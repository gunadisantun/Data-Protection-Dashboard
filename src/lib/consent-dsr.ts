import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ensureDatabase } from "@/db/init";
import type { AccessScope } from "@/lib/data";
import {
  auditEvents,
  consentEvents,
  consentRecords,
  consentTasks,
  consentTemplates,
  dsrEvents,
  dsrPublicTokens,
  dsrRequests,
  dsrResponseTemplates,
  dsrTasks,
  ropaActivities,
} from "@/db/schema";
import { DSR_REQUEST_TYPES, type DsrRequestType } from "@/lib/dsr-types";

const now = () => new Date().toISOString();
const id = () => randomUUID();
const token = () => randomBytes(32).toString("base64url");
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const subjectReference = () => `SUB-${new Date().getFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;

function scopeCondition(scope: AccessScope) {
  if (scope.role === "MasterAdmin" || scope.role === "DPO") return undefined;
  return scope.departmentId ? eq(dsrRequests.departmentId, scope.departmentId) : sql`false`;
}

function assertDepartment(scope: AccessScope, departmentId?: string | null) {
  if (scope.role === "User" && !scope.isDemo && departmentId !== scope.departmentId) {
    throw new Error("Forbidden department scope");
  }
}

function dueAt(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function listDsrRequests(scope: AccessScope, filters: {
  status?: string;
  requestType?: string;
  overdue?: boolean;
} = {}) {
  await ensureDatabase();
  const conditions = [scopeCondition(scope)];
  if (filters.status) conditions.push(eq(dsrRequests.status, filters.status));
  if (filters.requestType) conditions.push(eq(dsrRequests.requestType, filters.requestType));
  if (filters.overdue) conditions.push(sql`${dsrRequests.dueAt} < ${now()} and ${dsrRequests.status} not in ('Closed', 'Rejected')`);
  return db.select({
    id: dsrRequests.id,
    requestNumber: dsrRequests.requestNumber,
    subjectReference: dsrRequests.subjectReference,
    subjectName: dsrRequests.subjectName,
    subjectEmail: dsrRequests.subjectEmail,
    subjectPhone: dsrRequests.subjectPhone,
    requestType: dsrRequests.requestType,
    departmentId: dsrRequests.departmentId,
    status: dsrRequests.status,
    identityVerificationStatus: dsrRequests.identityVerificationStatus,
    submittedAt: dsrRequests.submittedAt,
    dueAt: dsrRequests.dueAt,
    responseChannel: dsrRequests.responseChannel,
    assignedOwnerId: dsrRequests.assignedOwnerId,
    closedAt: dsrRequests.closedAt,
  }).from(dsrRequests)
    .where(and(...conditions.filter(Boolean) as NonNullable<(typeof conditions)[number]>[]))
    .orderBy(asc(dsrRequests.status), desc(dsrRequests.submittedAt));
}

export async function getDsrDashboardSummary(scope: AccessScope) {
  const rows = await listDsrRequests(scope);
  const active = rows.filter((row) => !["Closed", "Rejected"].includes(row.status));
  return {
    open: active.length,
    dueSoon: active.filter((row) => new Date(row.dueAt).getTime() - Date.now() <= 7 * 86400000 && new Date(row.dueAt).getTime() >= Date.now()).length,
    overdue: active.filter((row) => new Date(row.dueAt).getTime() < Date.now()).length,
    waitingForUnit: active.filter((row) => row.status === "Waiting for Unit").length,
    waitingForSubject: active.filter((row) => row.status === "Waiting for Subject").length,
    closed: rows.filter((row) => row.status === "Closed").length,
    byType: Object.fromEntries(DSR_REQUEST_TYPES.map((type) => [type, rows.filter((row) => row.requestType === type).length])),
  };
}

export async function getDsrRequest(idValue: string, scope: AccessScope) {
  await ensureDatabase();
  const [request] = await db.select().from(dsrRequests)
    .where(and(eq(dsrRequests.id, idValue), scopeCondition(scope)));
  if (!request) return null;
  const [events, tasks] = await Promise.all([
    db.select().from(dsrEvents).where(eq(dsrEvents.requestId, idValue)).orderBy(asc(dsrEvents.timestamp)),
    db.select().from(dsrTasks).where(eq(dsrTasks.requestId, idValue)).orderBy(asc(dsrTasks.createdAt)),
  ]);
  return { request, events, tasks };
}

export async function createDsrRequest(input: {
  subjectReference?: string;
  subjectName: string;
  subjectEmail?: string;
  subjectPhone?: string;
  requestType: string;
  departmentId?: string | null;
  ropaId?: string | null;
  responseChannel: string;
  subjectMessage: string;
  responseLocale?: string;
  createdBy?: string | null;
  dueDays?: number;
}, scope?: AccessScope) {
  await ensureDatabase();
  if (!input.subjectName.trim() || (!input.subjectEmail?.trim() && !input.subjectPhone?.trim()) || !input.responseChannel.trim() || !input.subjectMessage.trim()) {
    throw new Error("Name, email or phone, response channel, and request description are required");
  }
  if (!DSR_REQUEST_TYPES.includes(input.requestType as DsrRequestType)) throw new Error("Invalid request type");
  const departmentId = scope?.isDemo ? scope.departmentId ?? null : input.departmentId ?? null;
  if (scope) assertDepartment(scope, departmentId);
  if (input.ropaId) {
    const [ropa] = await db.select({ departmentId: ropaActivities.departmentId }).from(ropaActivities).where(eq(ropaActivities.id, input.ropaId));
    if (!ropa || (departmentId && ropa.departmentId !== departmentId)) throw new Error("Invalid RoPA scope");
  }
  const timestamp = now();
  const requestId = id();
  const generatedSubjectReference = subjectReference();
  const requestNumber = `DSR-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
  const [created] = await db.insert(dsrRequests).values({
    id: requestId,
    requestNumber,
    subjectReference: generatedSubjectReference,
    subjectName: input.subjectName.trim(),
    subjectEmail: input.subjectEmail?.trim() ?? "",
    subjectPhone: input.subjectPhone?.trim() ?? "",
    requestType: input.requestType,
    departmentId,
    ropaId: input.ropaId ?? null,
    status: "New",
    identityVerificationStatus: "Unverified",
    submittedAt: timestamp,
    dueAt: dueAt(input.dueDays ?? 30),
    responseChannel: input.responseChannel.trim(),
    subjectMessage: input.subjectMessage.trim(),
    responseLocale: input.responseLocale ?? "id",
    createdBy: input.createdBy ?? null,
    updatedAt: timestamp,
  }).returning();
  await db.insert(dsrEvents).values({
    id: id(), requestId, eventType: "Request Submitted", timestamp,
    note: "Request received.", nextStatus: "New", metadata: {}, actorId: input.createdBy ?? null,
  });
  if (input.requestType === "Withdrawal of Consent") await handleConsentWithdrawal({ subjectReference: generatedSubjectReference, subjectEmail: input.subjectEmail, subjectPhone: input.subjectPhone }, requestId, input.createdBy ?? null, departmentId);
  return created;
}

