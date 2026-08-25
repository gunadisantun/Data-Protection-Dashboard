import questionsData from "@/lib/self-assessment-questions.json";

export const selfAssessmentAnswerValues = [
  "Ya",
  "Sebagian",
  "Tidak",
  "Tidak Tahu",
  "Tidak Berlaku",
  "Ada",
  "Tidak Ada",
  "Tidak Relevan",
  "N/A",
] as const;

export const selfAssessmentL1AnswerValues = [
  "Ya",
  "Sebagian",
  "Tidak",
  "Tidak Tahu",
  "Tidak Berlaku",
] as const;

export const selfAssessmentL2AnswerValues = [
  "Ada",
  "Sebagian",
  "Tidak Ada",
  "Tidak Tahu",
  "Tidak Relevan",
] as const;

export const selfAssessmentSelectableAnswerValues = selfAssessmentL1AnswerValues;

export const selfAssessmentPriorityValues = ["High", "Medium", "Low"] as const;
export const selfAssessmentKindValues = [
  "UNIT",
  "ADDITIONAL",
  "GOVERNANCE",
] as const;
export const selfAssessmentStatusValues = ["Draft", "Submitted", "Finalized"] as const;
export const selfAssessmentActionStatusValues = [
  "Open",
  "In Progress",
  "Done",
  "Deferred",
] as const;

export type SelfAssessmentKind = "UNIT" | "ADDITIONAL" | "GOVERNANCE";
export type SelfAssessmentAnswer = (typeof selfAssessmentAnswerValues)[number];
export type SelfAssessmentPriority = (typeof selfAssessmentPriorityValues)[number];
export type SelfAssessmentStatus = (typeof selfAssessmentStatusValues)[number];
export type SelfAssessmentActionStatus =
  (typeof selfAssessmentActionStatusValues)[number];

export type SelfAssessmentQuestion = {
  id: string;
  kind: SelfAssessmentKind;
  level?: "L1" | "L2" | "L3";
  number: number;
  triggerOrOwner: string;
  area: string;
  question: string;
  applicability: string;
  evidence: string;
  reference: string;
  module?: string;
  triggerModules?: string[];
  triggerQuestionIds?: string[];
  nextStep?: string;
  owner?: string;
  categoryScoring?: string;
  principleCategory?: string;
  articleReference?: string;
  riskHint?: string;
  codexNote?: string;
  noteRequirement?: string;
  noteRequiredWhen?: string;
  evidenceRequirementFlag?: string;
  minimumEvidence?: string;
  recommendedEvidence?: string;
  evidenceUiType?: string;
  evidenceValidation?: string;
  uiFields?: string;
  noEvidenceFallback?: string;
  minimumUploadEvidence?: number;
  riskId?: string;
  nonComplianceRisk?: string;
  administrativeRisk?: string;
  criminalRisk?: string;
  civilRisk?: string;
  defaultSeverity?: string;
  reportGapTrigger?: string;
  suggestedRemediation?: string;
  questionType?: string;
  dedupHint?: string;
  answerOptions?: string[];
  compliantAnswers?: string[];
  gapAnswers?: string[];
  noteAnswers?: string[];
  evidenceAnswers?: string[];
  closedAnswerNote?: string;
};

export type SelfAssessmentAnswerState = {
  answer: SelfAssessmentAnswer | "";
  note: string;
  pic: string;
  priority: SelfAssessmentPriority | "";
  evidenceFiles?: SelfAssessmentEvidenceFile[];
};

export type SelfAssessmentAnswers = Record<string, SelfAssessmentAnswerState>;

export type SelfAssessmentEvidenceFile = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageBucket: string;
  storagePath: string;
  uploadedAt: string;
  uploadedBy?: string | null;
};

export type SelfAssessmentDataMapRow = {
  id: string;
  activityName: string;
  subjectCategory: string;
  personalDataType: string;
  hasSpecificData: string;
  dataSource: string;
  processingPurpose: string;
  lawfulBasis: string;
  storageLocation: string;
  accessParties: string;
  recipientSharing: string;
  vendorProcessor: string;
  crossBorderCloud: string;
  retention: string;
  securityControl: string;
  unitPic: string;
  notes: string;
};

