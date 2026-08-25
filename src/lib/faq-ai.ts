import { findRelevantKnowledgeChunks } from "@/lib/data";
import { aiFaqDisclaimer } from "@/lib/knowledge";

export type FaqAiSource = {
  id: string;
  title: string;
  sourceType: "FAQ" | "REFERENCE" | "SOP";
  url: string | null;
};

export type FaqAiAnswer = {
  answer: string;
  sources: FaqAiSource[];
  refused: boolean;
  disclaimer: string;
};

const refusalAnswer =
  "Informasi belum tersedia di FAQ/SOP/referensi. Silakan tanyakan kepada DPO.";

const responseSchema = {
  type: "object",
  required: ["answer", "sourceIds", "refused"],
  properties: {
    answer: {
      type: "string",
      description:
        "Jawaban naratif 2-3 paragraf dalam Bahasa Indonesia, langsung menjawab, tanpa heading, bullet, markdown, atau citation inline.",
    },
    sourceIds: {
      type: "array",
      items: {
        type: "string",
      },
      description: "ID sumber yang digunakan, hanya dari daftar konteks.",
    },
    refused: {
      type: "boolean",
      description: "True jika konteks tidak cukup untuk menjawab.",
    },
  },
};

function expandPdpQuestion(question: string) {
  const normalized = question.toLowerCase();
  const terms = new Set<string>([question]);

  if (/(dpia|risiko|risk|tinggi|pasal 34|berisiko)/i.test(normalized)) {
    terms.add("DPIA penilaian dampak pelindungan data pribadi pemrosesan risiko tinggi Pasal 34 data spesifik skala besar teknologi baru keputusan otomatis");
  }

  if (/(transfer|tia|lintas negara|cross|luar negeri|negara tujuan)/i.test(normalized)) {
    terms.add("TIA transfer data pribadi luar negeri lintas negara negara tujuan mekanisme pelindungan safeguard penerima data");
  }

  if (/(lia|legitimate|kepentingan sah|balancing|uji keseimbangan)/i.test(normalized)) {
    terms.add("LIA legitimate interest kepentingan sah uji keseimbangan dasar pemrosesan");
  }

  if (/(ropa|catatan|record|pemrosesan|aktivitas)/i.test(normalized)) {
    terms.add("RoPA catatan aktivitas pemrosesan data pribadi tujuan dasar pemrosesan kategori data penerima retensi keamanan");
  }

  if (/(hak|subjek|akses|hapus|persetujuan|consent|keberatan)/i.test(normalized)) {
    terms.add("hak subjek data pribadi informasi akses salinan hapus musnah tarik persetujuan keberatan pembatasan interoperabilitas");
  }

  if (/(pengendali|prosesor|processor|controller|pihak ketiga|vendor)/i.test(normalized)) {
    terms.add("pengendali data pribadi prosesor pihak ketiga vendor kontrak akses pengawasan pemrosesan");
  }

  return Array.from(terms).join("\n");
}

const analystInstruction = `
Anda adalah AI Knowledge Center Privacy Bro untuk membantu analisis PDP.
Sumber yang boleh digunakan hanya konteks yang diberikan dari FAQ, Referensi Global, dan Kebijakan Pelindungan Data Pribadi/SOP/Template.

Aturan ketat:
1. Jangan gunakan pengetahuan umum di luar konteks.
2. Jangan mengarang pasal, kewajiban, standar, atau kesimpulan yang tidak didukung konteks.
3. Boleh melakukan analisis, perbandingan, inferensi praktis, dan rekomendasi langkah berikutnya jika semuanya diturunkan dari konteks.
4. Jika konteks hanya cukup sebagian, jawab bagian yang didukung sumber lalu jelaskan batasannya.
5. Jika konteks tidak cukup untuk menjawab substansi pertanyaan, set refused=true.
6. Jangan tulis citation inline seperti [S1], [S2] di dalam teks jawaban. Source akan ditampilkan terpisah oleh aplikasi.
7. Tetap isi sourceIds dengan ID sumber dari konteks yang benar-benar dipakai.

Gaya jawaban:
- Langsung mulai dengan jawaban/kesimpulan utama.
- Bahasa Indonesia profesional dan praktis.
- Tulis dalam 2-3 paragraf naratif seperti penjelasan legal singkat.
- Jangan gunakan heading, bullet, numbering, markdown, bold, atau citation inline.
- Paragraf 1: definisi/kesimpulan utama.
- Paragraf 2: cakupan/substansi pengaturan atau analisis utama.
- Paragraf 3: implikasi praktis bagi organisasi jika relevan.
- Batasi jawaban maksimal 3 paragraf, masing-masing 3-5 kalimat.
`.trim();

