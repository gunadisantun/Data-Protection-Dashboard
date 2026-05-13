import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ensureDatabase } from "@/db/init";
import {
  assessments,
  auditEvents,
  departments,
  ropaActivities,
  users,
} from "@/db/schema";
import { analyzeRopa } from "@/lib/rule-engine";
import type {
  AssessmentStatus,
  AssessmentType,
  CreateRopaPayload,
  RopaListFilters,
} from "@/lib/types";

const specificPersonalDataKeywords = [
  "kesehatan",
  "biometrik",
  "genetika",
  "kejahatan",
  "anak",
  "keuangan",
  "spesifik",
  "sensitif",
];

export async function getCurrentUser() {
  await ensureDatabase();
  return db.query.users.findFirst({
    where: eq(users.id, "user-admin"),
    with: { department: true },
  });
}

export async function getDepartments() {
  await ensureDatabase();
  return db.select().from(departments).orderBy(departments.name);
}

export async function listRopa(filters: RopaListFilters = {}) {
  await ensureDatabase();
  const conditions = [
    filters.department && filters.department !== "all"
      ? eq(ropaActivities.departmentId, filters.department)
      : undefined,
    filters.risk && filters.risk !== "all"
      ? eq(ropaActivities.riskAssessmentLevel, filters.risk)
      : undefined,
    filters.status && filters.status !== "all"
      ? eq(ropaActivities.status, filters.status as "Draft" | "Active" | "Archived")
      : undefined,
  ].filter((condition) => Boolean(condition));

  const rows = await db
    .select({
      id: ropaActivities.id,
      activityName: ropaActivities.activityName,
      departmentId: ropaActivities.departmentId,
      departmentName: departments.name,
      legalBasis: ropaActivities.legalBasis,
      subjectCategories: ropaActivities.subjectCategories,
      personalDataTypes: ropaActivities.personalDataTypes,
      recipients: ropaActivities.recipients,
      dataReceiverRole: ropaActivities.dataReceiverRole,
      riskAssessmentLevel: ropaActivities.riskAssessmentLevel,
      status: ropaActivities.status,
      isCrossBorder: ropaActivities.isCrossBorder,
      createdAt: ropaActivities.createdAt,
      picName: ropaActivities.picName,
    })
    .from(ropaActivities)
    .innerJoin(departments, eq(ropaActivities.departmentId, departments.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ropaActivities.createdAt));

  const obligations = rows.length
    ? await db
        .select({
          id: assessments.id,
          ropaId: assessments.ropaId,
          taskType: assessments.taskType,
          status: assessments.status,
          severity: assessments.severity,
        })
        .from(assessments)
        .where(inArray(assessments.ropaId, rows.map((row) => row.id)))
    : [];

  const obligationsByRopa = obligations.reduce<
    Map<string, typeof obligations>
  >((map, obligation) => {
    const existing = map.get(obligation.ropaId) ?? [];
    existing.push(obligation);
    map.set(obligation.ropaId, existing);
    return map;
  }, new Map());

  return rows.map((row) => ({
    ...row,
    assessments: (obligationsByRopa.get(row.id) ?? []).sort(
      (a, b) => assessmentOrder(a.taskType) - assessmentOrder(b.taskType),
    ),
  }));
}

export async function listRopaForExport(filters: RopaListFilters = {}) {
  const rows = await listRopa(filters);
  const activities = await Promise.all(rows.map((row) => getRopaById(row.id)));

  return activities.filter(
    (
      activity,
    ): activity is NonNullable<Awaited<ReturnType<typeof getRopaById>>> =>
      Boolean(activity),
  );
}

export async function getRopaById(id: string) {
  await ensureDatabase();
  return db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, id),
    with: {
      department: true,
      assessments: true,
    },
  });
}

export async function listTasks(statuses?: AssessmentStatus[]) {
  await ensureDatabase();
  const where =
    statuses && statuses.length
      ? inArray(assessments.status, statuses)
      : undefined;

  return db
    .select({
      id: assessments.id,
      taskType: assessments.taskType,
      title: assessments.title,
      reason: assessments.reason,
      severity: assessments.severity,
      status: assessments.status,
      dueDate: assessments.dueDate,
      picName: assessments.picName,
      departmentName: departments.name,
      ropaId: assessments.ropaId,
      activityName: ropaActivities.activityName,
      createdAt: assessments.createdAt,
      updatedAt: assessments.updatedAt,
      notes: assessments.notes,
    })
    .from(assessments)
    .innerJoin(ropaActivities, eq(assessments.ropaId, ropaActivities.id))
    .innerJoin(departments, eq(assessments.departmentId, departments.id))
    .where(where)
    .orderBy(assessments.dueDate);
}

