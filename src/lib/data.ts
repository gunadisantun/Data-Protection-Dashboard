import { and, asc, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import { ensureDatabase } from "@/db/init";
import {
  account,
  assessments,
  auditEvents,
  breachReports,
  departments,
  faqCategories,
  faqEntries,
  faqReferences,
  governanceSettings,
  knowledgeChunks,
  moduleColumnSettings,
  privacyMapOverrides,
  riskRegisterEntries,
  ropaActivities,
  selfAssessments,
  session,
  sopDocuments,
  user,
  users,
} from "@/db/schema";
import { demoDepartmentName, getDemoDepartmentId, getDemoUserId } from "@/lib/demo";
import {
  extractReferenceTextFromUrl,
  rankKnowledgeChunks,
  splitKnowledgeContent,
  type KnowledgeChunkInput,
} from "@/lib/knowledge";
import {
  getReferenceBucketName,
  getSelfAssessmentEvidenceBucketName,
  getSopBucketName,
  getSupabaseAdminClient,
} from "@/utils/supabase/admin";
import {
  isOfflineRuntime,
  readOfflineStorageObject,
  saveOfflineStorageObject,
} from "@/lib/offline-runtime";
import { analyzeRopa } from "@/lib/rule-engine";
import { emptyBreachReportAnswers } from "@/lib/breach-report-fields";
import {
  allowedKindsForRole,
  calculateSelfAssessmentSummary,
  emptySelfAssessmentAnswers,
  emptySelfAssessmentDataMap,
  generateSelfAssessmentActionPlan,
  type SelfAssessmentActionPlanItem,
  type SelfAssessmentAnswers,
  type SelfAssessmentDataMapRow,
  type SelfAssessmentEvidenceFile,
  type SelfAssessmentStatus,
} from "@/lib/self-assessment";
import type {
  AssessmentStatus,
  AssessmentType,
  BreachReportStatus,
  CreateRopaPayload,
  RopaTransferItem,
  RuleTrigger,
  RopaListFilters,
  UserRole,
} from "@/lib/types";
import {
  configurableModuleValues,
  normalizeModuleColumnSettings,
  type ConfigurableModule,
  type ModuleColumnSettings,
} from "@/lib/module-columns";

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

export type AccessScope = {
  role: "MasterAdmin" | "DPO" | "User";
  departmentId?: string | null;
  userId?: string;
  isDemo?: boolean;
  demoSessionId?: string;
};

type TaskListOptions = {
  scope?: AccessScope;
  taskTypes?: AssessmentType[];
};

const EMPTY_SCOPED_DEPARTMENT = "__scope_without_department__";

function departmentForScope(scope?: AccessScope) {
  if (!scope || scope.role !== "User") {
    return null;
  }

  return scope.departmentId?.trim() || EMPTY_SCOPED_DEPARTMENT;
}

function hasScopeAccess(scope: AccessScope | undefined, departmentId: string) {
  if (!scope || scope.role !== "User") {
    return true;
  }

  return Boolean(scope.departmentId && scope.departmentId === departmentId);
}

function isDemoScope(scope?: AccessScope): scope is AccessScope & {
  isDemo: true;
  demoSessionId: string;
  userId: string;
} {
  return Boolean(scope?.isDemo && scope.demoSessionId && scope.userId);
}

export async function createDemoSession(sessionId: string) {
  await ensureDatabase();
  const now = new Date().toISOString();
  const userId = getDemoUserId(sessionId);
  const departmentId = getDemoDepartmentId(sessionId);

  await db
    .insert(departments)
    .values({
      id: departmentId,
      name: demoDepartmentName,
      createdAt: now,
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      id: userId,
      username: `demo_${sessionId}`,
      fullName: "Demo User",
      email: `demo-${sessionId}@privacybro.local`,
      role: "User",
      departmentId,
      picName: "Demo User",
      picEmail: `demo-${sessionId}@privacybro.local`,
      createdAt: now,
    })
    .onConflictDoNothing();

  await db
    .update(users)
    .set({
      departmentId,
      picName: "Demo User",
      picEmail: `demo-${sessionId}@privacybro.local`,
    })
    .where(eq(users.id, userId));

  return {
    id: userId,
    name: "Demo User",
    email: `demo-${sessionId}@privacybro.local`,
  };
}

export async function cleanupDemoSession(sessionId: string) {
  await ensureDatabase();
  const userId = getDemoUserId(sessionId);
  const demoDepartmentPrefix = `demo-dept-${sessionId}-`;

  await db.transaction(async (tx) => {
    const demoRopaIds = (
      await tx
        .select({ id: ropaActivities.id })
        .from(ropaActivities)
        .where(eq(ropaActivities.userId, userId))
    ).map((activity) => activity.id);

    const demoAssessmentIds = demoRopaIds.length
      ? (
          await tx
            .select({ id: assessments.id })
            .from(assessments)
            .where(inArray(assessments.ropaId, demoRopaIds))
        ).map((assessment) => assessment.id)
      : [];

    if (demoAssessmentIds.length) {
      await tx.delete(auditEvents).where(inArray(auditEvents.entityId, demoAssessmentIds));
      await tx.delete(riskRegisterEntries).where(inArray(riskRegisterEntries.sourceAssessmentId, demoAssessmentIds));
    }

    if (demoRopaIds.length) {
      await tx.delete(auditEvents).where(inArray(auditEvents.entityId, demoRopaIds));
      await tx.delete(riskRegisterEntries).where(inArray(riskRegisterEntries.sourceRopaId, demoRopaIds));
      await tx.delete(assessments).where(inArray(assessments.ropaId, demoRopaIds));
      await tx.delete(ropaActivities).where(inArray(ropaActivities.id, demoRopaIds));
    }

    const demoSelfAssessmentIds = (
      await tx
        .select({ id: selfAssessments.id })
        .from(selfAssessments)
        .where(eq(selfAssessments.createdBy, userId))
    ).map((assessment) => assessment.id);

    if (demoSelfAssessmentIds.length) {
      await tx
        .delete(auditEvents)
        .where(inArray(auditEvents.entityId, demoSelfAssessmentIds));
      await tx
        .delete(selfAssessments)
        .where(inArray(selfAssessments.id, demoSelfAssessmentIds));
    }

    await tx.delete(breachReports).where(eq(breachReports.reportedBy, userId));
    await tx.delete(auditEvents).where(eq(auditEvents.actorId, userId));
    await tx.delete(users).where(eq(users.id, userId));
    await tx.delete(departments).where(like(departments.id, `${demoDepartmentPrefix}%`));
  });
}

async function ensureDemoDepartment(scope: AccessScope, departmentName: string) {
  if (!isDemoScope(scope)) {
    return departmentName;
  }

  const name = demoDepartmentName;
  const id = getDemoDepartmentId(scope.demoSessionId);
  const now = new Date().toISOString();

  await db
    .insert(departments)
    .values({
      id,
      name,
      createdAt: now,
    })
    .onConflictDoNothing();

  return id;
}

function normalizeDepartmentName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function toDepartmentSlug(value: string) {
  return normalizeDepartmentName(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function resolveDepartmentIdFromName(input: string | null | undefined) {
  const normalizedName = input ? normalizeDepartmentName(input) : "";
  if (!normalizedName) {
    return null;
  }

  const existingDepartments = await db
    .select({
      id: departments.id,
      name: departments.name,
    })
    .from(departments);

  const byName = existingDepartments.find(
    (department) => normalizeDepartmentName(department.name).toLowerCase() ===
      normalizedName.toLowerCase(),
  );

  if (byName) {
    return byName.id;
  }

  const slug = toDepartmentSlug(normalizedName) || "unit";
  const usedIds = new Set(existingDepartments.map((department) => department.id));
  let candidate = `dept-${slug}`;
  let attempt = 2;

  while (usedIds.has(candidate)) {
    candidate = `dept-${slug}-${attempt}`;
    attempt += 1;
  }

  await db.insert(departments).values({
    id: candidate,
    name: normalizedName,
    createdAt: new Date().toISOString(),
  });

  return candidate;
}

export async function getCurrentUser(scope?: AccessScope) {
  await ensureDatabase();

  if (isDemoScope(scope)) {
    await createDemoSession(scope.demoSessionId);
  }

  if (scope?.userId) {
    const byId = await db.query.users.findFirst({
      where: eq(users.id, scope.userId),
      with: { department: true },
    });

    if (byId) {
      return byId;
    }

    return null;
  }

  return db.query.users.findFirst({
    where: inArray(users.role, ["MasterAdmin", "DPO"]),
    with: { department: true },
  });
}

export async function getDepartments(scope?: AccessScope) {
  await ensureDatabase();
  if (isDemoScope(scope)) {
    await createDemoSession(scope.demoSessionId);
  }

  const scopedDepartment = departmentForScope(scope);

  return db
    .select()
    .from(departments)
    .where(scopedDepartment ? eq(departments.id, scopedDepartment) : undefined)
    .orderBy(departments.name);
}

export async function resolveLoginEmailFromDatabase(usernameOrEmail: string) {
  await ensureDatabase();
  const normalized = usernameOrEmail.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const records = await db
    .select({
      username: users.username,
      email: users.email,
    })
    .from(users);

  if (normalized.includes("@")) {
    const matched = records.find((record) => record.email.toLowerCase() === normalized);
    return matched?.email ?? null;
  }

  const matched = records.find((record) => record.username.toLowerCase() === normalized);
  return matched?.email ?? null;
}

export async function getGovernanceSettings(scope?: AccessScope) {
  await ensureDatabase();
  const [row] = await db
    .select()
    .from(governanceSettings)
    .where(eq(governanceSettings.id, "singleton"))
    .limit(1);

  if (row) {
    return row;
  }

  const now = new Date().toISOString();
  await db.insert(governanceSettings).values({
    id: "singleton",
    controllerProcessorContacts:
      "PT Data Protection Governance (Pengendali) - privacy@company.com",
    dpoContact: "dpo@company.com",
    createdAt: now,
    updatedAt: now,
    updatedBy: scope?.userId,
  });

  const [created] = await db
    .select()
    .from(governanceSettings)
    .where(eq(governanceSettings.id, "singleton"))
    .limit(1);

  return created ?? null;
}

export async function updateGovernanceSettings(
  payload: {
    controllerProcessorContacts: string;
    dpoContact: string;
  },
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope || scope.role !== "DPO") {
    return null;
  }

  const now = new Date().toISOString();
  await db
    .insert(governanceSettings)
    .values({
      id: "singleton",
      controllerProcessorContacts: payload.controllerProcessorContacts,
      dpoContact: payload.dpoContact,
      createdAt: now,
      updatedAt: now,
      updatedBy: scope.userId,
    })
    .onConflictDoUpdate({
      target: governanceSettings.id,
      set: {
        controllerProcessorContacts: payload.controllerProcessorContacts,
        dpoContact: payload.dpoContact,
        updatedAt: now,
        updatedBy: scope.userId,
      },
    });

  return getGovernanceSettings(scope);
}

export async function getModuleColumnSettings(
  module: ConfigurableModule,
): Promise<ModuleColumnSettings> {
  await ensureDatabase();
  const [row] = await db
    .select()
    .from(moduleColumnSettings)
    .where(eq(moduleColumnSettings.module, module))
    .limit(1);

  return normalizeModuleColumnSettings(
    module,
    row?.visibleColumns,
    row?.customColumns,
  );
}

export async function getAllModuleColumnSettings(): Promise<
  Record<ConfigurableModule, ModuleColumnSettings>
> {
  await ensureDatabase();
  const rows = await db.select().from(moduleColumnSettings);
  const byModule = new Map(
    rows.map((row) => [
      row.module,
      {
        visibleColumns: row.visibleColumns,
        customColumns: row.customColumns,
      },
    ]),
  );

  return Object.fromEntries(
    configurableModuleValues.map((module) => [
      module,
      normalizeModuleColumnSettings(
        module,
        byModule.get(module)?.visibleColumns,
        byModule.get(module)?.customColumns,
      ),
    ]),
  ) as Record<ConfigurableModule, ModuleColumnSettings>;
}

export async function updateModuleColumnSettings(
  module: ConfigurableModule,
  visibleColumns: string[],
  customColumns: ModuleColumnSettings["customColumns"],
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope || scope.role !== "MasterAdmin") {
    return null;
  }

  const normalized = normalizeModuleColumnSettings(
    module,
    visibleColumns,
    customColumns,
  );
  const now = new Date().toISOString();

  await db
    .insert(moduleColumnSettings)
    .values({
      id: `module-columns-${module}`,
      module,
      visibleColumns: normalized.visibleColumns,
      customColumns: normalized.customColumns,
      createdAt: now,
      updatedAt: now,
      updatedBy: scope.userId,
    })
    .onConflictDoUpdate({
      target: moduleColumnSettings.module,
      set: {
        visibleColumns: normalized.visibleColumns,
        customColumns: normalized.customColumns,
        updatedAt: now,
        updatedBy: scope.userId,
      },
    });

  return getModuleColumnSettings(module);
}

export async function listManagedUsers(scope?: AccessScope) {
  await ensureDatabase();
  if (!scope) {
    return [];
  }

  const scopedUserId = scope.role === "MasterAdmin" ? undefined : scope.userId;
  const conditions = [
    scopedUserId ? eq(users.id, scopedUserId) : undefined,
    scope.role === "MasterAdmin" ? sql`${users.id} not like 'demo-user-%'` : undefined,
  ].filter(Boolean);

  if (scope.role !== "MasterAdmin" && !scopedUserId) {
    return [];
  }

  return db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      departmentName: departments.name,
      picName: users.picName,
      picEmail: users.picEmail,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(users.username);
}

type ManagedUserUpdatePayload = Partial<{
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  departmentName: string;
  picName: string;
  picEmail: string;
  password: string;
}>;

export async function updateManagedUser(
  id: string,
  payload: ManagedUserUpdatePayload,
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!existing) {
    return null;
  }

  if (scope.role !== "MasterAdmin") {
    if (!scope.userId || scope.userId !== id) {
      return null;
    }

    const allowed = {
      picName: payload.picName?.trim() ?? existing.picName,
      picEmail: payload.picEmail?.trim() ?? existing.picEmail,
    };

    await db
      .update(users)
      .set({
        picName: allowed.picName,
        picEmail: allowed.picEmail,
      })
      .where(eq(users.id, id));
  } else {
    const hasDepartmentName = Object.prototype.hasOwnProperty.call(
      payload,
      "departmentName",
    );
    const resolvedDepartmentId = hasDepartmentName
      ? await resolveDepartmentIdFromName(payload.departmentName)
      : undefined;

    await db
      .update(users)
      .set({
        ...(payload.username ? { username: payload.username.trim() } : {}),
        ...(payload.fullName ? { fullName: payload.fullName.trim() } : {}),
        ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
        ...(payload.role ? { role: payload.role } : {}),
        ...(hasDepartmentName ? { departmentId: resolvedDepartmentId } : {}),
        ...(payload.picName ? { picName: payload.picName.trim() } : {}),
        ...(payload.picEmail ? { picEmail: payload.picEmail.trim() } : {}),
      })
      .where(eq(users.id, id));

    await db
      .update(user)
      .set({
        ...(payload.fullName ? { name: payload.fullName.trim() } : {}),
        ...(payload.email ? { email: payload.email.trim().toLowerCase() } : {}),
        ...(payload.role ? { role: payload.role } : {}),
        ...(hasDepartmentName ? { departmentId: resolvedDepartmentId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(user.id, id));

    if (payload.password?.trim()) {
      const passwordHash = await hashPassword(payload.password.trim());
      await db
        .update(account)
        .set({
          password: passwordHash,
          updatedAt: new Date(),
        })
        .where(and(eq(account.userId, id), eq(account.providerId, "credential")));
    }
  }

  const [updated] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      departmentName: departments.name,
      picName: users.picName,
      picEmail: users.picEmail,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, id))
    .limit(1);

  return updated ?? null;
}

export async function createManagedUser(
  payload: {
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    departmentName: string;
    picName?: string;
    picEmail?: string;
    password: string;
  },
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope || scope.role !== "MasterAdmin") {
    return null;
  }

  const id = `user-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const authNow = new Date();
  const normalizedEmail = payload.email.trim().toLowerCase();
  const picName = payload.picName?.trim() || payload.fullName.trim();
  const picEmail = payload.picEmail?.trim() || normalizedEmail;
  const departmentId = await resolveDepartmentIdFromName(payload.departmentName);

  if (!departmentId) {
    throw new Error("Departemen wajib diisi");
  }

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      username: payload.username.trim(),
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      role: payload.role,
      departmentId,
      picName,
      picEmail,
      createdAt: now,
    });

    await tx.insert(user).values({
      id,
      name: payload.fullName.trim(),
      email: normalizedEmail,
      emailVerified: true,
      image: null,
      role: payload.role,
      departmentId,
      createdAt: authNow,
      updatedAt: authNow,
    });

    const passwordHash = await hashPassword(payload.password.trim());
    await tx.insert(account).values({
      id: `account-${id}`,
      accountId: id,
      providerId: "credential",
      userId: id,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: passwordHash,
      createdAt: authNow,
      updatedAt: authNow,
    });
  });

  const [created] = await db
    .select({
      id: users.id,
      username: users.username,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      departmentId: users.departmentId,
      departmentName: departments.name,
      picName: users.picName,
      picEmail: users.picEmail,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(users.id, id))
    .limit(1);

  return created ?? null;
}

export async function deleteManagedUser(id: string, scope?: AccessScope) {
  await ensureDatabase();
  if (!scope || scope.role !== "MasterAdmin") {
    return false;
  }
  if (scope.userId === id) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(ropaActivities)
      .set({ userId: null })
      .where(eq(ropaActivities.userId, id));
    await tx
      .update(governanceSettings)
      .set({ updatedBy: scope.userId ?? null })
      .where(eq(governanceSettings.updatedBy, id));
    await tx
      .update(moduleColumnSettings)
      .set({ updatedBy: scope.userId ?? null })
      .where(eq(moduleColumnSettings.updatedBy, id));
    await tx
      .update(faqEntries)
      .set({ createdBy: null })
      .where(eq(faqEntries.createdBy, id));
    await tx
      .update(faqEntries)
      .set({ updatedBy: null })
      .where(eq(faqEntries.updatedBy, id));
    if (scope.userId) {
      await tx
        .update(sopDocuments)
        .set({ uploadedBy: scope.userId })
        .where(eq(sopDocuments.uploadedBy, id));
    }
    await tx
      .update(breachReports)
      .set({ reportedBy: null })
      .where(eq(breachReports.reportedBy, id));
    await tx
      .update(breachReports)
      .set({ finalizedBy: null })
      .where(eq(breachReports.finalizedBy, id));
    await tx
      .update(selfAssessments)
      .set({ createdBy: null })
      .where(eq(selfAssessments.createdBy, id));
    await tx
      .update(selfAssessments)
      .set({ finalizedBy: null })
      .where(eq(selfAssessments.finalizedBy, id));
    await tx
      .update(privacyMapOverrides)
      .set({ updatedBy: null })
      .where(eq(privacyMapOverrides.updatedBy, id));
    await tx
      .update(auditEvents)
      .set({ actorId: null })
      .where(eq(auditEvents.actorId, id));
    await tx.delete(session).where(eq(session.userId, id));
    await tx.delete(account).where(eq(account.userId, id));
    await tx.delete(user).where(eq(user.id, id));
    await tx.delete(users).where(eq(users.id, id));
  });

  return true;
}

export async function listRopa(filters: RopaListFilters = {}, scope?: AccessScope) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(scope);
  const conditions = [
    isDemoScope(scope) ? eq(ropaActivities.userId, scope.userId) : undefined,
    scopedDepartment ? eq(ropaActivities.departmentId, scopedDepartment) : undefined,
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
      processingPurpose: ropaActivities.processingPurpose,
      subjectCategories: ropaActivities.subjectCategories,
      personalDataTypes: ropaActivities.personalDataTypes,
      recipients: ropaActivities.recipients,
      dataReceiverRole: ropaActivities.dataReceiverRole,
      riskAssessmentLevel: ropaActivities.riskAssessmentLevel,
      status: ropaActivities.status,
      isCrossBorder: ropaActivities.isCrossBorder,
      destinationCountry: ropaActivities.destinationCountry,
      retentionPeriod: ropaActivities.retentionPeriod,
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

export async function listRopaForExport(filters: RopaListFilters = {}, scope?: AccessScope) {
  const rows = await listRopa(filters, scope);
  const activities = await Promise.all(rows.map((row) => getRopaById(row.id, scope)));

  return activities.filter(
    (
      activity,
    ): activity is NonNullable<Awaited<ReturnType<typeof getRopaById>>> =>
      Boolean(activity),
  );
}

export async function getRopaById(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const activity = await db.query.ropaActivities.findFirst({
    where: eq(ropaActivities.id, id),
    with: {
      department: true,
      assessments: true,
    },
  });

  if (!activity) {
    return null;
  }

  if (isDemoScope(scope)) {
    return activity.userId === scope.userId ? activity : null;
  }

  if (!hasScopeAccess(scope, activity.departmentId)) {
    return null;
  }

  return activity;
}

export async function listTasks(statuses?: AssessmentStatus[], options: TaskListOptions = {}) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(options.scope);
  const conditions = [
    isDemoScope(options.scope)
      ? eq(ropaActivities.userId, options.scope.userId)
      : undefined,
    scopedDepartment ? eq(assessments.departmentId, scopedDepartment) : undefined,
    statuses && statuses.length ? inArray(assessments.status, statuses) : undefined,
    options.taskTypes && options.taskTypes.length
      ? inArray(assessments.taskType, options.taskTypes)
      : undefined,
  ].filter((condition) => Boolean(condition));

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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(assessments.dueDate);
}

export async function listRiskRegisterEntries(filters?: {
  riskLevel?: string;
  status?: string;
  query?: string;
}, scope?: AccessScope) {
  await ensureDatabase();
  if (scope?.isDemo) {
    return [];
  }

  const scopedDepartment = departmentForScope(scope);
  const queryText = filters?.query?.trim();
  const conditions = [
    scopedDepartment ? eq(riskRegisterEntries.departmentId, scopedDepartment) : undefined,
    filters?.riskLevel && filters.riskLevel !== "all"
      ? eq(riskRegisterEntries.riskLevel, filters.riskLevel as "Low" | "Medium" | "High")
      : undefined,
    filters?.status && filters.status !== "all"
      ? eq(
          riskRegisterEntries.status,
          filters.status as "Open" | "In Progress" | "Closed",
        )
      : undefined,
    queryText
      ? or(
          like(riskRegisterEntries.riskId, `%${queryText}%`),
          like(riskRegisterEntries.riskDescription, `%${queryText}%`),
          like(riskRegisterEntries.activityName, `%${queryText}%`),
          like(riskRegisterEntries.riskOwner, `%${queryText}%`),
        )
      : undefined,
  ].filter((condition) => Boolean(condition));

  const rows = await db
    .select({
      id: riskRegisterEntries.id,
      riskId: riskRegisterEntries.riskId,
      riskDescription: riskRegisterEntries.riskDescription,
      potentialImpact: riskRegisterEntries.potentialImpact,
      existingControl: riskRegisterEntries.existingControl,
      riskLevel: riskRegisterEntries.riskLevel,
      recommendedAction: riskRegisterEntries.recommendedAction,
      riskOwner: riskRegisterEntries.riskOwner,
      targetDate: riskRegisterEntries.targetDate,
      status: riskRegisterEntries.status,
      remarks: riskRegisterEntries.remarks,
      sourceAssessmentId: riskRegisterEntries.sourceAssessmentId,
      sourceRopaId: riskRegisterEntries.sourceRopaId,
      departmentId: riskRegisterEntries.departmentId,
      departmentName: departments.name,
      activityName: riskRegisterEntries.activityName,
      createdAt: riskRegisterEntries.createdAt,
      updatedAt: riskRegisterEntries.updatedAt,
    })
    .from(riskRegisterEntries)
    .leftJoin(departments, eq(riskRegisterEntries.departmentId, departments.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(riskRegisterEntries.riskId), desc(riskRegisterEntries.createdAt));

  return rows.map(mapRiskRegisterRow);
}

export async function createRiskRegisterEntry(payload: {
  riskId: string;
  riskDescription: string;
  potentialImpact: string;
  existingControl: string;
  riskLevel: "Low" | "Medium" | "High";
  recommendedAction: string;
  riskOwner: string;
  targetDate: string;
  status: "Open" | "In Progress" | "Closed";
  remarks?: string;
  sourceAssessmentId?: string;
  sourceRopaId?: string;
  departmentId?: string;
  activityName?: string;
}, scope?: AccessScope) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(scope);
  const departmentId = scopedDepartment || payload.departmentId;

  if (scopedDepartment && payload.departmentId && payload.departmentId !== scopedDepartment) {
    return null;
  }

  const now = new Date().toISOString();
  const id = `risk-register-${crypto.randomUUID()}`;

  await db.insert(riskRegisterEntries).values({
    id,
    riskId: payload.riskId,
    riskDescription: payload.riskDescription,
    potentialImpact: payload.potentialImpact,
    existingControl: payload.existingControl,
    riskLevel: payload.riskLevel,
    recommendedAction: payload.recommendedAction,
    riskOwner: payload.riskOwner,
    targetDate: payload.targetDate,
    status: payload.status,
    remarks: payload.remarks ?? "",
    sourceAssessmentId: payload.sourceAssessmentId,
    sourceRopaId: payload.sourceRopaId,
    departmentId,
    activityName: payload.activityName ?? "",
    createdAt: now,
    updatedAt: now,
  });

  return getRiskRegisterEntryById(id, scope);
}

export async function updateRiskRegisterEntry(
  id: string,
  payload: Partial<{
    riskId: string;
    riskDescription: string;
    potentialImpact: string;
    existingControl: string;
    riskLevel: "Low" | "Medium" | "High";
    recommendedAction: string;
    riskOwner: string;
    targetDate: string;
    status: "Open" | "In Progress" | "Closed";
    remarks: string;
    sourceAssessmentId?: string;
    sourceRopaId?: string;
    departmentId?: string;
    activityName?: string;
  }>,
  scope?: AccessScope,
) {
  await ensureDatabase();
  const existing = await getRiskRegisterEntryById(id, scope);
  if (!existing) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  await db
    .update(riskRegisterEntries)
    .set({
      ...payload,
      updatedAt,
    })
    .where(eq(riskRegisterEntries.id, id));

  return getRiskRegisterEntryById(id, scope);
}

export async function deleteRiskRegisterEntry(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const existing = await getRiskRegisterEntryById(id, scope);

  if (!existing) {
    return false;
  }

  await db.delete(riskRegisterEntries).where(eq(riskRegisterEntries.id, id));
  return true;
}

export async function getRiskRegisterEntryById(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(scope);

  const [row] = await db
    .select({
      id: riskRegisterEntries.id,
      riskId: riskRegisterEntries.riskId,
      riskDescription: riskRegisterEntries.riskDescription,
      potentialImpact: riskRegisterEntries.potentialImpact,
      existingControl: riskRegisterEntries.existingControl,
      riskLevel: riskRegisterEntries.riskLevel,
      recommendedAction: riskRegisterEntries.recommendedAction,
      riskOwner: riskRegisterEntries.riskOwner,
      targetDate: riskRegisterEntries.targetDate,
      status: riskRegisterEntries.status,
      remarks: riskRegisterEntries.remarks,
      sourceAssessmentId: riskRegisterEntries.sourceAssessmentId,
      sourceRopaId: riskRegisterEntries.sourceRopaId,
      departmentId: riskRegisterEntries.departmentId,
      departmentName: departments.name,
      activityName: riskRegisterEntries.activityName,
      createdAt: riskRegisterEntries.createdAt,
      updatedAt: riskRegisterEntries.updatedAt,
    })
    .from(riskRegisterEntries)
    .leftJoin(departments, eq(riskRegisterEntries.departmentId, departments.id))
    .where(
      and(
        eq(riskRegisterEntries.id, id),
        scopedDepartment
          ? eq(riskRegisterEntries.departmentId, scopedDepartment)
          : undefined,
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return mapRiskRegisterRow(row);
}

type CreateFaqEntryPayload = {
  categoryId: string;
  question: string;
  answer: string;
  legalBasis?: string;
  benchmarkSupport?: string;
  status?: string;
};

type UpdateFaqEntryPayload = Partial<CreateFaqEntryPayload>;

export async function getFaqKnowledgeCenter(scope?: AccessScope) {
  await ensureDatabase();

  if (!scope) {
    return {
      categories: [],
      references: [],
      sopDocuments: [],
    };
  }

  const [categories, entries, references, documents] = await Promise.all([
    db
      .select({
        id: faqCategories.id,
        name: faqCategories.name,
        scope: faqCategories.scope,
        displayOrder: faqCategories.displayOrder,
      })
      .from(faqCategories)
      .orderBy(asc(faqCategories.displayOrder), asc(faqCategories.name)),
    db
      .select({
        id: faqEntries.id,
        categoryId: faqEntries.categoryId,
        question: faqEntries.question,
        answer: faqEntries.answer,
        legalBasis: faqEntries.legalBasis,
        benchmarkSupport: faqEntries.benchmarkSupport,
        status: faqEntries.status,
        displayOrder: faqEntries.displayOrder,
        updatedAt: faqEntries.updatedAt,
      })
      .from(faqEntries)
      .orderBy(asc(faqEntries.displayOrder)),
    db
      .select({
        id: faqReferences.id,
        groupName: faqReferences.groupName,
        title: faqReferences.title,
        description: faqReferences.description,
        url: faqReferences.url,
        fileName: faqReferences.fileName,
        mimeType: faqReferences.mimeType,
        fileSize: faqReferences.fileSize,
        storageBucket: faqReferences.storageBucket,
        storagePath: faqReferences.storagePath,
        displayOrder: faqReferences.displayOrder,
      })
      .from(faqReferences)
      .orderBy(asc(faqReferences.displayOrder)),
    listSopDocuments(scope),
  ]);

  const entriesByCategory = entries.reduce<Map<string, typeof entries>>((map, entry) => {
    const bucket = map.get(entry.categoryId) ?? [];
    bucket.push(entry);
    map.set(entry.categoryId, bucket);
    return map;
  }, new Map());

  return {
    categories: categories.map((category) => ({
      ...category,
      entries: entriesByCategory.get(category.id) ?? [],
    })),
    references,
    sopDocuments: documents,
  };
}

export async function listFaqEntries(categoryId?: string) {
  await ensureDatabase();
  const conditions = [categoryId ? eq(faqEntries.categoryId, categoryId) : undefined].filter(
    (condition) => Boolean(condition),
  );

  return db
    .select({
      id: faqEntries.id,
      categoryId: faqEntries.categoryId,
      question: faqEntries.question,
      answer: faqEntries.answer,
      legalBasis: faqEntries.legalBasis,
      benchmarkSupport: faqEntries.benchmarkSupport,
      status: faqEntries.status,
      displayOrder: faqEntries.displayOrder,
      updatedAt: faqEntries.updatedAt,
    })
    .from(faqEntries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(faqEntries.displayOrder));
}

export async function listFaqReferences() {
  await ensureDatabase();
  return db
    .select({
      id: faqReferences.id,
      groupName: faqReferences.groupName,
      title: faqReferences.title,
      description: faqReferences.description,
      url: faqReferences.url,
      fileName: faqReferences.fileName,
      mimeType: faqReferences.mimeType,
      fileSize: faqReferences.fileSize,
      storageBucket: faqReferences.storageBucket,
      storagePath: faqReferences.storagePath,
      displayOrder: faqReferences.displayOrder,
    })
    .from(faqReferences)
    .orderBy(asc(faqReferences.displayOrder));
}

export async function createFaqEntry(payload: CreateFaqEntryPayload, scope?: AccessScope) {
  await ensureDatabase();
  if (!scope || scope.role !== "DPO") {
    return null;
  }

  const now = new Date().toISOString();
  const [currentOrder] = await db
    .select({
      displayOrder: faqEntries.displayOrder,
    })
    .from(faqEntries)
    .where(eq(faqEntries.categoryId, payload.categoryId))
    .orderBy(desc(faqEntries.displayOrder))
    .limit(1);

  const id = `faq-${crypto.randomUUID()}`;
  await db.insert(faqEntries).values({
    id,
    categoryId: payload.categoryId,
    question: payload.question,
    answer: payload.answer,
    legalBasis: payload.legalBasis?.trim() ?? "",
    benchmarkSupport: payload.benchmarkSupport?.trim() ?? "",
    status: payload.status?.trim() ?? "",
    displayOrder: (currentOrder?.displayOrder ?? 0) + 1,
    createdAt: now,
    updatedAt: now,
    createdBy: scope.userId ?? null,
    updatedBy: scope.userId ?? null,
  });

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope.userId,
    eventType: "faq.created",
    entityType: "faq",
    entityId: id,
    message: `DPO menambahkan FAQ baru: ${payload.question.slice(0, 80)}.`,
    createdAt: now,
  });

  const [created] = await listFaqEntries()
    .then((rows) => rows.filter((row) => row.id === id));

  if (created) {
    await rebuildFaqKnowledgeChunk(created);
  }

  return created ?? null;
}

export async function updateFaqEntry(
  id: string,
  payload: UpdateFaqEntryPayload,
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope || scope.role !== "DPO") {
    return null;
  }

  const [existing] = await db
    .select({
      id: faqEntries.id,
    })
    .from(faqEntries)
    .where(eq(faqEntries.id, id))
    .limit(1);

  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  await db
    .update(faqEntries)
    .set({
      ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
      ...(payload.question ? { question: payload.question } : {}),
      ...(payload.answer ? { answer: payload.answer } : {}),
      ...(typeof payload.legalBasis === "string"
        ? { legalBasis: payload.legalBasis }
        : {}),
      ...(typeof payload.benchmarkSupport === "string"
        ? { benchmarkSupport: payload.benchmarkSupport }
        : {}),
      ...(typeof payload.status === "string" ? { status: payload.status } : {}),
      updatedAt: now,
      updatedBy: scope.userId ?? null,
    })
    .where(eq(faqEntries.id, id));

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope.userId,
    eventType: "faq.updated",
    entityType: "faq",
    entityId: id,
    message: "DPO memperbarui FAQ entry.",
    createdAt: now,
  });

  const [updated] = await listFaqEntries().then((rows) => rows.filter((row) => row.id === id));
  if (updated) {
    await rebuildFaqKnowledgeChunk(updated);
  }

  return updated ?? null;
}

type SopCreatePayload = {
  title: string;
  category: string;
  summary?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageBucket: string;
  storagePath: string;
};

export async function createSopDocumentMetadata(
  payload: SopCreatePayload,
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope || scope.role !== "DPO" || !scope.userId) {
    return null;
  }

  const id = `sop-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await db.insert(sopDocuments).values({
    id,
    title: payload.title,
    category: payload.category,
    summary: payload.summary?.trim() ?? "",
    fileName: payload.fileName,
    mimeType: payload.mimeType,
    fileSize: payload.fileSize,
    storageBucket: payload.storageBucket,
    storagePath: payload.storagePath,
    uploadedBy: scope.userId,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope.userId,
    eventType: "sop.uploaded",
    entityType: "sop",
    entityId: id,
    message: `DPO mengunggah SOP: ${payload.title}.`,
    createdAt: now,
  });

  return getSopDocumentById(id);
}

