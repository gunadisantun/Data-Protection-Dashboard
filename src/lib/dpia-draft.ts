import type { assessments, departments, ropaActivities } from "@/db/schema";
import {
  hasHighRiskCategory,
  highRiskCategoryOptions,
} from "@/lib/high-risk-categories";

export const DPIA_DRAFT_NOTE_KIND = "privacyvault.dpiaDraft.v2" as const;
export const LEGACY_DPIA_DRAFT_NOTE_KIND = "privacyvault.dpiaDraft.v1" as const;

type DpiaAssessment = typeof assessments.$inferSelect & {
  department: typeof departments.$inferSelect;
  ropa: typeof ropaActivities.$inferSelect;
};

export type DpiaRiskLevel =
  | "Low"
  | "Low to High"
  | "Moderate"
  | "Moderate to High"
  | "High";

export type DpiaRiskProfile = {
  impact: number;
  likelihood: number;
  score: number;
  level: DpiaRiskLevel;
  priority: "Low Priority" | "Medium Priority" | "High Priority";
};

export type DpiaExistingTreatment = {
  id: string;
  name: string;
  description: string;
  evidence: string;
  owner: string;
  effectivenessNote: string;
};

export type DpiaTreatmentPlan = {
  id: string;
  action: string;
  owner: string;
  dueDate: string;
  status: "Planned" | "In Progress" | "Implemented" | "Deferred";
  expectedEffect: string;
};

export type DpiaFieldRow = {
  id: string;
  number: string;
  question: string;
  guidance: string;
  answer: string;
  notes: string;
};

export type DpiaDraftSection = {
  id: "processing" | "identification" | "parties";
  title: string;
  rows: DpiaFieldRow[];
};

export type DpiaHighRiskSignal = {
  id: string;
  label: string;
  description: string;
  selected: boolean;
};

export type DpiaRisk = {
  id: string;
  number: number;
  source: string;
  event: string;
  legalImpact: string;
  riskOwner: string;
  residualProfile: DpiaRiskProfile;
  targetProfile: DpiaRiskProfile;
  existingTreatments: DpiaExistingTreatment[];
  treatmentPlans: DpiaTreatmentPlan[];
  monitoringStatus: string;
  targetTimeline: string;
  mitigationApproval: string;
  relatedUnits: string[];
};

export type DpiaDraft = {
  assessmentId: string;
  activityId: string;
  activityName: string;
  departmentName: string;
  picName: string;
  picEmail: string;
  generatedAt: string;
  metadata: {
    processOwnerPosition: string;
    dpo: string;
    date: string;
    responsiblePerson: string;
    relatedUnits: string;
  };
  sections: DpiaDraftSection[];
  highRiskSignals: DpiaHighRiskSignal[];
  highRiskExplanation: string;
  probabilityCriteria: string[];
  impactCriteria: string[];
  risks: DpiaRisk[];
  conclusion: string;
  monitoringPlan: string;
  publicSummary: string;
  signatures: {
    version: string;
    date: string;
    preparedBy: string;
    reviewedBy: string;
    approvedBy: string;
    acknowledgedBy: string;
  };
};

export type SavedDpiaDraftNotes = {
  kind: typeof DPIA_DRAFT_NOTE_KIND;
  savedAt: string;
  draft: DpiaDraft;
};

export const probabilityCriteria = [
  "Risiko mungkin terjadi sangat jarang, paling banyak satu kali dalam setahun.",
  "Risiko mungkin terjadi hanya sekali dalam 6 bulan atau sekitar 2 kali dalam setahun.",
  "Risiko pernah terjadi namun tidak sering, sekitar sekali dalam 4 bulan.",
  "Risiko pernah terjadi sekali dalam 2 bulan atau sekitar 5-8 kali setahun.",
  "Risiko pernah terjadi sekali dalam 1 bulan atau sekitar 9-12 kali setahun.",
];

