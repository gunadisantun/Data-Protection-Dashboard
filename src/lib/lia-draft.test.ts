import { describe, expect, it } from "vitest";
import {
  LIA_DRAFT_NOTE_KIND,
  buildLiaDraft,
  mergeSavedLiaDraft,
  serializeLiaDraftNotes,
} from "@/lib/lia-draft";

describe("LIA draft builder", () => {
  it("prefills Santun LIA sections from a RoPA assessment", () => {
    const draft = buildLiaDraft(makeAssessment());

    expect(draft.activityName).toBe("Customer Outreach");
    expect(draft.sections).toHaveLength(4);
    expect(draft.sections[0]?.title).toBe("Tujuan");
    expect(draft.sections[0]?.rows[0]?.answer).toContain("marketing campaign");
    expect(draft.sections[2]?.rows[0]?.answer).toContain("Contact Details");
    expect(draft.decision.signer).toContain("Santi");
  });

  it("merges a saved in-app LIA draft from task notes", () => {
    const generated = buildLiaDraft(makeAssessment());
    const saved = {
      ...generated,
      sections: generated.sections.map((section, sectionIndex) =>
        sectionIndex === 0
          ? {
              ...section,
              rows: section.rows.map((row, rowIndex) =>
                rowIndex === 0 ? { ...row, answer: "Custom answer" } : row,
              ),
            }
          : section,
      ),
    };

    const merged = mergeSavedLiaDraft(
      generated,
      JSON.stringify({
        kind: LIA_DRAFT_NOTE_KIND,
        savedAt: new Date().toISOString(),
        draft: saved,
      }),
    );

    expect(merged.sections[0]?.rows[0]?.answer).toBe("Custom answer");
  });

  it("serializes draft notes with the versioned kind", () => {
    const draft = buildLiaDraft(makeAssessment());
    const parsed = JSON.parse(serializeLiaDraftNotes(draft));

    expect(parsed.kind).toBe(LIA_DRAFT_NOTE_KIND);
    expect(parsed.draft.assessmentId).toBe("task-lia-test");
  });
});

function makeAssessment(): Parameters<typeof buildLiaDraft>[0] {
  return {
    id: "task-lia-test",
    ropaId: "ropa-test",
    taskType: "LIA",
    status: "Todo",
    severity: "Required",
    title: "LIA Triggered",
    reason: "Legitimate interest selected.",
    notes: "",
    dueDate: new Date().toISOString(),
    picName: "Santi",
    departmentId: "dept-marketing",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    department: {
      id: "dept-marketing",
      name: "Marketing",
      createdAt: new Date().toISOString(),
    },
    ropa: {
      id: "ropa-test",
      activityName: "Customer Outreach",
      processDescription: "Campaign audience enrichment.",
      departmentId: "dept-marketing",
      picName: "Santi",
      picEmail: "santi@example.com",
      legalBasis: "Legitimate Interest",
      processingPurpose: "Run a marketing campaign with existing customers.",
      sourceMechanism: "CRM export",
      subjectCategories: ["Customers"],
      personalDataTypes: ["Contact Details", "Purchase History"],
      recipients: "CRM vendor",
      processorContractLink: "",
      dataReceiverRole: "Processor",
      isCrossBorder: true,
      destinationCountry: "Singapore",
      exportProtectionMechanism: "SCC",
      transferMechanism: "Secure API",
      storageLocation: "Indonesia and Singapore",
      retentionPeriod: "12 months",
      technicalMeasures: "Encryption at rest.",
      organizationalMeasures: "Role-based access.",
      dataSubjectRights: "Privacy portal.",
      riskAssessmentLevel: "Medium",
      highRiskCategories: [],
      riskRegisterReference: "",
      riskLikelihood: "Medium",
      riskImpact: "Medium",
      riskContext: "Marketing outreach may affect expectation and objection rights.",
      existingControls: "Role-based access and consent suppression list.",
      residualRiskLevel: "Medium",
      riskMitigationPlan: "Review balancing test and opt-out wording.",
      volumeLevel: "Medium",
      usesAutomatedDecisionMaking: false,
      previousProcess: "Customer registration",
      nextProcess: "Campaign reporting",
      status: "Active",
      userId: "user-admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
