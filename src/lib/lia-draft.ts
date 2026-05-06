import type { assessments, departments, ropaActivities } from "@/db/schema";

export const LIA_DRAFT_NOTE_KIND = "privacyvault.liaDraft.v1" as const;

type LiaAssessment = typeof assessments.$inferSelect & {
  department: typeof departments.$inferSelect;
  ropa: typeof ropaActivities.$inferSelect;
};

export type LiaDraftRow = {
  id: string;
  number: string;
  question: string;
  guidance: string;
  answer: string;
  notes: string;
};

export type LiaDraftSection = {
  id: "tujuan" | "kebutuhan" | "keseimbangan" | "dampak";
  title: string;
  conclusionLabel: string;
  rows: LiaDraftRow[];
  conclusion: string;
};

export type LiaDraft = {
  assessmentId: string;
  activityId: string;
  activityName: string;
  departmentName: string;
  picName: string;
  picEmail: string;
  legalBasis: string;
  riskLevel: string;
  generatedAt: string;
  sections: LiaDraftSection[];
  decision: {
    signer: string;
    date: string;
    nextReview: string;
  };
};

export type SavedLiaDraftNotes = {
  kind: typeof LIA_DRAFT_NOTE_KIND;
  savedAt: string;
  draft: LiaDraft;
};