export type SelfAssessmentActionPlanItem = {
  id: string;
  source: SelfAssessmentKind;
  questionId: string;
  finding: string;
  practicalRisk: string;
  followUp: string;
  owner: string;
  targetDate: string;
  status: SelfAssessmentActionStatus;
  priority: SelfAssessmentPriority;
  note: string;
};

export type NormalizedSelfAssessmentAnswer =
  | "COMPLIANT"
  | "PARTIAL"
  | "GAP"
  | "UNKNOWN"
  | "NOT_RELEVANT";

export const selfAssessmentQuestions =
  questionsData as SelfAssessmentQuestion[];

export function normalizeAnswer(answer: string | undefined | null): NormalizedSelfAssessmentAnswer {
  if (answer === "Ya" || answer === "Ada") {
    return "COMPLIANT";
  }
  if (
    answer === "Sebagian" ||
    answer === "1 - Initial" ||
    answer === "2 - Partial"
  ) {
    return "PARTIAL";
  }
  if (
    answer === "Tidak" ||
    answer === "Tidak Ada" ||
    answer === "Belum" ||
    answer === "0 - Not Implemented"
  ) {
    return "GAP";
  }
  if (
    answer === "3 - Implemented" ||
    answer === "4 - Managed" ||
    answer === "5 - Optimized"
  ) {
    return "COMPLIANT";
  }
  if (answer === "Tidak Relevan" || answer === "Tidak Berlaku" || answer === "N/A") {
    return "NOT_RELEVANT";
  }
  return "UNKNOWN";
}

export function emptySelfAssessmentAnswers(): SelfAssessmentAnswers {
  return Object.fromEntries(
    selfAssessmentQuestions.map((question) => [
      question.id,
      {
        answer: "",
        note: "",
        pic: "",
        priority: "",
        evidenceFiles: [],
      },
    ]),
  );
}

export function emptySelfAssessmentDataMap(): SelfAssessmentDataMapRow[] {
  return [];
}

export function scoreAnswer(answer: string | undefined) {
  const normalized = normalizeAnswer(answer);
  if (normalized === "COMPLIANT") {
    return 1;
  }
  if (normalized === "PARTIAL") {
    return 0.5;
  }
  if (normalized === "GAP" || normalized === "UNKNOWN") {
    return 0;
  }
  return null;
}

export function scoreAnswerLevel(answer: string | undefined) {
  return scoreAnswer(answer);
}

export function statusFromPercentage(percentage: number | null) {
  if (percentage === null) {
    return "N/A";
  }
  if (percentage >= 0.85) {
    return "Baik";
  }
  if (percentage >= 0.65) {
    return "Perlu Perbaikan";
  }
  return "Prioritas Tinggi";
}

export function calculateSelfAssessmentSummary(
  answers: SelfAssessmentAnswers,
  allowedKinds?: SelfAssessmentKind[],
) {
  const kinds = allowedKinds ?? ["UNIT", "ADDITIONAL", "GOVERNANCE"];
  const questions = selfAssessmentQuestions.filter((question) =>
    kinds.includes(question.kind) &&
    isScoredSelfAssessmentQuestion(question) &&
    isSelfAssessmentQuestionApplicable(question, answers),
  );
  const byArea = new Map<
    string,
    { area: string; applicable: number; score: number; total: number }
  >();
  const byKind = new Map<
    SelfAssessmentKind,
    { kind: SelfAssessmentKind; applicable: number; score: number; total: number }
  >();

  let applicable = 0;
  let score = 0;

  for (const question of questions) {
    const answerScore = scoreAnswer(answers[question.id]?.answer);
    if (answerScore === null) {
      continue;
    }

    applicable += 1;
    score += answerScore;

    const area = byArea.get(question.area) ?? {
      area: question.area,
      applicable: 0,
      score: 0,
      total: 0,
    };
    area.applicable += 1;
    area.score += answerScore;
    area.total += 1;
    byArea.set(question.area, area);

    const kind = byKind.get(question.kind) ?? {
      kind: question.kind,
      applicable: 0,
      score: 0,
      total: 0,
    };
    kind.applicable += 1;
    kind.score += answerScore;
    kind.total += 1;
    byKind.set(question.kind, kind);
  }

  const percentage = applicable ? score / applicable : null;
  const mapScoreRows = <
    T extends { applicable: number; score: number; total: number },
  >(
    rows: T[],
  ) =>
    rows.map((row) => {
      const rowPercentage = row.applicable ? row.score / row.applicable : null;
      return {
        ...row,
        percentage: rowPercentage,
        status: statusFromPercentage(rowPercentage),
      };
    });

  return {
    applicable,
    score,
    percentage,
    status: statusFromPercentage(percentage),
    answered: questions.filter((question) => answers[question.id]?.answer).length,
    totalQuestions: questions.length,
    gaps: questions.filter((question) =>
      isSelfAssessmentGap(question, answers[question.id]),
    ).length,
    byArea: mapScoreRows([...byArea.values()]).sort((a, b) =>
      a.area.localeCompare(b.area),
    ),
    byKind: mapScoreRows([...byKind.values()]).sort((a, b) =>
      a.kind.localeCompare(b.kind),
    ),
  };
}