export async function getAssessmentById(id: string) {
  await ensureDatabase();

  return db.query.assessments.findFirst({
    where: eq(assessments.id, id),
    with: {
      department: true,
      ropa: true,
    },
  });
}

export async function getAuditEvents(limit = 8) {
  await ensureDatabase();
  return db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export async function getDashboardSummary() {
  await ensureDatabase();
  const allRopa = await listRopa();
  const allTasks = await listTasks();
  const ropaAnalysis = buildRopaAnalysis(allRopa);
  const openTasks = allTasks.filter((task) => task.status !== "Done");
  const criticalTasks = allTasks.filter((task) => task.severity === "Critical");
  const activeRopa = allRopa.filter((activity) => activity.status === "Active");
  const drafts = allRopa.filter((activity) => activity.status === "Draft");
  const assessmentByType = {
    DPIA: allTasks.filter((task) => task.taskType === "DPIA").length,
    TIA: allTasks.filter((task) => task.taskType === "TIA").length,
    LIA: allTasks.filter((task) => task.taskType === "LIA").length,
  };

  return {
    totalRopa: allRopa.length,
    activeRopa: activeRopa.length,
    drafts: drafts.length,
    activeAssessments: openTasks.length,
    assessmentByType,
    pendingTasks: openTasks.length,
    criticalRisks: criticalTasks.length,
    recentActivity: await getAuditEvents(4),
    urgentTasks: openTasks.slice(0, 6),
    ropaAnalysis,
    riskDistribution: {
      Low: allRopa.filter((activity) => activity.riskAssessmentLevel === "Low").length,
      Medium: allRopa.filter((activity) => activity.riskAssessmentLevel === "Medium")
        .length,
      High: allRopa.filter((activity) => activity.riskAssessmentLevel === "High").length,
    },
  };
}

export async function createRopa(payload: CreateRopaPayload) {
  await ensureDatabase();
  const now = new Date().toISOString();
  const ropaId = `ropa-${crypto.randomUUID()}`;
  const triggers = analyzeRopa({
    legalBasis: payload.legalBasis,
    isCrossBorder: payload.isCrossBorder,
    destinationCountry: payload.destinationCountry,
    riskAssessmentLevel: payload.riskAssessmentLevel,
    personalDataTypes: payload.personalDataTypes,
    highRiskCategories: payload.highRiskCategories ?? [],
    volumeLevel: payload.volumeLevel,
    usesAutomatedDecisionMaking: payload.usesAutomatedDecisionMaking,
  });

  await db.transaction(async (tx) => {
    await tx.insert(ropaActivities).values({
      id: ropaId,
      activityName: payload.activityName,
      processDescription: payload.processDescription,
      departmentId: payload.departmentId,
      picName: payload.picName,
      picEmail: payload.picEmail,
      controllerProcessorContacts: payload.controllerProcessorContacts,
      dpoContact: payload.dpoContact,
      legalBasis: payload.legalBasis,
      processingPurpose: payload.processingPurpose,
      transferPurpose: payload.transferPurpose,
      sourceMechanism: payload.sourceMechanism,
      subjectCategories: payload.subjectCategories,
      personalDataTypes: payload.personalDataTypes,
      recipients: payload.recipients,
      processorContractLink: payload.processorContractLink,
      dataReceiverRole: payload.dataReceiverRole,
      isCrossBorder: payload.isCrossBorder,
      destinationCountry: payload.destinationCountry,
      exportProtectionMechanism: payload.exportProtectionMechanism,
      transferMechanism: payload.transferMechanism,
      storageLocation: payload.storageLocation,
      retentionPeriod: payload.retentionPeriod,
      technicalMeasures: payload.technicalMeasures,
      organizationalMeasures: payload.organizationalMeasures,
      dataSubjectRights: payload.dataSubjectRights,
      riskAssessmentLevel: payload.riskAssessmentLevel,
      highRiskCategories: payload.highRiskCategories ?? [],
      riskRegisterReference: payload.riskRegisterReference ?? "",
      riskLikelihood: payload.riskLikelihood ?? payload.riskAssessmentLevel,
      riskImpact: payload.riskImpact ?? payload.riskAssessmentLevel,
      riskContext: payload.riskContext ?? "",
      existingControls: payload.existingControls ?? "",
      residualRiskLevel: payload.residualRiskLevel ?? payload.riskAssessmentLevel,
      riskMitigationPlan: payload.riskMitigationPlan ?? "",
      volumeLevel: payload.volumeLevel,
      usesAutomatedDecisionMaking: payload.usesAutomatedDecisionMaking,
      dataFlowMapping: payload.dataFlowMapping,
      previousProcess: payload.previousProcess,
      nextProcess: payload.nextProcess,
      status: payload.status ?? "Active",
      userId: payload.userId ?? "user-admin",
      createdAt: now,
      updatedAt: now,
    });

    if (triggers.length) {
      await tx.insert(assessments).values(
        triggers.map((trigger, index) => {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (trigger.type === "DPIA" ? 3 : 7));

          return {
            id: `task-${crypto.randomUUID()}`,
            ropaId,
            taskType: trigger.type,
            status: "Todo" as const,
            severity: trigger.severity,
            title: trigger.title,
            reason: trigger.reason,
            notes: "",
            dueDate: dueDate.toISOString(),
            picName: payload.picName,
            departmentId: payload.departmentId,
            createdAt: new Date(Date.now() + index).toISOString(),
            updatedAt: now,
          };
        }),
      );
    }

    await tx.insert(auditEvents).values({
      id: `audit-${crypto.randomUUID()}`,
      actorId: payload.userId ?? "user-admin",
      eventType: "ropa.submitted",
      entityType: "ropa",
      entityId: ropaId,
      message: `${payload.picName} submitted a new RoPA entry for ${payload.activityName}.`,
      createdAt: now,
    });
  });

  return {
    id: ropaId,
    triggers,
  };
}

