import type { assessments, departments, ropaActivities } from "@/db/schema";
import { lookupCountryReference } from "@/lib/country-references";
import type {
  CountryReference,
  CountryRegulationCategory,
} from "@/lib/country-references";

export { lookupCountryReference } from "@/lib/country-references";

export const TIA_DRAFT_NOTE_KIND = "privacyvault.tiaDraft.v1" as const;

type TiaAssessment = typeof assessments.$inferSelect & {
  department: typeof departments.$inferSelect;
  ropa: typeof ropaActivities.$inferSelect;
};

export type TiaRiskLevel =
  | "Risiko Rendah"
  | "Risiko Menengah"
  | "Risiko Tinggi";

export type TiaRegulationCategory = CountryRegulationCategory;

export type TiaControlRating =
  | "Memadai"
  | "Cukup memadai"
  | "Tidak memadai"
  | "Tidak diketahui";

export type TiaOnwardTransfer = "Ya" | "Tidak" | "Tidak diketahui";

export type TiaCountryReference = CountryReference;

export type TiaTransferDetails = {
  legalInstrument: string;
  transferPurpose: string;
  recipient: string;
  destinationCountry: string;
  destinationRegulation: string;
  regulationCategory: TiaRegulationCategory;
  regulationSource: string;
  sectorScope: string;
  personalDataGeneral: string;
  personalDataSpecific: string;
  transferMechanism: string;
  protectionMechanism: string;
  recipientControls: TiaControlRating;
  writtenAgreement: TiaControlRating;
  onwardTransfer: TiaOnwardTransfer;
};

export type TiaDraftRow = {
  id: string;
  number: string;
  section: "Informasi Umum" | "Mekanisme Transfer" | "Penilaian Risiko";
  question: string;
  guidance: string;
  field: keyof TiaTransferDetails;
};

export type TiaRisk = {
  id: string;
  title: string;
  level: TiaRiskLevel;
  explanation: string;
  mitigation: string;
};

export type TiaEvaluation = {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  status:
    | "Transfer dapat dilakukan"
    | "Konsultasi DPO"
    | "Perlu mitigasi tambahan"
    | "Transfer tidak disarankan";
  recommendation: string;
  proceduralSteps: string;
};

export type TiaDraft = {
  assessmentId: string;
  activityId: string;
  activityName: string;
  departmentName: string;
  picName: string;
  picEmail: string;
  generatedAt: string;
  metadata: {
    dpo: string;
    date: string;
    responsiblePerson: string;
    relatedUnits: string;
  };
  transfer: TiaTransferDetails;
  rows: TiaDraftRow[];
  risks: TiaRisk[];
  evaluation: TiaEvaluation;
};

export type SavedTiaDraftNotes = {
  kind: typeof TIA_DRAFT_NOTE_KIND;
  savedAt: string;
  draft: TiaDraft;
};

export function buildTiaDraft(assessment: TiaAssessment): TiaDraft {
  const activity = assessment.ropa;
  const countryReference = lookupCountryReference(activity.destinationCountry);
  const generalData = activity.personalDataTypes
    .filter((type) => !isSpecificPersonalData(type))
    .join(", ");
  const specificData = activity.personalDataTypes
    .filter((type) => isSpecificPersonalData(type))
    .join(", ");

  const transfer: TiaTransferDetails = {
    legalInstrument:
      activity.exportProtectionMechanism ||
      activity.processorContractLink ||
      "Instrumen hukum perlu dilengkapi, misalnya kontrak, klausul PDP, SCC, atau mekanisme perlindungan transfer lain.",
    transferPurpose: activity.processingPurpose,
    recipient: activity.recipients || "Pihak penerima perlu dilengkapi.",
    destinationCountry:
      activity.destinationCountry || "Negara penerima data perlu dilengkapi.",
    destinationRegulation:
      countryReference?.regulation ||
      "Regulasi negara penerima belum tersedia di referensi dan perlu dikaji manual.",
    regulationCategory: countryReference?.category || "Tidak diketahui",
    regulationSource: countryReference?.source || "Perlu dilengkapi oleh Legal/DPO.",
    sectorScope: activity.processDescription,
    personalDataGeneral:
      generalData || "Data Pribadi Umum perlu diklasifikasi dari RoPA.",
    personalDataSpecific:
      specificData ||
      "Tidak ada Data Pribadi Spesifik yang terdeteksi otomatis dari RoPA.",
    transferMechanism: activity.transferMechanism || "Tidak Diketahui",
    protectionMechanism:
      activity.exportProtectionMechanism ||
      activity.technicalMeasures ||
      "Tidak diketahui",
    recipientControls:
      activity.technicalMeasures && activity.organizationalMeasures
        ? "Memadai"
        : activity.technicalMeasures || activity.organizationalMeasures
          ? "Cukup memadai"
          : "Tidak diketahui",
    writtenAgreement: activity.processorContractLink
      ? "Memadai"
      : "Tidak diketahui",
    onwardTransfer: "Tidak diketahui",
  };

  return recalculateTiaDraft({
    assessmentId: assessment.id,
    activityId: activity.id,
    activityName: activity.activityName,
    departmentName: assessment.department.name,
    picName: activity.picName,
    picEmail: activity.picEmail,
    generatedAt: new Date().toISOString(),
    metadata: {
      dpo: "Pejabat Pelindung Data Pribadi",
      date: formatIndonesianDate(new Date()),
      responsiblePerson: `${activity.picName} (${activity.picEmail})`,
      relatedUnits: [assessment.department.name, activity.recipients]
        .filter(Boolean)
        .join(", "),
    },
    transfer,
    rows: buildRows(),
    risks: [],
    evaluation: emptyEvaluation(),
  });
}

