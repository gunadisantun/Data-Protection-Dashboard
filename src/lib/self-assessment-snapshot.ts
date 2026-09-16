import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { selfAssessmentRevisions } from "@/db/schema";
import { generateSelfAssessmentPdf, buildReportMetrics } from "@/lib/self-assessment-pdf";
import { selfAssessmentQuestions, selfAssessmentTemplateVersion } from "@/lib/self-assessment";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type SnapshotInput = Parameters<typeof generateSelfAssessmentPdf>[0] & { id: string; revision: number };

export async function captureFinalRevision(tx: Transaction, input: SnapshotInput, legacy = false) {
  const [existing] = await tx.select().from(selfAssessmentRevisions).where(and(eq(selfAssessmentRevisions.assessmentId, input.id), eq(selfAssessmentRevisions.revision, input.revision))).limit(1);
  if (existing) return existing;
  const pdf = await generateSelfAssessmentPdf(input);
  const [saved] = await tx.insert(selfAssessmentRevisions).values({
    id: `revision-${crypto.randomUUID()}`, assessmentId: input.id, revision: input.revision,
    finalizedAt: input.finalizedAt ?? input.updatedAt,
    snapshot: { ...input, questions: selfAssessmentQuestions, templateVersion: selfAssessmentTemplateVersion, metrics: buildReportMetrics(input), legacyCapture: legacy },
    pdfBase64: pdf.toString("base64"),
  }).returning();
  return saved;
}
