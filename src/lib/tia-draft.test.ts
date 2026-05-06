import { describe, expect, it } from "vitest";
import {
  TIA_DRAFT_NOTE_KIND,
  buildTiaDraft,
  calculateTiaEvaluation,
  calculateTiaRisks,
  lookupCountryReference,
  mergeSavedTiaDraft,
  serializeTiaDraftNotes,
} from "@/lib/tia-draft";

describe("TIA draft builder", () => {
  it("prefills transfer assessment fields from RoPA and country reference", () => {
    const draft = buildTiaDraft(makeAssessment());

    expect(draft.activityName).toBe("SaaS Subscription Billing");
    expect(draft.transfer.destinationCountry).toBe("Singapore");
    expect(draft.transfer.destinationRegulation).toContain(
      "Personal Data Protection",
    );
    expect(draft.rows).toHaveLength(11);
    expect(draft.risks).toHaveLength(5);
  });

  it("applies workbook-style TIA risk rules", () => {
    const draft = buildTiaDraft(makeAssessment());
    const risks = calculateTiaRisks({
      ...draft.transfer,
      protectionMechanism: "Tidak diketahui",
      recipientControls: "Memadai",
      writtenAgreement: "Tidak memadai",
      onwardTransfer: "Ya",
      regulationCategory: "Khusus",
    });

    expect(risks.map((risk) => risk.level)).toEqual([
      "Risiko Tinggi",
      "Risiko Rendah",
      "Risiko Tinggi",
      "Risiko Tinggi",
      "Risiko Rendah",
    ]);
    expect(calculateTiaEvaluation(risks).status).toBe("Transfer tidak disarankan");
  });

  it("looks up country law references from the TIA workbook country list subset", () => {
    expect(lookupCountryReference("Singapore")?.category).toBe("Khusus");
    expect(lookupCountryReference("USA")?.category).toBe("Parsial");
    expect(lookupCountryReference("Viet Nam")?.regulation).toContain(
      "Law No. 91/2025",
    );
  });

  it("merges a saved in-app TIA draft from task notes", () => {
    const generated = buildTiaDraft(makeAssessment());
    const saved = {
      ...generated,
      transfer: {
        ...generated.transfer,
        onwardTransfer: "Tidak" as const,
      },
    };

    const merged = mergeSavedTiaDraft(
      generated,
      JSON.stringify({
        kind: TIA_DRAFT_NOTE_KIND,
        savedAt: new Date().toISOString(),
        draft: saved,
      }),
    );

    expect(merged.transfer.onwardTransfer).toBe("Tidak");
  });

  it("serializes draft notes with the versioned kind", () => {
    const draft = buildTiaDraft(makeAssessment());
    const parsed = JSON.parse(serializeTiaDraftNotes(draft));

    expect(parsed.kind).toBe(TIA_DRAFT_NOTE_KIND);
    expect(parsed.draft.assessmentId).toBe("task-tia-test");
  });
});

function makeAssessment(): Parameters<typeof buildTiaDraft>[0] {
  return {
    id: "task-tia-test",
    ropaId: "ropa-test",
    taskType: "TIA",
    status: "Todo",
    severity: "Required",
    title: "TIA Triggered",
    reason: "Cross-border transfer detected.",
    notes: "",
    dueDate: new Date().toISOString(),
    picName: "Nadia",
    departmentId: "dept-finance",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    department: {
      id: "dept-finance",
      name: "Finance",
      createdAt: new Date().toISOString(),
    },
    ropa: {
      id: "ropa-test",
      activityName: "SaaS Subscription Billing",
      processDescription: "Billing and subscription reconciliation.",
      departmentId: "dept-finance",
      picName: "Nadia",
      picEmail: "nadia@example.com",
      legalBasis: "Contractual",
      processingPurpose: "Contract performance and invoicing.",
      sourceMechanism: "Billing portal",
      subjectCategories: ["Subscribers"],
      personalDataTypes: ["Contact Details", "Financial"],
      recipients: "Payment gateway",
      processorContractLink: "Vendor DPA",
      dataReceiverRole: "Processor",
      isCrossBorder: true,
      destinationCountry: "Singapore",
      exportProtectionMechanism: "Standard contractual clauses",
      transferMechanism: "Encrypted API",
      storageLocation: "Singapore SaaS tenant",
      retentionPeriod: "10 years",
      technicalMeasures: "Encryption and tokenization.",
      organizationalMeasures: "Vendor due diligence.",
      dataSubjectRights: "Billing data request workflow.",
      riskAssessmentLevel: "Medium",
      highRiskCategories: [],
      riskRegisterReference: "",
      riskLikelihood: "Medium",
      riskImpact: "Medium",
      riskContext: "Cross-border vendor processing requires safeguard review.",
      existingControls: "Encryption and tokenization.",
      residualRiskLevel: "Medium",
      riskMitigationPlan: "Complete TIA and validate SCC coverage.",
      volumeLevel: "Medium",
      usesAutomatedDecisionMaking: false,
      previousProcess: "Subscription signup",
      nextProcess: "Revenue reporting",
      status: "Active",
      userId: "user-admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