async function handleConsentWithdrawal(identity: { subjectReference: string; subjectEmail?: string; subjectPhone?: string }, requestId: string, actorId: string | null, departmentId: string | null) {
  const matches = await db.select().from(consentRecords).where(and(
    identity.subjectEmail?.trim() ? eq(consentRecords.subjectEmail, identity.subjectEmail.trim()) : identity.subjectPhone?.trim() ? eq(consentRecords.subjectPhone, identity.subjectPhone.trim()) : eq(consentRecords.subjectReference, identity.subjectReference),
    eq(consentRecords.status, "Granted"),
    departmentId ? eq(consentRecords.departmentId, departmentId) : undefined,
  ));
  for (const record of matches) {
    const timestamp = now();
    await db.update(consentRecords).set({ status: "Withdrawn", withdrawnAt: timestamp, updatedAt: timestamp }).where(eq(consentRecords.id, record.id));
    await db.insert(consentEvents).values({ id: id(), consentRecordId: record.id, eventType: "Withdrawn", actorId, eventAt: timestamp, channel: "DSR", note: `Linked to ${requestId}`, metadata: { requestId } });
    await db.insert(consentTasks).values({ id: id(), consentRecordId: record.id, taskType: "Stop processing and review legal basis", departmentId: record.departmentId, supportingOwner: "DPO / Process Owner", status: "Open", note: "Created from DSR withdrawal.", createdAt: timestamp });
    await db.insert(auditEvents).values({ id: id(), actorId, eventType: "CONSENT_WITHDRAWAL_REVIEW", entityType: "ROPA", entityId: record.ropaId, message: "Consent withdrawal requires legal basis review.", createdAt: timestamp });
  }
  await db.insert(dsrTasks).values({ id: id(), requestId, taskType: "Execute consent withdrawal and review processing stop", supportingOwner: "DPO / Process Owner", status: "Open", createdAt: now() });
}