export function buildLiaDraft(assessment: LiaAssessment): LiaDraft {
  const activity = assessment.ropa;
  const department = assessment.department;
  const dataTypes = joinList(activity.personalDataTypes);
  const subjects = joinList(activity.subjectCategories);
  const transfer = activity.isCrossBorder
    ? `Transfer lintas negara ke ${activity.destinationCountry || "negara tujuan"} melalui ${activity.transferMechanism || "mekanisme yang ditentukan"}.`
    : `Pemrosesan domestik melalui ${activity.transferMechanism || "mekanisme internal"}.`;
  const context = `${activity.sourceMechanism}. ${transfer} Retensi: ${activity.retentionPeriod}.`;
  const safeguards = [
    activity.technicalMeasures,
    activity.organizationalMeasures,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    assessmentId: assessment.id,
    activityId: activity.id,
    activityName: activity.activityName,
    departmentName: department.name,
    picName: activity.picName,
    picEmail: activity.picEmail,
    legalBasis: activity.legalBasis,
    riskLevel: activity.riskAssessmentLevel,
    generatedAt: new Date().toISOString(),
    sections: [
      {
        id: "tujuan",
        title: "Tujuan",
        conclusionLabel: "Kesimpulan Analisa Tujuan",
        rows: [
          row(
            "tujuan-1",
            "1",
            "Mengapa Anda ingin memproses data ini?",
            "Jelaskan tujuan bisnis atau operasional yang menjadi dasar pemrosesan.",
            activity.processingPurpose,
            "Diambil dari tujuan pemrosesan pada RoPA.",
          ),
          row(
            "tujuan-2",
            "2",
            "Manfaat apa yang diharapkan dari pemrosesan ini?",
            "Uraikan manfaat langsung bagi organisasi, fungsi bisnis, atau layanan.",
            `Mendukung ${department.name} untuk menjalankan ${activity.activityName} secara konsisten, terukur, dan dapat diaudit.`,
          ),
          row(
            "tujuan-3",
            "3",
            "Apakah ada pihak ketiga yang mendapatkan manfaat dari pemrosesan ini?",
            "Sebutkan penerima, pemroses, vendor, atau pihak lain yang menerima manfaat.",
            activity.recipients
              ? `Ya, penerima/manfaat terkait: ${activity.recipients}. Peran penerima: ${activity.dataReceiverRole || "perlu dikonfirmasi"}.`
              : "Tidak ada pihak ketiga yang secara langsung menerima manfaat di luar organisasi.",
          ),
          row(
            "tujuan-4",
            "4",
            "Apakah ada manfaat lebih luas bagi masyarakat dari pemrosesan ini?",
            "Pertimbangkan manfaat terhadap keamanan, kualitas layanan, atau akuntabilitas.",
            "Manfaat lebih luas terbatas pada peningkatan kualitas layanan, akuntabilitas operasional, dan tata kelola data pribadi.",
          ),
          row(
            "tujuan-5",
            "5",
            "Apa dampaknya jika pemrosesan ini tidak dapat dilakukan?",
            "Jelaskan konsekuensi apabila aktivitas tidak berjalan.",
            `Jika tidak dilakukan, proses terkait ${activity.previousProcess || "aktivitas sebelumnya"} hingga ${activity.nextProcess || "aktivitas lanjutan"} dapat terganggu.`,
          ),
        ],
        conclusion:
          "Tujuan pemrosesan dinilai jelas dan relevan, namun tetap memerlukan dokumentasi LIA final oleh PIC dan Legal.",
      },
      {
        id: "kebutuhan",
        title: "Kebutuhan",
        conclusionLabel: "Kesimpulan Analisa Kebutuhan",
        rows: [
          row(
            "kebutuhan-1",
            "1",
            "Apakah pemrosesan ini benar-benar membantu Anda mencapai tujuan Anda?",
            "Hubungkan pemrosesan dengan tujuan yang sudah ditetapkan.",
            `Ya. Pemrosesan ini secara langsung mendukung tujuan: ${activity.processingPurpose}.`,
          ),
          row(
            "kebutuhan-2",
            "2",
            "Apakah pemrosesan ini proporsional terhadap tujuan tersebut?",
            "Nilai apakah data, akses, retensi, dan cara pemrosesan sudah sepadan.",
            `Proporsional sepanjang kategori data dibatasi pada ${dataTypes || "data yang tercatat di RoPA"} dan akses hanya diberikan kepada pihak yang berwenang.`,
          ),
          row(
            "kebutuhan-3",
            "3",
            "Bisakah Anda mencapai tujuan yang sama tanpa melakukan pemrosesan data ini?",
            "Catat alternatif non-data pribadi bila tersedia.",
            "Alternatif tanpa pemrosesan data pribadi belum memadai untuk mencapai tujuan yang sama secara akurat dan dapat diaudit.",
          ),
          row(
            "kebutuhan-4",
            "4",
            "Bisakah Anda mencapai tujuan yang sama dengan memproses lebih sedikit data atau dengan cara yang lebih jelas atau kurang mengganggu?",
            "Tuliskan peluang minimisasi data atau metode yang lebih rendah risikonya.",
            `Minimisasi perlu diterapkan dengan membatasi subjek data pada ${subjects || "kategori yang relevan"} serta menghapus data setelah ${activity.retentionPeriod}.`,
          ),
        ],
        conclusion:
          "Pemrosesan diperlukan dan proporsional dengan catatan prinsip minimisasi, pembatasan akses, dan retensi tetap diterapkan.",
      },
      {
        id: "keseimbangan",
        title: "Keseimbangan",
        conclusionLabel: "Kesimpulan Analisa Keseimbangan",
        rows: [
          row(
            "keseimbangan-1",
            "1",
            "Data Pribadi apa saja yang diproses?",
            "Sebutkan kategori data pribadi dan data sensitif bila ada.",
            dataTypes || "Mengacu pada kategori data pribadi yang dicatat pada RoPA.",
          ),
          row(
            "keseimbangan-2",
            "2",
            "Apakah pernah ada hubungan sebelumnya dengan subjek data pribadi?",
            "Jelaskan relasi historis, kontraktual, layanan, atau interaksi sebelumnya.",
            activity.previousProcess
              ? `Ada hubungan/proses sebelumnya: ${activity.previousProcess}.`
              : "Hubungan sebelumnya perlu dikonfirmasi oleh PIC.",
          ),
          row(
            "keseimbangan-3",
            "3",
            "Apakah memproses data anak atau data penyandang disabilitas?",
            "Tandai subjek rentan yang memerlukan perlindungan tambahan.",
            hasVulnerableSubjects(activity.subjectCategories)
              ? "Ya, terdapat kategori subjek yang memerlukan perhatian tambahan. Perlindungan khusus wajib diterapkan."
              : "Tidak terindikasi memproses data anak atau penyandang disabilitas berdasarkan input RoPA.",
          ),
          row(
            "keseimbangan-4",
            "4",
            "Bagaimana pemrosesan data dilakukan?",
            "Ringkas sumber data, media, transfer, dan retensi.",
            context,
          ),
          row(
            "keseimbangan-5",
            "5",
            "Apakah ada bukti mengenai ekspektasi subjek data terkait pemrosesan? (misalnya dari riset pasar atau konsultasi)",
            "Catat pemberitahuan, konsultasi, survei, riset, atau dasar ekspektasi subjek data.",
            "Ekspektasi subjek data perlu dijaga melalui pemberitahuan privasi, transparansi tujuan, dan kanal pemenuhan hak.",
          ),
          row(
            "keseimbangan-6",
            "6",
            "Apakah ada faktor lain dalam situasi tertentu yang membuat subjek data mengharapkan atau tidak mengharapkan pemrosesan?",
            "Pertimbangkan konteks layanan, sensitivitas data, risiko, dan hubungan dengan subjek data.",
            `Faktor tambahan: dasar pemrosesan adalah ${activity.legalBasis}; tingkat risiko RoPA ${activity.riskAssessmentLevel}.`,
          ),
          row(
            "keseimbangan-7",
            "7",
            "Apakah ada mekanisme untuk pemenuhan hak Subjek Data Pribadi?",
            "Jelaskan kanal akses, koreksi, penghapusan, keberatan, atau permintaan lain.",
            activity.dataSubjectRights ||
              "Mekanisme pemenuhan hak subjek data perlu dipastikan tersedia dan mudah diakses.",
          ),
        ],
        conclusion:
          "Kepentingan organisasi dapat diseimbangkan dengan hak subjek data apabila transparansi, kontrol akses, dan kanal hak subjek berjalan efektif.",
      },
      {
        id: "dampak",
        title: "Penilaian Dampak",
        conclusionLabel: "Kesimpulan Penilaian Dampak",
        rows: [
          row(
            "dampak-1",
            "1",
            "Apa dampak yang mungkin timbul dari pemrosesan terhadap individu?",
            "Identifikasi dampak privasi, kerugian, ketidaknyamanan, atau kehilangan kontrol.",
            `Dampak potensial mencakup risiko privasi terkait ${dataTypes || "data yang diproses"}, terutama jika akses, transfer, atau retensi tidak dikendalikan.`,
          ),
          row(
            "dampak-2",
            "2",
            "Apakah individu akan kehilangan kendali atas penggunaan data pribadinya?",
            "Nilai transparansi, pilihan, dan kontrol subjek data.",
            activity.isCrossBorder
              ? "Ada potensi berkurangnya kontrol karena data ditransfer ke luar Indonesia; informasi transfer dan safeguard perlu dijelaskan kepada subjek data."
              : "Kontrol individu dapat tetap terjaga sepanjang informasi pemrosesan dan mekanisme hak subjek data tersedia.",
          ),
          row(
            "dampak-3",
            "3",
            "Seberapa besar kemungkinan dan tingkat keparahan dari dampak yang mungkin terjadi?",
            "Gunakan tingkat risiko, volume, sensitivitas data, dan mekanisme mitigasi.",
            `Kemungkinan/keparahan dinilai ${activity.riskAssessmentLevel}; volume data ${activity.volumeLevel}.`,
          ),
          row(
            "dampak-4",
            "4",
            "Apakah ada individu yang kemungkinan akan menolak pemrosesan atau merasa terganggu?",
            "Catat kemungkinan keberatan dan sumber friksi untuk subjek data.",
            "Keberatan mungkin muncul apabila tujuan, penerima, atau retensi tidak dikomunikasikan dengan jelas.",
          ),
          row(
            "dampak-5",
            "5",
            "Apakah organisasi telah menerapkan langkah teknis dan organisasi yang memadai untuk mencegah kegagalan dalam pelindungan data pribadi?",
            "Ringkas kontrol keamanan, tata kelola, dan operasional.",
            safeguards ||
              "Langkah teknis dan organisasi perlu dilengkapi oleh PIC sebelum LIA disetujui.",
          ),
          row(
            "dampak-6",
            "6",
            "Dapatkah Anda menerapkan langkah-langkah pelindungan untuk meminimalkan dampaknya?",
            "Tuliskan mitigasi tambahan yang wajib dijalankan.",
            "Mitigasi yang disarankan: minimisasi data, pembatasan akses, enkripsi, audit akses berkala, dan review retensi.",
          ),
          row(
            "dampak-7",
            "7",
            "Apakah pemrosesan termasuk dalam kategori risiko tinggi sebagaimana diatur dalam UU PDP?",
            "Evaluasi risiko tinggi berdasarkan data sensitif, skala, geolokasi, automated decision-making, atau indikator lain.",
            isHighRisk(activity)
              ? "Ya, terdapat indikator risiko tinggi. Pertimbangkan DPIA paralel sebelum pelaksanaan penuh."
              : "Tidak terindikasi risiko tinggi berdasarkan parameter saat ini, namun legal review tetap diperlukan.",
          ),
        ],
        conclusion:
          "Dampak dapat diterima apabila mitigasi diterapkan dan hasil review Legal menyetujui keseimbangan kepentingan.",
      },
    ],
    decision: {
      signer: `${activity.picName} (${activity.picEmail})`,
      date: formatIndonesianDate(new Date()),
      nextReview: nextReviewDate(),
    },
  };
}

