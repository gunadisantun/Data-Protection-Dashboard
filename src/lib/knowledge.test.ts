import { describe, expect, it } from "vitest";
import {
  rankKnowledgeChunks,
  splitKnowledgeContent,
  tokenizeKnowledgeText,
} from "@/lib/knowledge";

describe("knowledge retrieval helpers", () => {
  it("tokenizes meaningful words and removes common stop words", () => {
    expect(tokenizeKnowledgeText("Apa dasar pemrosesan data pribadi?")).toContain(
      "dasar",
    );
    expect(tokenizeKnowledgeText("Apa dasar pemrosesan data pribadi?")).not.toContain(
      "apa",
    );
  });

  it("returns relevant FAQ chunks for matching questions", () => {
    const ranked = rankKnowledgeChunks("kapan DPIA wajib dilakukan", [
      {
        id: "1",
        sourceType: "FAQ",
        sourceId: "faq-1",
        title: "DPIA wajib",
        content: "DPIA wajib dilakukan untuk pemrosesan risiko tinggi.",
      },
      {
        id: "2",
        sourceType: "REFERENCE",
        sourceId: "ref-1",
        title: "Consent",
        content: "Consent adalah salah satu dasar pemrosesan.",
      },
    ]);

    expect(ranked[0]?.sourceId).toBe("faq-1");
  });

  it("returns no chunks when no source is relevant", () => {
    const ranked = rankKnowledgeChunks("retensi payroll", [
      {
        id: "1",
        sourceType: "REFERENCE",
        sourceId: "ref-1",
        title: "Consent",
        content: "Consent adalah salah satu dasar pemrosesan.",
      },
    ]);

    expect(ranked).toHaveLength(0);
  });

  it("splits long SOP text into smaller chunks", () => {
    const chunks = splitKnowledgeContent("a".repeat(250), 100);
    expect(chunks).toHaveLength(3);
  });
});
