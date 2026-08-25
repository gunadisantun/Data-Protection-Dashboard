import { describe, expect, it } from "vitest";
import {
  answerOptionsForQuestion,
  normalizeAnswer,
  scoreAnswer,
  type SelfAssessmentQuestion,
} from "@/lib/self-assessment";

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
