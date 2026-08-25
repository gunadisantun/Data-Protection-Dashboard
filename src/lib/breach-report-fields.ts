export type BreachReportStatus = "Draft" | "Submitted" | "Finalized";

export type BreachReportFieldType =
  | "text"
  | "textarea"
  | "date"
  | "radio"
  | "checkbox";

export type BreachReportField = {
  id: string;
  label: string;
  help?: string;
  type: BreachReportFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export type BreachReportSection = {
  id: string;
  title: string;
  description?: string;
  fields: BreachReportField[];
};

export const breachReportSections: BreachReportSection[] = [
  {
    id: "incident",
    title: "I. Tentang Kegagalan Pelindungan Data Pribadi",
    description:
      "Mengikuti formulir laporan dugaan kebocoran data pribadi Komdigi.",
    fields: [
      {
        id: "discoverySource",
        label: "Bagaimana awalnya Anda mengetahui kebocoran data pribadi?",
        help: "Jelaskan dari mana dan kapan Anda mengetahui kebocoran data.",
        type: "textarea",
        required: true,
      },
      {
        id: "chronology",
        label: "Jelaskan kronologi terjadinya insiden.",
        help:
          "Mulai dari percobaan masuk sampai berhasil masuk ke sistem, tindakan pelaku, dan aktor yang terlibat.",
        type: "textarea",
        required: true,
      },
      {
        id: "cyberIncident",
        label: "Apakah kebocoran data pribadi disebabkan oleh insiden siber?",
        type: "radio",
        required: true,
        options: ["Ya", "Tidak", "Tidak tahu"],
      },
      {
        id: "attackStart",
        label: "Perkiraan waktu mulai penyerangan/insiden",
        type: "date",
      },
      {
        id: "attackEnd",
        label: "Perkiraan waktu akhir penyerangan/insiden",
        type: "date",
      },
      {
        id: "generalDataDetails",
        label: "Data pribadi umum yang mengalami kebocoran",
        help: "Misalnya nama, alamat, user ID, password, telepon, email, dll.",
        type: "textarea",
        required: true,
      },
      {
        id: "specificDataDetails",
        label: "Data pribadi lainnya/spesifik yang mengalami kebocoran",
        help: "Misalnya data kesehatan, finansial, kriminal, biometrik, dll.",
        type: "textarea",
      },
      {
        id: "affectedUsersEstimate",
        label: "Perkiraan jumlah pengguna yang terkena dampak",
        type: "text",
        required: true,
      },
      {
        id: "affectedRecordsEstimate",
        label: "Perkiraan jumlah record data pribadi yang bocor",
        type: "text",
        required: true,
      },
      {
        id: "affectedSubjectCategories",
        label: "Kategori pemilik data pribadi yang terkena dampak",
        type: "checkbox",
        required: true,
        options: [
          "Karyawan",
          "Pengguna",
          "Pelanggan/Calon pelanggan",
          "Pasien",
          "Subscriber",
          "Murid/Mahasiswa",
          "Lainnya",
        ],
      },
      {
        id: "affectedSubjectOther",
        label: "Detail kategori lainnya",
        type: "text",
      },
      {
        id: "impactLikelihood",
        label:
          "Bagaimana kemungkinan terjadinya dampak terhadap pemilik data pribadi?",
        type: "radio",
        required: true,
        options: ["Sangat mungkin", "Netral", "Tidak mungkin", "Belum diketahui"],
      },
      {
        id: "impactDetails",
        label: "Tuliskan detail kemungkinan dampak",
        type: "textarea",
      },
      {
        id: "securityImpacted",
        label:
          "Apakah aspek keamanan informasi sistem elektronik terkena dampaknya?",
        type: "radio",
        required: true,
        options: ["Ya", "Tidak", "Tidak tahu"],
      },
      {
        id: "securityAspects",
        label: "Jika Ya, aspek keamanan apa saja yang terganggu?",
        type: "checkbox",
        options: [
          "Kerahasiaan (Confidentiality)",
          "Keutuhan (Integrity)",
          "Ketersediaan (Availability)",
        ],
      },
      {
        id: "recoveryTime",
        label: "Waktu pemulihan",
        type: "radio",
        options: [
          "Regular",
          "Supplemented",
          "Extended",
          "Not recoverable",
          "Complete",
          "Belum diketahui",
        ],
      },
      {
        id: "companyImpact",
        label: "Dampak bagi perusahaan",
        type: "radio",
        options: ["Tinggi", "Sedang", "Rendah", "Belum diketahui"],
      },
      {
        id: "cyberIncidentDetails",
        label: "Khusus insiden siber, jelaskan lebih detail jawaban Anda",
        type: "textarea",
      },
    ],
  },
  {
    id: "remediation",
    title: "II. Perbaikan yang Dilakukan",
    fields: [
      {
        id: "preventiveStepsBefore",
        label:
          "Langkah yang telah dilakukan untuk mencegah kebocoran sebelum insiden",
        type: "textarea",
      },
      {
        id: "trainingLastTwoYears",
        label:
          "Apakah pegawai terkait pemrosesan data pribadi menerima pelatihan PDP dalam 2 tahun terakhir?",
        type: "radio",
        options: ["Ya", "Tidak", "Tidak tahu"],
      },
      {
        id: "containmentActions",
        label:
          "Tindakan yang telah dilakukan atau rencana tindakan untuk menutup celah kebocoran",
        help:
          "Contoh: update password, patching, isolasi sistem, pelatihan keamanan informasi, dll.",
        type: "textarea",
        required: true,
      },
      {
        id: "recurrencePreventionPlan",
        label:
          "Langkah mencegah kembali terjadinya kebocoran, rencana waktu penyelesaian, dan bukti efektivitas",
        type: "textarea",
      },
      {
        id: "subjectNotificationStatus",
        label:
          "Apakah pemilik data pribadi telah diberitahu tentang insiden kebocoran ini?",
        type: "radio",
        options: [
          "Ya, kami telah memberitahu pemilik data pribadi yang mengalami kebocoran",
          "Kami sedang dalam proses pemberitahuan kepada pemilik data pribadi",
          "Tidak, mereka sudah mengetahui kebocoran data pribadi",
          "Tidak, namun kami berencana melakukan hal tersebut",
          "Tidak, kami memutuskan untuk tidak melakukan hal tersebut",
          "Lainnya",
        ],
      },
      {
        id: "subjectNotificationDetails",
        label: "Detail pemberitahuan kepada pemilik data pribadi",
        type: "textarea",
      },
    ],
  },
  {
    id: "profile",
    title: "III. Profil Sistem Elektronik dan Organisasi",
    fields: [
      { id: "organizationName", label: "Nama organisasi", type: "text", required: true },
      { id: "organizationAddress", label: "Alamat organisasi", type: "textarea" },
      {
        id: "systemName",
        label: "Nama Sistem Elektronik",
        type: "text",
        required: true,
      },
      {
        id: "processingPurpose",
        label: "Tujuan Pemrosesan Data Pribadi",
        type: "textarea",
        required: true,
      },
      { id: "responsibleName", label: "Penanggung jawab - Nama", type: "text" },
      { id: "responsibleEmail", label: "Penanggung jawab - Email", type: "text" },
      { id: "dpoName", label: "Pejabat/Petugas PDP - Nama", type: "text" },
      { id: "dpoEmail", label: "Pejabat/Petugas PDP - Email", type: "text" },
      {
        id: "signingPlaceDate",
        label: "Tempat dan tanggal penandatanganan",
        type: "text",
      },
      {
        id: "authorizedSigner",
        label: "Nama pejabat yang berwenang",
        type: "text",
      },
      { id: "signerPosition", label: "Jabatan pejabat yang berwenang", type: "text" },
    ],
  },
];

export function emptyBreachReportAnswers() {
  return Object.fromEntries(
    breachReportSections.flatMap((section) =>
      section.fields.map((field) => [field.id, field.type === "checkbox" ? [] : ""]),
    ),
  ) as Record<string, string | string[]>;
}

export function getBreachReportField(fieldId: string) {
  return breachReportSections
    .flatMap((section) => section.fields)
    .find((field) => field.id === fieldId);
}