export const impactCriteria = [
  "Subjek Data Pribadi tidak akan terpengaruh atau hanya mengalami ketidaknyamanan ringan.",
  "Subjek Data Pribadi mungkin menghadapi ketidaknyamanan signifikan tanpa dampak jangka panjang.",
  "Subjek Data Pribadi mungkin menghadapi gangguan signifikan yang dapat diatasi dengan usaha wajar.",
  "Subjek Data Pribadi mungkin menghadapi konsekuensi serius yang sulit diatasi.",
  "Subjek Data Pribadi mungkin menghadapi konsekuensi signifikan atau tidak dapat diubah.",
];

export function buildDpiaDraft(assessment: DpiaAssessment): DpiaDraft {
  const activity = assessment.ropa;
  const department = assessment.department;
  const dataTypes = joinList(activity.personalDataTypes);
  const subjects = joinList(activity.subjectCategories);
  const transferDescription = activity.isCrossBorder
    ? `Transfer lintas negara ke ${activity.destinationCountry || "negara tujuan"} dengan mekanisme ${activity.transferMechanism || "yang perlu dikonfirmasi"} dan perlindungan ${activity.exportProtectionMechanism || "yang perlu dilengkapi"}.`
    : "Tidak ada transfer lintas negara berdasarkan input RoPA.";
  const relatedUnits = [department.name, activity.recipients, activity.dataReceiverRole]
    .filter(Boolean)
    .join(", ");
  const highRiskSignals = buildHighRiskSignals(activity);
  const selectedSignals = highRiskSignals
    .filter((signal) => signal.selected)
    .map((signal) => signal.label);

  return {
    assessmentId: assessment.id,
    activityId: activity.id,
    activityName: activity.activityName,
    departmentName: department.name,
    picName: activity.picName,
    picEmail: activity.picEmail,
    generatedAt: new Date().toISOString(),
    metadata: {
      processOwnerPosition: `${department.name} Process Owner`,
      dpo: "Pejabat Pelindung Data Pribadi",
      date: formatIndonesianDate(new Date()),
      responsiblePerson: `${activity.picName} (${activity.picEmail})`,
      relatedUnits: relatedUnits || department.name,
    },
    sections: [
      {
        id: "processing",
        title: "Analisa Pemrosesan Data",
        rows: [
          row(
            "processing-1",
            "1",
            "Deskripsi Aktivitas Pemrosesan Data Pribadi",
            "Jelaskan bagaimana data diperoleh, diolah, disimpan, ditransfer, dan dihapus.",
            `${activity.processDescription}. Data diperoleh melalui ${activity.sourceMechanism}; disimpan di ${activity.storageLocation || "lokasi yang perlu dikonfirmasi"}; retensi ${activity.retentionPeriod || "perlu dilengkapi"}. ${transferDescription}`,
          ),
          row(
            "processing-2",
            "2",
            "Tujuan Pemrosesan Data Pribadi",
            "Tuliskan tujuan pemrosesan yang spesifik dan dapat diuji.",
            activity.processingPurpose,
          ),
          row(
            "processing-3",
            "3",
            "Latar belakang kebutuhan pemrosesan Data Pribadi",
            "Jelaskan kepentingan Pengendali Data Pribadi dan kebutuhan operasionalnya.",
            `Aktivitas ${activity.activityName} diperlukan untuk mendukung tujuan ${activity.processingPurpose}. Dasar pemrosesan yang dipilih adalah ${activity.legalBasis}.`,
          ),
          row(
            "processing-4",
            "4",
            "Data Pribadi siapa yang diproses dan jenis Data Pribadi yang diproses",
            "Sebutkan kategori subjek data dan kategori data pribadi.",
            `Subjek data: ${subjects || "perlu dilengkapi"}. Jenis data: ${dataTypes || "perlu dilengkapi"}.`,
          ),
          row(
            "processing-5",
            "5",
            "Unit Kerja yang menjadi penanggung jawab pemrosesan",
            "Sebutkan process owner dan unit kerja terkait.",
            `${department.name} bertindak sebagai process owner. PIC: ${activity.picName}.`,
          ),
          row(
            "processing-6",
            "6",
            "Konsultasi Pemangku Kepentingan",
            "Dokumentasikan pemangku kepentingan internal dan eksternal yang perlu dikonsultasikan.",
            `Pemangku kepentingan awal: ${relatedUnits || department.name}. Legal, DPO, Security, dan Risk Owner perlu meninjau hasil DPIA ini sebelum pemrosesan berjalan penuh.`,
          ),
          row(
            "processing-7",
            "7",
            "Analisis Potensi Risiko Tinggi (Pasal 34 ayat (2) UU PDP)",
            "Centang kategori potensi risiko tinggi yang relevan.",
            selectedSignals.length
              ? selectedSignals.join(", ")
              : "Tidak ada kategori risiko tinggi tambahan yang terdeteksi otomatis selain penilaian risiko RoPA.",
          ),
          row(
            "processing-8",
            "8",
            "Uraikan bagaimana kategori potensi risiko tinggi dilakukan",
            "Jelaskan sistem, data, proses, dan kontrol untuk kategori risiko tinggi yang dicentang.",
            selectedSignals.length
              ? `Kategori yang perlu dijelaskan lebih lanjut: ${selectedSignals.join(", ")}. ${activity.riskContext || "PIC perlu melengkapi detail sistem, proses, dan kontrol mitigasi untuk setiap kategori."}${activity.riskRegisterReference ? ` Referensi Risk Register: ${activity.riskRegisterReference}.` : ""}`
              : activity.riskContext ||
                "PIC perlu mengonfirmasi kembali apakah terdapat indikator risiko tinggi lain yang belum tercatat di RoPA.",
          ),
        ],
      },
      {
        id: "identification",
        title: "Identifikasi",
        rows: [
          row(
            "identification-9",
            "9",
            "Dasar pemrosesan Data Pribadi yang digunakan",
            "Sebutkan dasar pemrosesan berdasarkan Pasal 20 UU PDP.",
            activity.legalBasis,
          ),
          row(
            "identification-10",
            "10",
            "Kepentingan dari Pengendali Data Pribadi",
            "Jelaskan kepentingan organisasi dalam melakukan pemrosesan.",
            `Kepentingan utama adalah menjalankan ${activity.activityName} secara akuntabel untuk ${department.name}.`,
          ),
          row(
            "identification-11",
            "11",
            "Rasionalitas pemilihan dasar pemrosesan Data Pribadi",
            "Jelaskan alasan dasar pemrosesan, relevansi pemberitahuan, dan transparansi kepada subjek data.",
            `Dasar ${activity.legalBasis} dipilih karena mendukung tujuan pemrosesan yang dinyatakan. Pemberitahuan privasi perlu memastikan informasi tujuan, kategori data, penerima, retensi, dan hak subjek data tersedia secara relevan.`,
          ),
          row(
            "identification-12",
            "12",
            "Bentuk dasar pemrosesan dan evidence",
            "Sebutkan media atau dokumen pendukung dasar pemrosesan.",
            activity.processorContractLink
              ? `Evidence awal: ${activity.processorContractLink}. PIC perlu menambahkan dokumen pemberitahuan, kontrak, atau dasar hukum yang relevan.`
              : "PIC perlu menambahkan dokumen pemberitahuan, kontrak, persetujuan, atau dasar hukum yang relevan.",
          ),
          row(
            "identification-13",
            "13",
            "Jangka waktu retensi Data Pribadi",
            "Sebutkan masa retensi dan alasan pemilihannya.",
            activity.retentionPeriod || "Masa retensi perlu dilengkapi dan dikaitkan dengan tujuan pemrosesan.",
          ),
          row(
            "identification-14",
            "14",
            "Prosedur retensi dan pemusnahan Data Pribadi",
            "Jelaskan mekanisme penghapusan atau pemusnahan yang aman.",
            `Data perlu dihapus atau dimusnahkan setelah ${activity.retentionPeriod || "masa retensi berakhir"} dengan bukti audit penghapusan dan kontrol akses yang memadai.`,
          ),
          row(
            "identification-15",
            "15",
            "Langkah untuk memastikan akurasi, kelengkapan, dan konsistensi Data Pribadi",
            "Jelaskan validasi data dan proses pembaruan.",
            activity.previousProcess
              ? `Akurasi dijaga melalui proses sebelumnya: ${activity.previousProcess}. PIC perlu melengkapi validasi data dan mekanisme pembaruan.`
              : "PIC perlu melengkapi validasi data, mekanisme pembaruan, dan kontrol perubahan data.",
          ),
          row(
            "identification-16",
            "16",
            "Langkah untuk menerapkan Data Minimisation",
            "Jelaskan pembatasan data, akses, dan tujuan.",
            `Data dibatasi pada ${dataTypes || "kategori yang diperlukan"} untuk subjek ${subjects || "yang relevan"}. Akses harus diberikan berdasarkan kebutuhan tugas.`,
          ),
          row(
            "identification-17",
            "17",
            "Kontrol pengamanan Data Pribadi",
            "Sebutkan kontrol teknis dan organisasi.",
            activity.technicalMeasures ||
              "Kontrol teknis perlu dilengkapi, termasuk enkripsi, pembatasan akses, logging, dan review akses.",
          ),
          row(
            "identification-18",
            "18",
            "Mekanisme atau kebijakan lain untuk mencegah pelanggaran PDP",
            "Sebutkan kebijakan kontrol akses, enkripsi, vendor, incident response, dan audit.",
            activity.organizationalMeasures ||
              "Kebijakan organisasi perlu dilengkapi, termasuk prosedur incident response, review vendor, dan audit berkala.",
          ),
          row(
            "identification-19",
            "19",
            "Mekanisme pemenuhan hak Subjek Data Pribadi",
            "Jelaskan kanal permintaan dan komplain subjek data.",
            activity.dataSubjectRights ||
              "Mekanisme pemenuhan hak subjek data perlu dipastikan tersedia, terdokumentasi, dan mudah diakses.",
          ),
        ],
      },
      {
        id: "parties",
        title: "Peran Para Pihak",
        rows: [
          row(
            "parties-20",
            "20",
            "Profil Pihak Eksternal yang terlibat",
            "Sebutkan peran pihak eksternal, kontrak, dan tanggung jawabnya.",
            activity.recipients
              ? `${activity.recipients} terlibat sebagai ${activity.dataReceiverRole || "pihak eksternal yang perlu diklasifikasi"}. Kontrak/perjanjian: ${activity.processorContractLink || "perlu dilengkapi"}.`
              : "Tidak ada pihak eksternal yang tercatat. PIC perlu mengonfirmasi apakah ada vendor, prosesor, atau pengendali bersama.",
          ),
          row(
            "parties-21",
            "21",
            "PDP Maturity Checklist terhadap kepatuhan Pihak Eksternal",
            "Catat hasil uji tuntas pihak eksternal.",
            activity.recipients
              ? "Pihak eksternal perlu menjalani review PDP maturity, termasuk kontrol keamanan, subprocessor, lokasi pemrosesan, dan mekanisme breach notification."
              : "Tidak diperlukan checklist pihak eksternal kecuali vendor atau prosesor ditambahkan.",
          ),
          row(
            "parties-22",
            "22",
            "Transfer Data Pribadi keluar wilayah hukum Republik Indonesia",
            "Jelaskan penerima, pelaku transfer, negara tujuan, dan pengamanan transfer.",
            transferDescription,
          ),
        ],
      },
    ],
    highRiskSignals,
    highRiskExplanation: selectedSignals.length
      ? `DPIA diprioritaskan karena terdeteksi ${selectedSignals.join(", ")}. Setiap kategori perlu divalidasi oleh PIC, Legal, DPO, Security, dan Risk Owner.${activity.riskRegisterReference ? ` Referensi Risk Register: ${activity.riskRegisterReference}.` : ""}`
      : "DPIA dibuat berdasarkan trigger rule engine. PIC perlu mengonfirmasi kategori risiko tinggi yang relevan.",
    probabilityCriteria,
    impactCriteria,
    risks: [],
    conclusion:
      "Pemrosesan dapat dilanjutkan setelah risiko prioritas tinggi dimitigasi, kontrol keamanan dan transparansi diperkuat, dan DPO/Legal menyetujui residual risk.",
    monitoringPlan:
      "Monitoring dilakukan melalui review kontrol akses, audit retensi, pengecekan vendor, dan evaluasi ulang DPIA minimal setiap 12 bulan atau saat terjadi perubahan tujuan, data, vendor, atau transfer.",
    publicSummary:
      `${activity.activityName} memproses ${dataTypes || "data pribadi"} untuk ${activity.processingPurpose}. Organisasi menerapkan kontrol keamanan, pembatasan akses, dan mekanisme hak subjek data untuk mengurangi risiko privasi.`,
    signatures: {
      version: "v0.1 Draft",
      date: formatIndonesianDate(new Date()),
      preparedBy: `${activity.picName} / ${department.name}`,
      reviewedBy: "DPO / Legal",
      approvedBy: "Process Owner",
      acknowledgedBy: "Risk Owner",
    },
  };
}