function normalizeGeminiJsonText(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function fallbackParsedAnswer(
  outputText: string,
  availableSourceIds: string[],
): { answer: string; sourceIds: string[]; refused: boolean } {
  const usedIds = Array.from(
    new Set(outputText.match(/\bS\d+\b/g)?.filter((id) => availableSourceIds.includes(id)) ?? []),
  );
  const cleaned = normalizeGeminiJsonText(outputText)
    .replace(/^\{\s*"answer"\s*:\s*"?/i, "")
    .replace(/",?\s*"sourceIds"[\s\S]*$/i, "")
    .replace(/",?\s*"refused"[\s\S]*$/i, "")
    .trim();

  return {
    answer:
      cleaned ||
      "AI berhasil menemukan konteks, tetapi format jawaban perlu disederhanakan. Silakan ulangi pertanyaan dengan ruang lingkup yang lebih spesifik.",
    sourceIds: usedIds.length ? usedIds : availableSourceIds.slice(0, 3),
    refused: false,
  };
}

function parseGeminiAnswer(outputText: string, availableSourceIds: string[]) {
  const normalized = normalizeGeminiJsonText(outputText);
  try {
    return JSON.parse(normalized) as {
      answer: string;
      sourceIds: string[];
      refused: boolean;
    };
  } catch {
    const start = normalized.indexOf("{");
    const end = normalized.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(normalized.slice(start, end + 1)) as {
          answer: string;
          sourceIds: string[];
          refused: boolean;
        };
      } catch {
        return fallbackParsedAnswer(normalized, availableSourceIds);
      }
    }

    return fallbackParsedAnswer(normalized, availableSourceIds);
  }
}

export async function answerFaqQuestion(question: string): Promise<FaqAiAnswer> {
  const chunks = await findRelevantKnowledgeChunks(expandPdpQuestion(question));
  const sources = chunks.map((chunk, index) => ({
    citationId: `S${index + 1}`,
    chunk,
  }));

  if (!sources.length) {
    return {
      answer: refusalAnswer,
      sources: [],
      refused: true,
      disclaimer: aiFaqDisclaimer,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      answer:
        "AI belum dikonfigurasi karena GEMINI_API_KEY belum tersedia. Silakan hubungi DPO atau administrator.",
      sources: [],
      refused: true,
      disclaimer: aiFaqDisclaimer,
    };
  }

  const context = sources
    .map(
      ({ citationId, chunk }) =>
        `[${citationId}] ${chunk.sourceType}: ${chunk.title}\n${chunk.content.slice(0, 2600)}${
          chunk.url ? `\nURL: ${chunk.url}` : ""
        }`,
    )
    .join("\n\n---\n\n");

  const model = process.env.GEMINI_FAQ_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: analystInstruction,
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              text: `Pertanyaan user:\n${question}\n\nKonteks yang boleh digunakan:\n${context}`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: responseSchema,
        maxOutputTokens: 2200,
        temperature: 0.25,
      },
    }),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || "Gemini request failed.");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };
  const outputText = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .find((text) => typeof text === "string");

  if (!outputText) {
    throw new Error("Gemini response tidak memuat jawaban.");
  }

  const parsed = parseGeminiAnswer(outputText, sources.map(({ citationId }) => citationId));
  const sourceIdSet = new Set(parsed.sourceIds);
  const selectedSources = sources
    .filter(({ citationId }) => sourceIdSet.has(citationId))
    .map(({ citationId, chunk }) => ({
      id: citationId,
      title: chunk.title,
      sourceType: chunk.sourceType,
      url: chunk.url ?? null,
    }));

  return {
    answer: parsed.refused ? refusalAnswer : parsed.answer,
    sources: parsed.refused ? [] : selectedSources,
    refused: parsed.refused,
    disclaimer: aiFaqDisclaimer,
  };
}
