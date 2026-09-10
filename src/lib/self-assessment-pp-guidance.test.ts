import { describe, expect, it } from "vitest";
import { getControlPpGuidance, ppGuidanceArticles } from "@/lib/self-assessment-pp-guidance";
import { calculateSelfAssessmentSummary, emptySelfAssessmentAnswers, generateSelfAssessmentActionPlan, getSelfAssessmentValidationIssues, selfAssessmentQuestions } from "@/lib/self-assessment";
import { buildReportMetrics } from "@/lib/self-assessment-pdf";
import { selfAssessmentUpdateSchema } from "@/lib/validators";

describe("PP guidance is a reference, never another assessment layer", () => {
  it("imports unique source articles and preserves forward-filled UU mapping", () => {
    expect(ppGuidanceArticles).toHaveLength(162);
    expect(new Set(ppGuidanceArticles.map((article) => article.number)).size).toBe(162);
    expect(ppGuidanceArticles.reduce((sum, article) => sum + article.mappingNotes.length, 0)).toBe(222);
    expect(getControlPpGuidance(selfAssessmentQuestions[0]).articles.map((article) => article.number)).toEqual([61, 62, 63, 64, 65, 66]);
    for (const article of ppGuidanceArticles) {
      expect(article.articleText).toMatch(new RegExp(`^Pasal ${article.number}\\b`));
      expect(article).not.toHaveProperty("answerOptions");
      expect(article).not.toHaveProperty("question");
      expect(article).not.toHaveProperty("suggestedRemediation");
      for (const id of article.mappedUuQuestionIds) expect(selfAssessmentQuestions.some((q) => q.id === id)).toBe(true);
      for (const note of article.mappingNotes) expect(note.sourceRow).toBeGreaterThan(1);
      for (const doc of article.documentReferences) {
        expect(doc.name).toBeTruthy();
        expect(doc.sourceRows.length).toBeGreaterThan(0);
      }
    }
  });

  it("only shows mapping notes for the selected UU article and does not invent missing guidance", () => {
    for (const control of selfAssessmentQuestions) {
      const uuNumber = Number(control.reference.match(/^Pasal\s+(\d+)/)?.[1]);
      for (const article of getControlPpGuidance(control).articles) {
        expect(article.mappingNotes.every((note) => note.uuArticle === uuNumber)).toBe(true);
      }
    }
    const article66 = selfAssessmentQuestions.at(-1)!;
    expect(getControlPpGuidance(article66).articles).toEqual([]);
    expect(getControlPpGuidance(article66).unmappedNote).toContain("Tetap pada tingkat UU");
  });

  it("keeps scoring, action plan, validation and report strictly UU-only", () => {
    const answers = emptySelfAssessmentAnswers();
    selfAssessmentQuestions.forEach((q, index) => { answers[q.id].answer = index < 28 ? "Sudah Ada" : "Dalam Proses"; });
    const reportData = { assessmentNumber: "TEST", title: "Test", status: "Draft" as const, createdAt: "2026-09-10", updatedAt: "2026-09-10", answers, actionPlan: [] };
    const before = { summary: calculateSelfAssessmentSummary(answers), actions: generateSelfAssessmentActionPlan(answers), validation: getSelfAssessmentValidationIssues(answers), report: buildReportMetrics(reportData) };
    // Even an old or injected PP answer cannot enter the UU scoring set.
    for (const article of ppGuidanceArticles) answers[article.id] = { answer: "Belum Ada", note: "", pic: "", priority: "" };
    selfAssessmentQuestions.forEach(getControlPpGuidance);
    expect(calculateSelfAssessmentSummary(answers)).toEqual(before.summary);
    expect(before.summary).toMatchObject({ totalQuestions: 56, percentage: 0.75 });
    expect(generateSelfAssessmentActionPlan(answers)).toEqual(before.actions);
    expect(getSelfAssessmentValidationIssues(answers)).toEqual(before.validation);
    expect({ ...buildReportMetrics(reportData), generatedAt: before.report.generatedAt }).toEqual(before.report);
  });

  it("accepts an independent optional guidance preference without answers or workflow fields", () => {
    expect(selfAssessmentUpdateSchema.parse({ ppGuidanceEnabled: true })).toEqual({ ppGuidanceEnabled: true });
    expect(selfAssessmentUpdateSchema.parse({ ppGuidanceEnabled: false })).toEqual({ ppGuidanceEnabled: false });
    expect(selfAssessmentUpdateSchema.safeParse({ ppGuidanceEnabled: "true" }).success).toBe(false);
    expect(selfAssessmentUpdateSchema.parse({})).not.toHaveProperty("ppGuidanceEnabled");
  });
});
