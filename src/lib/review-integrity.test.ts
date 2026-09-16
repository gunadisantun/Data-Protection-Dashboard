import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { AccessScope } from "@/lib/data";
import { emptySelfAssessmentAnswers, getEvidenceStrength, selfAssessmentQuestions } from "@/lib/self-assessment";
import { mergeTrustedAnswers, ReviewConflict } from "@/lib/review-policy";

// Never use DATABASE_URL or resetAndSeedDatabase: these tests own a temporary PGlite DB.
describe("review integrity in an isolated local database", () => {
  let directory: string;
  let client: typeof import("@/db/client");
  let schema: typeof import("@/db/schema");
  let data: typeof import("@/lib/data");
  let review: typeof import("@/lib/self-assessment-review");
  let assessmentId: string;
  const unit: AccessScope = { userId: "qa-user", role: "User", departmentId: "dept-hr" };
  const other: AccessScope = { userId: "qa-other", role: "User", departmentId: "dept-finance" };
  const dpo: AccessScope = { userId: "qa-dpo", role: "DPO", departmentId: "dept-legal" };

  beforeAll(async () => {
    directory = await mkdtemp(path.join(tmpdir(), "privacy-bro-integrity-"));
    vi.stubEnv("PRIVACY_BRO_OFFLINE", "1");
    vi.stubEnv("PRIVACY_BRO_DATA_DIR", directory);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    client = await import("@/db/client");
    schema = await import("@/db/schema");
    data = await import("@/lib/data");
    review = await import("@/lib/self-assessment-review");
    await (await import("@/db/init")).ensureDatabase();
    const now = new Date().toISOString();
    for (const scope of [unit, other, dpo]) {
      await client.db.insert(schema.users).values({ id: scope.userId!, username: scope.userId!, fullName: scope.userId!, email: `${scope.userId}@example.test`, role: scope.role!, departmentId: scope.departmentId, picName: "QA", picEmail: "qa@example.test", createdAt: now });
    }
    assessmentId = (await data.createSelfAssessment({ departmentId: unit.departmentId! }, unit))!.id;
  }, 120000);

  afterAll(async () => {
    await client?.closeQueryClient();
    if (directory) await rm(directory, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });

  it("denies cross-unit and orphan records, including export/revision access", async () => {
    expect(await data.getSelfAssessmentById(assessmentId, other)).toBeNull();
    expect(await review.listSelfAssessmentRevisions(assessmentId, other)).toBeNull();
    await client.db.update(schema.selfAssessments).set({ departmentId: null }).where(eq(schema.selfAssessments.id, assessmentId));
    expect(await data.getSelfAssessmentById(assessmentId, unit)).toBeNull();
    expect(await data.getSelfAssessmentById(assessmentId, dpo)).not.toBeNull();
    await client.db.update(schema.selfAssessments).set({ departmentId: unit.departmentId }).where(eq(schema.selfAssessments.id, assessmentId));
  });

  it("rejects public signup and makes privileged fields server-only", async () => {
    const { auth } = await import("@/lib/auth");
    expect(auth.options.user?.additionalFields?.role.input).toBe(false);
    expect(auth.options.user?.additionalFields?.departmentId.input).toBe(false);
    const response = await auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify({ name: "Intruder", email: "intruder@example.test", password: "Testing-Password-2026", role: "MasterAdmin" }) }));
    expect([400, 403]).toContain(response.status);
    expect(await client.db.select().from(schema.user)).toHaveLength(0);
  }, 30000);

  it("rejects expired and fabricated demo sessions", async () => {
    const { validDemoSession } = await import("@/lib/demo-session");
    const id = crypto.randomUUID();
    expect(await validDemoSession(id)).toBe(false);
    await client.db.insert(schema.demoSessions).values({ id, expiresAt: new Date(Date.now() - 1000).toISOString() });
    expect(await validDemoSession(id)).toBe(false);
    await client.db.update(schema.demoSessions).set({ expiresAt: new Date(Date.now() + 60000).toISOString() }).where(eq(schema.demoSessions.id, id));
    expect(await validDemoSession(id)).toBe(true);
  });

  it("blocks privilege changes through auth and unauthorized assessment APIs", async () => {
    const { auth } = await import("@/lib/auth");
    const { hashPassword } = await import("better-auth/crypto");
    const now = new Date();
    await client.db.insert(schema.user).values({ id: unit.userId!, name: "QA User", email: "qa-user@example.test", emailVerified: true, role: "User", departmentId: unit.departmentId, createdAt: now, updatedAt: now });
    await client.db.insert(schema.account).values({ id: "qa-account", userId: unit.userId!, accountId: unit.userId!, providerId: "credential", password: await hashPassword("Testing-Password-2026"), createdAt: now, updatedAt: now });
    const login = await auth.handler(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify({ email: "qa-user@example.test", password: "Testing-Password-2026" }) }));
    expect(login.ok).toBe(true);
    const cookie = login.headers.getSetCookie().map((item) => item.split(";")[0]).join("; ");
    const headers = { "Content-Type": "application/json", Origin: "http://localhost:3000", Cookie: cookie };
    await auth.handler(new Request("http://localhost:3000/api/auth/update-user", { method: "POST", headers, body: JSON.stringify({ role: "MasterAdmin", departmentId: "dept-finance", name: "QA User" }) }));
    const [stored] = await client.db.select().from(schema.user).where(eq(schema.user.id, unit.userId!));
    expect(stored).toMatchObject({ role: "User", departmentId: "dept-hr" });
    const route = await import("@/app/api/self-assessments/[id]/route");
    const context = { params: Promise.resolve({ id: assessmentId }) };
    expect((await route.GET(new Request("http://localhost:3000/api/self-assessments/x"), context)).status).toBe(401);
    expect((await route.GET(new Request("http://localhost:3000/api/self-assessments/x", { headers }), context)).status).toBe(200);
    const conflict = await route.PATCH(new Request("http://localhost:3000/api/self-assessments/x", { method: "PATCH", headers, body: JSON.stringify({ expectedVersion: 999, title: "Stale draft" }) }), context);
    expect(conflict.status).toBe(409);
    await client.db.update(schema.selfAssessments).set({ departmentId: other.departmentId }).where(eq(schema.selfAssessments.id, assessmentId));
    expect((await route.GET(new Request("http://localhost:3000/api/self-assessments/x", { headers }), context)).status).toBe(404);
    const exportRoute = await import("@/app/api/self-assessments/[id]/export/route");
    expect((await exportRoute.GET(new Request("http://localhost:3000/api/self-assessments/x/export", { headers }), context)).status).toBe(404);
    await client.db.update(schema.selfAssessments).set({ departmentId: unit.departmentId }).where(eq(schema.selfAssessments.id, assessmentId));
  }, 30000);

  it("preserves answers on conflict and treats new uploads as unreviewed", async () => {
    const answers = emptySelfAssessmentAnswers();
    for (const question of selfAssessmentQuestions) answers[question.id] = { ...answers[question.id], answer: "Sudah Ada" };
    expect(selfAssessmentQuestions).toHaveLength(56);
    const saved = await data.updateSelfAssessment(assessmentId, { expectedVersion: 0, answers }, unit);
    expect(saved?.version).toBe(1);
    await expect(data.updateSelfAssessment(assessmentId, { expectedVersion: 0, title: "stale" }, unit)).rejects.toBeInstanceOf(ReviewConflict);
    const id = selfAssessmentQuestions[0].id;
    await data.uploadSelfAssessmentEvidenceFile(assessmentId, id, new File(["proof"], "proof.pdf", { type: "application/pdf" }), unit, 1);
    const uploaded = await data.getSelfAssessmentById(assessmentId, unit);
    expect(getEvidenceStrength(selfAssessmentQuestions[0], uploaded!.answers[id])).toBe("Weak");
    await expect(review.reviewSelfAssessmentEvidence(assessmentId, id, { expectedVersion: 2, status: "Accepted", strength: "Strong", note: "Reviewed" }, unit)).rejects.toThrow("Only DPO");
    const accepted = await review.reviewSelfAssessmentEvidence(assessmentId, id, { expectedVersion: 2, status: "Accepted", strength: "Strong", note: "Reviewed against the stated process" }, dpo);
    expect(getEvidenceStrength(selfAssessmentQuestions[0], accepted!.answers[id])).toBe("Strong");
    const changed = mergeTrustedAnswers(accepted!.answers, { [id]: { ...accepted!.answers[id], note: "Changed process" } });
    expect(getEvidenceStrength(selfAssessmentQuestions[0], changed[id])).toBe("Weak");
    const forged = mergeTrustedAnswers({}, { [id]: accepted!.answers[id] });
    expect(forged[id].evidenceFiles).toHaveLength(0);
    expect(forged[id].evidenceReview).toBeUndefined();
  });

  it("locks finals and preserves exact PDF/metadata when creating a revision", async () => {
    await expect(data.updateSelfAssessment(assessmentId, { expectedVersion: 3, status: "Finalized" }, unit)).rejects.toThrow("Only DPO");
    const finalized = await data.updateSelfAssessment(assessmentId, { expectedVersion: 3, status: "Finalized" }, dpo);
    const snapshot = await review.getFinalRevision(assessmentId, 1, dpo);
    expect(snapshot?.pdfBase64).toBeTruthy();
    await expect(data.updateSelfAssessment(assessmentId, { expectedVersion: 4, answers: {} }, dpo)).rejects.toBeInstanceOf(ReviewConflict);
    await expect(data.uploadSelfAssessmentEvidenceFile(assessmentId, selfAssessmentQuestions[0].id, new File(["x"], "x.pdf"), unit, 4)).rejects.toBeInstanceOf(ReviewConflict);
    const flag = await data.updateSelfAssessment(assessmentId, { ppGuidanceEnabled: true }, unit);
    expect(flag?.version).toBe(4);
    expect(flag?.finalizedAt).toBe(finalized?.finalizedAt);
    const revised = await review.createSelfAssessmentRevision(assessmentId, 4, unit);
    expect(revised).toMatchObject({ id: assessmentId, revision: 2, version: 5, status: "Draft" });
    await data.updateSelfAssessment(assessmentId, { expectedVersion: 5, title: "Revision two" }, unit);
    expect((await review.getFinalRevision(assessmentId, 1, unit))?.pdfBase64).toBe(snapshot?.pdfBase64);
    expect((await review.getFinalRevision(assessmentId, 1, unit))?.snapshot).toEqual(snapshot?.snapshot);
  }, 120000);

  it("scopes and paginates the operational inbox in SQL", async () => {
    const { getOperationalDashboard } = await import("@/lib/operational-dashboard");
    const own = await getOperationalDashboard(unit);
    expect(own.inbox.rows.some((item) => item.id === assessmentId)).toBe(true);
    const outside = await getOperationalDashboard(other);
    expect(outside.inbox.rows).toHaveLength(0);
    const filtered = await getOperationalDashboard(dpo, { inbox: "revision", inboxPage: "9999" });
    expect(filtered.inbox.page).toBe(1);
    expect(filtered.inbox.rows).toHaveLength(1);
  });
});