export async function listSopDocuments(scope?: AccessScope) {
  await ensureDatabase();
  if (!scope) {
    return [];
  }

  return db
    .select({
      id: sopDocuments.id,
      title: sopDocuments.title,
      category: sopDocuments.category,
      summary: sopDocuments.summary,
      fileName: sopDocuments.fileName,
      mimeType: sopDocuments.mimeType,
      fileSize: sopDocuments.fileSize,
      storageBucket: sopDocuments.storageBucket,
      storagePath: sopDocuments.storagePath,
      uploadedBy: sopDocuments.uploadedBy,
      uploadedByName: users.fullName,
      createdAt: sopDocuments.createdAt,
      updatedAt: sopDocuments.updatedAt,
    })
    .from(sopDocuments)
    .leftJoin(users, eq(sopDocuments.uploadedBy, users.id))
    .orderBy(desc(sopDocuments.createdAt));
}

export async function getSopDocumentById(id: string) {
  await ensureDatabase();
  const [row] = await db
    .select({
      id: sopDocuments.id,
      title: sopDocuments.title,
      category: sopDocuments.category,
      summary: sopDocuments.summary,
      fileName: sopDocuments.fileName,
      mimeType: sopDocuments.mimeType,
      fileSize: sopDocuments.fileSize,
      storageBucket: sopDocuments.storageBucket,
      storagePath: sopDocuments.storagePath,
      uploadedBy: sopDocuments.uploadedBy,
      uploadedByName: users.fullName,
      createdAt: sopDocuments.createdAt,
      updatedAt: sopDocuments.updatedAt,
    })
    .from(sopDocuments)
    .leftJoin(users, eq(sopDocuments.uploadedBy, users.id))
    .where(eq(sopDocuments.id, id))
    .limit(1);

  return row ?? null;
}

