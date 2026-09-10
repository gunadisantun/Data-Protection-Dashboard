import { describe, expect, it } from "vitest";
import {
  answerOptionsForQuestion,
  normalizeAnswer,
  scoreAnswer,
  selfAssessmentQuestions,
  selfAssessmentControlAnswerValues,
  emptySelfAssessmentAnswers,
  calculateSelfAssessmentSummary,
  generateSelfAssessmentActionPlan,
  getSelfAssessmentValidationIssues,
  isSelfAssessmentQuestionApplicable,
  isScoredSelfAssessmentQuestion,
  type SelfAssessmentQuestion,
} from "@/lib/self-assessment";
import { buildReportMetrics } from "@/lib/self-assessment-pdf";

const baseQuestion: SelfAssessmentQuestion = {
  id: "test-l2",
  kind: "ADDITIONAL",
  level: "L2",
  number: 1,
  triggerOrOwner: "M01",
  area: "M01 - Test",
  question: "Apakah kontrol tersedia?",
  applicability: "",
  evidence: "",
  reference: "",
};

describe("self-assessment closed-answer scoring", () => {
  it("scores L2 closed answers without maturity levels", () => {
    expect(scoreAnswer("Ada")).toBe(1);
    expect(scoreAnswer("Ya")).toBe(1);
    expect(scoreAnswer("Sebagian")).toBe(0.5);
    expect(scoreAnswer("Tidak Ada")).toBe(0);
    expect(scoreAnswer("Tidak")).toBe(0);
    expect(scoreAnswer("Tidak Tahu")).toBe(0);
    expect(scoreAnswer("Tidak Relevan")).toBeNull();
    expect(scoreAnswer("N/A")).toBeNull();
  });

  it("normalizes legacy 0-5 answers for saved drafts without exposing them", () => {
    expect(normalizeAnswer("0 - Not Implemented")).toBe("GAP");
    expect(normalizeAnswer("1 - Initial")).toBe("PARTIAL");
    expect(normalizeAnswer("2 - Partial")).toBe("PARTIAL");
    expect(normalizeAnswer("3 - Implemented")).toBe("COMPLIANT");
    expect(normalizeAnswer("4 - Managed")).toBe("COMPLIANT");
    expect(normalizeAnswer("5 - Optimized")).toBe("COMPLIANT");

    expect(scoreAnswer("1 - Initial")).toBe(0.5);
    expect(scoreAnswer("5 - Optimized")).toBe(1);
  });

  it("filters legacy answer options from question metadata", () => {
    expect(
      answerOptionsForQuestion({
        ...baseQuestion,
        answerOptions: [
          "0 - Not Implemented",
          "Ada",
          "Sebagian",
          "5 - Optimized",
          "Tidak Ada",
        ],
      }),
    ).toEqual(["Ada", "Sebagian", "Tidak Ada"]);
  });
});

describe("controller workbook single-layer assessment", () => {
  it("loads all 56 controls in source order, including processor controls and article 66", () => {
    expect(selfAssessmentQuestions).toHaveLength(56);
    expect(new Set(selfAssessmentQuestions.map((question) => question.id)).size).toBe(56);
    expect(new Set(selfAssessmentQuestions.map((question) => question.area)).size).toBe(7);
    expect(selfAssessmentQuestions[0]).toMatchObject({ reference: "Pasal 5", sourceRow: 6 });
    expect(selfAssessmentQuestions.at(-1)).toMatchObject({ reference: "Pasal 66", sourceRow: 67 });
    expect(selfAssessmentQuestions.filter((question) => question.reference.startsWith("Pasal 51"))).toHaveLength(2);
    for (const question of selfAssessmentQuestions) {
      expect(isSelfAssessmentQuestionApplicable(question, {})).toBe(true);
      expect(isScoredSelfAssessmentQuestion(question)).toBe(true);
      expect(answerOptionsForQuestion(question)).toEqual(selfAssessmentControlAnswerValues);
      expect(question.articleText).toBeTruthy();
      expect(question.objective).toBeTruthy();
      expect(question).not.toHaveProperty("triggerQuestionIds");
    }
  });

  it("starts blank and never imports source auditee responses", () => {
    const answers = emptySelfAssessmentAnswers();
    expect(Object.values(answers).every((state) => state.answer === "" && state.note === "" && state.pic === "" && !state.evidenceFiles?.length)).toBe(true);
    expect(calculateSelfAssessmentSummary(answers).totalQuestions).toBe(56);
    expect(calculateSelfAssessmentSummary(answers).gaps).toBe(0);
    expect(calculateSelfAssessmentSummary(answers).clarification).toBe(56);
    expect(getSelfAssessmentValidationIssues(answers)).toHaveLength(56);
  });

  it("normalizes workbook statuses without changing declared answers", () => {
    expect(normalizeAnswer("Sudah Ada")).toBe("COMPLIANT");
    expect(scoreAnswer("Sudah Ada")).toBe(1);
    expect(scoreAnswer("Dalam Proses")).toBe(0.5);
    expect(scoreAnswer("Belum Ada")).toBe(0);
  });

  it("keeps dashboard and report counts consistent and separates control/evidence gaps", () => {
    const answers = emptySelfAssessmentAnswers();
    selfAssessmentQuestions.forEach((question, index) => {
      answers[question.id].answer = selfAssessmentControlAnswerValues[index % 4];
      answers[question.id].note = index % 4 === 3 ? "Proses ini tidak dijalankan oleh unit." : "";
    });
    const summary = calculateSelfAssessmentSummary(answers);
    const report = buildReportMetrics({ assessmentNumber: "TEST", title: "Test", status: "Draft", createdAt: "2026-09-10", updatedAt: "2026-09-10", answers, actionPlan: [] });
    expect(summary).toMatchObject({ applicable: 42, percentage: 0.5, gaps: 14, partial: 14, clarification: 0 });
    expect(report).toMatchObject({ applicableControls: 42, totalControls: 56, readinessScore: 50, evidenceGapCount: 28, evidenceConfidence: 0 });
    expect(report.controlGapItems).toHaveLength(summary.gaps);
    expect(report.partialItems).toHaveLength(summary.partial);
    expect(getSelfAssessmentValidationIssues(answers)).toEqual([]);
    expect(generateSelfAssessmentActionPlan(answers)).toHaveLength(28);
    for (const finding of report.consolidatedFindings) {
      expect(finding.items).toHaveLength(1);
      expect(finding.template.issue).toBe(finding.items[0].question.question);
      expect(finding.template.recommendation).toBe(finding.items[0].question.suggestedRemediation);
    }
    const na = selfAssessmentQuestions[3];
    answers[na.id].note = "";
    expect(calculateSelfAssessmentSummary(answers)).toMatchObject({ applicable: 43, clarification: 1 });
  });

  it("does not count archived L1/L2 answers or accept their options for new controls", () => {
    const answers = emptySelfAssessmentAnswers();
    answers["M01-01"] = { answer: "Ada", note: "Legacy evidence", pic: "", priority: "" };
    expect(calculateSelfAssessmentSummary(answers).answered).toBe(0);
    answers[selfAssessmentQuestions[0].id].answer = "Ada";
    expect(getSelfAssessmentValidationIssues(answers)[0].message).toContain("pilih status");
  });
});
