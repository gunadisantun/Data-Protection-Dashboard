import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CreateRopaPayload } from "@/lib/types";

const tempDir = mkdtempSync(path.join(tmpdir(), "privacyvault-"));

let createRopa: typeof import("@/lib/data").createRopa;
let getRopaById: typeof import("@/lib/data").getRopaById;
let resetAndSeedDatabase: typeof import("@/db/init").resetAndSeedDatabase;
let sqlite: typeof import("@/db/client").sqlite;

beforeAll(async () => {
  process.env.DATABASE_URL = path.join(tempDir, "test.sqlite");
  ({ resetAndSeedDatabase } = await import("@/db/init"));
  ({ createRopa, getRopaById } = await import("@/lib/data"));
  ({ sqlite } = await import("@/db/client"));
  resetAndSeedDatabase();
});

afterAll(() => {
  sqlite.close();
  rmSync(tempDir, { recursive: true, force: true });
});

describe("createRopa", () => {
  it("persists a RoPA activity and generated obligations atomically", () => {
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

    const result = createRopa(payload);
    const stored = getRopaById(result.id);

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