export function mergeSavedDpiaDraft(generated: DpiaDraft, notes: string | null) {
  if (!notes?.trim()) {
    return generated;
  }

  try {
    const parsed = JSON.parse(notes) as Partial<SavedDpiaDraftNotes>;

    if (
      (parsed.kind === DPIA_DRAFT_NOTE_KIND ||
        parsed.kind === LEGACY_DPIA_DRAFT_NOTE_KIND) &&
      isDpiaDraft(parsed.draft)
    ) {
      return normalizeDpiaDraft(parsed.draft);
    }
  } catch {
    return generated;
  }

  return generated;
}

export function serializeDpiaDraftNotes(draft: DpiaDraft): string {
  return JSON.stringify({
    kind: DPIA_DRAFT_NOTE_KIND,
    savedAt: new Date().toISOString(),
    draft: normalizeDpiaDraft(draft),
  } satisfies SavedDpiaDraftNotes);
}

export function calculateRiskProfile(
  impact: number,
  likelihood: number,
): DpiaRiskProfile {
  const safeImpact = clampScore(impact);
  const safeLikelihood = clampScore(likelihood);
  const score = safeImpact * safeLikelihood;

  return {
    impact: safeImpact,
    likelihood: safeLikelihood,
    score,
    level: riskLevelFromScore(score),
    priority: priorityFromScore(score),
  };
}

