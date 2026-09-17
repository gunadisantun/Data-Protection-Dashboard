import { describe, it, expect } from "vitest";
import { PDFParse } from "pdf-parse";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { calculateSelfAssessmentSummary, emptySelfAssessmentAnswers, generateSelfAssessmentActionPlan, getSelfAssessmentValidationIssues, selfAssessmentQuestions } from "./self-assessment";
import { buildReportMetrics, generateSelfAssessmentPdf, type PdfAssessment } from "./self-assessment-pdf";

const fixture = (): PdfAssessment => ({ assessmentNumber: "SA-TEST-001", title: "Test", status: "Draft", createdAt: "2026-09-16", updatedAt: "2026-09-16", department: { name: "Unit ABC" }, answers: emptySelfAssessmentAnswers(), actionPlan: [] });

describe("declaration methodology", () => {
  it("keeps scores, priorities, actions and status independent of uploads and review", () => {
    const input = fixture();
    selfAssessmentQuestions.forEach((q, i) => { input.answers[q.id].answer = (["Sudah Ada", "Dalam Proses", "Belum Ada"] as const)[i % 3]; });
    const summary = calculateSelfAssessmentSummary(input.answers);
    const actions = generateSelfAssessmentActionPlan(input.answers);
    const before = buildReportMetrics(input);
    Object.values(input.answers).forEach(a => {
      a.evidenceFiles = [{ id: "file", fileName: "attachment.pdf", mimeType: "application/pdf", fileSize: 100, storageBucket: "local", storagePath: "test", uploadedAt: "2026-09-16" }];
      a.evidenceReview = { status: "Accepted", strength: "Strong", note: "Reviewed", reviewedBy: "dpo", reviewedAt: "2026-09-16" };
    });
    expect(calculateSelfAssessmentSummary(input.answers)).toEqual(summary);
    expect(generateSelfAssessmentActionPlan(input.answers)).toEqual(actions);
    const after = buildReportMetrics(input);
    expect(after.overallComplianceLevel).toBe(before.overallComplianceLevel);
    expect(after.findings.map(f => [f.question.id, f.priority])).toEqual(before.findings.map(f => [f.question.id, f.priority]));
    expect(after.evidenceGapCount).toBe(0);
    expect(getSelfAssessmentValidationIssues(input.answers)).toEqual([]);
  });
  it("allows all positive declarations without files and requires only N/A reasons", () => {
    const input = fixture();
    Object.values(input.answers).forEach(a => { a.answer = "Sudah Ada"; });
    expect(getSelfAssessmentValidationIssues(input.answers)).toEqual([]);
    expect(buildReportMetrics(input)).toMatchObject({ readinessScore: 100, overallComplianceLevel: "Compliance", evidenceGapCount: 0 });
    expect(generateSelfAssessmentActionPlan(input.answers)).toEqual([]);
    input.answers[selfAssessmentQuestions[0].id].answer = "Tidak Relevan";
    expect(getSelfAssessmentValidationIssues(input.answers)).toHaveLength(1);
    input.answers[selfAssessmentQuestions[0].id].note = "Tidak berlaku pada proses unit ini.";
    expect(getSelfAssessmentValidationIssues(input.answers)).toEqual([]);
    expect(calculateSelfAssessmentSummary(input.answers).applicable).toBe(55);
  });
  for (const scenario of ["empty", "partial", "complete", "long-notes"] as const) {
    it(`renders ${scenario} report without evidence penalties`, async () => {
      const input = fixture();
      input.locale = scenario === "complete" ? "en" : "id";
      Object.values(input.answers).forEach((a, i) => {
        a.answer = scenario === "empty" ? "" : scenario === "complete" ? "Sudah Ada" : (["Sudah Ada", "Dalam Proses", "Belum Ada", "Tidak Relevan"] as const)[i % 4];
        a.note = a.answer === "Tidak Relevan" ? "Tidak berlaku bagi unit." : "";
      });
      if (scenario === "long-notes") input.answers[selfAssessmentQuestions[0].id].note = "Catatan unit untuk klarifikasi proses. ".repeat(150);
      const bytes = await generateSelfAssessmentPdf(input);
      const parser = new PDFParse({ data: bytes });
      const result = await parser.getText();
      await parser.destroy();
      expect(result.text).not.toMatch(/Evidence Gap|Evidence Confidence|Evidence-Verified|Audit Readiness/);
      expect(result.text).toContain("declaration-1.0");
      expect(result.text).toContain(input.locale === "en" ? "Self-Declared Fulfillment Score" : "Skor pemenuhan berdasarkan deklarasi");
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPages().every(p => Math.abs(p.getWidth() - 595.28) < 1 && Math.abs(p.getHeight() - 841.89) < 1)).toBe(true);
      expect(result.pages.filter(p => p.text.includes(input.locale === "en" ? "Executive Summary" : "Ringkasan Eksekutif"))).toHaveLength(2); // contents + one dashboard page
      if (process.env.PDF_QA_OUTPUT) { await mkdir(process.env.PDF_QA_OUTPUT, { recursive: true }); await writeFile(`${process.env.PDF_QA_OUTPUT}/${scenario}.pdf`, bytes); }
    }, 30000);
  }
});