export function generateSelfAssessmentActionPlan(
  answers: SelfAssessmentAnswers,
  allowedKinds?: SelfAssessmentKind[],
): SelfAssessmentActionPlanItem[] {
  const kinds = allowedKinds ?? ["UNIT", "ADDITIONAL", "GOVERNANCE"];
  return selfAssessmentQuestions
    .filter(
      (question) =>
        kinds.includes(question.kind) &&
        isScoredSelfAssessmentQuestion(question) &&
        isSelfAssessmentQuestionApplicable(question, answers),
    )
    .filter((question) =>
      isSelfAssessmentGap(question, answers[question.id]),
    )
    .map((question) => {
      const answer = answers[question.id];
      const evidenceStrength = getEvidenceStrength(question, answer);
      const priority =
        answer?.priority ||
        (resolveDefaultSeverity(question, answer, evidenceStrength) === "High"
          ? "High"
          : "Medium");
      return {
        id: `action-${question.id}`,
        source: question.kind,
        questionId: question.id,
        finding: buildGapFinding(answer?.answer, question),
        practicalRisk: buildPracticalRisk(answer, question, evidenceStrength),
        followUp: buildRecommendedAction(answer?.answer, question),
        owner: answer?.pic || "",
        targetDate: "",
        status: "Open",
        priority,
        note: answer?.note || "",
      };
    });
}

export function kindLabel(kind: SelfAssessmentKind) {
  return {
    UNIT: "Level 1 Screening",
    ADDITIONAL: "Level 2 Assessment",
    GOVERNANCE: "DPO Review",
  }[kind];
}

export function allowedKindsForRole(role: "MasterAdmin" | "DPO" | "User") {
  void role;
  return ["UNIT", "ADDITIONAL"] as SelfAssessmentKind[];
}

export function isSelfAssessmentQuestionApplicable(
  question: SelfAssessmentQuestion,
  answers: SelfAssessmentAnswers,
) {
  if (question.kind !== "ADDITIONAL") {
    return true;
  }

  const triggerQuestionIds = question.triggerQuestionIds ?? [];
  if (!triggerQuestionIds.length) {
    return false;
  }

  return triggerQuestionIds.some((triggerId) =>
    ["Ya", "Sebagian", "Tidak Tahu"].includes(answers[triggerId]?.answer ?? ""),
  );
}

export function countTriggeredL2Questions(answers: SelfAssessmentAnswers) {
  return selfAssessmentQuestions.filter(
    (question) =>
      question.kind === "ADDITIONAL" &&
      isSelfAssessmentQuestionApplicable(question, answers),
  ).length;
}

export function isSelfAssessmentGapAnswer(answer: string | undefined) {
  const normalized = normalizeAnswer(answer);
  return normalized === "GAP" || normalized === "UNKNOWN" || normalized === "PARTIAL";
}

export function isScoredSelfAssessmentQuestion(question: SelfAssessmentQuestion) {
  return question.level === "L2" || question.kind === "ADDITIONAL";
}

export function answerOptionsForQuestion(question: SelfAssessmentQuestion) {
  if (question.answerOptions?.length) {
    const closedOptions = isScoredSelfAssessmentQuestion(question)
      ? selfAssessmentL2AnswerValues
      : selfAssessmentL1AnswerValues;
    const allowed = new Set<string>(closedOptions);
    const filtered = question.answerOptions.filter((option) => allowed.has(option));
    return filtered.length ? filtered : [...closedOptions];
  }

  return isScoredSelfAssessmentQuestion(question)
    ? [...selfAssessmentL2AnswerValues]
    : [...selfAssessmentL1AnswerValues];
}