export function createEmptyDpiaRisk(number: number): DpiaRisk {
  return {
    id: createDraftId("risk"),
    number,
    source: "",
    event: "",
    legalImpact: "",
    riskOwner: "",
    residualProfile: calculateRiskProfile(3, 3),
    targetProfile: calculateRiskProfile(2, 2),
    existingTreatments: [],
    treatmentPlans: [],
    monitoringStatus: "Open",
    targetTimeline: "",
    mitigationApproval: "Menunggu Review Risk Owner",
    relatedUnits: [],
  };
}

export function createEmptyExistingTreatment(): DpiaExistingTreatment {
  return {
    id: createDraftId("control"),
    name: "",
    description: "",
    evidence: "",
    owner: "",
    effectivenessNote: "",
  };
}

export function createEmptyTreatmentPlan(): DpiaTreatmentPlan {
  return {
    id: createDraftId("plan"),
    action: "",
    owner: "",
    dueDate: "",
    status: "Planned",
    expectedEffect: "",
  };
}

function normalizeDpiaDraft(draft: DpiaDraft): DpiaDraft {
  return {
    ...draft,
    risks: Array.isArray(draft.risks)
      ? draft.risks.map((risk, index) => normalizeDpiaRisk(risk, index + 1))
      : [],
  };
}