export async function updateDsrRequest(idValue: string, patch: Partial<Pick<typeof dsrRequests.$inferInsert, "status" | "internalNotes" | "responseBody" | "responseLocale" | "departmentId" | "ropaId" | "responseChannel" | "assignedOwnerId">>, scope: AccessScope) {
  await ensureDatabase();
  const current = await getDsrRequest(idValue, scope);
  if (!current) throw new Error("DSR request not found");
  if (scope.role === "User" && ("departmentId" in patch || "assignedOwnerId" in patch)) throw new Error("Only DPO or Master Admin can assign a request");
  if (["Closed", "Rejected"].includes(current.request.status) && patch.status !== current.request.status) {
    if (scope.role !== "DPO" && scope.role !== "MasterAdmin") throw new Error("Closed requests require DPO reopening");
  }
  if (patch.departmentId) assertDepartment(scope, patch.departmentId);
  const timestamp = now();
  await db.update(dsrRequests).set({ ...patch, updatedAt: timestamp }).where(eq(dsrRequests.id, idValue));
  if (patch.status && patch.status !== current.request.status) {
    await db.insert(dsrEvents).values({ id: id(), requestId: idValue, eventType: "Status Changed", actorId: scope.userId ?? null, timestamp, note: "Status updated.", previousStatus: current.request.status, nextStatus: patch.status, metadata: {} });
  }
  await db.insert(auditEvents).values({ id: id(), actorId: scope.userId ?? null, eventType: "DSR_UPDATED", entityType: "DSR_REQUEST", entityId: idValue, message: "DSR request updated.", createdAt: timestamp });
  return getDsrRequest(idValue, scope);
}

export async function verifyDsrRequest(idValue: string, input: { status: "Unverified" | "In Review" | "Verified" | "Rejected"; method?: string; note?: string }, scope: AccessScope) {
  const current = await getDsrRequest(idValue, scope);
  if (!current) throw new Error("DSR request not found");
  const timestamp = now();
  await db.update(dsrRequests).set({ identityVerificationStatus: input.status, verificationMethod: input.method ?? null, verificationNote: input.note ?? "", verifiedAt: input.status === "Verified" ? timestamp : null, verifiedBy: input.status === "Verified" ? scope.userId ?? null : null, status: input.status === "Verified" ? "In Review" : input.status === "Rejected" ? "Rejected" : "Identity Verification", updatedAt: timestamp }).where(eq(dsrRequests.id, idValue));
  await db.insert(dsrEvents).values({ id: id(), requestId: idValue, eventType: "Identity Verification", actorId: scope.userId ?? null, timestamp, note: input.note ?? "", previousStatus: current.request.status, nextStatus: input.status === "Verified" ? "In Review" : input.status === "Rejected" ? "Rejected" : "Identity Verification", metadata: { method: input.method ?? null } });
  return getDsrRequest(idValue, scope);
}

