import { splitKnowledgeContent, type KnowledgeChunkInput } from "@/lib/knowledge";
import legalMappingData from "@/lib/legal-mapping-data.json";

export type LegalMappingDirection = "UU_TO_PP" | "PP_TO_UU";

export type LegalMappingEntry = {
  id: string;
  direction: LegalMappingDirection;
  sourceRow: number;
  babUu: string;
  topik: string;
  noUu: string;
  pasalUu: string;
  isiPasalUu: string;
  noPp: string;
  pasalPp: string;
  isiPasalPp: string;
  penjelasanResmiPp: string;
  catatanMapping: string;
  jenisHubungan: string;
};

export type LegalMappingCoverage = {
  uuCoverage: string;
  ppCoverage: string;
  uuArticleCount: number;
  ppArticleCount: number;
  babCount: number;
  uuRows: number;
  ppRows: number;
};

export type LegalMappingTrackerData = {
  coverage: LegalMappingCoverage;
  uuToPp: LegalMappingEntry[];
  ppToUu: LegalMappingEntry[];
};

let cachedTrackerData: LegalMappingTrackerData | null = null;

export async function getLegalMappingTrackerData(): Promise<LegalMappingTrackerData> {
  cachedTrackerData ??= legalMappingData as LegalMappingTrackerData;
  return cachedTrackerData;
}

export async function getLegalMappingKnowledgeChunks(): Promise<KnowledgeChunkInput[]> {
  const data = await getLegalMappingTrackerData();
  const sourceRows = [...data.uuToPp, ...data.ppToUu];
  const chunks: KnowledgeChunkInput[] = [];

  for (const entry of sourceRows) {
    const title =
      entry.direction === "UU_TO_PP"
        ? `Mapping ${entry.pasalUu} UU PDP ke ${entry.pasalPp || "PP 33/2026"}`
        : `Mapping ${entry.pasalPp} PP 33/2026 ke ${entry.pasalUu || "UU PDP"}`;
    const content = [
      "Tracker UU PDP dan PP 33/2026.",
      `Arah: ${entry.direction === "UU_TO_PP" ? "Urut per UU PDP" : "Urut per PP 33/2026"}.`,
      entry.babUu ? `BAB UU PDP: ${entry.babUu}` : "",
      entry.topik ? `Topik: ${entry.topik}` : "",
      entry.pasalUu ? `Pasal UU PDP: ${entry.pasalUu}` : "",
      entry.isiPasalUu ? `Isi Pasal UU PDP: ${entry.isiPasalUu}` : "",
      entry.pasalPp ? `Pasal PP 33/2026: ${entry.pasalPp}` : "",
      entry.isiPasalPp ? `Isi Pasal PP 33/2026: ${entry.isiPasalPp}` : "",
      entry.penjelasanResmiPp ? `Penjelasan resmi PP: ${entry.penjelasanResmiPp}` : "",
      entry.catatanMapping ? `Catatan mapping: ${entry.catatanMapping}` : "",
      entry.jenisHubungan ? `Jenis hubungan: ${entry.jenisHubungan}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    splitKnowledgeContent(content).forEach((chunk, index) => {
      chunks.push({
        id: `legal-mapping-${entry.direction.toLowerCase()}-${entry.sourceRow}-${index + 1}`,
        sourceType: "REFERENCE",
        sourceId: `legal-mapping-${entry.direction.toLowerCase()}-${entry.sourceRow}`,
        title: index === 0 ? title : `${title} (${index + 1})`,
        content: chunk,
        metadata: {
          groupName: "UU PDP & PP PDP Tracker",
          direction: entry.direction,
          sourceRow: entry.sourceRow,
          pasalUu: entry.pasalUu || null,
          pasalPp: entry.pasalPp || null,
        },
      });
    });
  }

  return chunks;
}
