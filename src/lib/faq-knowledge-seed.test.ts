import { describe, expect, it } from "vitest";
import { loadFaqSeedData } from "@/lib/faq-knowledge-seed";

describe("FAQ knowledge seed loader", () => {
  it("loads categories and faq rows from the narrative workbook template", async () => {
    const data = await loadFaqSeedData();
    expect(data.categories).toHaveLength(20);
    expect(data.entries).toHaveLength(133);
    expect(data.references).toHaveLength(0);
  });
});
