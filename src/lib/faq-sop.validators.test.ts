import { describe, expect, it } from "vitest";
import {
  faqEntryCreateSchema,
  faqEntryUpdateSchema,
  faqAskSchema,
  referenceDocumentCreateSchema,
  sopMetadataSchema,
  validateSopUploadFile,
} from "@/lib/validators";

describe("FAQ and SOP validators", () => {
  it("validates faq create payload", () => {
    const parsed = faqEntryCreateSchema.safeParse({
      categoryId: "faq-cat-01",
      question: "Apa itu RoPA?",
      answer: "RoPA adalah catatan aktivitas pemrosesan data pribadi.",
      legalBasis: "UU PDP Pasal 31",
      benchmarkSupport: "ICO",
      status: "Norma",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty faq update payload", () => {
    const parsed = faqEntryUpdateSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("validates faq AI question length", () => {
    expect(faqAskSchema.safeParse({ question: "DPIA kapan wajib?" }).success).toBe(
      true,
    );
    expect(faqAskSchema.safeParse({ question: "x" }).success).toBe(false);
  });

  it("validates privacy document category options", () => {
    expect(
      sopMetadataSchema.safeParse({
        title: "Kebijakan Retensi Data",
        category: "Kebijakan",
        summary: "",
      }).success,
    ).toBe(true);
    expect(
      sopMetadataSchema.safeParse({
        title: "Dokumen acak",
        category: "Lainnya",
        summary: "",
      }).success,
    ).toBe(false);
  });

  it("validates global reference category options", () => {
    expect(
      referenceDocumentCreateSchema.safeParse({
        title: "NIST Privacy Framework",
        groupName: "Best Practice",
        description: "",
      }).success,
    ).toBe(true);
    expect(
      referenceDocumentCreateSchema.safeParse({
        title: "Dokumen lama",
        groupName: "Referensi",
        description: "",
      }).success,
    ).toBe(false);
  });

  it("rejects SOP file extension outside pdf/doc/docx", () => {
    const file = new File(["dummy"], "sop.txt", { type: "text/plain" });
    expect(validateSopUploadFile(file)).toContain("PDF, DOC, atau DOCX");
  });

  it("rejects SOP file larger than 10MB", () => {
    const oversized = new Uint8Array(10 * 1024 * 1024 + 1);
    const file = new File([oversized], "sop.pdf", { type: "application/pdf" });
    expect(validateSopUploadFile(file)).toContain("maksimal 10MB");
  });

  it("accepts valid SOP file", () => {
    const file = new File(["ok"], "sop.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateSopUploadFile(file)).toBeNull();
  });
});
