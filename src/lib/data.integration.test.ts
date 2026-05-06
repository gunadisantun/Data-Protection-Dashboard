import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateRopaPayload } from "@/lib/types";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;

let createRopa: typeof import("@/lib/data").createRopa;
let getRopaById: typeof import("@/lib/data").getRopaById;
let resetAndSeedDatabase: typeof import("@/db/init").resetAndSeedDatabase;
let queryClient: typeof import("@/db/client").queryClient;

describeWithDatabase("createRopa", () => {
  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.DIRECT_URL = testDatabaseUrl;
    ({ resetAndSeedDatabase } = await import("@/db/init"));
    ({ createRopa, getRopaById } = await import("@/lib/data"));
    ({ queryClient } = await import("@/db/client"));
    await resetAndSeedDatabase();
  });

  afterAll(async () => {
    await queryClient?.end();
  });

  it("persists a RoPA activity and generated obligations atomically", async () => {
    const payload: CreateRopaPayload = {
      activityName: "Global Customer Outreach Q3",
      processDescription:
        "Campaign analytics using purchase history and geolocation for quarterly customer outreach.",
      departmentId: "dept-marketing",
      picName: "Bima Santoso",
      picEmail: "bima@privacyvault.local",
      legalBasis: "Legitimate Interest",
      processingPurpose: "Marketing and sales analytics",
      sourceMechanism: "CRM and campaign form",
      subjectCategories: ["Customers"],
      personalDataTypes: ["Contact Details", "Purchase History", "Geolocation"],
      recipients: "Analytics platform",
      processorContractLink: "https://contracts.local/analytics",
      dataReceiverRole: "Processor",
      isCrossBorder: true,
      destinationCountry: "USA",
      exportProtectionMechanism: "Standard contractual clauses",
      transferMechanism: "Secure API",
      storageLocation: "Regional SaaS platform",
      retentionPeriod: "7 years",
      technicalMeasures: "Encryption and role-based access",
      organizationalMeasures: "Marketing approval workflow",
      dataSubjectRights: "Access and deletion request workflow",
      riskAssessmentLevel: "High",
      highRiskCategories: ["new-technology"],
      riskRegisterReference: "RR-PRIV-2026-014",
      volumeLevel: "Large",
      usesAutomatedDecisionMaking: true,
      previousProcess: "Customer purchase",
      nextProcess: "Campaign reporting",
      status: "Active",
      userId: "user-pic-marketing",
    };

    const result = await createRopa(payload);
    const stored = await getRopaById(result.id);

    expect(result.triggers.map((trigger) => trigger.type)).toEqual([
      "LIA",
      "TIA",
      "DPIA",
    ]);
    expect(stored?.activityName).toBe(payload.activityName);
    expect(stored?.highRiskCategories).toEqual(["new-technology"]);
    expect(stored?.riskRegisterReference).toBe("RR-PRIV-2026-014");
    expect(stored?.assessments).toHaveLength(3);
  });
});
