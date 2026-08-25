import path from "node:path";
import type { Worksheet } from "exceljs";

export type FaqSeedCategory = {
  id: string;
  name: string;
  scope: string;
  displayOrder: number;
};

export type FaqSeedEntry = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  legalBasis: string;
  benchmarkSupport: string;
  status: string;
  displayOrder: number;
};

export type FaqSeedReference = {
  id: string;
  groupName: string;
  title: string;
  description: string;
  url: string;
  displayOrder: number;
};

export type FaqSeedData = {
  categories: FaqSeedCategory[];
  entries: FaqSeedEntry[];
  references: FaqSeedReference[];
};

export const canonicalFaqReferenceMetadata: Record<
  string,
  {
    groupName: "UU PDP" | "RPP" | "Aturan Sektoral" | "Best Practice";
    description: string;
    url?: string;
  }
> = {
  "UU PDP": {
    groupName: "UU PDP",
    description:
      "Dasar hukum utama Indonesia untuk prinsip pemrosesan, legal basis, hak subjek data, kewajiban pengendali/prosesor, transfer, dan DPIA.",
  },
  "RPP PDP": {
    groupName: "RPP",
    description:
      "Draft peraturan pelaksanaan UU PDP sebagai konteks operasional tambahan. Gunakan sebagai referensi pembanding karena statusnya masih rancangan.",
    url: "https://kadin.id/wp-content/uploads/DRAF-RANCANGAN-PERATURAN-PEMERINTAH-TENTANG-PERATURAN-PELAKSANAAN-UU-NOMOR-27-TAHUN-2022-TENTANG-PELINDUNGAN-DATA-PRIBADI.pdf",
  },
  "ICO Lawful Basis": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk memilih dasar pemrosesan, mendokumentasikan alasan, dan memahami konsekuensi tiap lawful basis.",
  },
  "ICO DPIA": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk menentukan kebutuhan DPIA, menyusun asesmen risiko, mitigasi, dan review berkala.",
  },
  "ICO Documentation": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk RoPA, dokumentasi aktivitas pemrosesan, dan bukti akuntabilitas organisasi.",
  },
  "ICO Data Sharing": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk berbagi data, penilaian pihak penerima, tujuan transfer, dan kontrol kontraktual/operasional.",
  },
  "EDPB Controller Processor": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk membedakan peran controller, joint controller, dan processor dalam hubungan pemrosesan data.",
  },
  "EDPB Consent": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk menilai validitas consent, penarikan consent, granularitas, dan bukti persetujuan.",
  },
  "EDPB DPIA": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding Uni Eropa untuk kriteria pemrosesan berisiko tinggi dan metodologi DPIA.",
  },
  "EDPB Breach": {
    groupName: "Best Practice",
    description:
      "Panduan pembanding untuk contoh insiden data pribadi, penilaian risiko pelanggaran, dan respons awal.",
  },
  "GDPR Article 30": {
    groupName: "Best Practice",
    description:
      "Rujukan pembanding untuk elemen record of processing activities dan dokumentasi pemrosesan.",
  },
  "GDPR Article 28": {
    groupName: "Best Practice",
    description:
      "Rujukan pembanding untuk klausul pemrosesan oleh processor dan pengaturan kontraktual pihak ketiga.",
  },
};

const workbookPath = path.join(
  process.cwd(),
  "templates",
  "faq-knowledge-center-pdp-narasi.xlsx",
);

