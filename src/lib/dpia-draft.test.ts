import { describe, expect, it } from "vitest";
import {
  DPIA_DRAFT_NOTE_KIND,
  LEGACY_DPIA_DRAFT_NOTE_KIND,
  buildDpiaDraft,
  calculateRiskProfile,
  createEmptyDpiaRisk,
  mergeSavedDpiaDraft,
  serializeDpiaDraftNotes,
} from "@/lib/dpia-draft";

describe("DPIA draft builder", () => {
  it("prefills the DPIA template sections from a RoPA assessment", () => {
    const draft = buildDpiaDraft(makeAssessment());

    expect(draft.activityName).toBe("Candidate Screening");
    expect(draft.sections).toHaveLength(3);
    expect(draft.sections[0]?.rows[0]?.answer).toContain("Candidate screening");
    expect(draft.highRiskSignals.some((signal) => signal.selected)).toBe(true);
    expect(draft.risks).toEqual([]);
  });

  it("calculates 5x5 matrix levels from impact and likelihood", () => {
    expect(calculateRiskProfile(1, 1)).toMatchObject({
      score: 1,
      level: "Low",
    });
    expect(calculateRiskProfile(4, 4)).toMatchObject({
      score: 16,
      level: "Moderate to High",
      priority: "High Priority",
    });
    expect(calculateRiskProfile(5, 5)).toMatchObject({
      score: 25,
      level: "High",
    });

    const risk = createEmptyDpiaRisk(1);
    expect(risk.residualProfile).toMatchObject(calculateRiskProfile(3, 3));
    expect(risk.targetProfile).toMatchObject(calculateRiskProfile(2, 2));
  });

  it("merges a saved in-app DPIA draft from task notes", () => {
    const generated = buildDpiaDraft(makeAssessment());
    const saved = {
      ...generated,
      conclusion: "Custom DPIA conclusion",
    };

    const merged = mergeSavedDpiaDraft(
      generated,
      JSON.stringify({
        kind: DPIA_DRAFT_NOTE_KIND,
        savedAt: new Date().toISOString(),
        draft: saved,
      }),
    );

    expect(merged.conclusion).toBe("Custom DPIA conclusion");
  });

  it("converts a saved legacy DPIA risk into the v2 risk workflow", () => {
    const generated = buildDpiaDraft(makeAssessment());
    const legacyDraft = {
      ...generated,
      risks: [
        {
          id: "risk-legacy",
          number: 1,
          source: "Internal",
          event: "Legacy risk event",
          legalImpact: "Legacy legal impact",
          impact: 4,
          likelihood: 4,
          score: 16,
          level: "Moderate to High",
          priority: "High Priority",
          riskAppetite: "Low to High",
          riskOwner: "Risk Owner",
          existingTreatment: "Existing legacy control",
          targetLevel: "Low",
          monitoringStatus: "Open",
          targetTimeline: "Q3",
          mitigation: "Legacy mitigation plan",
          mitigationApproval: "Approved by owner",
          relatedUnits: "Legal",
        },
      ],
    };

    const merged = mergeSavedDpiaDraft(
      generated,
      JSON.stringify({
        kind: LEGACY_DPIA_DRAFT_NOTE_KIND,
        savedAt: new Date().toISOString(),
        draft: legacyDraft,
      }),
    );

    expect(merged.risks[0]?.residualProfile).toMatchObject({
      impact: 4,
      likelihood: 4,
      score: 16,
    });
    expect(merged.risks[0]?.existingTreatments[0]?.description).toBe(
      "Existing legacy control",
    );
    expect(merged.risks[0]?.treatmentPlans[0]?.action).toBe(
      "Legacy mitigation plan",
    );
  });

  it("serializes draft notes with the versioned kind", () => {
    const draft = buildDpiaDraft(makeAssessment());
    const parsed = JSON.parse(serializeDpiaDraftNotes(draft));

    expect(parsed.kind).toBe(DPIA_DRAFT_NOTE_KIND);
    expect(parsed.draft.assessmentId).toBe("task-dpia-test");
  });
});

function makeAssessment(): Parameters<typeof buildDpiaDraft>[0] {
  return {
    id: "task-dpia-test",
    ropaId: "ropa-test",
    taskType: "DPIA",
    status: "Todo",
    severity: "Critical",
    title: "DPIA Required",
    reason: "High risk processing detected.",
    notes: "",
    dueDate: new Date().toISOString(),
    picName: "Santi",
    departmentId: "dept-hr",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    department: {
      id: "dept-hr",
      name: "Human Resources",
      createdAt: new Date().toISOString(),
    },
    ropa: {
      id: "ropa-test",
      activityName: "Candidate Screening",
      processDescription: "Candidate screening and assessment workflow.",
      departmentId: "dept-hr",
      picName: "Santi",
      picEmail: "santi@example.com",
      legalBasis: "Legitimate Interest",
      processingPurpose: "Evaluate candidates for hiring decisions.",
      sourceMechanism: "Recruitment portal",
      subjectCategories: ["Candidates"],
      personalDataTypes: ["Contact Details", "Financial", "Geolocation"],
      recipients: "Background screening vendor",
      processorContractLink: "Vendor DPA",
      dataReceiverRole: "Processor",
      isCrossBorder: true,
      destinationCountry: "Singapore",
      exportProtectionMechanism: "SCC",
      transferMechanism: "Secure API",
      storageLocation: "Indonesia and Singapore",
      retentionPeriod: "24 months",
      technicalMeasures: "Encryption and audit logging.",
      organizationalMeasures: "Access review and vendor due diligence.",
      dataSubjectRights: "Candidate privacy portal.",
      riskAssessmentLevel: "High",
      highRiskCategories: [
        "automated-legal-significant-effect",
        "specific-personal-data",
        "large-scale-processing",
      ],
      riskRegisterReference: "RR-HR-001",
      riskLikelihood: "High",
      riskImpact: "High",
      riskContext: "Screening can affect candidate hiring outcomes.",
      existingControls: "Encryption and vendor access controls.",
      residualRiskLevel: "High",
      riskMitigationPlan: "Complete DPIA and human review before go-live.",
      volumeLevel: "Large",
      usesAutomatedDecisionMaking: true,
      previousProcess: "Candidate application",
      nextProcess: "Hiring decision",
      status: "Active",
      userId: "user-admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