export async function updateTask(
  id: string,
  values: { status?: AssessmentStatus; notes?: string },
) {
  await ensureDatabase();
  const updatedAt = new Date().toISOString();

  await db
    .update(assessments)
    .set({
      ...(values.status ? { status: values.status } : {}),
      ...(typeof values.notes === "string" ? { notes: values.notes } : {}),
      updatedAt,
    })
    .where(eq(assessments.id, id));

  return db.query.assessments.findFirst({
    where: eq(assessments.id, id),
  });
}

export async function deleteTask(id: string) {
  await ensureDatabase();
  const task = await db.query.assessments.findFirst({
    where: eq(assessments.id, id),
  });

  if (!task) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx.delete(auditEvents).where(eq(auditEvents.entityId, id));
    await tx.delete(assessments).where(eq(assessments.id, id));
  });

  return true;
}

export async function deleteRopa(id: string) {
  await ensureDatabase();
  const activity = await db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, id),
  });

  if (!activity) {
    return false;
  }

  await db.transaction(async (tx) => {
    const linkedAssessmentIds = (
      await tx
        .select({ id: assessments.id })
        .from(assessments)
        .where(eq(assessments.ropaId, id))
    ).map((assessment) => assessment.id);

    if (linkedAssessmentIds.length) {
      await tx
        .delete(auditEvents)
        .where(inArray(auditEvents.entityId, linkedAssessmentIds));
    }

    await tx.delete(auditEvents).where(eq(auditEvents.entityId, id));
    await tx.delete(assessments).where(eq(assessments.ropaId, id));
    await tx.delete(ropaActivities).where(eq(ropaActivities.id, id));
  });

  return true;
}

export async function getReportSummary() {
  const summary = await getDashboardSummary();
  const tasks = await listTasks();
  const byType = (type: AssessmentType) =>
    tasks.filter((task) => task.taskType === type);

  return {
    ...summary,
    complianceScore:
      tasks.length === 0
        ? 100
        : Math.round(
            (tasks.filter((task) => task.status === "Done").length / tasks.length) * 100,
          ),
    assessmentMix: {
      DPIA: byType("DPIA").length,
      TIA: byType("TIA").length,
      LIA: byType("LIA").length,
    },
    taskCompletionRate:
      tasks.length === 0
        ? 100
        : Math.round(
            (tasks.filter((task) => task.status === "Done").length / tasks.length) * 100,
          ),
  };
}

