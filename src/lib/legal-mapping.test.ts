import { describe, expect, it } from "vitest";
import {
  getLegalMappingKnowledgeChunks,
  getLegalMappingTrackerData,
} from "@/lib/legal-mapping";

describe("UU PDP and PP 33/2026 legal mapping tracker", () => {
  it("loads workbook coverage and both mapping directions", async () => {
    const data = await getLegalMappingTrackerData();

    expect(data.coverage.uuCoverage).toBe("76/76");
    expect(data.coverage.ppCoverage).toBe("225/225");
    expect(data.coverage.babCount).toBe(16);
    expect(data.uuToPp.length).toBeGreaterThan(600);
    expect(data.ppToUu.length).toBeGreaterThan(600);
  }, 30000);

  it("forward-fills blank source article rows for nested mappings", async () => {
    const data = await getLegalMappingTrackerData();
    const rowWithAdditionalPpArticle = data.uuToPp.find(
      (entry) => entry.sourceRow === 7,
    );
    const rowWithAdditionalUuArticle = data.ppToUu.find(
      (entry) => entry.sourceRow === 6,
    );

    expect(rowWithAdditionalPpArticle).toMatchObject({
      pasalUu: "Pasal 2",
      pasalPp: "Pasal 3",
    });
    expect(rowWithAdditionalUuArticle).toMatchObject({
      pasalPp: "Pasal 1",
      pasalUu: "Pasal 58",
    });
  }, 30000);

  it("exposes legal mapping as reference-like knowledge chunks", async () => {
    const chunks = await getLegalMappingKnowledgeChunks();

    expect(chunks.length).toBeGreaterThan(1000);
    expect(chunks[0]?.sourceType).toBe("REFERENCE");
    expect(chunks.some((chunk) => chunk.content.includes("Pasal UU PDP"))).toBe(true);
    expect(chunks.some((chunk) => chunk.content.includes("Pasal PP 33/2026"))).toBe(true);
  }, 30000);
});