function normalizeDpiaRisk(risk: unknown, fallbackNumber: number): DpiaRisk {
  if (!risk || typeof risk !== "object") {
    return createEmptyDpiaRisk(fallbackNumber);
  }

  const candidate = risk as Partial<DpiaRisk> & LegacyDpiaRisk;
  const residualProfile = normalizeRiskProfile(
    candidate.residualProfile,
    candidate.impact,
    candidate.likelihood,
    candidate.level,
  );
  const targetProfile = normalizeRiskProfile(
    candidate.targetProfile,
    undefined,
    undefined,
    candidate.targetLevel,
  );
  const legacyTreatment = stringValue(candidate.existingTreatment);
  const legacyPlan = stringValue(candidate.mitigation);

  return {
    id: stringValue(candidate.id) || createDraftId("risk"),
    number: numberValue(candidate.number, fallbackNumber),
    source: stringValue(candidate.source),
    event: stringValue(candidate.event),
    legalImpact: stringValue(candidate.legalImpact),
    riskOwner: stringValue(candidate.riskOwner),
    residualProfile,
    targetProfile,
    existingTreatments: Array.isArray(candidate.existingTreatments)
      ? candidate.existingTreatments.map(normalizeExistingTreatment)
      : legacyTreatment
        ? [
            {
              id: createDraftId("control"),
              name: "Existing Treatment",
              description: legacyTreatment,
              evidence: "",
              owner: stringValue(candidate.riskOwner),
              effectivenessNote: `Residual risk: ${residualProfile.level} (${residualProfile.score})`,
            },
          ]
        : [],
    treatmentPlans: Array.isArray(candidate.treatmentPlans)
      ? candidate.treatmentPlans.map(normalizeTreatmentPlan)
      : legacyPlan
        ? [
            {
              id: createDraftId("plan"),
              action: legacyPlan,
              owner: stringValue(candidate.riskOwner),
              dueDate: stringValue(candidate.targetTimeline),
              status: "Planned",
              expectedEffect: `Target risk: ${targetProfile.level} (${targetProfile.score})`,
            },
          ]
        : [],
    monitoringStatus: stringValue(candidate.monitoringStatus) || "Open",
    targetTimeline: stringValue(candidate.targetTimeline),
    mitigationApproval:
      stringValue(candidate.mitigationApproval) || "Menunggu Review Risk Owner",
    relatedUnits: normalizeStringList(candidate.relatedUnits),
  };
}

