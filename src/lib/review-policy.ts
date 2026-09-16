import type { SelfAssessmentAnswers, SelfAssessmentStatus } from "@/lib/self-assessment";

export class ReviewConflict extends Error {}

export function requireEditable(status: SelfAssessmentStatus) {
  if (status === "Finalized") throw new ReviewConflict("Finalized self assessment cannot be edited. Create a revision first.");
}

export function requireVersion(current: number, expected: number | undefined) {
  if (expected === undefined || current !== expected) throw new ReviewConflict("Assessment changed. Reload the latest version before saving.");
}

export function mergeTrustedAnswers(current: SelfAssessmentAnswers, incoming?: SelfAssessmentAnswers): SelfAssessmentAnswers {
  const merged = { ...current };
  for (const [id, state] of Object.entries(incoming ?? {})) {
    const previous = current[id];
    merged[id] = {
      answer: state.answer, note: state.note, pic: state.pic, priority: state.priority,
      evidenceFiles: previous?.evidenceFiles ?? [],
      evidenceReview: previous?.answer === state.answer && previous?.note === state.note ? previous.evidenceReview : undefined,
    };
  }
  return merged;
}