export function recalculateTiaDraft(draft: TiaDraft): TiaDraft {
  const risks = calculateTiaRisks(draft.transfer, draft.risks);
  const evaluation = calculateTiaEvaluation(risks, draft.evaluation.proceduralSteps);

  return {
    ...draft,
    risks,
    evaluation,
  };
}

export function calculateTiaRisks(
  transfer: TiaTransferDetails,
  previousRisks: TiaRisk[] = [],
): TiaRisk[] {
  const riskDrafts: Array<Omit<TiaRisk, "mitigation"> & { mitigation: string }> = [
    {
      id: "transmission-security",
      title: "Kebocoran, Akses Tidak Sah, atau Intersepsi Data Saat Transmisi",
      ...riskFromProtectionMechanism(transfer.protectionMechanism),
      mitigation:
        "Pastikan mekanisme transfer terenkripsi, akses dibatasi, kunci dikelola, dan bukti konfigurasi keamanan tersedia.",
    },
    {
      id: "recipient-control",
      title:
        "Kegagalan Kontrol Teknis atau Operasional pada Pihak Penerima",
      ...riskFromControlRating(
        transfer.recipientControls,
        "Kontrol teknis dan operasional pada pihak penerima",
      ),
      mitigation:
        "Minta bukti kontrol teknis, sertifikasi, audit report, incident response, backup, dan recovery capability dari penerima.",
    },
    {
      id: "agreement-misuse",
      title:
        "Penyalahgunaan, Pengungkapan Tanpa Otorisasi, atau Penggunaan Data di Luar Tujuan Pemrosesan",
      ...riskFromControlRating(
        transfer.writtenAgreement,
        "Perjanjian atau pengaturan tertulis",
      ),
      mitigation:
        "Lengkapi perjanjian tertulis dengan purpose limitation, confidentiality, audit rights, subprocessor control, dan breach notification.",
    },
    {
      id: "onward-transfer",
      title: "Transfer Lanjutan ke Pihak atau Negara Lain Tanpa Pengendalian",
      ...riskFromOnwardTransfer(transfer.onwardTransfer),
      mitigation:
        "Batasi onward transfer, wajibkan approval tertulis, dan minta daftar subprocessor atau negara lanjutan sebelum transfer berjalan.",
    },
    {
      id: "data-subject-rights",
      title: "Hak Subjek Data Pribadi Sulit Dipenuhi atau Ditegakkan di Negara Tujuan",
      ...riskFromCountryCategory(transfer.regulationCategory),
      mitigation:
        "Pastikan kanal hak subjek data tetap tersedia, SLA penanganan jelas, dan penerima wajib membantu pemenuhan hak subjek data.",
    },
  ];

  return riskDrafts.map((risk) => ({
    ...risk,
    mitigation:
      previousRisks.find((previous) => previous.id === risk.id)?.mitigation ||
      risk.mitigation,
  }));
}