type FaqKnowledgeRow = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  legalBasis: string;
  benchmarkSupport: string;
  status: string;
};

type SopKnowledgeRow = {
  id: string;
  title: string;
  category: string;
  summary: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

async function replaceKnowledgeChunks(chunks: KnowledgeChunkInput[]) {
  if (!chunks.length) {
    return;
  }

  const now = new Date().toISOString();
  const first = chunks[0];

  await db
    .delete(knowledgeChunks)
    .where(
      and(
        eq(knowledgeChunks.sourceType, first.sourceType),
        eq(knowledgeChunks.sourceId, first.sourceId),
      ),
    );

  await db.insert(knowledgeChunks).values(
    chunks.map((chunk) => ({
      id: chunk.id,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      title: chunk.title,
      content: chunk.content,
      url: chunk.url ?? null,
      metadata: chunk.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

async function rebuildFaqKnowledgeChunk(entry: FaqKnowledgeRow) {
  const content = [
    `Pertanyaan: ${entry.question}`,
    `Jawaban: ${entry.answer}`,
    entry.legalBasis ? `Dasar hukum: ${entry.legalBasis}` : "",
    entry.benchmarkSupport ? `Benchmark/rujukan: ${entry.benchmarkSupport}` : "",
    entry.status ? `Status: ${entry.status}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await replaceKnowledgeChunks([
    {
      id: `knowledge-faq-${entry.id}`,
      sourceType: "FAQ",
      sourceId: entry.id,
      title: entry.question,
      content,
      metadata: {
        categoryId: entry.categoryId,
        status: entry.status || null,
      },
    },
  ]);
}

async function rebuildReferenceKnowledgeChunk(reference: {
  id: string;
  groupName: string;
  title: string;
  description: string;
  url: string;
  storageBucket?: string | null;
  storagePath?: string | null;
}) {
  const extractedText = reference.storageBucket && reference.storagePath
    ? await extractReferenceTextFromStorage(reference.storageBucket, reference.storagePath)
    : await extractReferenceTextFromUrl(reference.url);
  const baseContent = [
    `Referensi: ${reference.title}`,
    `Kelompok: ${reference.groupName}`,
    `Konteks: ${reference.description}`,
    `URL: ${reference.url}`,
    extractedText ? `Isi referensi: ${extractedText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const contentChunks = splitKnowledgeContent(baseContent);

  await replaceKnowledgeChunks(
    (contentChunks.length ? contentChunks : [baseContent]).map((content, index) => ({
      id: `knowledge-reference-${reference.id}-${index + 1}`,
      sourceType: "REFERENCE",
      sourceId: reference.id,
      title: contentChunks.length > 1 ? `${reference.title} (${index + 1})` : reference.title,
      content,
      url: reference.url,
      metadata: {
        groupName: reference.groupName,
        extractionStatus: extractedText ? "extracted" : "metadata_only",
      },
    })),
  );
}

async function extractReferenceTextFromStorage(bucket: string, storagePath: string) {
  try {
    if (bucket === "database") {
      const [reference] = await db
        .select({ fileContentBase64: faqReferences.fileContentBase64 })
        .from(faqReferences)
        .where(eq(faqReferences.id, storagePath))
        .limit(1);

      if (!reference?.fileContentBase64) {
        return "";
      }

      const pdfModule = await import("pdf-parse");
      const pdfParse = (
        "default" in pdfModule ? pdfModule.default : pdfModule
      ) as (input: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(Buffer.from(reference.fileContentBase64, "base64"));
      return String(result.text ?? "").trim();
    }

    let buffer: Buffer;
    if (bucket.startsWith("local:")) {
      buffer = await readOfflineStorageObject(bucket.slice("local:".length), storagePath);
    } else {
      const adminClient = getSupabaseAdminClient();
      const { data, error } = await adminClient.storage.from(bucket).download(storagePath);
      if (error || !data) {
        return "";
      }
      buffer = Buffer.from(await data.arrayBuffer());
    }

    const pdfModule = await import("pdf-parse");
    const pdfParse = (
      "default" in pdfModule ? pdfModule.default : pdfModule
    ) as (input: Buffer) => Promise<{ text?: string }>;
    const result = await pdfParse(buffer);
    return String(result.text ?? "").trim();
  } catch {
    return "";
  }
}

export async function rebuildSopKnowledgeChunks(
  document: SopKnowledgeRow,
  extractedText: string,
  extractionStatus: "extracted" | "metadata_only",
) {
  await ensureDatabase();

  const baseContent = [
    `Judul SOP: ${document.title}`,
    `Kategori: ${document.category}`,
    document.summary ? `Ringkasan: ${document.summary}` : "",
    `Nama file: ${document.fileName}`,
    extractedText ? `Isi SOP: ${extractedText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const contentChunks = splitKnowledgeContent(baseContent);
  await replaceKnowledgeChunks(
    (contentChunks.length ? contentChunks : [baseContent]).map((content, index) => ({
      id: `knowledge-sop-${document.id}-${index + 1}`,
      sourceType: "SOP",
      sourceId: document.id,
      title: contentChunks.length > 1 ? `${document.title} (${index + 1})` : document.title,
      content,
      metadata: {
        category: document.category,
        fileName: document.fileName,
        mimeType: document.mimeType,
        extractionStatus,
      },
    })),
  );
}

export async function syncKnowledgeChunksFromFaqCenter() {
  await ensureDatabase();

  const [entries, references] = await Promise.all([
    listFaqEntries(),
    listFaqReferences(),
  ]);

  for (const entry of entries) {
    await rebuildFaqKnowledgeChunk(entry);
  }

  for (const reference of references) {
    await rebuildReferenceKnowledgeChunk(reference);
  }
}

export async function findRelevantKnowledgeChunks(question: string) {
  await ensureDatabase();

  const [existing] = await db.select({ value: count() }).from(knowledgeChunks);
  if ((existing?.value ?? 0) === 0) {
    await syncKnowledgeChunksFromFaqCenter();
  }

  const rows = await db
    .select({
      id: knowledgeChunks.id,
      sourceType: knowledgeChunks.sourceType,
      sourceId: knowledgeChunks.sourceId,
      title: knowledgeChunks.title,
      content: knowledgeChunks.content,
      url: knowledgeChunks.url,
      metadata: knowledgeChunks.metadata,
    })
    .from(knowledgeChunks);

  return rankKnowledgeChunks(
    question,
    rows.map((row) => ({
      id: row.id,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      title: row.title,
      content: row.content,
      url: row.url,
      metadata: row.metadata,
    })),
  );
}

export async function uploadSopFileToStorage(
  file: File,
  scope?: AccessScope,
) {
  if (!scope || scope.role !== "DPO") {
    return null;
  }

  const bucket = getSopBucketName();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `sop/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
  const payload = Buffer.from(await file.arrayBuffer());

  if (isOfflineRuntime()) {
    await saveOfflineStorageObject(bucket, storagePath, payload);
    return {
      bucket: `local:${bucket}`,
      storagePath,
    };
  }

  const adminClient = getSupabaseAdminClient();

  const { data: buckets } = await adminClient.storage.listBuckets();
  const bucketExists = (buckets ?? []).some((bucketInfo) => bucketInfo.name === bucket);
  if (!bucketExists) {
    const { error: createBucketError } = await adminClient.storage.createBucket(bucket, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ],
    });

    if (createBucketError && !createBucketError.message.toLowerCase().includes("already")) {
      throw new Error(`Gagal membuat bucket SOP: ${createBucketError.message}`);
    }
  }

  const { error } = await adminClient.storage
    .from(bucket)
    .upload(storagePath, payload, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload SOP gagal: ${error.message}`);
  }

  return {
    bucket,
    storagePath,
  };
}

export async function getSopSignedDownloadUrl(id: string, scope?: AccessScope) {
  if (!scope) {
    return null;
  }

  const document = await getSopDocumentById(id);
  if (!document) {
    return null;
  }

  if (document.storageBucket.startsWith("local:")) {
    return {
      url: `/api/sop/${id}/download?file=1`,
      fileName: document.fileName,
      mimeType: document.mimeType,
    };
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from(document.storageBucket)
    .createSignedUrl(document.storagePath, 60 * 5);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Gagal membuat signed URL SOP.");
  }

  return {
    url: data.signedUrl,
    fileName: document.fileName,
    mimeType: document.mimeType,
  };
}

export async function getSopStoredFile(id: string, scope?: AccessScope) {
  if (!scope) {
    return null;
  }

  const document = await getSopDocumentById(id);
  if (!document || !document.storageBucket.startsWith("local:")) {
    return null;
  }

  return {
    bytes: await readOfflineStorageObject(
      document.storageBucket.slice("local:".length),
      document.storagePath,
    ),
    fileName: document.fileName,
    mimeType: document.mimeType,
  };
}

async function ensurePrivateStorageBucket(
  bucket: string,
  allowedMimeTypes: string[],
  fileSizeLimit: number,
) {
  const adminClient = getSupabaseAdminClient();
  const { data: buckets } = await adminClient.storage.listBuckets();
  const bucketExists = (buckets ?? []).some((bucketInfo) => bucketInfo.name === bucket);
  if (bucketExists) {
    return adminClient;
  }

  const { error } = await adminClient.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit,
    allowedMimeTypes,
  });

  if (error && !error.message.toLowerCase().includes("already")) {
    throw new Error(`Gagal membuat bucket ${bucket}: ${error.message}`);
  }

  return adminClient;
}

export async function backfillReferenceDocumentsFromUrls(scope?: AccessScope) {
  await ensureDatabase();
  if (!scope || scope.role !== "DPO") {
    return { updated: 0 };
  }

  const references = await listFaqReferences();
  let updated = 0;

  for (const reference of references) {
    if (reference.storageBucket && reference.storagePath) {
      continue;
    }

    const file = await downloadReferencePdf(reference.url, reference.title);
    if (!file) {
      continue;
    }

    const saved = await saveReferenceDocument(
      {
        title: reference.title,
        groupName: reference.groupName,
        description: reference.description,
        originalUrl: reference.url,
        file,
        existingId: reference.id,
      },
      scope,
    );

    if (saved) {
      updated += 1;
    }
  }

  return { updated };
}

async function downloadReferencePdf(url: string, title: string) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "PrivacyBroReferenceFetcher/1.0" },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "application/pdf";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!contentType.toLowerCase().includes("pdf") && !url.toLowerCase().endsWith(".pdf")) {
      return null;
    }

    return new File([buffer], `${toDepartmentSlug(title) || "reference"}.pdf`, {
      type: "application/pdf",
    });
  } catch {
    return null;
  }
}

type ReferenceDocumentPayload = {
  title: string;
  groupName: string;
  description?: string;
  originalUrl?: string;
  file: File;
  existingId?: string;
};

export async function saveReferenceDocument(
  payload: ReferenceDocumentPayload,
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (!scope || scope.role !== "DPO") {
    return null;
  }

  const fileBuffer = Buffer.from(await payload.file.arrayBuffer());
  let bucket = getReferenceBucketName();
  let storagePath = `references/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.pdf`;
  let fileContentBase64 = "";

  if (isOfflineRuntime()) {
    await saveOfflineStorageObject(bucket, storagePath, fileBuffer);
    bucket = `local:${bucket}`;
  } else {
    try {
    const adminClient = await ensurePrivateStorageBucket(
      bucket,
      ["application/pdf"],
      20 * 1024 * 1024,
    );
    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload referensi gagal: ${uploadError.message}`);
    }
    } catch {
      bucket = "database";
      storagePath = payload.existingId ?? `faq-ref-${crypto.randomUUID()}`;
      fileContentBase64 = fileBuffer.toString("base64");
    }
  }

  const now = new Date().toISOString();
  const id = payload.existingId ?? (bucket === "database" ? storagePath : `faq-ref-${crypto.randomUUID()}`);
  if (bucket === "database") {
    storagePath = id;
  }
  const [currentOrder] = await db
    .select({ displayOrder: faqReferences.displayOrder })
    .from(faqReferences)
    .orderBy(desc(faqReferences.displayOrder))
    .limit(1);

  if (payload.existingId) {
    await db
      .update(faqReferences)
      .set({
        groupName: payload.groupName,
        title: payload.title,
        description: payload.description?.trim() ?? "",
        url: payload.originalUrl ?? "",
        fileName: payload.file.name,
        mimeType: "application/pdf",
        fileSize: payload.file.size,
        storageBucket: bucket,
        storagePath,
        fileContentBase64,
        updatedAt: now,
      })
      .where(eq(faqReferences.id, id));
  } else {
    await db.insert(faqReferences).values({
      id,
      groupName: payload.groupName,
      title: payload.title,
      description: payload.description?.trim() ?? "",
      url: payload.originalUrl ?? "",
      fileName: payload.file.name,
      mimeType: "application/pdf",
      fileSize: payload.file.size,
      storageBucket: bucket,
      storagePath,
      fileContentBase64,
      displayOrder: (currentOrder?.displayOrder ?? 0) + 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [saved] = await listFaqReferences().then((rows) =>
    rows.filter((row) => row.id === id),
  );

  if (saved) {
    await rebuildReferenceKnowledgeChunk(saved);
  }

  return saved ?? null;
}

export async function getReferenceSignedDownloadUrl(id: string, scope?: AccessScope) {
  if (!scope) {
    return null;
  }

  const [reference] = await db
    .select({
      id: faqReferences.id,
      title: faqReferences.title,
      fileName: faqReferences.fileName,
      mimeType: faqReferences.mimeType,
      storageBucket: faqReferences.storageBucket,
      storagePath: faqReferences.storagePath,
      fileContentBase64: faqReferences.fileContentBase64,
    })
    .from(faqReferences)
    .where(eq(faqReferences.id, id))
    .limit(1);

  if (!reference?.storageBucket || !reference.storagePath) {
    return null;
  }

  if (reference.storageBucket === "database" && reference.fileContentBase64) {
    return {
      url: `/api/faq/references/${id}/download?file=1`,
      fileName: reference.fileName || `${reference.title}.pdf`,
      mimeType: reference.mimeType || "application/pdf",
    };
  }

  if (reference.storageBucket.startsWith("local:")) {
    return {
      url: `/api/faq/references/${id}/download?file=1`,
      fileName: reference.fileName || `${reference.title}.pdf`,
      mimeType: reference.mimeType || "application/pdf",
    };
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from(reference.storageBucket)
    .createSignedUrl(reference.storagePath, 60 * 5);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Gagal membuat link referensi.");
  }

  return {
    url: data.signedUrl,
    fileName: reference.fileName || `${reference.title}.pdf`,
    mimeType: reference.mimeType || "application/pdf",
  };
}

export async function getReferenceStoredFile(id: string, scope?: AccessScope) {
  if (!scope) {
    return null;
  }

  const [reference] = await db
    .select({
      id: faqReferences.id,
      title: faqReferences.title,
      fileName: faqReferences.fileName,
      mimeType: faqReferences.mimeType,
      fileContentBase64: faqReferences.fileContentBase64,
      storageBucket: faqReferences.storageBucket,
      storagePath: faqReferences.storagePath,
    })
    .from(faqReferences)
    .where(eq(faqReferences.id, id))
    .limit(1);

  if (
    !reference ||
    (!reference.fileContentBase64 && !reference.storageBucket?.startsWith("local:"))
  ) {
    return null;
  }

  if (reference.storageBucket.startsWith("local:")) {
    return {
      bytes: await readOfflineStorageObject(
        reference.storageBucket.slice("local:".length),
        reference.storagePath ?? "",
      ),
      fileName: reference.fileName || `${reference.title}.pdf`,
      mimeType: reference.mimeType || "application/pdf",
    };
  }

  return {
    bytes: Buffer.from(reference.fileContentBase64, "base64"),
    fileName: reference.fileName || `${reference.title}.pdf`,
    mimeType: reference.mimeType || "application/pdf",
  };
}

export async function getAssessmentById(id: string, scope?: AccessScope) {
  await ensureDatabase();

  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.id, id),
    with: {
      department: true,
      ropa: true,
    },
  });

  if (!assessment) {
    return null;
  }

  if (!hasScopeAccess(scope, assessment.departmentId)) {
    return null;
  }

  return assessment;
}

export async function getAuditEvents(limit = 8, scope?: AccessScope) {
  await ensureDatabase();
  if (scope?.role === "User") {
    return [];
  }

  return db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}

export async function listBreachReports(scope?: AccessScope) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(scope);

  const rows = await db.query.breachReports.findMany({
    where: scopedDepartment
      ? eq(breachReports.departmentId, scopedDepartment)
      : undefined,
    with: {
      department: true,
      reporter: true,
      finalizer: true,
    },
    orderBy: [desc(breachReports.updatedAt)],
  });

  return rows;
}

export async function listSelfAssessments(scope?: AccessScope) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(scope);

  return db.query.selfAssessments.findMany({
    where: scopedDepartment
      ? eq(selfAssessments.departmentId, scopedDepartment)
      : undefined,
    with: {
      department: true,
      creator: true,
      finalizer: true,
    },
    orderBy: [desc(selfAssessments.updatedAt)],
  });
}

export async function getSelfAssessmentById(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const assessment = await db.query.selfAssessments.findFirst({
    where: eq(selfAssessments.id, id),
    with: {
      department: true,
      creator: true,
      finalizer: true,
    },
  });

  if (!assessment) {
    return null;
  }

  if (assessment.departmentId && !hasScopeAccess(scope, assessment.departmentId)) {
    return null;
  }

  return assessment;
}

export async function createSelfAssessment(
  payload: {
    title?: string;
    departmentId: string;
  },
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (isDemoScope(scope)) {
    await createDemoSession(scope.demoSessionId);
  }

  const scopedDepartment = departmentForScope(scope);
  const departmentId = isDemoScope(scope)
    ? await ensureDemoDepartment(scope, payload.departmentId)
    : scopedDepartment || payload.departmentId;

  if (
    scope?.role === "User" &&
    !scope.isDemo &&
    scopedDepartment &&
    scopedDepartment !== payload.departmentId
  ) {
    throw new Error("Forbidden department scope");
  }

  const existing = await db.query.selfAssessments.findFirst({
    where: eq(selfAssessments.departmentId, departmentId),
    with: {
      department: true,
      creator: true,
      finalizer: true,
    },
    orderBy: [desc(selfAssessments.updatedAt)],
  });

  if (existing && hasScopeAccess(scope, existing.departmentId ?? "")) {
    return existing;
  }

  const answers = emptySelfAssessmentAnswers();
  const actionPlan = generateSelfAssessmentActionPlan(
    answers,
    allowedKindsForRole(scope?.role ?? "User"),
  );
  const now = new Date().toISOString();
  const id = `self-${crypto.randomUUID()}`;
  const assessmentNumber = await nextSelfAssessmentNumber();

  await db.insert(selfAssessments).values({
    id,
    assessmentNumber,
    title: payload.title?.trim() || "Draft Self Assessment Kepatuhan PDP",
    departmentId,
    status: "Draft",
    answers,
    actionPlan,
    dataMap: emptySelfAssessmentDataMap(),
    createdBy: scope?.userId ?? null,
    finalizedBy: null,
    finalizedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope?.userId,
    eventType: "self_assessment.created",
    entityType: "self_assessment",
    entityId: id,
    message: `Created self assessment ${assessmentNumber}.`,
    createdAt: now,
  });

  return getSelfAssessmentById(id, scope);
}

export async function updateSelfAssessment(
  id: string,
  payload: {
    title?: string;
    departmentId?: string;
    answers?: SelfAssessmentAnswers;
    actionPlan?: SelfAssessmentActionPlanItem[];
    dataMap?: SelfAssessmentDataMapRow[];
    status?: SelfAssessmentStatus;
  },
  scope?: AccessScope,
) {
  await ensureDatabase();
  const existing = await getSelfAssessmentById(id, scope);

  if (!existing) {
    return null;
  }

  if (payload.status === "Finalized" && scope?.role === "User") {
    throw new Error("Only DPO or Master Admin can finalize self assessments");
  }

  const scopedDepartment = departmentForScope(scope);
  const requestedDepartment = payload.departmentId ?? existing.departmentId ?? "";
  const departmentId = isDemoScope(scope)
    ? await ensureDemoDepartment(scope, requestedDepartment)
    : scopedDepartment || requestedDepartment;

  if (
    scope?.role === "User" &&
    !scope.isDemo &&
    scopedDepartment &&
    requestedDepartment !== scopedDepartment
  ) {
    throw new Error("Forbidden department scope");
  }

  const answers = payload.answers ?? (existing.answers as SelfAssessmentAnswers);
  const actionPlan =
    payload.actionPlan ??
    generateSelfAssessmentActionPlan(answers, allowedKindsForRole(scope?.role ?? "User"));
  const dataMap = payload.dataMap ?? (existing.dataMap as SelfAssessmentDataMapRow[]);
  const nextStatus = payload.status ?? existing.status;
  const now = new Date().toISOString();

  await db
    .update(selfAssessments)
    .set({
      ...(payload.title ? { title: payload.title } : {}),
      ...(departmentId ? { departmentId } : {}),
      answers,
      actionPlan,
      dataMap,
      status: nextStatus,
      finalizedBy:
        nextStatus === "Finalized" ? (scope?.userId ?? existing.finalizedBy) : existing.finalizedBy,
      finalizedAt:
        nextStatus === "Finalized" ? (existing.finalizedAt ?? now) : existing.finalizedAt,
      updatedAt: now,
    })
    .where(eq(selfAssessments.id, id));

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope?.userId,
    eventType:
      nextStatus === "Finalized"
        ? "self_assessment.finalized"
        : nextStatus === "Submitted"
          ? "self_assessment.submitted"
          : "self_assessment.updated",
    entityType: "self_assessment",
    entityId: id,
    message: `Self assessment ${existing.assessmentNumber} updated to ${nextStatus}.`,
    createdAt: now,
  });

  return getSelfAssessmentById(id, scope);
}

export async function uploadSelfAssessmentEvidenceFile(
  assessmentId: string,
  questionId: string,
  file: File,
  scope?: AccessScope,
) {
  await ensureDatabase();
  const assessment = await getSelfAssessmentById(assessmentId, scope);
  if (!assessment) {
    return null;
  }

  const bucket = getSelfAssessmentEvidenceBucketName();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `self-assessment/${assessment.id}/${questionId}/${crypto.randomUUID()}.${extension}`;
  const payload = Buffer.from(await file.arrayBuffer());

  let storageBucket = bucket;
  if (isOfflineRuntime()) {
    await saveOfflineStorageObject(bucket, storagePath, payload);
    storageBucket = `local:${bucket}`;
  } else {
    await ensurePrivateStorageBucket(bucket, [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "image/png",
      "image/jpeg",
    ], 10 * 1024 * 1024);

    const adminClient = getSupabaseAdminClient();
    const { error } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, payload, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload bukti gagal: ${error.message}`);
    }
  }

  const evidence: SelfAssessmentEvidenceFile = {
    id: `evidence-${crypto.randomUUID()}`,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    storageBucket,
    storagePath,
    uploadedAt: new Date().toISOString(),
    uploadedBy: scope?.userId ?? null,
  };

  const answers = {
    ...emptySelfAssessmentAnswers(),
    ...(assessment.answers as SelfAssessmentAnswers),
  };
  const existingAnswer = answers[questionId] ?? {
    answer: "",
    note: "",
    pic: "",
    priority: "",
    evidenceFiles: [],
  };

  answers[questionId] = {
    ...existingAnswer,
    evidenceFiles: [...(existingAnswer.evidenceFiles ?? []), evidence],
  };

  await db
    .update(selfAssessments)
    .set({
      answers,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(selfAssessments.id, assessment.id));

  return evidence;
}

export async function getSelfAssessmentEvidenceSignedUrl(
  assessmentId: string,
  evidenceId: string,
  scope?: AccessScope,
) {
  const assessment = await getSelfAssessmentById(assessmentId, scope);
  if (!assessment) {
    return null;
  }

  const answers = assessment.answers as SelfAssessmentAnswers;
  const evidence = Object.values(answers)
    .flatMap((answer) => answer.evidenceFiles ?? [])
    .find((file) => file.id === evidenceId);

  if (!evidence) {
    return null;
  }

  if (evidence.storageBucket.startsWith("local:")) {
    return {
      url: `/api/self-assessments/${assessmentId}/evidence/${evidenceId}/download?file=1`,
      fileName: evidence.fileName,
      mimeType: evidence.mimeType,
    };
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.storage
    .from(evidence.storageBucket)
    .createSignedUrl(evidence.storagePath, 60 * 5);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Gagal membuat signed URL bukti.");
  }

  return {
    url: data.signedUrl,
    fileName: evidence.fileName,
    mimeType: evidence.mimeType,
  };
}

export async function getSelfAssessmentEvidenceStoredFile(
  assessmentId: string,
  evidenceId: string,
  scope?: AccessScope,
) {
  const assessment = await getSelfAssessmentById(assessmentId, scope);
  if (!assessment) {
    return null;
  }

  const answers = assessment.answers as SelfAssessmentAnswers;
  const evidence = Object.values(answers)
    .flatMap((answer) => answer.evidenceFiles ?? [])
    .find((file) => file.id === evidenceId);

  if (!evidence || !evidence.storageBucket.startsWith("local:")) {
    return null;
  }

  return {
    bytes: await readOfflineStorageObject(
      evidence.storageBucket.slice("local:".length),
      evidence.storagePath,
    ),
    fileName: evidence.fileName,
    mimeType: evidence.mimeType,
  };
}

export async function getSelfAssessmentDashboard(scope?: AccessScope) {
  const rows = await listSelfAssessments(scope);
  const allowedKinds = allowedKindsForRole(scope?.role ?? "User");
  return rows.map((row) => ({
    ...row,
    summary: calculateSelfAssessmentSummary(
      row.answers as SelfAssessmentAnswers,
      allowedKinds,
    ),
  }));
}

export async function getBreachReportById(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const report = await db.query.breachReports.findFirst({
    where: eq(breachReports.id, id),
    with: {
      department: true,
      reporter: true,
      finalizer: true,
    },
  });

  if (!report) {
    return null;
  }

  if (report.departmentId && !hasScopeAccess(scope, report.departmentId)) {
    return null;
  }

  return report;
}

export async function createBreachReport(
  payload: {
    title: string;
    departmentId: string;
    answers: Record<string, string | string[]>;
  },
  scope?: AccessScope,
) {
  await ensureDatabase();
  if (isDemoScope(scope)) {
    await createDemoSession(scope.demoSessionId);
  }

  const scopedDepartment = departmentForScope(scope);
  const departmentId = isDemoScope(scope)
    ? await ensureDemoDepartment(scope, payload.departmentId)
    : scopedDepartment || payload.departmentId;

  if (
    scope?.role === "User" &&
    !scope.isDemo &&
    scopedDepartment &&
    scopedDepartment !== payload.departmentId
  ) {
    throw new Error("Forbidden department scope");
  }

  const now = new Date().toISOString();
  const id = `breach-${crypto.randomUUID()}`;
  const reportNumber = await nextBreachReportNumber();
  const answers = mergeBreachReportAnswers(payload.answers);

  await db.insert(breachReports).values({
    id,
    reportNumber,
    title: payload.title,
    departmentId,
    status: "Draft",
    answers,
    reportedBy: scope?.userId ?? null,
    finalizedBy: null,
    finalizedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope?.userId,
    eventType: "breach_report.created",
    entityType: "breach_report",
    entityId: id,
    message: `Created breach report ${reportNumber}.`,
    createdAt: now,
  });

  return getBreachReportById(id, scope);
}

export async function updateBreachReport(
  id: string,
  payload: {
    title?: string;
    departmentId?: string;
    answers?: Record<string, string | string[]>;
    status?: BreachReportStatus;
  },
  scope?: AccessScope,
) {
  await ensureDatabase();
  const existing = await getBreachReportById(id, scope);

  if (!existing) {
    return null;
  }

  if (existing.status === "Finalized") {
    throw new Error("Finalized report cannot be edited");
  }

  if (payload.status === "Finalized" && scope?.role !== "DPO") {
    throw new Error("Only DPO can finalize breach reports");
  }

  const scopedDepartment = departmentForScope(scope);
  const requestedDepartment = payload.departmentId ?? existing.departmentId ?? "";
  const departmentId = isDemoScope(scope)
    ? await ensureDemoDepartment(scope, requestedDepartment)
    : scopedDepartment || requestedDepartment;

  if (
    scope?.role === "User" &&
    !scope.isDemo &&
    scopedDepartment &&
    requestedDepartment !== scopedDepartment
  ) {
    throw new Error("Forbidden department scope");
  }

  const now = new Date().toISOString();
  const nextStatus = payload.status ?? existing.status;

  await db
    .update(breachReports)
    .set({
      ...(payload.title ? { title: payload.title } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(payload.answers
        ? { answers: mergeBreachReportAnswers(payload.answers) }
        : {}),
      status: nextStatus,
      finalizedBy:
        nextStatus === "Finalized" ? (scope?.userId ?? existing.finalizedBy) : existing.finalizedBy,
      finalizedAt:
        nextStatus === "Finalized" ? (existing.finalizedAt ?? now) : existing.finalizedAt,
      updatedAt: now,
    })
    .where(eq(breachReports.id, id));

  await db.insert(auditEvents).values({
    id: `audit-${crypto.randomUUID()}`,
    actorId: scope?.userId,
    eventType:
      nextStatus === "Finalized"
        ? "breach_report.finalized"
        : nextStatus === "Submitted"
          ? "breach_report.submitted"
          : "breach_report.updated",
    entityType: "breach_report",
    entityId: id,
    message: `Breach report ${existing.reportNumber} updated to ${nextStatus}.`,
    createdAt: now,
  });

  return getBreachReportById(id, scope);
}

export async function getDashboardSummary(scope?: AccessScope) {
  await ensureDatabase();
  const allRopa = await listRopa({}, scope);
  const allTasks = await listTasks(undefined, { scope });
  const riskRegister = await listRiskRegisterEntries(undefined, scope);
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
    recentActivity: await getAuditEvents(4, scope),
    urgentTasks: openTasks.slice(0, 6),
    riskRegister: {
      total: riskRegister.length,
      high: riskRegister.filter((item) => item.riskLevel === "High").length,
      open: riskRegister.filter((item) => item.status === "Open").length,
      closed: riskRegister.filter((item) => item.status === "Closed").length,
      rows: riskRegister,
      references: riskRegister.map((item) => ({
        id: item.id,
        riskId: item.riskId,
        riskDescription: item.riskDescription,
        potentialImpact: item.potentialImpact,
        existingControl: item.existingControl,
        recommendedAction: item.recommendedAction,
        riskOwner: item.riskOwner,
        targetDate: item.targetDate,
        riskLevel: item.riskLevel,
        status: item.status,
      })),
    },
    ropaAnalysis,
    riskDistribution: {
      Low: allRopa.filter((activity) => activity.riskAssessmentLevel === "Low").length,
      Medium: allRopa.filter((activity) => activity.riskAssessmentLevel === "Medium")
        .length,
      High: allRopa.filter((activity) => activity.riskAssessmentLevel === "High").length,
    },
  };
}

export async function createRopa(payload: CreateRopaPayload, scope?: AccessScope) {
  await ensureDatabase();
  if (isDemoScope(scope)) {
    await createDemoSession(scope.demoSessionId);
  }

  const scopedDepartment = departmentForScope(scope);
  const departmentId = isDemoScope(scope)
    ? await ensureDemoDepartment(scope, payload.departmentId)
    : scopedDepartment || payload.departmentId;
  const actorId = scope?.userId ?? payload.userId ?? "user-admin";
  const actorUser = await db.query.users.findFirst({
    where: eq(users.id, actorId),
  });
  const governance = await getGovernanceSettings(scope);
  const resolvedPicName =
    actorUser?.picName?.trim() ||
    actorUser?.fullName?.trim() ||
    payload.picName ||
    "Unassigned PIC";
  const resolvedPicEmail =
    actorUser?.picEmail?.trim() ||
    actorUser?.email?.trim() ||
    payload.picEmail ||
    "unknown@privacyvault.local";
  const resolvedControllerContacts =
    governance?.controllerProcessorContacts?.trim() ||
    payload.controllerProcessorContacts?.trim() ||
    "";
  const resolvedDpoContact =
    governance?.dpoContact?.trim() || payload.dpoContact?.trim() || "";
  if (resolvedControllerContacts.length < 5 || resolvedDpoContact.length < 3) {
    throw new Error("Governance contacts are not configured");
  }
  const hasTransfer = payload.hasTransfer;
  const transferItems = hasTransfer ? normalizeRopaTransferItems(payload) : [];
  const transferSummary = summarizeRopaTransferItems(transferItems);
  const crossBorderTransferItems = groupCrossBorderTransferItemsByCountry(transferItems);
  const normalizedIsCrossBorder = crossBorderTransferItems.length > 0;
  const normalizedTransferPurpose = hasTransfer ? transferSummary.transferPurpose : "";
  const normalizedRecipients = hasTransfer ? transferSummary.recipients : "";
  const normalizedReceiverRole = hasTransfer ? transferSummary.dataReceiverRole : "";
  const normalizedReceiverLocation = hasTransfer ? payload.processorContractLink : "";
  const normalizedTransferMechanism = hasTransfer ? transferSummary.transferMechanism : "";
  const normalizedDestinationCountry = normalizedIsCrossBorder
    ? transferSummary.destinationCountry
    : "";
  const normalizedExportProtection = normalizedIsCrossBorder
    ? transferSummary.exportProtectionMechanism
    : "";
  const now = new Date().toISOString();
  const ropaId = `ropa-${crypto.randomUUID()}`;
  const baseTriggers = analyzeRopa({
    legalBasis: payload.legalBasis,
    isCrossBorder: normalizedIsCrossBorder,
    destinationCountry: normalizedDestinationCountry,
    riskAssessmentLevel: payload.riskAssessmentLevel,
    personalDataTypes: payload.personalDataTypes,
    highRiskCategories: payload.highRiskCategories ?? [],
    volumeLevel: payload.volumeLevel,
    usesAutomatedDecisionMaking: payload.usesAutomatedDecisionMaking,
  }).filter((trigger) => trigger.type !== "TIA");
  const tiaTriggers = crossBorderTransferItems.map((item) => ({
    type: "TIA" as const,
    severity: "Required" as const,
    title: `TIA Review Required - ${item.destinationCountry}`,
    reason: `Cross-border transfer to ${item.destinationCountry} was identified. Review transfer impact, destination risk, and required safeguards.`,
    transfer: item,
  }));
  const triggers = [...baseTriggers, ...tiaTriggers];

  await db.transaction(async (tx) => {
    if (
      scope?.role === "User" &&
      !scope.isDemo &&
      scopedDepartment &&
      scopedDepartment !== payload.departmentId
    ) {
      throw new Error("Forbidden department scope");
    }

    await tx.insert(ropaActivities).values({
      id: ropaId,
      activityName: payload.activityName,
      processDescription: payload.processDescription,
      departmentId,
      picName: resolvedPicName,
      picEmail: resolvedPicEmail,
      controllerProcessorContacts: resolvedControllerContacts,
      dpoContact: resolvedDpoContact,
      legalBasis: payload.legalBasis,
      processingPurpose: payload.processingPurpose,
      transferPurpose: normalizedTransferPurpose,
      sourceMechanism: payload.sourceMechanism,
      subjectCategories: payload.subjectCategories,
      personalDataTypes: payload.personalDataTypes,
      recipients: normalizedRecipients,
      processorContractLink: normalizedReceiverLocation,
      dataReceiverRole: normalizedReceiverRole,
      isCrossBorder: normalizedIsCrossBorder,
      destinationCountry: normalizedDestinationCountry,
      exportProtectionMechanism: normalizedExportProtection,
      transferMechanism: normalizedTransferMechanism,
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
      dataFlowMapping: payload.dataFlowMapping ?? "",
      previousProcess: payload.previousProcess,
      nextProcess: payload.nextProcess,
      status: payload.status ?? "Active",
      userId: actorId,
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
            notes: isTiaTransferTrigger(trigger)
              ? serializeTiaTransferTaskNotes(trigger.transfer)
              : "",
            dueDate: dueDate.toISOString(),
            picName: resolvedPicName,
            departmentId,
            createdAt: new Date(Date.now() + index).toISOString(),
            updatedAt: now,
          };
        }),
      );
    }

    await tx.insert(auditEvents).values({
      id: `audit-${crypto.randomUUID()}`,
      actorId,
      eventType: "ropa.submitted",
      entityType: "ropa",
      entityId: ropaId,
      message: `${resolvedPicName} submitted a new RoPA entry for ${payload.activityName}.`,
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
  scope?: AccessScope,
) {
  await ensureDatabase();
  const existing = await getAssessmentById(id, scope);

  if (!existing) {
    return null;
  }

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

export async function deleteTask(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const task = await getAssessmentById(id, scope);

  if (!task) {
    return false;
  }

  await db.transaction(async (tx) => {
    await tx.delete(auditEvents).where(eq(auditEvents.entityId, id));
    await tx.delete(assessments).where(eq(assessments.id, id));
  });

  return true;
}

export async function deleteRopa(id: string, scope?: AccessScope) {
  await ensureDatabase();
  const activity = await getRopaById(id, scope);

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

export async function getReportSummary(scope?: AccessScope) {
  const summary = await getDashboardSummary(scope);
  const tasks = await listTasks(undefined, { scope });
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

export async function getRegistryStats(scope?: AccessScope) {
  await ensureDatabase();
  const scopedDepartment = departmentForScope(scope);
  const rows = await db
    .select({
      status: ropaActivities.status,
      count: sql<number>`count(*)`,
    })
    .from(ropaActivities)
    .where(scopedDepartment ? eq(ropaActivities.departmentId, scopedDepartment) : undefined)
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

async function nextBreachReportNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const [row] = await db.select({ value: count() }).from(breachReports);
  const sequence = String((row?.value ?? 0) + 1).padStart(4, "0");

  return `BR-${year}-${sequence}`;
}

async function nextSelfAssessmentNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const [row] = await db.select({ value: count() }).from(selfAssessments);
  const sequence = String((row?.value ?? 0) + 1).padStart(4, "0");

  return `SA-${year}-${sequence}`;
}

function mergeBreachReportAnswers(answers: Record<string, string | string[]>) {
  return {
    ...emptyBreachReportAnswers(),
    ...answers,
  };
}

type NormalizedTransferItem = RopaTransferItem;

type TiaTransferTrigger = RuleTrigger & {
  type: "TIA";
  transfer: NormalizedTransferItem;
};

type TiaTransferTaskNotes = {
  kind: "privacyvault.tiaTransfer.v1";
  transfer: NormalizedTransferItem;
};

function normalizeRopaTransferItems(payload: CreateRopaPayload): NormalizedTransferItem[] {
  const sourceItems = payload.transferItems?.length
    ? payload.transferItems
    : [
        {
          transferPurpose: payload.transferPurpose,
          recipients: payload.recipients,
          dataReceiverRole: payload.dataReceiverRole,
          isCrossBorder: payload.isCrossBorder,
          destinationCountry: payload.destinationCountry,
          exportProtectionMechanism: payload.exportProtectionMechanism,
        },
      ];

  return sourceItems
    .map((item) => ({
      transferPurpose: item.transferPurpose.trim(),
      recipients: item.recipients.trim(),
      dataReceiverRole: item.dataReceiverRole.trim(),
      isCrossBorder: Boolean(item.isCrossBorder),
      destinationCountry: item.destinationCountry.trim(),
      exportProtectionMechanism: item.exportProtectionMechanism.trim(),
    }))
    .filter(
      (item) =>
        item.transferPurpose ||
        item.recipients ||
        item.dataReceiverRole ||
        item.destinationCountry ||
        item.exportProtectionMechanism,
    );
}

function summarizeRopaTransferItems(items: NormalizedTransferItem[]) {
  const line = (value: string, index: number) => `Pengiriman ${index + 1}: ${value}`;
  const crossBorderItems = items.filter((item) => item.isCrossBorder);

  return {
    transferPurpose: items
      .map((item, index) => line(item.transferPurpose, index))
      .join("\n"),
    recipients: items.map((item, index) => line(item.recipients, index)).join("\n"),
    dataReceiverRole: items
      .map((item, index) => line(item.dataReceiverRole, index))
      .join("\n"),
    transferMechanism: items
      .map((item, index) => line(item.dataReceiverRole || "Belum ditentukan", index))
      .join("\n"),
    destinationCountry: crossBorderItems
      .map((item, index) => line(item.destinationCountry, index))
      .join("\n"),
    exportProtectionMechanism: crossBorderItems
      .map((item, index) => line(item.exportProtectionMechanism, index))
      .join("\n"),
  };
}

function groupCrossBorderTransferItemsByCountry(items: NormalizedTransferItem[]) {
  const grouped = new Map<string, NormalizedTransferItem>();

  items
    .filter((item) => item.isCrossBorder && item.destinationCountry)
    .forEach((item) => {
      const key = item.destinationCountry.trim().toLowerCase();
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, item);
        return;
      }

      grouped.set(key, {
        ...existing,
        transferPurpose: uniqueNonEmpty([
          ...splitMultilineValue(existing.transferPurpose),
          item.transferPurpose,
        ]).join("; "),
        recipients: uniqueNonEmpty([
          ...splitMultilineValue(existing.recipients),
          item.recipients,
        ]).join("; "),
        dataReceiverRole: uniqueNonEmpty([
          ...splitMultilineValue(existing.dataReceiverRole),
          item.dataReceiverRole,
        ]).join("; "),
        exportProtectionMechanism: uniqueNonEmpty([
          ...splitMultilineValue(existing.exportProtectionMechanism),
          item.exportProtectionMechanism,
        ]).join("; "),
      });
    });

  return [...grouped.values()];
}

function serializeTiaTransferTaskNotes(transfer: NormalizedTransferItem) {
  return JSON.stringify({
    kind: "privacyvault.tiaTransfer.v1",
    transfer,
  } satisfies TiaTransferTaskNotes);
}

function isTiaTransferTrigger(
  trigger: RuleTrigger | TiaTransferTrigger,
): trigger is TiaTransferTrigger {
  return trigger.type === "TIA" && "transfer" in trigger;
}

function splitMultilineValue(value: string) {
  return value
    .split(/[\n;]+/)
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

function mapRiskRegisterRow(
  row: {
    id: string;
    riskId: string;
    riskDescription: string;
    potentialImpact: string;
    existingControl: string;
    riskLevel: "Low" | "Medium" | "High";
    recommendedAction: string;
    riskOwner: string;
    targetDate: string;
    status: "Open" | "In Progress" | "Closed";
    remarks: string;
    sourceAssessmentId: string | null;
    sourceRopaId: string | null;
    departmentId: string | null;
    departmentName: string | null;
    activityName: string;
    createdAt: string;
    updatedAt: string;
  },
) {
  return {
    ...row,
    departmentName: row.departmentName ?? "-",
  };
}

export type RiskRegisterEntry = Awaited<
  ReturnType<typeof listRiskRegisterEntries>
>[number];