export function getRequiredEvidenceCount(
  question: SelfAssessmentQuestion,
  answerState?: SelfAssessmentAnswerState,
) {
  void question;
  void answerState;
  return 0;
}

export type EvidenceStrength = "None" | "Weak" | "Adequate" | "Strong";

export function getEvidenceStrength(
  question: SelfAssessmentQuestion,
  answerState?: SelfAssessmentAnswerState,
): EvidenceStrength {
  const files = answerState?.evidenceFiles ?? [];
  const requiredCount = getRequiredEvidenceCount(question, answerState);
  const score = scoreAnswerLevel(answerState?.answer);

  if (!files.length) {
    return "None";
  }

  if (requiredCount && files.length < requiredCount) {
    return "Weak";
  }

  if (score === 1) {
    const note = (answerState?.note ?? "").toLowerCase();
    const hasContext =
      /owner|pic|pemilik|tanggal|periode|versi|status|berlaku|sistem|proses|unit/.test(note);
    return hasContext ? "Strong" : "Adequate";
  }

  return files.length >= 2 ? "Adequate" : "Weak";
}

export function isSelfAssessmentGap(
  question: SelfAssessmentQuestion,
  answerState?: SelfAssessmentAnswerState,
) {
  if (!isScoredSelfAssessmentQuestion(question)) {
    return false;
  }

  const normalized = normalizeAnswer(answerState?.answer);
  return (
    normalized === "GAP" ||
    normalized === "PARTIAL" ||
    normalized === "UNKNOWN"
  );
}

export function getSelfAssessmentValidationIssues(
  answers: SelfAssessmentAnswers,
  allowedKinds?: SelfAssessmentKind[],
) {
  const kinds = allowedKinds ?? ["UNIT", "ADDITIONAL", "GOVERNANCE"];
  const issues: Array<{ questionId: string; message: string }> = [];

  for (const question of selfAssessmentQuestions) {
    if (!kinds.includes(question.kind) || !isSelfAssessmentQuestionApplicable(question, answers)) {
      continue;
    }

    const state = answers[question.id];
    const answer = state?.answer;

    if (!answer) {
      issues.push({
        questionId: question.id,
        message: `${question.id}: jawaban wajib diisi.`,
      });
      continue;
    }

  }

  return issues;
}

function buildGapFinding(
  answer: string | undefined,
  question: SelfAssessmentQuestion,
) {
  const statement = normalizeQuestionToStatement(question.question);
  const normalized = normalizeAnswer(answer);

  if (normalized === "UNKNOWN") {
    return `Belum ada kepastian atau bukti memadai bahwa ${statement}.`;
  }

  if (normalized === "PARTIAL") {
    return `Kontrol atau dokumentasi belum lengkap untuk memastikan bahwa ${statement}.`;
  }

  if (normalized === "GAP") {
    return `Belum terdapat kontrol, proses, atau bukti untuk memastikan bahwa ${statement}.`;
  }

  if (normalized === "COMPLIANT") {
    return `Evidence belum cukup kuat untuk membuktikan bahwa ${statement}.`;
  }

  return `Belum terdapat kontrol atau bukti memadai untuk memastikan bahwa ${statement}.`;
}

function normalizeQuestionToStatement(value: string) {
  const normalized = value
    .trim()
    .replace(/\?+$/g, "")
    .replace(/^Apakah\s+/i, "")
    .replace(/^Jika\s+/i, "ketika ")
    .replace(/^apabila\s+/i, "ketika ");

  return normalized.charAt(0).toLowerCase() + normalized.slice(1);
}

function buildRecommendedAction(
  answer: string | undefined,
  question: SelfAssessmentQuestion,
) {
  if (question.suggestedRemediation) {
    return question.suggestedRemediation;
  }

  const normalized = normalizeAnswer(answer);

  if (normalized === "UNKNOWN") {
    return "Klarifikasi ownership, bukti, dan kontrol yang berlaku dengan DPO/PIC PDP.";
  }

  if (normalized === "PARTIAL") {
    return `Lengkapi kontrol atau dokumentasi yang belum tersedia${question.evidence ? `, termasuk ${question.evidence}` : ""}.`;
  }

  return `Buat atau implementasikan kontrol yang diperlukan${question.evidence ? ` dan siapkan bukti minimal: ${question.evidence}` : ""}.`;
}