export function calculateTiaEvaluation(
  risks: TiaRisk[],
  existingProceduralSteps?: string,
): TiaEvaluation {
  const highCount = risks.filter((risk) => risk.level === "Risiko Tinggi").length;
  const mediumCount = risks.filter(
    (risk) => risk.level === "Risiko Menengah",
  ).length;
  const lowCount = risks.filter((risk) => risk.level === "Risiko Rendah").length;

  if (lowCount === 5) {
    return {
      highCount,
      mediumCount,
      lowCount,
      status: "Transfer dapat dilakukan",
      recommendation:
        "Seluruh parameter dinilai berisiko rendah, sehingga transfer dapat dilakukan.",
      proceduralSteps:
        existingProceduralSteps ||
        "Simpan bukti penilaian, kontrak, safeguard transfer, dan jadwalkan review berkala.",
    };
  }

  if (highCount > 2) {
    return {
      highCount,
      mediumCount,
      lowCount,
      status: "Transfer tidak disarankan",
      recommendation:
        "Terdapat lebih dari 2 risiko tinggi, sehingga transfer tidak disarankan untuk dilakukan.",
      proceduralSteps:
        existingProceduralSteps ||
        "Tunda transfer sampai DPO/Legal menyetujui mitigasi, perjanjian, dan bukti safeguard yang memadai.",
    };
  }

  if (highCount >= 1) {
    return {
      highCount,
      mediumCount,
      lowCount,
      status: "Konsultasi DPO",
      recommendation:
        "Terdapat risiko tinggi dalam hasil evaluasi, sehingga perlu dikonsultasikan terlebih dahulu kepada DPO sebelum transfer dilakukan.",
      proceduralSteps:
        existingProceduralSteps ||
        "Konsultasikan risiko tinggi kepada DPO, lengkapi mitigasi, dan simpan approval sebelum transfer.",
    };
  }

  return {
    highCount,
    mediumCount,
    lowCount,
    status: "Perlu mitigasi tambahan",
    recommendation:
      "Masih terdapat risiko menengah, sehingga transfer perlu dikaji lebih lanjut dan memerlukan mitigasi tambahan.",
    proceduralSteps:
      existingProceduralSteps ||
      "Dokumentasikan mitigasi tambahan, owner, tenggat, dan bukti review sebelum transfer rutin.",
  };
}

export function mergeSavedTiaDraft(generated: TiaDraft, notes: string | null) {
  if (!notes?.trim()) {
    return generated;
  }

  try {
    const parsed = JSON.parse(notes) as Partial<SavedTiaDraftNotes>;

    if (parsed.kind === TIA_DRAFT_NOTE_KIND && isTiaDraft(parsed.draft)) {
      return recalculateTiaDraft(parsed.draft);
    }
  } catch {
    return generated;
  }

  return generated;
}

export function serializeTiaDraftNotes(draft: TiaDraft): string {
  return JSON.stringify({
    kind: TIA_DRAFT_NOTE_KIND,
    savedAt: new Date().toISOString(),
    draft: recalculateTiaDraft(draft),
  } satisfies SavedTiaDraftNotes);
}

function buildRows(): TiaDraftRow[] {
  return [
    row(
      "row-1",
      "1",
      "Informasi Umum",
      "Apa dasar regulasi atau instrumen hukum yang digunakan untuk transfer Data Pribadi ini?",
      "Jelaskan dokumen atau dasar yang membuat transfer sah, misalnya kontrak, klausul PDP, atau instrumen hukum lain.",
      "legalInstrument",
    ),
    row(
      "row-2",
      "2",
      "Informasi Umum",
      "Tujuan Transfer Data Pribadi",
      "Jelaskan tujuan transfer Data Pribadi.",
      "transferPurpose",
    ),
    row(
      "row-3",
      "3",
      "Informasi Umum",
      "Pihak Penerima Data Pribadi",
      "Sebutkan pihak penerima Data Pribadi.",
      "recipient",
    ),
    row(
      "row-4",
      "4",
      "Informasi Umum",
      "Negara Penerima Data Pribadi",
      "Sebutkan tempat penyimpanan dan akses terhadap Data Pribadi.",
      "destinationCountry",
    ),
    row(
      "row-5",
      "5",
      "Informasi Umum",
      "Regulasi Pelindungan Data Pribadi Negara Penerima",
      "Gunakan referensi country list dari dokumen TIA atau lengkapi manual.",
      "destinationRegulation",
    ),
    row(
      "row-6",
      "6",
      "Informasi Umum",
      "Kategori Regulasi Pelindungan Data Pribadi",
      "Kategori sesuai country list: Khusus, Parsial, atau Tidak ada.",
      "regulationCategory",
    ),
    row(
      "row-7",
      "7",
      "Mekanisme Transfer",
      "Lingkup Sektor Transfer Data Pribadi",
      "Jelaskan proses bisnis atau kegiatan operasional yang menjadi konteks transfer.",
      "sectorScope",
    ),
    row(
      "row-8a",
      "8A",
      "Mekanisme Transfer",
      "Kategori Data Pribadi Umum",
      "Jelaskan jenis Data Pribadi umum yang dikirim kepada pihak penerima.",
      "personalDataGeneral",
    ),
    row(
      "row-8b",
      "8B",
      "Mekanisme Transfer",
      "Kategori Data Pribadi Spesifik",
      "Jelaskan jenis Data Pribadi spesifik atau sensitif yang dikirim.",
      "personalDataSpecific",
    ),
    row(
      "row-9",
      "9",
      "Mekanisme Transfer",
      "Mekanisme Transfer Data Pribadi",
      "Jelaskan metode atau sarana transfer Data Pribadi.",
      "transferMechanism",
    ),
    row(
      "row-10",
      "10",
      "Penilaian Risiko",
      "Mekanisme Pelindungan Transfer Data Pribadi",
      "Jelaskan langkah perlindungan transfer yang menjamin hak Subjek Data Pribadi.",
      "protectionMechanism",
    ),
  ];
}

