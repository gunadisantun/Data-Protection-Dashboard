import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents, selfAssessments, selfAssessmentRevisions } from "@/db/schema";
import { getSelfAssessmentById, type AccessScope } from "@/lib/data";
import { captureFinalRevision } from "@/lib/self-assessment-snapshot";
import { requireEditable, requireVersion, ReviewConflict } from "@/lib/review-policy";
import type { SelfAssessmentAnswers, SelfAssessmentActionPlanItem, SelfAssessmentAnswerState } from "@/lib/self-assessment";

export async function listSelfAssessmentRevisions(id: string, scope: AccessScope) {
  if (!await getSelfAssessmentById(id, scope)) return null;
  return db.select({ revision: selfAssessmentRevisions.revision, finalizedAt: selfAssessmentRevisions.finalizedAt }).from(selfAssessmentRevisions).where(eq(selfAssessmentRevisions.assessmentId, id)).orderBy(desc(selfAssessmentRevisions.revision));
}

export async function getFinalRevision(id: string, revision: number, scope: AccessScope) {
  const assessment = await getSelfAssessmentById(id, scope);
  if (!assessment) return null;
  const [record] = await db.select().from(selfAssessmentRevisions).where(and(eq(selfAssessmentRevisions.assessmentId, id), eq(selfAssessmentRevisions.revision, revision))).limit(1);
  if (record) return record;
  if (assessment.status !== "Finalized" || assessment.revision !== revision) return null;
  return db.transaction(async (tx) => {
    // Capture pre-upgrade finals once, explicitly marked as legacy snapshots.
    await tx.select({ id: selfAssessments.id }).from(selfAssessments).where(eq(selfAssessments.id, id)).for("update");
    return captureFinalRevision(tx, { ...assessment, answers: assessment.answers as SelfAssessmentAnswers, actionPlan: assessment.actionPlan as SelfAssessmentActionPlanItem[] }, true);
  });
}

export async function createSelfAssessmentRevision(id: string, expectedVersion: number, scope: AccessScope) {
  const assessment = await getSelfAssessmentById(id, scope);
  if (!assessment) return null;
  requireVersion(assessment.version, expectedVersion);
  if (assessment.status !== "Finalized") throw new ReviewConflict("Only finalized assessments can start a revision.");
  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(selfAssessments).where(eq(selfAssessments.id, id)).for("update");
    requireVersion(locked.version, expectedVersion);
    await captureFinalRevision(tx, { ...assessment, answers: assessment.answers as SelfAssessmentAnswers, actionPlan: assessment.actionPlan as SelfAssessmentActionPlanItem[] }, true);
    await tx.update(selfAssessments).set({ status: "Draft", revision: assessment.revision + 1, version: assessment.version + 1, finalizedAt: null, finalizedBy: null, updatedAt: new Date().toISOString() }).where(eq(selfAssessments.id, id));
    await tx.insert(auditEvents).values({ id: `audit-${crypto.randomUUID()}`, actorId: scope.userId, eventType: "self_assessment.revision_created", entityType: "self_assessment", entityId: id, message: `Revision ${assessment.revision + 1} created; final revision ${assessment.revision} retained.`, createdAt: new Date().toISOString() });
  });
  return getSelfAssessmentById(id, scope);
}

export async function reviewSelfAssessmentEvidence(id: string, questionId: string, input: { expectedVersion: number; status: "NeedsChanges" | "Accepted"; strength: "Weak" | "Adequate" | "Strong"; note: string }, scope: AccessScope) {
  if (scope.role === "User" || !scope.userId) throw new Error("Only DPO or Master Admin can review evidence");
  const assessment = await getSelfAssessmentById(id, scope);
  if (!assessment) return null;
  requireEditable(assessment.status);
  requireVersion(assessment.version, input.expectedVersion);
  const answers = assessment.answers as SelfAssessmentAnswers;
  const answer = answers[questionId];
  if (!answer?.evidenceFiles?.length) throw new Error("Upload evidence before requesting review");
  const review: SelfAssessmentAnswerState["evidenceReview"] = { status: input.status, strength: input.status === "NeedsChanges" ? "Weak" : input.strength, note: input.note, reviewedBy: scope.userId, reviewedAt: new Date().toISOString() };
  await db.transaction(async (tx) => {
    const [updated] = await tx.update(selfAssessments).set({ answers: { ...answers, [questionId]: { ...answer, evidenceReview: review } }, version: assessment.version + 1, updatedAt: review.reviewedAt }).where(and(eq(selfAssessments.id, id), eq(selfAssessments.version, input.expectedVersion))).returning();
    if (!updated) throw new ReviewConflict("Assessment changed. Reload before reviewing.");
    await tx.insert(auditEvents).values({ id: `audit-${crypto.randomUUID()}`, actorId: scope.userId, eventType: "self_assessment.evidence_reviewed", entityType: "self_assessment", entityId: id, message: `${questionId}: ${input.status}. ${input.note}`, createdAt: review.reviewedAt });
  });
  return getSelfAssessmentById(id, scope);
}