export function mergeSavedLiaDraft(generated: LiaDraft, notes: string | null) {
  if (!notes?.trim()) {
    return generated;
  }

  try {
    const parsed = JSON.parse(notes) as Partial<SavedLiaDraftNotes>;

    if (parsed.kind === LIA_DRAFT_NOTE_KIND && isLiaDraft(parsed.draft)) {
      return parsed.draft;
    }
  } catch {
    return generated;
  }

  return generated;
}

export function serializeLiaDraftNotes(draft: LiaDraft): string {
  return JSON.stringify({
    kind: LIA_DRAFT_NOTE_KIND,
    savedAt: new Date().toISOString(),
    draft,
  } satisfies SavedLiaDraftNotes);
}

function row(
  id: string,
  number: string,
  question: string,
  guidance: string,
  answer: string,
  notes = "",
): LiaDraftRow {
  return {
    id,
    number,
    question,
    guidance,
    answer,
    notes,
  };
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

function isHighRisk(activity: typeof ropaActivities.$inferSelect) {
  const personalData = activity.personalDataTypes.join(" ").toLowerCase();

  return (
    activity.riskAssessmentLevel === "High" ||
    activity.volumeLevel === "Large" ||
    activity.usesAutomatedDecisionMaking ||
    [
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
      "genetic",
      "genetika",
      "anak",
      "spesifik",
    ].some((signal) => personalData.includes(signal))
  );
}

function nextReviewDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return formatIndonesianDate(date);
}

function formatIndonesianDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isLiaDraft(value: unknown): value is LiaDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<LiaDraft>;
  return (
    typeof candidate.assessmentId === "string" &&
    typeof candidate.activityId === "string" &&
    Array.isArray(candidate.sections) &&
    candidate.sections.length > 0 &&
    Boolean(candidate.decision)
  );
}