export async function createDsrPublicLink(scope: AccessScope, expiresInDays = 14) {
  await ensureDatabase();
  if (scope.role === "User" && !scope.departmentId) throw new Error("Department is required");
  const raw = token();
  const timestamp = now();
  const expires = new Date(); expires.setDate(expires.getDate() + expiresInDays);
  await db.insert(dsrPublicTokens).values({ id: id(), tokenHash: hashToken(raw), purpose: "intake", expiresAt: expires.toISOString(), createdBy: scope.userId ?? null, createdAt: timestamp });
  return { token: raw, expiresAt: expires.toISOString() };
}

async function getPublicToken(rawToken: string, purpose: string) {
  await ensureDatabase();
  const [record] = await db.select().from(dsrPublicTokens).where(and(eq(dsrPublicTokens.tokenHash, hashToken(rawToken)), eq(dsrPublicTokens.purpose, purpose)));
  if (!record || record.revokedAt || record.usedAt || new Date(record.expiresAt).getTime() < Date.now()) return null;
  return record;
}

export async function submitDsrPublicRequest(rawToken: string, input: Parameters<typeof createDsrRequest>[0]) {
  const tokenRecord = await getPublicToken(rawToken, "intake");
  if (!tokenRecord) throw new Error("Public link expired or already used");
  const request = await createDsrRequest({ ...input, departmentId: null, createdBy: null });
  await db.update(dsrPublicTokens).set({ requestId: request.id, usedAt: now() }).where(eq(dsrPublicTokens.id, tokenRecord.id));
  const statusRaw = token(); const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
  await db.insert(dsrPublicTokens).values({ id: id(), requestId: request.id, tokenHash: hashToken(statusRaw), purpose: "status", expiresAt: expiry.toISOString(), createdAt: now() });
  return { requestNumber: request.requestNumber, statusToken: statusRaw };
}

export async function getPublicDsr(rawToken: string) {
  const record = await getPublicToken(rawToken, "status");
  if (!record?.requestId) return null;
  const [request] = await db.select({ requestNumber: dsrRequests.requestNumber, requestType: dsrRequests.requestType, status: dsrRequests.status, submittedAt: dsrRequests.submittedAt, dueAt: dsrRequests.dueAt, responseBody: dsrRequests.responseBody, responseChannel: dsrRequests.responseChannel }).from(dsrRequests).where(eq(dsrRequests.id, record.requestId));
  return request ?? null;
}

export async function listConsentRecords(scope: AccessScope) {
  await ensureDatabase();
  const conditions = scope.role === "MasterAdmin" || scope.role === "DPO" ? [] : [scope.departmentId ? eq(consentRecords.departmentId, scope.departmentId) : sql`false`];
  return db.select().from(consentRecords).where(and(...conditions)).orderBy(desc(consentRecords.updatedAt));
}

export async function createConsentRecord(input: typeof consentRecords.$inferInsert, scope: AccessScope) {
  await ensureDatabase();
  assertDepartment(scope, input.departmentId);
  const [ropa] = await db.select({ departmentId: ropaActivities.departmentId }).from(ropaActivities).where(eq(ropaActivities.id, input.ropaId));
  if (!ropa || ropa.departmentId !== input.departmentId) throw new Error("RoPA activity is outside department scope");
  if (!(input.subjectName ?? "").trim() || (!(input.subjectEmail ?? "").trim() && !(input.subjectPhone ?? "").trim())) throw new Error("Name, email or phone is required for verification");
  const timestamp = now();
  const [record] = await db.insert(consentRecords).values({ ...input, subjectReference: subjectReference(), id: input.id ?? id(), updatedAt: timestamp }).returning();
  await db.insert(consentEvents).values({ id: id(), consentRecordId: record.id, eventType: "Granted", actorId: scope.userId ?? null, eventAt: timestamp, channel: input.sourceChannel ?? "Manual", note: "Consent recorded.", metadata: {} });
  return record;
}

