import data from "@/lib/self-assessment-pp-guidance.json";
import type { SelfAssessmentQuestion } from "@/lib/self-assessment";

export const ppGuidanceSourceWorkbook = data.sourceWorkbook;
export const ppGuidanceArticles = data.articles;

// Mapping is by UU article in the workbook, not an inferred paragraph-level match.
export function getControlPpGuidance(question: SelfAssessmentQuestion) {
  const uuArticle = Number(question.reference.match(/^Pasal\s+(\d+)/)?.[1]);
  return {
    articles: ppGuidanceArticles
      .filter((article) => article.mappedUuQuestionIds.includes(question.id))
      .map((article) => ({ ...article, mappingNotes: article.mappingNotes.filter((note) => note.uuArticle === uuArticle) })),
    unmappedNote: data.unmapped.find((row) => row.uuArticle === uuArticle)?.note ?? null,
  };
}
