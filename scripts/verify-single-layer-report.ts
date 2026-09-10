import { mkdir, writeFile } from "node:fs/promises";
import { generateSelfAssessmentPdf, buildReportMetrics } from "../src/lib/self-assessment-pdf";
import { emptySelfAssessmentAnswers, selfAssessmentQuestions, selfAssessmentControlAnswerValues } from "../src/lib/self-assessment";

async function main() {
  const answers = emptySelfAssessmentAnswers();
  selfAssessmentQuestions.forEach((question, index) => {
    answers[question.id].answer = selfAssessmentControlAnswerValues[index % 4];
    answers[question.id].note = index % 4 === 3 ? "Tidak terdapat proses tersebut pada unit pengujian." : "";
    answers[question.id].pic = "PIC Unit Pengujian";
  });
  const input = { assessmentNumber: "QA-SINGLE-LAYER", title: "Asesmen Kepatuhan PDP", status: "Draft", createdAt: "2026-09-10", updatedAt: "2026-09-10", department: { name: "Unit Pengujian" }, answers, actionPlan: [] };
  const metrics = buildReportMetrics(input);
  const pdf = await generateSelfAssessmentPdf(input);
  await mkdir("outputs/self-assessment-qa", { recursive: true });
  await writeFile("outputs/self-assessment-qa/report.pdf", pdf);
  console.log(JSON.stringify({ controls: metrics.totalControls, applicable: metrics.applicableControls, readiness: metrics.readinessScore, controlGap: metrics.controlGapItems.length, evidenceGap: metrics.evidenceGapCount, bytes: pdf.length }));
}
void main();