function normalizeExistingTreatment(
  treatment: DpiaExistingTreatment,
): DpiaExistingTreatment {
  return {
    id: treatment.id || createDraftId("control"),
    name: treatment.name || "",
    description: treatment.description || "",
    evidence: treatment.evidence || "",
    owner: treatment.owner || "",
    effectivenessNote: treatment.effectivenessNote || "",
  };
}

function normalizeTreatmentPlan(plan: DpiaTreatmentPlan): DpiaTreatmentPlan {
  return {
    id: plan.id || createDraftId("plan"),
    action: plan.action || "",
    owner: plan.owner || "",
    dueDate: plan.dueDate || "",
    status: plan.status || "Planned",
    expectedEffect: plan.expectedEffect || "",
  };
}

function normalizeRiskProfile(
  profile: DpiaRiskProfile | undefined,
  fallbackImpact: unknown,
  fallbackLikelihood: unknown,
  fallbackLevel: unknown,
) {
  if (
    profile &&
    typeof profile.impact === "number" &&
    typeof profile.likelihood === "number"
  ) {
    return calculateRiskProfile(profile.impact, profile.likelihood);
  }

  if (typeof fallbackImpact === "number" || typeof fallbackLikelihood === "number") {
    return calculateRiskProfile(
      numberValue(fallbackImpact, 3),
      numberValue(fallbackLikelihood, 3),
    );
  }

  return riskProfileFromLevel(fallbackLevel);
}

function riskProfileFromLevel(level: unknown) {
  switch (level) {
    case "Low":
      return calculateRiskProfile(2, 2);
    case "Low to High":
      return calculateRiskProfile(3, 3);
    case "Moderate":
      return calculateRiskProfile(3, 4);
    case "Moderate to High":
      return calculateRiskProfile(4, 4);
    case "High":
      return calculateRiskProfile(5, 5);
    default:
      return calculateRiskProfile(3, 3);
  }
}