export async function getRegistryStats() {
  await ensureDatabase();
  const rows = await db
    .select({
      status: ropaActivities.status,
      count: sql<number>`count(*)`,
    })
    .from(ropaActivities)
    .groupBy(ropaActivities.status);

  return {
    active: Number(rows.find((row) => row.status === "Active")?.count ?? 0),
    drafts: Number(rows.find((row) => row.status === "Draft")?.count ?? 0),
  };
}

function assessmentOrder(type: AssessmentType) {
  return type === "DPIA" ? 0 : type === "TIA" ? 1 : 2;
}

type RopaActivityForAnalysis = Awaited<ReturnType<typeof listRopa>>[number];

function buildRopaAnalysis(activities: RopaActivityForAnalysis[]) {
  const dataTypeMap = new Map<string, { count: number; units: Set<string> }>();
  let specificDataActivityCount = 0;

  activities.forEach((activity) => {
    const uniqueTypes = uniqueNonEmpty(activity.personalDataTypes);
    const hasSpecificData = uniqueTypes.some((type) => isSpecificPersonalDataType(type));

    if (hasSpecificData) {
      specificDataActivityCount += 1;
    }

    uniqueTypes.forEach((dataType) => {
      const current = dataTypeMap.get(dataType) ?? {
        count: 0,
        units: new Set<string>(),
      };
      current.count += 1;
      current.units.add(activity.departmentName);
      dataTypeMap.set(dataType, current);
    });
  });

  const dataTypeRows = [...dataTypeMap.entries()]
    .map(([dataType, aggregate]) => ({
      dataType,
      activityCount: aggregate.count,
      units: [...aggregate.units].sort().join(", "),
    }))
    .sort((a, b) => b.activityCount - a.activityCount || a.dataType.localeCompare(b.dataType));

  const legalBasisDistribution = aggregateLegalBasisDistribution(activities);
  const activitiesWithoutLegalBasis = activities
    .filter((activity) => !activity.legalBasis.trim())
    .map((activity) => ({
      id: activity.id,
      activityName: activity.activityName,
      departmentName: activity.departmentName,
      picName: activity.picName,
    }));

  const thirdPartyTableRows = activities
    .flatMap((activity) => {
      const thirdParties = splitThirdParties(activity.recipients);
      const role = activity.dataReceiverRole.trim();

      return thirdParties.map((thirdParty) => ({
        id: activity.id,
        activityName: activity.activityName,
        departmentName: activity.departmentName,
        thirdParty,
        role: role || "-",
      }));
    })
    .sort((a, b) => a.activityName.localeCompare(b.activityName));

  const topThirdParties = [...countBy(thirdPartyTableRows, (row) => row.thirdParty)]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 10);

  const activitiesWithThirdParty = activities.filter(
    (activity) => splitThirdParties(activity.recipients).length > 0,
  ).length;

  return {
    dataTypeAnalysis: {
      totalActivities: activities.length,
      specificDataActivityCount,
      topDataTypes: dataTypeRows.slice(0, 10),
      tableRows: dataTypeRows,
    },
    legalBasisAnalysis: {
      distribution: legalBasisDistribution,
      missingCount: activitiesWithoutLegalBasis.length,
      missingActivities: activitiesWithoutLegalBasis,
    },
    thirdPartyAnalysis: {
      activitiesWithThirdParty,
      topThirdParties,
      tableRows: thirdPartyTableRows,
    },
  };
}

function aggregateLegalBasisDistribution(activities: RopaActivityForAnalysis[]) {
  const labels = [
    "Consent",
    "Contractual",
    "Legal Obligation",
    "Legitimate Interest",
    "Vital Interest",
    "Public Interest",
  ];
  const counts = new Map<string, number>(labels.map((label) => [label, 0]));

  activities.forEach((activity) => {
    const legalBasis = activity.legalBasis.trim();

    if (!legalBasis) {
      return;
    }

    counts.set(legalBasis, (counts.get(legalBasis) ?? 0) + 1);
  });

  return [...counts.entries()].map(([legalBasis, count]) => ({
    legalBasis,
    count,
  }));
}

function uniqueNonEmpty(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function isSpecificPersonalDataType(value: string) {
  const normalized = value.toLowerCase();
  return specificPersonalDataKeywords.some((keyword) => normalized.includes(keyword));
}

function splitThirdParties(value: string) {
  return value
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return counts;
}