function resolveDefaultSeverity(
  question: SelfAssessmentQuestion,
  answerState: SelfAssessmentAnswerState | undefined,
  evidenceStrength: EvidenceStrength,
) {
  const raw = `${answerState?.priority || question.defaultSeverity || "Medium"}`.toLowerCase();
  const normalized = normalizeAnswer(answerState?.answer);
  if (containsCriminalIndicator(answerState?.note ?? "")) {
    return "High";
  }
  if (normalized === "GAP" || normalized === "UNKNOWN" || evidenceStrength === "None") {
    return raw.includes("critical") || raw.includes("high") ? "High" : "Medium";
  }
  if (raw.includes("critical") || raw.includes("high")) {
    return "High";
  }
  if (raw.includes("low")) {
    return "Low";
  }
  return "Medium";
}

function buildPracticalRisk(
  answerState: SelfAssessmentAnswerState | undefined,
  question: SelfAssessmentQuestion,
  evidenceStrength: EvidenceStrength,
) {
  const administrativeRisk =
    question.administrativeRisk ||
    "Risiko administratif dapat timbul apabila kewajiban yang dinilai termasuk lingkup Pasal 57 UU PDP.";
  const civilRisk =
    question.civilRisk ||
    "Risiko gugatan/ganti rugi dapat muncul bila gap merugikan Subjek Data Pribadi atau menghambat pemenuhan haknya.";
  const criminalRisk = containsCriminalIndicator(answerState?.note ?? "")
    ? question.criminalRisk ||
      "Terdapat indikasi yang perlu dievaluasi Legal/DPO terhadap unsur Pasal 65/66 UU PDP; jangan disimpulkan sebagai tindak pidana tanpa investigasi hukum."
    : "Risiko pidana tidak ditarik otomatis. Eskalasi hanya bila evidence menunjukkan perbuatan sengaja dan melawan hukum terkait memperoleh, mengumpulkan, mengungkapkan, menggunakan, membuat, atau memalsukan Data Pribadi.";

  return [
    `Finding/isu utama: ${buildGapFinding(answerState?.answer, question)}`,
    `Unit dan proses terdampak: ${question.applicability || "Unit/proses yang menjawab assessment ini."}`,
    `Pasal/area UU PDP: ${question.articleReference || question.reference || "-"}; prinsip/kategori: ${question.principleCategory || question.area}.`,
    `Jawaban unit: ${answerState?.answer || "Belum dijawab"}; catatan: ${answerState?.note || "-"}; evidence strength: ${evidenceStrength}.`,
    `Risiko ketidakpatuhan: ${question.nonComplianceRisk || "Bukti kepatuhan dan akuntabilitas PDP menjadi lemah."} ${administrativeRisk} ${criminalRisk} ${civilRisk}`,
    "Dampak praktis: proses dapat berjalan tanpa kontrol terdokumentasi, pembuktian kepatuhan menjadi sulit, dan tindak lanjut DPO/PIC bisa terlambat.",
    `Root cause sementara: ${answerState?.note ? "lihat catatan unit; perlu validasi DPO." : "belum ada catatan penyebab dari unit."}`,
    `Rekomendasi remediasi: ${buildRecommendedAction(answerState?.answer, question)}`,
    `Evidence yang masih perlu diminta: ${question.evidence || question.minimumEvidence || "Evidence relevan dengan owner/PIC, tanggal/periode, versi/status berlaku, dan konteks proses."}`,
    `Priority/owner/target: ${resolveDefaultSeverity(question, answerState, evidenceStrength)}; ${answerState?.pic || "owner belum ditentukan"}; target ditentukan saat review action plan.`,
  ].join("\n");
}

function containsCriminalIndicator(value: string) {
  return /sengaja|melawan hukum|tanpa hak|memperoleh|mengumpulkan|mengungkapkan|menggunakan|memalsukan|palsu|pasal\s*65|pasal\s*66/i.test(
    value,
  );
}