type LegacyDpiaRisk = {
  impact?: number;
  likelihood?: number;
  level?: DpiaRiskLevel;
  existingTreatment?: string;
  mitigation?: string;
  targetLevel?: DpiaRiskLevel;
  relatedUnits?: string | string[];
};

function buildHighRiskSignals(
  activity: typeof ropaActivities.$inferSelect,
): DpiaHighRiskSignal[] {
  const personalData = activity.personalDataTypes.join(" ").toLowerCase();
  const containsAnyPersonalDataTerm = (terms: string[]) =>
    terms.some((signal) => personalData.includes(signal));
  const sensitive = containsAnyPersonalDataTerm([
    "geolocation",
    "geolokasi",
    "biometric",
    "biometrik",
    "health",
    "kesehatan",
    "criminal",
    "kejahatan",
    "financial",
    "keuangan",
    "religion",
    "agama",
    "genetic",
    "genetika",
    "specific",
    "spesifik",
    "sensitif",
  ]);
  const systematicMonitoring = containsAnyPersonalDataTerm([
    "geolocation",
    "geolokasi",
    "location",
    "lokasi",
    "tracking",
    "pemantauan",
    "monitoring",
    "scoring",
    "penskoran",
    "profiling",
    "evaluasi",
  ]);
  const dataMatching = containsAnyPersonalDataTerm([
    "matching",
    "pencocokan",
    "combination",
    "combined",
    "kombinasi",
    "penggabungan",
  ]);

  return highRiskCategoryOptions.map((category) => {
    const selectedFromRopa = hasHighRiskCategory(
      activity.highRiskCategories,
      category.id,
    );
    const inferred =
      category.id === "automated-legal-significant-effect"
        ? activity.usesAutomatedDecisionMaking
        : category.id === "specific-personal-data"
          ? sensitive || hasVulnerableSubjects(activity.subjectCategories)
          : category.id === "large-scale-processing"
            ? activity.volumeLevel === "Large"
            : category.id === "systematic-evaluation-scoring-monitoring"
              ? systematicMonitoring
              : category.id === "data-matching-combination"
                ? dataMatching
                : false;

    return {
      id: category.id,
      label: category.shortLabel,
      description: category.label,
      selected: selectedFromRopa || inferred,
    };
  });
}

function row(
  id: string,
  number: string,
  question: string,
  guidance: string,
  answer: string,
  notes = "",
): DpiaFieldRow {
  return {
    id,
    number,
    question,
    guidance,
    answer,
    notes,
  };
}

function riskLevelFromScore(score: number): DpiaRiskLevel {
  if (score <= 5) {
    return "Low";
  }

  if (score <= 10) {
    return "Low to High";
  }

  if (score <= 15) {
    return "Moderate";
  }

  if (score <= 20) {
    return "Moderate to High";
  }

  return "High";
}

function priorityFromScore(
  score: number,
): "Low Priority" | "Medium Priority" | "High Priority" {
  if (score >= 16) {
    return "High Priority";
  }

  if (score >= 9) {
    return "Medium Priority";
  }

  return "Low Priority";
}

function clampScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(value || 1)));
}

function joinList(values: string[]) {
  return values.filter(Boolean).join(", ");
}

function hasVulnerableSubjects(subjects: string[]) {
  return subjects.some((subject) =>
    ["children", "anak", "disabilitas", "disability"].some((signal) =>
      subject.toLowerCase().includes(signal),
    ),
  );
}

function formatIndonesianDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeStringList(value: unknown) {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function createDraftId(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isDpiaDraft(value: unknown): value is DpiaDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DpiaDraft>;
  return (
    typeof candidate.assessmentId === "string" &&
    typeof candidate.activityId === "string" &&
    Array.isArray(candidate.sections) &&
    Array.isArray(candidate.risks) &&
    Boolean(candidate.metadata)
  );
}
