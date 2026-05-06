import { describe, expect, it } from "vitest";
import { analyzeRopa } from "@/lib/rule-engine";
import type { RuleInput } from "@/lib/types";

const baseInput: RuleInput = {
  legalBasis: "Consent",
  isCrossBorder: false,
  destinationCountry: "",
  riskAssessmentLevel: "Low",
  personalDataTypes: ["Contact Details"],
  volumeLevel: "Small",
  usesAutomatedDecisionMaking: false,
};

describe("analyzeRopa", () => {
  it("returns no trigger for low-risk domestic consent processing", () => {
    expect(analyzeRopa(baseInput)).toEqual([]);
  });

  it("triggers LIA for legitimate interest", () => {
    expect(
      analyzeRopa({ ...baseInput, legalBasis: "Legitimate Interest" }).map(
        (trigger) => trigger.type,
      ),
    ).toEqual(["LIA"]);
  });

  it("triggers TIA for cross-border transfer", () => {
    expect(
      analyzeRopa({
        ...baseInput,
        isCrossBorder: true,
        destinationCountry: "Singapore",
      }).map((trigger) => trigger.type),
    ).toEqual(["TIA"]);
  });

  it("triggers DPIA for high risk and sensitive data", () => {
    expect(
      analyzeRopa({
        ...baseInput,
        riskAssessmentLevel: "High",
        personalDataTypes: ["Geolocation", "Financial"],
      }).map((trigger) => trigger.type),
    ).toEqual(["DPIA"]);
  });

  it("triggers DPIA for Pasal 34 high-risk checklist categories", () => {
    const triggers = analyzeRopa({
      ...baseInput,
      highRiskCategories: ["new-technology"],
    });

    expect(triggers.map((trigger) => trigger.type)).toEqual(["DPIA"]);
    expect(triggers[0]?.reason).toContain("Teknologi baru");
  });

  it("can combine DPIA, TIA, and LIA obligations", () => {
    expect(
      analyzeRopa({
        ...baseInput,
        legalBasis: "Legitimate Interest",
        isCrossBorder: true,
        destinationCountry: "USA",
        riskAssessmentLevel: "High",
        usesAutomatedDecisionMaking: true,
      }).map((trigger) => trigger.type),
    ).toEqual(["LIA", "TIA", "DPIA"]);
  });
});