export async function loadFaqSeedData(): Promise<FaqSeedData> {
  const ExcelJS = await import("exceljs").then((module) => module.default ?? module);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);

  const narrativeSheet = workbook.getWorksheet("FAQ PDP Detail");
  if (narrativeSheet) {
    return loadNarrativeFaqSeedData(narrativeSheet);
  }

  const faqSheet = workbook.getWorksheet("FAQ Bank");
  const categorySheet =
    workbook.getWorksheet("Index Kategori") ?? workbook.getWorksheet("Kategori");
  const referenceSheet = workbook.getWorksheet("Referensi");

  if (!faqSheet || !categorySheet || !referenceSheet) {
    throw new Error("FAQ workbook format tidak valid.");
  }

  const categories: FaqSeedCategory[] = [];
  const categoryMap = new Map<string, string>();

  for (let rowNumber = 2; rowNumber <= categorySheet.rowCount; rowNumber += 1) {
    const row = categorySheet.getRow(rowNumber);
    const name = row.getCell(1).text.trim();
    const rawScope = row.getCell(3).text.trim();
    const scope = rawScope || `Ruang lingkup ${name}`;

    if (!name) {
      continue;
    }

    const id = `faq-cat-${String(categories.length + 1).padStart(2, "0")}`;
    categories.push({
      id,
      name,
      scope,
      displayOrder: categories.length + 1,
    });
    categoryMap.set(name.toLowerCase(), id);
  }

  const entries: FaqSeedEntry[] = [];
  for (let rowNumber = 2; rowNumber <= faqSheet.rowCount; rowNumber += 1) {
    const row = faqSheet.getRow(rowNumber);
    const categoryName = row.getCell(2).text.trim();
    const question = row.getCell(3).text.trim();
    const answer = row.getCell(4).text.trim();

    if (!categoryName || !question || !answer) {
      continue;
    }

    const categoryId = categoryMap.get(categoryName.toLowerCase());
    if (!categoryId) {
      continue;
    }

    entries.push({
      id: `faq-${String(entries.length + 1).padStart(3, "0")}`,
      categoryId,
      question,
      answer,
      legalBasis: row.getCell(5).text.trim(),
      benchmarkSupport: row.getCell(6).text.trim(),
      status: row.getCell(7).text.trim(),
      displayOrder: entries.length + 1,
    });
  }

  const references: FaqSeedReference[] = [];
  const referenceHeader = referenceSheet.getRow(1);
  const isLegacyReferenceShape = referenceHeader.getCell(4).text.trim().length > 0;
  for (let rowNumber = 2; rowNumber <= referenceSheet.rowCount; rowNumber += 1) {
    const row = referenceSheet.getRow(rowNumber);
    const groupName = isLegacyReferenceShape ? row.getCell(1).text.trim() : "Referensi";
    const title = isLegacyReferenceShape ? row.getCell(2).text.trim() : row.getCell(1).text.trim();
    const url = isLegacyReferenceShape ? row.getCell(4).text.trim() : row.getCell(2).text.trim();
    const description = isLegacyReferenceShape
      ? row.getCell(3).text.trim()
      : row.getCell(3).text.trim();

    if (!title || !url) {
      continue;
    }

    const canonical = canonicalFaqReferenceMetadata[title];

    references.push({
      id: `faq-ref-${String(references.length + 1).padStart(2, "0")}`,
      groupName: canonical?.groupName ?? (groupName || "Best Practice"),
      title,
      description: canonical?.description ?? description,
      url: canonical?.url ?? url,
      displayOrder: references.length + 1,
    });
  }

  return { categories, entries, references };
}

function loadNarrativeFaqSeedData(sheet: Worksheet): FaqSeedData {
  const categories: FaqSeedCategory[] = [];
  const categoryMap = new Map<string, string>();
  const entries: FaqSeedEntry[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const categoryName = row.getCell(2).text.trim();
    const question = row.getCell(3).text.trim();
    const answer = row.getCell(4).text.trim();

    if (!categoryName || !question || !answer) {
      continue;
    }

    let categoryId = categoryMap.get(categoryName.toLowerCase());
    if (!categoryId) {
      categoryId = `faq-cat-${String(categories.length + 1).padStart(2, "0")}`;
      categoryMap.set(categoryName.toLowerCase(), categoryId);
      categories.push({
        id: categoryId,
        name: categoryName,
        scope: `FAQ PDP terkait ${categoryName}.`,
        displayOrder: categories.length + 1,
      });
    }

    entries.push({
      id: `faq-${String(entries.length + 1).padStart(3, "0")}`,
      categoryId,
      question,
      answer,
      legalBasis: row.getCell(5).text.trim(),
      benchmarkSupport: row.getCell(8).text.trim(),
      status: row.getCell(6).text.trim(),
      displayOrder: entries.length + 1,
    });
  }

  return { categories, entries, references: [] };
}