function row(
  id: string,
  number: string,
  section: TiaDraftRow["section"],
  question: string,
  guidance: string,
  field: keyof TiaTransferDetails,
): TiaDraftRow {
  return {
    id,
    number,
    section,
    question,
    guidance,
    field,
  };
}

function riskFromProtectionMechanism(value: string) {
  if (!value.trim() || normalize(value) === "tidakdiketahui") {
    return {
      level: "Risiko Tinggi" as const,
      explanation:
        "Potensi risiko tinggi karena mekanisme pengamanan dalam Transfer Data Pribadi tidak diketahui atau belum dapat dibuktikan memadai.",
    };
  }

  return {
    level: "Risiko Rendah" as const,
    explanation:
      "Transfer Data Pribadi telah dilakukan melalui mekanisme pengamanan yang memadai.",
  };
}

function riskFromControlRating(value: TiaControlRating, subject: string) {
  const normalized = normalize(value);

  if (normalized === "memadai") {
    return {
      level: "Risiko Rendah" as const,
      explanation: `${subject} dinilai memadai, sehingga risikonya rendah.`,
    };
  }

  if (normalized === "cukupmemadai") {
    return {
      level: "Risiko Menengah" as const,
      explanation: `${subject} dinilai cukup memadai, namun masih perlu ditelaah lebih lanjut.`,
    };
  }

  if (normalized === "tidakmemadai") {
    return {
      level: "Risiko Tinggi" as const,
      explanation: `${subject} dinilai tidak memadai, sehingga risikonya tinggi.`,
    };
  }

  return {
    level: "Risiko Tinggi" as const,
    explanation: `${subject} tidak diketahui, sehingga risikonya tinggi.`,
  };
}

function riskFromOnwardTransfer(value: TiaOnwardTransfer) {
  if (value === "Ya" || value === "Tidak diketahui") {
    return {
      level: "Risiko Tinggi" as const,
      explanation:
        value === "Ya"
          ? "Terdapat kemungkinan Transfer Data Pribadi lebih lanjut ke negara lain oleh pihak penerima, sehingga risikonya tinggi."
          : "Kemungkinan Transfer Data Pribadi lebih lanjut belum diketahui, sehingga risikonya tinggi.",
    };
  }

  return {
    level: "Risiko Rendah" as const,
    explanation:
      "Tidak terdapat kemungkinan Transfer Data Pribadi lebih lanjut ke negara lain oleh pihak penerima, sehingga risikonya rendah.",
  };
}

function riskFromCountryCategory(value: TiaRegulationCategory) {
  if (value === "Khusus") {
    return {
      level: "Risiko Rendah" as const,
      explanation:
        "Negara tujuan transfer memiliki aturan Pelindungan Data Pribadi yang khusus, sehingga risikonya rendah.",
    };
  }

  if (value === "Parsial") {
    return {
      level: "Risiko Menengah" as const,
      explanation:
        "Negara tujuan transfer memiliki aturan Pelindungan Data Pribadi yang parsial, sehingga perlu dikaji lebih lanjut terkait kecukupan aturan tersebut.",
    };
  }

  return {
    level: "Risiko Tinggi" as const,
    explanation:
      value === "Tidak ada"
        ? "Negara tujuan transfer tidak memiliki aturan Pelindungan Data Pribadi, sehingga risikonya tinggi."
        : "Kategori regulasi negara tujuan belum diketahui, sehingga risikonya tinggi.",
  };
}

function emptyEvaluation(): TiaEvaluation {
  return {
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    status: "Perlu mitigasi tambahan",
    recommendation: "",
    proceduralSteps: "",
  };
}

function isSpecificPersonalData(value: string) {
  const normalized = value.toLowerCase();

  return [
    "criminal",
    "kejahatan",
    "catatan kejahatan",
    "health",
    "kesehatan",
    "biometric",
    "biometrik",
    "genetic",
    "genetika",
    "geolocation",
    "geolokasi",
    "financial",
    "keuangan",
    "anak",
    "spesifik",
    "religion",
    "tax",
    "record",
  ].some((signal) => normalized.includes(signal));
}

function normalize(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function formatIndonesianDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isTiaDraft(value: unknown): value is TiaDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<TiaDraft>;
  return (
    typeof candidate.assessmentId === "string" &&
    typeof candidate.activityId === "string" &&
    Boolean(candidate.metadata) &&
    Boolean(candidate.transfer) &&
    Array.isArray(candidate.risks)
  );
}
