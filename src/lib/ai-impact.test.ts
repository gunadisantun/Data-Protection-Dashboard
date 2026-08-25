import { describe, expect, it } from "vitest";
import {
  buildDefaultFriaItems,
  calculateFinalDecision,
  calculateFriaCompletion,
  calculateFriaStatus,
  calculateInherentScore,
  calculateResidualScore,
  riskLevelFromScore,
  type AiImpactDomain,
} from "@/lib/ai-impact";

function domain(overrides: Partial<AiImpactDomain>): AiImpactDomain {
  return {
    id: "privacy-data-protection",
    domain: "Privacy and data protection",
    potentialNegativeImpact: "",
    affectedPersonGroup: "",
    severity: null,
    likelihood: null,
    inherentScore: null,
    existingControls: "",
    controlEffectiveness: 0,
    residualScore: null,
    residualRiskLevel: "",
    furtherAction: "",
    owner: "",
    status: "Not Started",
    ...overrides,
  };
}

describe("AI impact assessment scoring", () => {
  it("calculates inherent and residual scores", () => {
    expect(calculateInherentScore(5, 4)).toBe(20);
    expect(calculateResidualScore(20, 0.5)).toBe(10);
  });

  it("maps a 5x5 score to a risk level", () => {
    expect(riskLevelFromScore(2)).toBe("Low");
    expect(riskLevelFromScore(8)).toBe("Medium");
    expect(riskLevelFromScore(12)).toBe("High");
    expect(riskLevelFromScore(20)).toBe("Critical");
  });

  it("requires further assessment for incomplete FRIA screening", () => {
    expect(calculateFriaStatus({ euAiActApplies: "TBD" })).toBe(
      "FURTHER ASSESSMENT",
    );
  });

  it("triggers FRIA when the Article 27 conditions are met", () => {
    expect(
      calculateFriaStatus({
        euAiActApplies: "Yes",
        highRiskAiSystem: "Yes",
        annexPoint2: "No",
        publicServiceDeployer: "No",
        annexPoint5bc: "Yes",
      }),
    ).toBe("FRIA REQUIRED");
  });

  it("calculates FRIA completion only from applicable items", () => {
    const items = buildDefaultFriaItems();
    items[0].status = "Completed";
    items[1].status = "N/A";
    expect(calculateFriaCompletion(items)).toBe(20);
  });

  it("blocks open critical residual risk", () => {
    expect(
      calculateFinalDecision({
        domains: [domain({ residualRiskLevel: "Critical" })],
        friaStatus: "FRIA NOT TRIGGERED",
        friaCompletion: 100,
        specialistAssessment: { required: "No", types: [] },
      }),
    ).toBe("DO NOT PROCEED");
  });

  it("requires remediation for high residual risk with incomplete required FRIA", () => {
    expect(
      calculateFinalDecision({
        domains: [domain({ residualRiskLevel: "High" })],
        friaStatus: "FRIA REQUIRED",
        friaCompletion: 50,
        specialistAssessment: { required: "Yes", types: ["DPIA"] },
      }),
    ).toBe("REMEDIATION REQUIRED");
  });

  it("allows conditional approval for medium residual risk", () => {
    expect(
      calculateFinalDecision({
        domains: [domain({ residualRiskLevel: "Medium" })],
        friaStatus: "FRIA NOT TRIGGERED",
        friaCompletion: 100,
        specialistAssessment: { required: "No", types: [] },
      }),
    ).toBe("CONDITIONAL APPROVAL");
  });

  it("approves low residual risk when specialist and FRIA checks are clear", () => {
    expect(
      calculateFinalDecision({
        domains: [domain({ residualRiskLevel: "Low" })],
        friaStatus: "FRIA NOT TRIGGERED",
        friaCompletion: 100,
        specialistAssessment: { required: "No", types: [] },
      }),
    ).toBe("APPROVE");
  });
});
