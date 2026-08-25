export const aiFaqDisclaimer =
  "Jawaban AI dapat keliru. Untuk keputusan final, konfirmasi kepada DPO.";

export type KnowledgeSourceType = "FAQ" | "REFERENCE" | "SOP";

export type KnowledgeChunkInput = {
  id: string;
  sourceType: KnowledgeSourceType;
  sourceId: string;
  title: string;
  content: string;
  url?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
};

export type RankedKnowledgeChunk = KnowledgeChunkInput & {
  score: number;
};

const stopWords = new Set([
  "apa",
  "apakah",
  "bagaimana",
  "yang",
  "dan",
  "atau",
  "untuk",
  "dari",
  "dengan",
  "pada",
  "dalam",
  "ini",
  "itu",
  "the",
  "and",
  "for",
  "with",
  "data",
  "pribadi",
]);

export function tokenizeKnowledgeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

export function rankKnowledgeChunks(
  question: string,
  chunks: KnowledgeChunkInput[],
  limit = 14,
) {
  const queryTokens = tokenizeKnowledgeText(question);
  if (!queryTokens.length) {
    return [];
  }

  const querySet = new Set(queryTokens);

  return chunks
    .map((chunk) => {
      const titleTokens = tokenizeKnowledgeText(chunk.title);
      const contentTokens = tokenizeKnowledgeText(chunk.content);
      const contentSet = new Set(contentTokens);
      let score = 0;

      for (const token of querySet) {
        if (contentSet.has(token)) {
          score += 2;
        }

        if (titleTokens.includes(token)) {
          score += 3;
        }

        if (chunk.content.toLowerCase().includes(token)) {
          score += 0.5;
        }
      }

      const phrase = question.trim().toLowerCase();
      if (phrase.length > 8 && chunk.content.toLowerCase().includes(phrase)) {
        score += 6;
      }

      if (chunk.sourceType === "SOP") {
        score += 0.5;
      }

      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

export function splitKnowledgeContent(content: string, maxLength = 1800) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  for (let index = 0; index < normalized.length; index += maxLength) {
    chunks.push(normalized.slice(index, index + maxLength).trim());
  }

  return chunks.filter(Boolean);
}

export async function extractSopText(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (extension === "pdf") {
      const pdfModule = await import("pdf-parse");
      const pdfParse = (
        "default" in pdfModule ? pdfModule.default : pdfModule
      ) as (input: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(buffer);
      return {
        text: String(result.text ?? "").trim(),
        extractionStatus: "extracted" as const,
      };
    }

    if (extension === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: String(result.value ?? "").trim(),
        extractionStatus: "extracted" as const,
      };
    }
  } catch {
    return {
      text: "",
      extractionStatus: "metadata_only" as const,
    };
  }

  return {
    text: "",
    extractionStatus: "metadata_only" as const,
  };
}

export async function extractReferenceTextFromUrl(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PrivacyBroKnowledgeIndexer/1.0",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const buffer = Buffer.from(await response.arrayBuffer());

    if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
      const pdfModule = await import("pdf-parse");
      const pdfParse = (
        "default" in pdfModule ? pdfModule.default : pdfModule
      ) as (input: Buffer) => Promise<{ text?: string }>;
      const result = await pdfParse(buffer);
      return String(result.text ?? "").trim();
    }

    const text = buffer.toString("utf8");
    return stripHtmlToText(text);
  } catch {
    return "";
  }
}

function stripHtmlToText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