export async function withdrawConsent(idValue: string, scope: AccessScope) {
  await ensureDatabase();
  const conditions = [eq(consentRecords.id, idValue)];
  if (scope.role === "User") conditions.push(scope.departmentId ? eq(consentRecords.departmentId, scope.departmentId) : sql`false`);
  const [record] = await db.select().from(consentRecords).where(and(...conditions));
  if (!record) throw new Error("Consent record not found");
  const timestamp = now();
  await db.update(consentRecords).set({ status: "Withdrawn", withdrawnAt: timestamp, updatedAt: timestamp }).where(eq(consentRecords.id, idValue));
  await db.insert(consentEvents).values({ id: id(), consentRecordId: idValue, eventType: "Withdrawn", actorId: scope.userId ?? null, eventAt: timestamp, channel: "Manual", note: "Consent withdrawn.", metadata: {} });
  await db.insert(consentTasks).values({ id: id(), consentRecordId: idValue, taskType: "Stop processing and review legal basis", departmentId: record.departmentId, supportingOwner: "DPO / Process Owner", status: "Open", createdAt: timestamp });
  return { ...record, status: "Withdrawn", withdrawnAt: timestamp };
}

export async function listConsentTemplates(scope: AccessScope) {
  await ensureDatabase();
  const conditions = scope.role === "MasterAdmin" || scope.role === "DPO" ? [] : [scope.departmentId ? eq(consentTemplates.departmentId, scope.departmentId) : sql`false`];
  return db.select().from(consentTemplates).where(and(...conditions)).orderBy(desc(consentTemplates.updatedAt));
}

export async function createConsentTemplate(input: typeof consentTemplates.$inferInsert, scope: AccessScope) {
  await ensureDatabase();
  assertDepartment(scope, input.departmentId);
  const timestamp = now();
  const [record] = await db.insert(consentTemplates).values({ ...input, id: input.id ?? id(), createdAt: timestamp, updatedAt: timestamp, createdBy: scope.userId ?? null }).returning();
  return record;
}

export async function listDsrTemplates(scope: AccessScope) {
  await ensureDatabase();
  if (scope.role !== "MasterAdmin" && scope.role !== "DPO") return [];
  return db.select().from(dsrResponseTemplates).orderBy(asc(dsrResponseTemplates.requestType), desc(dsrResponseTemplates.version));
}

export async function createDsrTemplate(input: typeof dsrResponseTemplates.$inferInsert, scope: AccessScope) {
  await ensureDatabase();
  if (scope.role !== "MasterAdmin" && scope.role !== "DPO") throw new Error("Forbidden");
  const timestamp = now();
  const [record] = await db.insert(dsrResponseTemplates).values({ ...input, id: input.id ?? id(), createdBy: scope.userId ?? null, createdAt: timestamp, updatedAt: timestamp }).returning();
  return record;
}

export async function updateDsrTask(taskId: string, patch: Partial<typeof dsrTasks.$inferInsert>, scope: AccessScope) {
  await ensureDatabase();
  const [task] = await db.select({ task: dsrTasks, request: dsrRequests }).from(dsrTasks).innerJoin(dsrRequests, eq(dsrTasks.requestId, dsrRequests.id)).where(and(eq(dsrTasks.id, taskId), scopeCondition(scope)));
  if (!task) throw new Error("DSR task not found");
  await db.update(dsrTasks).set({ ...patch, completedAt: patch.status === "Completed" ? now() : patch.completedAt }).where(eq(dsrTasks.id, taskId));
  return db.select().from(dsrTasks).where(eq(dsrTasks.id, taskId));
}
