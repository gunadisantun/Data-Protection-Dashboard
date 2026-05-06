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
      subjectCategories: ropaActivities.subjectCategories,
      personalDataTypes: ropaActivities.personalDataTypes,
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
  const openTasks = allTasks.filter((task) => task.status !== "Done");
  const criticalTasks = allTasks.filter((task) => task.severity === "Critical");
  const activeRopa = allRopa.filter((activity) => activity.status === "Active");
  const drafts = allRopa.filter((activity) => activity.status === "Draft");
  const complianceScore =
    allTasks.length === 0
      ? 100
      : Math.round(
          ((allTasks.length - openTasks.length * 0.42 - criticalTasks.length * 0.18) /
            allTasks.length) *
            100,
        );

  return {
    complianceScore: Math.max(0, Math.min(100, complianceScore)),
    totalRopa: allRopa.length,
    activeRopa: activeRopa.length,
    drafts: drafts.length,
    activeAssessments: openTasks.length,
    pendingTasks: openTasks.length,
    criticalRisks: criticalTasks.length,
    controlsActive: 0,
    recentActivity: await getAuditEvents(4),
    urgentTasks: openTasks.slice(0, 6),
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
      legalBasis: payload.legalBasis,
      processingPurpose: payload.processingPurpose,
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
