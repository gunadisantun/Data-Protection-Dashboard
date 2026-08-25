import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import {
  getEvidenceStrength,
  isScoredSelfAssessmentQuestion,
  isSelfAssessmentQuestionApplicable,
  normalizeAnswer,
  selfAssessmentQuestions,
  type EvidenceStrength,
  type NormalizedSelfAssessmentAnswer,
  type SelfAssessmentActionPlanItem,
  type SelfAssessmentAnswers,
  type SelfAssessmentEvidenceFile,
  type SelfAssessmentQuestion,
} from "@/lib/self-assessment";

type PdfAssessment = {
  assessmentNumber: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
  department?: { name: string } | null;
  creator?: { fullName: string; email: string } | null;
  finalizer?: { fullName: string; email: string } | null;
  answers: SelfAssessmentAnswers;
  actionPlan: SelfAssessmentActionPlanItem[];
};

type PdfKit = {
  pdf: PDFDocument;
  regular: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  bold: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  page: PDFPage;
  y: number;
  section: string;
};

type StatusCount = {
  compliant: number;
  partial: number;
  gap: number;
  unknown: number;
  notRelevant: number;
  naValid: number;
  naInvalid: number;
};

type ReportQuestion = {
  question: SelfAssessmentQuestion;
  answer: string;
  note: string;
  normalized: NormalizedSelfAssessmentAnswer;
  isNaValid: boolean;
  isApplicableForScore: boolean;
  score: number;
  evidenceFiles: SelfAssessmentEvidenceFile[];
  evidenceStrength: EvidenceStrength;
  evidenceRequired: boolean;
  isEvidenceGap: boolean;
  isEvidenceRequest: boolean;
  isClarification: boolean;
  priority: "Critical" | "High" | "Medium" | "Low";
};

type ConsolidatedFinding = {
  key: string;
  title: string;
  template: ReturnType<typeof resolveFindingTemplate>;
  items: ReportQuestion[];
  priority: "Critical" | "High" | "Medium" | "Low";
  area: string;
  module: string;
};

type AreaReportRow = StatusCount & {
  area: string;
  module: string;
  principle: string;
  total: number;
  applicable: number;
  scorePoints: number;
  fulfillmentScore: number | null;
  evidenceRequired: number;
  evidenceAdequate: number;
  evidenceConfidence: number | null;
  evidenceGap: number;
  clarification: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type ReportMetrics = {
  generatedAt: Date;
  reportDate: string;
  unitName: string;
  preparedBy: string;
  reviewedBy: string;
  reportStatus: string;
  l1Answered: number;
  l2Triggered: number;
  l2Applicable: number;
  counts: StatusCount;
  readinessScore: number | null;
  selfDeclaredFulfillmentScore: number | null;
  evidenceVerifiedScore: number | null;
  gapRate: number | null;
  partialRate: number | null;
  uncertaintyRate: number | null;
  evidenceConfidence: number | null;
  evidenceRequiredCount: number;
  evidenceUploadedCount: number;
  evidenceAdequateCount: number;
  evidenceGapCount: number;
  evidenceRequestCount: number;
  clarificationCount: number;
  overallComplianceLevel: "Compliance" | "Partial Compliance" | "Non-Compliance";
  auditReadiness: "High" | "Medium" | "Low";
  reportQuestions: ReportQuestion[];
  scoringQuestions: ReportQuestion[];
  clarificationItems: ReportQuestion[];
  evidenceGapItems: ReportQuestion[];
  controlGapItems: ReportQuestion[];
  partialItems: ReportQuestion[];
  findings: ReportQuestion[];
  consolidatedFindings: ConsolidatedFinding[];
  areaRows: AreaReportRow[];
  triggeredModules: string[];
  excludedModules: string[];
  topWeakAreas: string;
  topStrongAreas: string;
  topPriorityAreas: string;
  keyRiskAreas: string;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;
const contentWidth = pageWidth - margin * 2;
const navy = rgb(0.04, 0.13, 0.32);
const blue = rgb(0.12, 0.38, 0.95);
const cyan = rgb(0.05, 0.73, 0.86);
const slate = rgb(0.29, 0.36, 0.48);
const muted = rgb(0.48, 0.56, 0.68);
const pale = rgb(0.95, 0.97, 1);
const border = rgb(0.80, 0.86, 0.93);
const white = rgb(1, 1, 1);
const green = rgb(0.05, 0.60, 0.40);
const amber = rgb(0.92, 0.55, 0.08);
const red = rgb(0.89, 0.14, 0.14);
const gray = rgb(0.62, 0.67, 0.75);
const purple = rgb(0.43, 0.30, 0.88);

const bigSections = new Set([
  "Executive Summary",
  "Introduction",
  "Methodology",
  "Current State of PDP Compliance",
  "Gap Identification",
  "Detailed Findings",
  "Bridging the Gaps",
  "Recommendations",
  "Appendix",
]);

const desiredConditions: Record<string, string> = {
  P01: "pemrosesan Data Pribadi dilakukan secara terbatas, spesifik, sah secara hukum, dan transparan, termasuk adanya dasar pemrosesan yang jelas dan informasi yang diberikan kepada SDP.",
  P02: "pemrosesan dilakukan sesuai tujuan yang ditentukan dan tidak diperluas tanpa dasar yang sah.",
  P03: "hak SDP dapat dijalankan melalui prosedur, kanal, SLA, verifikasi, dan pencatatan yang memadai.",
  P04: "Data Pribadi dijaga agar akurat, lengkap, mutakhir, dan dapat dipertanggungjawabkan.",
  P05: "Data Pribadi dilindungi dari akses, pengungkapan, pengubahan, perusakan, atau kehilangan yang tidak sah.",
  P06: "tujuan, aktivitas pemrosesan, dan kegagalan PDP diberitahukan sesuai ketentuan yang berlaku.",
  P07: "Data Pribadi dihapus atau dimusnahkan setelah masa retensi berakhir atau berdasarkan permintaan yang sah, kecuali ditentukan lain oleh peraturan.",
  P08: "pemrosesan Data Pribadi dapat dibuktikan secara jelas melalui dokumentasi, evidence, owner, dan governance yang memadai.",
};

const abbreviationRows = [
  ["PDP", "Pelindungan Data Pribadi"],
  ["SDP", "Subjek Data Pribadi"],
  ["RoPA", "Record of Processing Activities"],
  ["DPIA", "Data Protection Impact Assessment"],
  ["DPA", "Data Processing Agreement"],
  ["DPO", "Data Protection Officer"],
  ["L1", "Level 1 Relevance Screening"],
  ["L2", "Level 2 Triggered Assessment"],
  ["N/A", "Not Applicable"],
  ["SLA", "Service Level Agreement"],
];

const moduleDisplayNames: Record<string, string> = {
  M01: "Inventarisasi Pemrosesan Data Pribadi / RoPA",
  M02: "Dasar Pemrosesan dan Transparansi",
  M03: "Tujuan dan Pembatasan Pemrosesan",
  M04: "Persetujuan dan Kondisi Khusus",
  M05: "Hak Subjek Data Pribadi",
  M06: "Akurasi dan Kualitas Data",
  M07: "Keamanan Data Pribadi dan Kontrol Akses",
  M08: "Vendor, Prosesor, dan Berbagi Data",
  M09: "Retensi, Penghapusan, dan Pemusnahan",
  M10: "Transfer Data Pribadi Lintas Negara",
  M11: "DPIA dan Pemrosesan Berisiko Tinggi",
  M12: "Kegagalan Pelindungan Data Pribadi / Insiden",
  M13: "Tata Kelola DPO / Fungsi PDP",
  M14: "CCTV dan Pemrosesan Visual",
  M15: "Modul Lain / Tidak Masuk Scope",
};

const principleDisplayNames: Record<string, string> = {
  P01: "Terbatas, Spesifik, Sah Secara Hukum, dan Transparan",
  P02: "Sesuai dengan Tujuan Pemrosesan",
  P03: "Menjamin Hak Subjek Data Pribadi",
  P04: "Akurat, Lengkap, Mutakhir, dan Dapat Dipertanggungjawabkan",
  P05: "Keamanan Data Pribadi",
  P06: "Pemberitahuan Tujuan, Aktivitas, dan Kegagalan PDP",
  P07: "Retensi, Penghapusan, dan Pemusnahan",
  P08: "Akuntabilitas dan Pembuktian",
};

const principleShortLabels: Record<string, string> = {
  P01: "Sah & Transparan",
  P02: "Sesuai Tujuan",
  P03: "Hak SDP",
  P04: "Kualitas Data",
  P05: "Keamanan",
  P06: "Pemberitahuan",
  P07: "Retensi",
  P08: "Akuntabilitas",
};

async function loadReportFonts(pdf: PDFDocument) {
  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
}

export async function generateSelfAssessmentPdf(input: PdfAssessment) {
  const pdf = await PDFDocument.create();
  const { regular, bold } = await loadReportFonts(pdf);
  const page = pdf.addPage([pageWidth, pageHeight]);
  const kit: PdfKit = { pdf, regular, bold, page, y: pageHeight - margin, section: "Cover" };
  const metrics = buildReportMetrics(input);

  drawCover(kit, input, metrics);
  drawDisclaimer(kit);
  drawDocumentInformation(kit, input, metrics);
  drawDocumentHistory(kit, input, metrics);
  drawTableOfContents(kit);
  drawListOfTablesAndFigures(kit);
  drawAbbreviations(kit);
  drawExecutiveSummary(kit, metrics);
  drawIntroduction(kit);
  drawScopeBoundary(kit, metrics);
  drawMethodology(kit);
  drawScoringDictionary(kit);
  drawCurrentState(kit, metrics);
  drawPositiveFindings(kit, metrics);
  drawDesiredState(kit, metrics);
  drawGapIdentification(kit, metrics);
  drawGapPrioritization(kit, metrics);
  drawRadarSection(kit, metrics);
  drawCategoryModuleAnalysis(kit, metrics);
  drawRiskExposureAnalysis(kit, metrics);
  drawEvidenceQualityAnalysis(kit, metrics);
  drawDetailedFindings(kit, metrics);
  drawBridgingTheGaps(kit, metrics);
  drawRecommendations(kit, metrics);
  drawImplementationRoadmap(kit, metrics);
  drawManagementDecisions(kit, metrics);
  drawContinuousImprovement(kit);
  drawCommunicationPlan(kit);
  drawConclusion(kit, metrics);
  drawAppendix(kit, input, metrics);
  addFooters(kit.pdf, regular);

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

function buildReportMetrics(input: PdfAssessment): ReportMetrics {
  const generatedAt = new Date();
  const l1Questions = selfAssessmentQuestions.filter((question) => question.level === "L1" || question.kind === "UNIT");
  const l2TriggeredQuestions = selfAssessmentQuestions.filter(
    (question) => isScoredSelfAssessmentQuestion(question) && isSelfAssessmentQuestionApplicable(question, input.answers),
  );

  const reportQuestions = l2TriggeredQuestions.map((question): ReportQuestion => {
    const state = input.answers[question.id];
    const answer = state?.answer || "";
    const note = state?.note?.trim() || "";
    const normalized = normalizeAnswer(answer);
    const isNaValid = normalized === "NOT_RELEVANT" && note.length > 0;
    const evidenceFiles = state?.evidenceFiles ?? [];
    const evidenceStrength = getEvidenceStrength(question, state);
    const evidenceRequired = isEvidenceRequiredForReport(question, answer);
    const isEvidenceGap =
      evidenceRequired &&
      (normalized === "COMPLIANT" || normalized === "PARTIAL") &&
      !["Adequate", "Strong"].includes(evidenceStrength);
    const isEvidenceRequest =
      (normalized === "GAP" || normalized === "UNKNOWN") &&
      Boolean(question.minimumEvidence || question.evidence || question.recommendedEvidence);
    const isClarification =
      normalized === "UNKNOWN" || (normalized === "NOT_RELEVANT" && !isNaValid);
    const isApplicableForScore = normalized !== "NOT_RELEVANT" || !isNaValid;
    const score = normalized === "COMPLIANT" ? 1 : normalized === "PARTIAL" ? 0.5 : 0;
    return {
      question,
      answer,
      note,
      normalized,
      isNaValid,
      isApplicableForScore,
      score,
      evidenceFiles,
      evidenceStrength,
      evidenceRequired,
      isEvidenceGap,
      isEvidenceRequest,
      isClarification,
      priority: resolvePriority(question, normalized, isEvidenceGap),
    };
  });

  const scoringQuestions = reportQuestions.filter((item) => item.isApplicableForScore);
  const l2Applicable = scoringQuestions.length;
  const counts = countStatuses(reportQuestions);
  const readinessNumerator = scoringQuestions.reduce((sum, item) => sum + item.score, 0);
  const selfDeclaredNumerator = scoringQuestions
    .filter((item) => item.normalized === "COMPLIANT" || item.normalized === "PARTIAL")
    .reduce((sum, item) => sum + item.score, 0);
  const gapCount = scoringQuestions.filter((item) => item.normalized === "GAP").length;
  const partialCount = scoringQuestions.filter((item) => item.normalized === "PARTIAL").length;
  const unknownCount = scoringQuestions.filter((item) => item.normalized === "UNKNOWN").length;
  const evidenceRequiredItems = reportQuestions.filter((item) => item.evidenceRequired && item.isApplicableForScore);
  const evidenceAdequateItems = evidenceRequiredItems.filter((item) =>
    ["Adequate", "Strong"].includes(item.evidenceStrength),
  );
  const evidenceUploadedItems = evidenceRequiredItems.filter((item) => item.evidenceFiles.length > 0);
  const evidenceGapItems = reportQuestions.filter((item) => item.isEvidenceGap);
  const evidenceRequestCount = reportQuestions.filter((item) => item.isEvidenceRequest).length;
  const clarificationItems = reportQuestions.filter((item) => item.isClarification);
  const readinessScore = l2Applicable ? (readinessNumerator / l2Applicable) * 100 : null;
  const selfDeclaredFulfillmentScore = l2Applicable ? (selfDeclaredNumerator / l2Applicable) * 100 : null;
  const evidenceVerifiedScore = evidenceRequiredItems.length
    ? (evidenceAdequateItems.length / evidenceRequiredItems.length) * 100
    : null;
  const evidenceConfidence = evidenceRequiredItems.length
    ? (evidenceAdequateItems.length / evidenceRequiredItems.length) * 100
    : null;
  const areaRows = buildAreaRows(reportQuestions);
  const findings = reportQuestions
    .filter((item) => item.normalized === "GAP" || item.normalized === "PARTIAL" || item.normalized === "UNKNOWN" || item.isEvidenceGap)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.question.area.localeCompare(b.question.area));
  const consolidatedFindings = buildConsolidatedFindings(findings);
  const allModules = [...new Set(selfAssessmentQuestions.filter((q) => q.kind === "ADDITIONAL").map((q) => q.module || q.triggerOrOwner).filter(Boolean))];
  const triggeredModules = [...new Set(reportQuestions.map((item) => item.question.module || item.question.triggerOrOwner).filter(Boolean))].sort();
  const highCriticalGapCount = findings.filter(
    (item) => item.normalized === "GAP" && (item.priority === "High" || item.priority === "Critical"),
  ).length;
  const overallComplianceLevel = getOverallComplianceLevel({
    readinessScore,
    controlGapCount: gapCount,
    highCriticalGapCount,
    partialCount,
    unknownCount,
    evidenceConfidence,
    evidenceGapCount: evidenceGapItems.length,
    applicableCount: l2Applicable,
    hasFundamentalCriticalGap: hasFundamentalCriticalGap(findings),
  });

  return {
    generatedAt,
    reportDate: formatDate(generatedAt.toISOString()),
    unitName: input.department?.name ?? "metadata tidak tersedia",
    preparedBy: input.creator ? `${input.creator.fullName} (${input.creator.email})` : "System Generated",
    reviewedBy: input.finalizer ? `${input.finalizer.fullName} (${input.finalizer.email})` : "Belum direview",
    reportStatus: input.finalizedAt ? "Final" : input.status || "Draft",
    l1Answered: l1Questions.filter((question) => input.answers[question.id]?.answer).length,
    l2Triggered: reportQuestions.length,
    l2Applicable,
    counts,
    readinessScore,
    selfDeclaredFulfillmentScore,
    evidenceVerifiedScore,
    gapRate: l2Applicable ? (gapCount / l2Applicable) * 100 : null,
    partialRate: l2Applicable ? (partialCount / l2Applicable) * 100 : null,
    uncertaintyRate: l2Applicable ? (unknownCount / l2Applicable) * 100 : null,
    evidenceConfidence,
    evidenceRequiredCount: evidenceRequiredItems.length,
    evidenceUploadedCount: evidenceUploadedItems.length,
    evidenceAdequateCount: evidenceAdequateItems.length,
    evidenceGapCount: evidenceGapItems.length,
    evidenceRequestCount,
    clarificationCount: clarificationItems.length,
    overallComplianceLevel,
    auditReadiness: getAuditReadiness(evidenceConfidence, evidenceGapItems.length),
    reportQuestions,
    scoringQuestions,
    clarificationItems,
    evidenceGapItems,
    controlGapItems: reportQuestions.filter((item) => item.normalized === "GAP"),
    partialItems: reportQuestions.filter((item) => item.normalized === "PARTIAL"),
    findings,
    consolidatedFindings,
    areaRows,
    triggeredModules,
    excludedModules: allModules.filter((module) => !triggeredModules.includes(module)).sort(),
    topWeakAreas: listTopAreas(areaRows, "weak"),
    topStrongAreas: listTopAreas(areaRows, "strong"),
    topPriorityAreas: listTopAreas(areaRows, "priority"),
    keyRiskAreas: listRiskAreas(findings),
  };
}

function countStatuses(rows: ReportQuestion[]): StatusCount {
  return rows.reduce<StatusCount>(
    (acc, item) => {
      if (item.normalized === "COMPLIANT") acc.compliant += 1;
      if (item.normalized === "PARTIAL") acc.partial += 1;
      if (item.normalized === "GAP") acc.gap += 1;
      if (item.normalized === "UNKNOWN") acc.unknown += 1;
      if (item.normalized === "NOT_RELEVANT") {
        acc.notRelevant += 1;
        if (item.isNaValid) acc.naValid += 1;
        else acc.naInvalid += 1;
      }
      return acc;
    },
    { compliant: 0, partial: 0, gap: 0, unknown: 0, notRelevant: 0, naValid: 0, naInvalid: 0 },
  );
}

function buildAreaRows(items: ReportQuestion[]) {
  const rows = new Map<string, AreaReportRow>();
  for (const item of items) {
    const key = getQuestionAreaDisplayName(item.question);
    const row = rows.get(key) ?? {
      area: key,
      module: getModuleDisplayName(item.question.module || item.question.triggerOrOwner),
      principle: getPrincipleDisplayName(item.question.categoryScoring || item.question.principleCategory),
      total: 0,
      applicable: 0,
      scorePoints: 0,
      compliant: 0,
      partial: 0,
      gap: 0,
      unknown: 0,
      notRelevant: 0,
      naValid: 0,
      naInvalid: 0,
      fulfillmentScore: null,
      evidenceRequired: 0,
      evidenceAdequate: 0,
      evidenceConfidence: null,
      evidenceGap: 0,
      clarification: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    row.total += 1;
    if (item.isApplicableForScore) {
      row.applicable += 1;
      row.scorePoints += item.score;
    }
    if (item.normalized === "COMPLIANT") row.compliant += 1;
    if (item.normalized === "PARTIAL") row.partial += 1;
    if (item.normalized === "GAP") row.gap += 1;
    if (item.normalized === "UNKNOWN") row.unknown += 1;
    if (item.normalized === "NOT_RELEVANT") {
      row.notRelevant += 1;
      if (item.isNaValid) row.naValid += 1;
      else row.naInvalid += 1;
    }
    if (item.evidenceRequired && item.isApplicableForScore) row.evidenceRequired += 1;
    if (item.evidenceRequired && item.isApplicableForScore && ["Adequate", "Strong"].includes(item.evidenceStrength)) row.evidenceAdequate += 1;
    if (item.isEvidenceGap) row.evidenceGap += 1;
    if (item.isClarification) row.clarification += 1;
    if (item.normalized === "GAP" || item.normalized === "PARTIAL" || item.normalized === "UNKNOWN" || item.isEvidenceGap) {
      if (item.priority === "Critical") row.critical += 1;
      if (item.priority === "High") row.high += 1;
      if (item.priority === "Medium") row.medium += 1;
      if (item.priority === "Low") row.low += 1;
    }
    rows.set(key, row);
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      fulfillmentScore: row.applicable ? (row.scorePoints / row.applicable) * 100 : null,
      evidenceConfidence: row.evidenceRequired ? (row.evidenceAdequate / row.evidenceRequired) * 100 : null,
    }))
    .sort((a, b) => b.gap - a.gap || b.partial - a.partial || a.area.localeCompare(b.area));
}

function drawCover(kit: PdfKit, input: PdfAssessment, metrics: ReportMetrics) {
  kit.section = "Cover";
  kit.page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: white });
  kit.page.drawRectangle({ x: 0, y: pageHeight - 142, width: pageWidth, height: 142, color: navy });
  kit.page.drawRectangle({ x: 0, y: pageHeight - 148, width: pageWidth, height: 6, color: cyan });
  text(kit, "Privacy Bro", margin, pageHeight - 54, 14, kit.bold, white);
  text(kit, "Untuk Penggunaan Internal", pageWidth - margin - 132, pageHeight - 54, 9, kit.bold, cyan);
  text(kit, "Gap Analysis Report Kepatuhan UU PDP", margin, pageHeight - 98, 27, kit.bold, white, contentWidth);
  text(kit, "Self-Assessment Berbasis Unit Kerja", margin, pageHeight - 123, 13, kit.regular, rgb(0.80, 0.90, 1));

  kit.y = pageHeight - 190;
  const metadata = [
    ["Unit Kerja", metrics.unitName],
    ["Assessment ID", input.assessmentNumber],
    ["Tanggal Assessment", formatDate(input.createdAt)],
    ["Tanggal Report", metrics.reportDate],
    ["Status Report", translateStatus(metrics.reportStatus)],
    ["Disusun oleh", metrics.preparedBy],
    ["Direview oleh", metrics.reviewedBy],
    ["Kerahasiaan", "Untuk Penggunaan Internal"],
  ];
  drawInfoGrid(kit, metadata, 2);

  kit.y -= 22;
  drawMetricCards(kit, [
    ["Overall Compliance Level", metrics.overallComplianceLevel],
    ["PDP Readiness Score", formatScore(metrics.readinessScore)],
    ["Self-Declared Fulfillment Score", formatScore(metrics.selfDeclaredFulfillmentScore)],
    ["Evidence Confidence", formatScore(metrics.evidenceConfidence)],
    ["Audit Readiness", metrics.auditReadiness],
    ["Control Gap", String(metrics.counts.gap)],
    ["Kesenjangan Evidence", String(metrics.evidenceGapCount)],
  ]);
  kit.y -= 18;
  text(kit, coverInsight(metrics), margin, kit.y, 9.5, kit.bold, colorForComplianceLevel(metrics.overallComplianceLevel), contentWidth);
  kit.y -= 16;
  text(kit, "Report ini disusun berdasarkan data self-assessment yang tersedia pada saat report dibuat.", margin, kit.y, 9, kit.regular, muted, contentWidth);
}

function drawDisclaimer(kit: PdfKit) {
  newPage(kit, "Disclaimer");
  drawSectionTitle(kit, "Disclaimer");
  [
    "Report ini disusun berdasarkan jawaban self-assessment, catatan, dan evidence yang diberikan oleh unit kerja pada saat assessment dilakukan. Hasil report ini bertujuan untuk memberikan gambaran awal mengenai tingkat pemenuhan kewajiban Pelindungan Data Pribadi berdasarkan UU PDP dan dokumen assessment yang digunakan.",
    "Report ini bukan legal opinion final dan tidak boleh digunakan sebagai satu-satunya dasar untuk menyimpulkan adanya pelanggaran hukum. Setiap temuan, risiko administratif, risiko gugatan, atau indikasi risiko pidana perlu divalidasi lebih lanjut oleh Legal, DPO, atau fungsi terkait.",
    "Jawaban Tidak Tahu dan Tidak Relevan tanpa alasan yang memadai diperlakukan sebagai item yang memerlukan klarifikasi. Jawaban Ya/Ada yang belum didukung evidence yang memadai tetap dicatat sebagai jawaban unit, tetapi akan ditandai sebagai Evidence Gap untuk kebutuhan pembuktian kepatuhan.",
    "Report ini perlu dibaca bersama dengan evidence, catatan unit, dan hasil validasi lanjutan oleh owner terkait.",
  ].forEach((item) => paragraph(kit, item, margin, contentWidth, 10.5, 16, 8));
}

function drawDocumentInformation(kit: PdfKit, input: PdfAssessment, metrics: ReportMetrics) {
  drawSectionTitle(kit, "Document Information");
  paragraph(
    kit,
    "Tabel berikut merangkum informasi utama mengenai report, scope assessment, dan data assessment yang digunakan dalam penyusunan gap analysis.",
    margin,
    contentWidth,
    10,
    15,
    8,
  );
  const rows = [
    ["Report Name", "Gap Analysis Report Kepatuhan UU PDP"],
    ["Assessment ID", input.assessmentNumber],
    ["Unit Kerja", metrics.unitName],
    ["Assessment Period", `${formatDate(input.createdAt)} - ${formatDate(input.updatedAt)}`],
    ["Report Generated Date", metrics.reportDate],
    ["Template Version", "Self Assessment UU PDP Unit Trigger Risk Evidence v5 Simplified"],
    ["Excel Source Version", "Self_Assessment_UU_PDP_Unit_Trigger_Risk_Evidence_ClosedAnswer_Codex_v5_Simplified.xlsx"],
    ["Total L1 Answered", String(metrics.l1Answered)],
    ["Total L2 Triggered", String(metrics.l2Triggered)],
    ["Total L2 Applicable", String(metrics.l2Applicable)],
    ["Total Ya/Ada", String(metrics.counts.compliant)],
    ["Total Sebagian", String(metrics.counts.partial)],
    ["Total Tidak/Tidak Ada", String(metrics.counts.gap)],
    ["Total Tidak Tahu", String(metrics.counts.unknown)],
    ["Total Tidak Relevan/N/A Valid", String(metrics.counts.naValid)],
    ["Questions Requiring Evidence", String(metrics.evidenceRequiredCount)],
    ["Evidence Uploaded", String(metrics.evidenceUploadedCount)],
    ["Evidence Adequate/Strong", String(metrics.evidenceAdequateCount)],
    ["Total Evidence Gap", String(metrics.evidenceGapCount)],
    ["Overall Compliance Level", metrics.overallComplianceLevel],
    ["Audit Readiness", metrics.auditReadiness],
    ["Disusun Oleh", metrics.preparedBy],
    ["Review Status", input.finalizedAt ? "Sudah direview/final" : "Menunggu review DPO"],
  ];
  drawKeyValueTable(kit, rows);
}

function drawDocumentHistory(kit: PdfKit, input: PdfAssessment, metrics: ReportMetrics) {
  drawSectionTitle(kit, "Document History");
  paragraph(kit, "Tabel berikut mencatat riwayat pembuatan dan pembaruan report.", margin, contentWidth, 10, 15, 8);
  const rows = [["v1.0", metrics.reportDate, "System Generated", "Initial report generated from self-assessment responses"]];
  if (input.finalizedAt && input.finalizer) {
    rows.push(["v1.1", formatDate(input.finalizedAt), input.finalizer.fullName, "Review notes added"]);
  }
  drawTable(kit, ["Version", "Date", "Updated By", "Description"], rows, [60, 88, 132, contentWidth - 280]);
}

function drawTableOfContents(kit: PdfKit) {
  newPage(kit, "Table of Contents");
  drawSectionTitle(kit, "Daftar Isi");
  const sections = [
    "Disclaimer",
    "Document Information",
    "Document History",
    "List of Tables and Figures",
    "List of Abbreviations",
    "Executive Summary",
    "Introduction",
    "Scope and Assessment Boundary",
    "Methodology",
    "Current State",
    "Desired State",
    "Gap Identification",
    "Gap Prioritization",
    "PDP Principle Fulfillment",
    "Category and Module Analysis",
    "Risk Exposure Analysis",
    "Evidence Quality Analysis",
    "Detailed Findings",
    "Bridging the Gaps",
    "Recommendations",
    "Implementation Roadmap",
    "Management Decisions Required",
    "Continuous Improvement",
    "Communication and Collaboration Plan",
    "Conclusion",
    "Appendix",
  ];
  sections.forEach((section, index) => {
    ensureSpace(kit, 18);
    text(kit, `${index + 1}. ${section}`, margin, kit.y, 10, kit.regular, slate, contentWidth - 40);
    kit.y -= 17;
  });
}

function drawListOfTablesAndFigures(kit: PdfKit) {
  drawSectionTitle(kit, "List of Tables and Figures");
  const figures = [
    "Figure 1. Answer Distribution",
    "Figure 2. Category Fulfillment Score",
    "Figure 3. Status by Category",
    "Figure 4. Gap Severity Heatmap",
    "Figure 5. PDP Principle Fulfillment Radar",
    "Figure 6. Evidence Strength Distribution",
    "Figure 7. Evidence Confidence by Category",
    "Figure 8. Gap Prioritization Matrix",
    "Figure 9. Implementation Roadmap",
  ];
  const tables = [
    "Table 1. Document Information",
    "Table 2. Document History",
    "Table 3. Scoring Dictionary",
    "Table 4. Category and Module Analysis",
    "Table 5. Detailed Findings",
    "Table 6. Communication and Collaboration Plan",
  ];
  twoColumnList(kit, "List of Figures", figures, "List of Tables", tables);
}

function drawAbbreviations(kit: PdfKit) {
  drawSectionTitle(kit, "List of Abbreviations");
  drawTable(kit, ["Abbreviation", "Meaning"], abbreviationRows, [120, contentWidth - 120]);
}

function drawExecutiveSummary(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Executive Summary");
  drawSectionTitle(kit, "Executive Summary");
  paragraph(kit, `Assessment ini dilakukan untuk menilai tingkat pemenuhan kewajiban Pelindungan Data Pribadi pada unit ${metrics.unitName} berdasarkan pertanyaan Level 2 yang terpicu dari hasil screening relevansi Level 1. Level 1 digunakan untuk menentukan relevansi proses unit kerja, sedangkan scoring report dihitung dari pertanyaan Level 2 yang applicable.`, margin, contentWidth, 10.2, 15, 6);
  paragraph(kit, `Berdasarkan ${metrics.l2Applicable} pertanyaan Level 2 yang applicable, unit memperoleh PDP Readiness Score sebesar ${formatScore(metrics.readinessScore)} dan Self-Declared Fulfillment Score sebesar ${formatScore(metrics.selfDeclaredFulfillmentScore)}. Overall Compliance Level berada pada kategori ${metrics.overallComplianceLevel}.`, margin, contentWidth, 10.2, 15, 6);
  paragraph(kit, `Assessment mengidentifikasi ${metrics.counts.gap} control gap, ${metrics.counts.partial} partial fulfillment, ${metrics.counts.unknown} clarification item, dan ${metrics.evidenceGapCount} evidence gap. Area dengan perhatian tertinggi adalah ${metrics.topWeakAreas}.`, margin, contentWidth, 10.2, 15, 6);
  paragraph(kit, `Evidence Confidence berada pada angka ${formatScore(metrics.evidenceConfidence)}. Angka ini menunjukkan sejauh mana jawaban unit telah didukung oleh evidence yang memadai. Jika evidence belum tersedia atau masih lemah, pemenuhan kontrol belum dapat dibuktikan secara kuat meskipun unit menjawab Ya/Ada.`, margin, contentWidth, 10.2, 15, 6);
  if ((metrics.evidenceConfidence ?? 100) < 50 && metrics.evidenceGapCount > 0) {
    paragraph(kit, `Walaupun ${metrics.counts.compliant} kontrol dijawab Ya/Ada, sebagian jawaban tersebut belum didukung evidence yang memadai. Karena itu, isu utama assessment bukan hanya control gap, tetapi juga auditability dan pembuktian akuntabilitas.`, margin, contentWidth, 10.2, 15, 6);
  }
  paragraph(kit, `Risiko utama yang terindikasi berkaitan dengan ${metrics.keyRiskAreas}. Risiko ini perlu ditindaklanjuti melalui validasi Legal/DPO, penguatan evidence, dan penyusunan action plan oleh owner terkait.`, margin, contentWidth, 10.2, 15, 6);
  paragraph(kit, "Prioritas tindak lanjut direkomendasikan dalam tiga tahap: tindakan 0-30 hari untuk gap kritikal atau high priority, tindakan 31-60 hari untuk penguatan kontrol utama, dan tindakan 61-90 hari untuk penyempurnaan evidence, dokumentasi, dan monitoring.", margin, contentWidth, 10.2, 15, 8);
  drawSummaryBoxes(kit, metrics);
  drawAnswerDistributionDonut(kit, metrics);
}

function drawIntroduction(kit: PdfKit) {
  newPage(kit, "Introduction");
  drawSectionTitle(kit, "Introduction");
  [
    "UU PDP menempatkan kewajiban pada pengendali dan prosesor Data Pribadi untuk memastikan bahwa pemrosesan Data Pribadi dilakukan secara sah, transparan, terbatas, aman, dan dapat dibuktikan. Dalam konteks organisasi, pemenuhan kewajiban tersebut perlu dinilai pada level unit kerja karena setiap unit dapat memiliki peran, proses, data, sistem, vendor, dan risiko yang berbeda.",
    "Self-assessment ini dirancang dengan dua level. Level 1 berfungsi sebagai screening relevansi untuk menentukan apakah suatu modul Level 2 perlu dijawab oleh unit. Level 2 berisi pertanyaan kontrol yang lebih spesifik dan menjadi dasar perhitungan score, gap analysis, evidence request, dan action plan.",
    "Report ini menyajikan hasil assessment dalam bentuk gap analysis. Tujuannya bukan hanya menampilkan skor, tetapi juga mengidentifikasi kondisi saat ini, kondisi yang diharapkan, gap, risiko, evidence yang perlu dilengkapi, serta rekomendasi remediasi.",
  ].forEach((item) => paragraph(kit, item, margin, contentWidth, 10.5, 16, 8));
}

function drawScopeBoundary(kit: PdfKit, metrics: ReportMetrics) {
  drawSectionTitle(kit, "Scope and Assessment Boundary");
  paragraph(kit, "Scope assessment dibatasi pada proses, aktivitas, dan modul Level 2 yang terpicu berdasarkan jawaban Level 1. Modul yang tidak relevan tidak dihitung sebagai gap dan tidak dimasukkan ke dalam denominator scoring.", margin, contentWidth, 10, 15, 8);
  paragraph(kit, `Area assessment yang relevan untuk unit ini mencakup ${metrics.triggeredModules.length ? metrics.triggeredModules.map(getModuleDisplayName).join(", ") : "metadata tidak tersedia"}.`, margin, contentWidth, 10, 15, 8);
  paragraph(kit, `Area berikut tidak masuk scope karena tidak terpicu atau dinyatakan tidak relevan: ${metrics.excludedModules.length ? metrics.excludedModules.map(getModuleDisplayName).join(", ") : "metadata tidak tersedia"}.`, margin, contentWidth, 10, 15, 8);
  paragraph(kit, "Limitasi utama assessment ini adalah ketergantungan pada jawaban unit dan evidence yang tersedia pada saat pengisian. Item dengan jawaban Tidak Tahu atau Tidak Relevan tanpa alasan perlu diklarifikasi sebelum digunakan sebagai kesimpulan final.", margin, contentWidth, 10, 15, 8);
}

function drawMethodology(kit: PdfKit) {
  newPage(kit, "Methodology");
  drawSectionTitle(kit, "Methodology");
  [
    "Metodologi assessment menggunakan pendekatan closed-answer. Setiap pertanyaan Level 2 dijawab dengan Ya/Ada, Sebagian, Tidak/Tidak Ada, Tidak Tahu, atau Tidak Relevan/N/A. Jawaban tersebut digunakan untuk menghitung tingkat pemenuhan kontrol, gap, partial fulfillment, uncertainty, dan evidence confidence.",
    "Assessment ini bukan penilaian level kematangan. Oleh karena itu, report tidak menggunakan level kematangan. Score yang digunakan adalah PDP Readiness Score, Self-Declared Fulfillment Score, Evidence-Verified Score, dan Evidence Confidence.",
    "Level 1 tidak dihitung dalam score final. Level 1 hanya digunakan untuk menentukan relevansi unit dan memicu pertanyaan Level 2.",
    "Level 2 menjadi dasar utama scoring, gap analysis, risk exposure, evidence request, dan action plan.",
    "Jawaban Tidak Relevan/N/A hanya dikeluarkan dari perhitungan jika disertai alasan yang memadai. Jika alasan tidak tersedia, item tersebut masuk daftar klarifikasi.",
    "Jawaban Tidak Tahu menunjukkan bahwa unit belum dapat memastikan kondisi kontrol. Item ini tidak langsung disimpulkan sebagai pelanggaran, tetapi harus ditindaklanjuti melalui klarifikasi.",
    "Evidence tidak mengubah jawaban utama. Namun, evidence memengaruhi tingkat keyakinan atas jawaban tersebut. Jawaban Ya/Ada tanpa evidence yang memadai akan ditandai sebagai Evidence Gap.",
  ].forEach((item) => paragraph(kit, item, margin, contentWidth, 10, 15, 5));
}

function drawScoringDictionary(kit: PdfKit) {
  drawSectionTitle(kit, "Scoring Dictionary");
  drawTable(
    kit,
    ["Jawaban", "Makna", "Nilai"],
    [
      ["Ya/Ada", "Kontrol dinyatakan tersedia atau berjalan", "1"],
      ["Sebagian", "Kontrol tersedia sebagian atau belum lengkap", "0.5"],
      ["Tidak/Tidak Ada", "Kontrol tidak tersedia atau belum berjalan", "0"],
      ["Tidak Tahu", "Kondisi belum dapat dikonfirmasi", "0 untuk Readiness Score dan masuk clarification"],
      ["Tidak Relevan/N/A", "Tidak berlaku untuk unit/proses", "Excluded jika alasan valid"],
    ],
    [112, 250, contentWidth - 362],
  );
  paragraph(kit, "PDP Readiness Score menunjukkan tingkat kesiapan berdasarkan seluruh pertanyaan applicable, termasuk item Tidak Tahu sebagai belum terverifikasi.", margin, contentWidth, 9.6, 14, 8);
  paragraph(kit, "Self-Declared Fulfillment Score menunjukkan pemenuhan berdasarkan jawaban unit. Evidence-Verified Score dan Evidence Confidence menunjukkan sejauh mana jawaban tersebut sudah didukung evidence yang adequate atau strong.", margin, contentWidth, 9.6, 14, 4);
}

function drawCurrentState(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Current State");
  drawSectionTitle(kit, "Current State of PDP Compliance");
  paragraph(kit, "Current state menggambarkan kondisi pemenuhan PDP berdasarkan jawaban unit pada pertanyaan Level 2 yang applicable. Bagian ini membedakan self-declared fulfilled areas, verified fulfilled areas, unverified fulfilled areas, priority weaknesses, dan evidence weaknesses.", margin, contentWidth, 10, 15, 8);
  paragraph(kit, `Self-declared fulfilled areas adalah area yang dijawab Ya/Ada oleh unit. Verified fulfilled areas adalah area yang didukung evidence adequate atau strong. Unverified fulfilled areas adalah area yang dijawab Ya/Ada tetapi evidence belum memadai.`, margin, contentWidth, 10, 15, 5);
  if (metrics.topStrongAreas !== "metadata tidak tersedia") paragraph(kit, `Area dengan self-declared fulfillment tertinggi adalah ${metrics.topStrongAreas}. Area ini belum otomatis menjadi area yang kuat secara audit bila Evidence Confidence masih rendah.`, margin, contentWidth, 10, 15, 5);
  const limitedStrong = metrics.areaRows
    .filter((row) => (row.fulfillmentScore ?? 0) >= 90 && row.applicable > 0 && row.applicable < 3)
    .map((row) => row.area)
    .slice(0, 3);
  if (limitedStrong.length) {
    paragraph(
      kit,
      `Beberapa area memperoleh skor tinggi namun jumlah pertanyaan applicable terbatas, yaitu ${limitedStrong.join(", ")}. Area ini perlu dibaca bersama scope assessment dan tidak langsung menunjukkan pemenuhan menyeluruh.`,
      margin,
      contentWidth,
      10,
      15,
      5,
    );
  }
  const evidenceAreas = metrics.areaRows.filter((row) => row.evidenceGap).map((row) => row.area).slice(0, 3);
  if (evidenceAreas.length) {
    paragraph(kit, `Evidence weaknesses utama adalah ${evidenceAreas.join(", ")}. Area ini memiliki jawaban kontrol yang perlu diperkuat dengan bukti pendukung.`, margin, contentWidth, 10, 15, 5);
  }
  if (metrics.topWeakAreas !== "metadata tidak tersedia") paragraph(kit, `Area dengan gap tertinggi adalah ${metrics.topWeakAreas}. Area tersebut perlu menjadi prioritas karena memiliki kombinasi jawaban Tidak/Tidak Ada, Sebagian, atau evidence gap.`, margin, contentWidth, 10, 15, 5);
  if (metrics.counts.unknown) paragraph(kit, `Terdapat ${metrics.counts.unknown} item Tidak Tahu. Item ini belum dapat dinilai secara final dan perlu diklarifikasi dengan process owner atau fungsi terkait.`, margin, contentWidth, 10, 15, 5);
  if (metrics.evidenceGapCount) paragraph(kit, `Terdapat ${metrics.evidenceGapCount} item Evidence Gap. Artinya, unit telah memberikan jawaban, tetapi evidence yang tersedia belum cukup untuk membuktikan pemenuhan kontrol.`, margin, contentWidth, 10, 15, 5);
  drawCategoryFulfillmentScore(kit, metrics);
  drawStatusByCategory(kit, metrics);
}

function drawPositiveFindings(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Positive Findings");
  drawSectionTitle(kit, "Positive Findings / Area yang Dinyatakan Terpenuhi");
  const selfDeclared = metrics.areaRows
    .filter((row) => row.compliant > 0)
    .sort((a, b) => b.compliant - a.compliant)
    .slice(0, 8);
  const verified = metrics.areaRows
    .filter((row) => row.evidenceAdequate > 0)
    .sort((a, b) => b.evidenceAdequate - a.evidenceAdequate)
    .slice(0, 8);
  const evidenceOnly = metrics.areaRows
    .filter((row) => row.compliant > 0 && row.evidenceGap > 0 && row.gap === 0)
    .slice(0, 6);
  paragraph(kit, "Bagian ini mencatat area yang dinyatakan terpenuhi oleh unit. Area tersebut tetap perlu dibaca bersama Evidence Confidence karena jawaban Ya/Ada tanpa evidence belum dapat dianggap audit-ready.", margin, contentWidth, 10, 15, 8);
  if (selfDeclared.length) {
    drawSectionSubtitle(kit, "Self-declared fulfilled controls");
    drawTable(kit, ["Area", "Ya/Ada", "Evidence Gap", "Evidence Confidence"], selfDeclared.map((row) => [row.area, String(row.compliant), String(row.evidenceGap), formatScore(row.evidenceConfidence)]), [220, 70, 90, contentWidth - 380], 26);
  }
  if (verified.length) {
    drawSectionSubtitle(kit, "Verified fulfilled controls");
    drawTable(kit, ["Area", "Adequate/Strong Evidence", "Evidence Confidence"], verified.map((row) => [row.area, String(row.evidenceAdequate), formatScore(row.evidenceConfidence)]), [260, 120, contentWidth - 380], 26);
  } else {
    paragraph(kit, "Belum ada verified fulfilled controls karena belum ada evidence Adequate atau Strong yang tersedia.", margin, contentWidth, 10, 15, 8);
  }
  if (evidenceOnly.length) {
    paragraph(kit, `${evidenceOnly[0].area} dan area serupa dapat menjadi quick win jika fokus tindak lanjutnya adalah pengumpulan evidence, bukan perbaikan kontrol utama.`, margin, contentWidth, 10, 15, 8);
  }
}

function drawDesiredState(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Desired State");
  drawSectionTitle(kit, "Desired State of PDP Compliance");
  paragraph(kit, "Desired state menggambarkan kondisi yang diharapkan agar pemrosesan Data Pribadi dapat memenuhi prinsip dan kewajiban UU PDP. Desired state digunakan sebagai pembanding terhadap current state untuk mengidentifikasi gap dan tindakan perbaikan.", margin, contentWidth, 10, 15, 8);
  const principles = [...new Set(metrics.scoringQuestions.map((item) => item.question.categoryScoring).filter((value): value is string => Boolean(value && /^P0[1-8]$/i.test(value))))].slice(0, 8);
  const rows = (principles.length ? principles : Object.keys(desiredConditions)).map((principle) => [
    getPrincipleDisplayName(principle),
    `Untuk prinsip ${getPrincipleDisplayName(principle)}, kondisi yang diharapkan adalah tersedianya proses, dokumen, kontrol, dan evidence yang menunjukkan bahwa ${desiredConditions[principle] ?? "kewajiban PDP terkait dapat dipenuhi dan dibuktikan secara memadai."}`,
  ]);
  drawTable(kit, ["Prinsip", "Desired Condition"], rows, [150, contentWidth - 150], 48);
  drawSectionSubtitle(kit, "Desired State per Triggered Category");
  const categoryRows = metrics.consolidatedFindings.slice(0, 8).map((finding) => [
    finding.title,
    finding.template.desired,
  ]);
  if (categoryRows.length) {
    drawTable(kit, ["Kategori", "Desired State"], categoryRows, [120, contentWidth - 120], 44);
  }
}

function drawGapIdentification(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Gap Identification");
  drawSectionTitle(kit, "Gap Identification");
  paragraph(kit, "Gap diidentifikasi dengan membandingkan current state berdasarkan jawaban unit dengan desired state berdasarkan prinsip, kewajiban, dan metadata assessment. Report ini memisahkan Control Gap dan Evidence Gap agar jawaban unit tidak disalahartikan.", margin, contentWidth, 10, 15, 8);
  drawSectionSubtitle(kit, "Control Gap Register");
  const controlRows = metrics.controlGapItems.slice(0, 10).map((item, index) => [
    `CG-${String(index + 1).padStart(2, "0")}`,
    getQuestionAreaDisplayName(item.question),
    cleanQuestionToRequirement(item.question.question),
    item.answer || "Belum dijawab",
    getPrincipleDisplayName(item.question.categoryScoring || item.question.principleCategory),
    formatArticles(item.question.articleReference || item.question.reference),
    categoryRiskFallback(item.question, "operational"),
    item.priority,
    ownerForFinding(item.question),
    timelineForPriority(item.priority),
  ]);
  if (controlRows.length) {
    drawTable(kit, ["Finding ID", "Area", "Kontrol yang belum terpenuhi", "Jawaban", "Prinsip PDP", "Pasal", "Risiko utama", "Priority", "Owner", "Timeline"], controlRows, [36, 50, 90, 38, 52, 38, 58, 34, 50, 65], 34);
  } else {
    paragraph(kit, "Tidak ada control gap berdasarkan jawaban Tidak/Tidak Ada.", margin, contentWidth, 10, 15, 8);
  }
  drawSectionSubtitle(kit, "Evidence Gap Register");
  const evidenceRows = metrics.evidenceGapItems.slice(0, 10).map((item, index) => [
    `EV-${String(index + 1).padStart(2, "0")}`,
    getQuestionAreaDisplayName(item.question),
    cleanQuestionToRequirement(item.question.question),
    item.question.minimumEvidence || item.question.evidence || "Evidence minimum belum tersedia di metadata.",
    item.question.recommendedEvidence || "-",
    ownerForFinding(item.question),
    item.priority,
    timelineForPriority(item.priority),
    "Open",
  ]);
  if (evidenceRows.length) {
    drawTable(kit, ["Evidence ID", "Area", "Kontrol yang dinyatakan ada/sebagian", "Evidence Minimum", "Evidence Tambahan", "Owner", "Priority", "Due Date", "Status"], evidenceRows, [36, 50, 90, 90, 70, 50, 34, 40, 51], 34);
  } else {
    paragraph(kit, "Tidak ada evidence gap berdasarkan jawaban saat ini.", margin, contentWidth, 10, 15, 0);
  }
}

function drawGapPrioritization(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Gap Prioritization");
  drawSectionTitle(kit, "Gap Prioritization");
  paragraph(kit, "Prioritas gap ditentukan berdasarkan severity, jenis jawaban, kebutuhan evidence, risk exposure, dampak terhadap SDP, dan keterkaitan dengan kewajiban UU PDP. Gap dengan severity Critical atau High harus ditangani lebih awal.", margin, contentWidth, 10, 15, 8);
  paragraph(kit, "Gap dengan prioritas High memerlukan tindak lanjut segera karena dapat memengaruhi pembuktian kepatuhan, pengelolaan risiko, atau pemenuhan kewajiban utama UU PDP.", margin, contentWidth, 9.5, 14, 4);
  paragraph(kit, "Gap dengan prioritas Medium memerlukan rencana perbaikan yang jelas karena dapat melemahkan konsistensi proses dan evidence kepatuhan.", margin, contentWidth, 9.5, 14, 4);
  paragraph(kit, "Gap dengan prioritas Low tetap perlu dimonitor agar tidak berkembang menjadi isu kepatuhan yang lebih besar.", margin, contentWidth, 9.5, 14, 8);
  drawGapSeverityHeatmap(kit, metrics);
  drawGapPrioritizationMatrix(kit, metrics);
}

function drawRadarSection(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "PDP Principle Fulfillment Radar");
  drawSectionTitle(kit, "PDP Principle Fulfillment Radar");
  paragraph(kit, "Radar berikut menunjukkan tingkat pemenuhan berdasarkan prinsip PDP. Nilai dihitung dari pertanyaan Level 2 yang applicable dan dipetakan ke prinsip terkait. Prinsip yang tidak memiliki pertanyaan applicable ditampilkan sebagai N/A dan tidak dianggap sebagai skor 0.", margin, contentWidth, 10, 15, 8);
  drawRadarChart(kit, metrics);
  text(kit, "Figure 5. PDP Principle Fulfillment Radar", margin, kit.y, 8.5, kit.bold, muted);
  kit.y -= 18;
}

function drawCategoryModuleAnalysis(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Category and Module Analysis");
  drawSectionTitle(kit, "Category and Module Analysis");
  paragraph(kit, "Analisis kategori menunjukkan distribusi pemenuhan, gap, partial fulfillment, dan uncertainty pada setiap area assessment. Kategori yang tidak memiliki pertanyaan applicable ditampilkan sebagai N/A.", margin, contentWidth, 10, 15, 8);
  const rows = metrics.areaRows.slice(0, 14).map((row) => [
    row.area,
    row.module,
    formatScore(row.fulfillmentScore),
    String(row.compliant),
    String(row.partial),
    String(row.gap),
    String(row.unknown),
    String(row.evidenceGap),
  ]);
  drawTable(kit, ["Area", "Module", "Fulfillment", "Ya", "Partial", "Gap", "Unknown", "Evidence Gap"], rows, [100, 110, 56, 28, 38, 30, 42, 107], 28);
  const weak = metrics.areaRows.find((row) => row.gap || row.partial || row.evidenceGap);
  const strong = metrics.areaRows.find((row) => (row.fulfillmentScore ?? 0) >= 75);
  if (strong) paragraph(kit, `Kategori ${strong.area} menunjukkan tingkat pemenuhan ${formatScore(strong.fulfillmentScore)} dengan ${strong.compliant} jawaban Ya/Ada dan ${strong.gap} gap.`, margin, contentWidth, 9.5, 14, 6);
  if (weak) paragraph(kit, `Kategori ${weak.area} memerlukan perhatian karena memiliki ${weak.gap} gap, ${weak.partial} partial fulfillment, dan ${weak.evidenceGap} evidence gap.`, margin, contentWidth, 9.5, 14, 4);
}

function drawRiskExposureAnalysis(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Risk Exposure Analysis");
  drawSectionTitle(kit, "Risk Exposure Analysis");
  [
    "Risk exposure disusun berdasarkan risk metadata pada setiap pertanyaan Level 2. Analisis ini bersifat indikatif dan perlu divalidasi oleh Legal/DPO sebelum digunakan sebagai kesimpulan hukum final.",
    "Risiko administratif terindikasi apabila gap berkaitan dengan kewajiban yang dapat dikenai sanksi administratif berdasarkan UU PDP, seperti peringatan tertulis, penghentian sementara kegiatan pemrosesan, penghapusan atau pemusnahan Data Pribadi, dan/atau denda administratif sesuai ketentuan yang berlaku.",
    "Risiko gugatan atau ganti rugi terindikasi apabila gap berpotensi menimbulkan kerugian bagi Subjek Data Pribadi atau melemahkan kemampuan organisasi untuk membuktikan pemenuhan kewajiban PDP.",
    "Indikasi risiko pidana tidak boleh disimpulkan secara otomatis dari self-assessment. Risiko ini hanya perlu dicatat untuk validasi Legal/DPO apabila terdapat indikasi unsur sengaja dan melawan hukum sesuai pasal terkait.",
    "Risiko operasional muncul ketika gap dapat menghambat pelaksanaan proses, eskalasi insiden, pemenuhan hak SDP, pengelolaan vendor, atau pembuktian kepatuhan.",
    "Risiko auditability muncul ketika kontrol dinyatakan tersedia tetapi tidak didukung evidence yang memadai.",
  ].forEach((item) => paragraph(kit, item, margin, contentWidth, 9.8, 14.5, 5));
  drawRiskExposureCards(kit, metrics);
}

function drawEvidenceQualityAnalysis(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Evidence Quality Analysis");
  drawSectionTitle(kit, "Evidence Quality Analysis");
  paragraph(kit, "Evidence quality analysis menunjukkan tingkat kekuatan pembuktian atas jawaban unit. Evidence yang kuat penting untuk menunjukkan akuntabilitas dan kesiapan organisasi jika dilakukan audit, review DPO, atau pemeriksaan regulator.", margin, contentWidth, 10, 15, 8);
  if (metrics.evidenceConfidence !== null && metrics.evidenceConfidence < 75) {
    paragraph(kit, `Evidence Confidence masih rendah, yaitu ${formatScore(metrics.evidenceConfidence)}. Hal ini menunjukkan bahwa sebagian jawaban belum didukung evidence yang memadai.`, margin, contentWidth, 9.8, 14, 5);
  }
  const yesWithoutEvidence = metrics.reportQuestions.filter((item) => item.normalized === "COMPLIANT" && item.evidenceRequired && !item.evidenceFiles.length).length;
  const partialWeak = metrics.reportQuestions.filter((item) => item.normalized === "PARTIAL" && item.evidenceRequired && !["Adequate", "Strong"].includes(item.evidenceStrength)).length;
  if (yesWithoutEvidence) paragraph(kit, `Terdapat ${yesWithoutEvidence} jawaban Ya/Ada yang belum didukung evidence memadai. Item tersebut tidak otomatis menjadi gap kontrol, tetapi perlu ditindaklanjuti sebagai Evidence Gap.`, margin, contentWidth, 9.8, 14, 5);
  if (partialWeak) paragraph(kit, `Terdapat ${partialWeak} jawaban Sebagian dengan evidence lemah atau belum tersedia. Item tersebut perlu dilengkapi agar status pemenuhan dapat diverifikasi.`, margin, contentWidth, 9.8, 14, 8);
  if (metrics.auditReadiness === "Low") {
    drawBox(kit, margin, kit.y, contentWidth, 58, rgb(1, 0.96, 0.88), rgb(0.95, 0.64, 0.20));
    text(kit, "Audit Readiness: Low", margin + 12, kit.y - 18, 10.5, kit.bold, amber);
    text(kit, `${metrics.evidenceGapCount} evidence gap, ${metrics.evidenceAdequateCount} adequate/strong evidence, dan Evidence Confidence ${formatScore(metrics.evidenceConfidence)}.`, margin + 12, kit.y - 36, 9, kit.regular, slate, contentWidth - 24);
    kit.y -= 70;
  }
  drawEvidenceStrengthBar(kit, metrics);
  drawEvidenceConfidenceByCategory(kit, metrics);
}

function drawDetailedFindings(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Detailed Findings");
  drawSectionTitle(kit, "Detailed Findings");
  if (!metrics.consolidatedFindings.length) {
    paragraph(kit, "Tidak ada detailed finding berdasarkan jawaban saat ini.", margin, contentWidth, 10, 15, 0);
    return;
  }
  metrics.consolidatedFindings.slice(0, 12).forEach((finding, index) => {
    if (index > 0) newPage(kit, "Detailed Findings");
    drawConsolidatedFinding(kit, finding, index + 1);
  });
}

function drawConsolidatedFinding(kit: PdfKit, finding: ConsolidatedFinding, index: number) {
  const representative = finding.items[0];
  const answerSummary = summarizeFindingAnswers(finding.items);
  const evidenceSummary = summarizeFindingEvidence(finding.items);
  text(kit, `Finding ${index} - ${finding.title}`, margin, kit.y, 14, kit.bold, navy, contentWidth);
  kit.y -= 22;
  const blocks = [
    ["Issue", finding.template.issue],
    ["Current Answer Summary", `${formatConsolidatedQuestionSummary(finding.items)} Ringkasan jawaban: ${answerSummary}. Catatan unit: ${summarizeNotes(finding.items)}. Evidence yang tersedia: ${evidenceSummary}.`],
    ["Why It Matters", buildConsolidatedRiskText(finding.items)],
    ["Root Cause Classification", classifyRootCauses(finding.items).join(", ")],
    ["Required Evidence", uniqueList(finding.items.map((item) => item.question.minimumEvidence || item.question.evidence)).slice(0, 3).join("; ") || "Evidence relevan dengan owner/PIC, tanggal/periode, versi/status berlaku, dan konteks proses."],
    ["Recommended Action", finding.template.recommendation],
    ["Owner and Timeline", `Owner: ${ownerForFinding(representative.question)}. Timeline: ${timelineForPriority(finding.priority)}. Priority: ${finding.priority}.`],
  ];
  blocks.forEach(([heading, body]) => {
    ensureSpace(kit, 54);
    text(kit, heading, margin, kit.y, 9.5, kit.bold, navy);
    kit.y -= 13;
    body.split("\n").forEach((line) => paragraph(kit, line, margin + 10, contentWidth - 10, 8.6, 12, 1));
    kit.y -= 5;
  });
}

function drawBridgingTheGaps(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Bridging the Gaps");
  drawSectionTitle(kit, "Bridging the Gaps");
  paragraph(kit, "Bagian ini mengubah gap yang teridentifikasi menjadi area perbaikan yang dapat ditindaklanjuti. Fokus bridging diarahkan pada perbaikan dokumentasi, penguatan proses, pemenuhan evidence, koordinasi antar fungsi, dan monitoring berkelanjutan.", margin, contentWidth, 10, 15, 8);
  const rows = buildImprovementAreas(metrics).map((row) => [row.area, row.actions, row.outputs, row.owner, row.timeline]);
  drawTable(kit, ["Improvement Area", "Required Actions", "Expected Outputs", "Owner", "Timeline"], rows, [100, 142, 126, 86, contentWidth - 454], 44);
}

function drawRecommendations(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Recommendations");
  drawSectionTitle(kit, "Recommendations");
  paragraph(kit, "Rekomendasi disusun berdasarkan prioritas gap, dampak terhadap kepatuhan UU PDP, dan kebutuhan pembuktian. Rekomendasi ini perlu diterjemahkan ke dalam action plan oleh owner terkait.", margin, contentWidth, 10, 15, 8);
  [
    "Immediate actions perlu difokuskan pada gap dengan priority Critical atau High, terutama yang berkaitan dengan dasar pemrosesan, keamanan, Kegagalan PDP, DPIA, vendor, atau transfer lintas negara.",
    "Short-term actions perlu diarahkan pada penyusunan atau pembaruan dokumen, SOP, register, evidence, dan mekanisme koordinasi internal.",
    "Medium-term actions perlu mencakup integrasi kontrol ke proses bisnis dan sistem, training owner, serta monitoring pelaksanaan.",
    "Long-term actions perlu diarahkan pada continuous improvement, review berkala, automation evidence, dan penguatan dashboard kepatuhan.",
  ].forEach((item) => paragraph(kit, item, margin, contentWidth, 10, 15, 6));
  drawRecommendationPriorityList(kit, metrics);
  drawGranularActionPlan(kit, metrics);
  drawEvidenceRequestList(kit, metrics);
}

function drawGranularActionPlan(kit: PdfKit, metrics: ReportMetrics) {
  drawSectionSubtitle(kit, "Action Plan yang Dapat Dieksekusi");
  const rows = metrics.consolidatedFindings.slice(0, 10).map((finding, index) => {
    const representative = finding.items[0];
    const action = actionForFinding(representative.question);
    return [
      `ACT-${String(index + 1).padStart(2, "0")}`,
      finding.title,
      finding.area,
      action.action,
      action.owner,
      action.supportingOwner,
      timelineForPriority(finding.priority),
      action.expectedEvidence,
      action.completionCriteria,
      action.dependency,
      "Open",
    ];
  });
  if (rows.length) {
    drawTable(kit, ["Action ID", "Finding", "Area", "Action", "Owner", "Supporting", "Due Date", "Expected Evidence", "Completion Criteria", "Dependency", "Status"], rows, [34, 52, 42, 64, 42, 46, 34, 56, 52, 34, 55], 38);
  }
}

function drawEvidenceRequestList(kit: PdfKit, metrics: ReportMetrics) {
  drawSectionSubtitle(kit, "Evidence Request List per Owner");
  const rows = metrics.evidenceGapItems.slice(0, 12).map((item, index) => [
    `EV-${String(index + 1).padStart(2, "0")}`,
    getQuestionAreaDisplayName(item.question),
    cleanQuestionToRequirement(item.question.question),
    item.question.minimumEvidence || item.question.evidence || "Evidence minimum perlu dikonfirmasi.",
    item.question.recommendedEvidence || "-",
    ownerForFinding(item.question),
    item.priority,
    timelineForPriority(item.priority),
    "Open",
  ]);
  if (rows.length) {
    drawTable(kit, ["Evidence ID", "Area", "Kontrol", "Evidence Minimum", "Evidence Tambahan", "Owner", "Priority", "Due Date", "Status"], rows, [36, 50, 90, 90, 70, 50, 34, 40, 51], 34);
  } else {
    paragraph(kit, "Tidak ada evidence request berdasarkan jawaban saat ini.", margin, contentWidth, 10, 15, 4);
  }
}

function drawImplementationRoadmap(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Implementation Roadmap");
  drawSectionTitle(kit, "Implementation Roadmap");
  paragraph(kit, "Roadmap implementasi disusun untuk membantu unit dan fungsi terkait menyelesaikan action plan berdasarkan tingkat prioritas.", margin, contentWidth, 10, 15, 8);
  drawRoadmapTimeline(kit, metrics);
  [
    ["0-30 hari", "Control remediation actions untuk critical/high control gaps, high-priority evidence gaps, dan legal validation items."],
    ["31-60 hari", "Evidence completion actions dan documentation updates untuk SOP, kontrak, register, atau kontrol vendor/security."],
    ["61-90 hari", "DPO review, evidence verification, training owner, dan integrasi kontrol ke proses operasional."],
    ["91-180 hari", "Monitoring actions, pengujian efektivitas, training lanjutan, dan perbaikan evidence quality."],
    ["Ongoing", "Quarterly review, vendor reassessment, incident drill, RoPA/DPIA refresh, dan evidence refresh."],
  ].forEach(([title, body]) => {
    text(kit, title, margin, kit.y, 10, kit.bold, navy);
    kit.y -= 13;
    paragraph(kit, body, margin + 12, contentWidth - 12, 9.5, 13, 3);
    kit.y -= 4;
  });
}

function drawManagementDecisions(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Management Decisions Required");
  drawSectionTitle(kit, "Management Decisions Required");
  paragraph(kit, "Keputusan manajemen dibutuhkan agar remediation tidak berhenti sebagai daftar temuan, tetapi berubah menjadi program kerja yang memiliki owner, standar evidence, dan cadence monitoring.", margin, contentWidth, 10, 15, 8);
  const rows = [
    ["MD-01", "Menunjuk owner remediation per area", metrics.topPriorityAreas, "Management + DPO"],
    ["MD-02", "Menyetujui timeline 30/60/90 hari", "Roadmap remediation", "Management"],
    ["MD-03", "Menetapkan evidence standard", `${metrics.evidenceGapCount} evidence gap`, "DPO + Legal"],
    ["MD-04", "Menyetujui prioritas review DPO", `${metrics.clarificationCount} clarification item`, "DPO"],
    ["MD-05", "Menyetujui vendor remediation plan", "Jika area vendor/prosesor triggered", "Procurement + Legal"],
    ["MD-06", "Menentukan kebutuhan validasi onsite/interview", metrics.auditReadiness === "Low" ? "Direkomendasikan" : "Opsional", "DPO + Unit"],
    ["MD-07", "Menetapkan monitoring cadence sampai gap selesai", "Weekly/bi-weekly sampai action plan closed", "Management + DPO"],
  ];
  drawTable(kit, ["Decision ID", "Decision Required", "Context", "Decision Owner"], rows, [58, 176, 170, contentWidth - 404], 34);
}

function drawContinuousImprovement(kit: PdfKit) {
  newPage(kit, "Continuous Improvement");
  drawSectionTitle(kit, "Continuous Improvement");
  paragraph(kit, "Pemenuhan UU PDP tidak berhenti pada penyelesaian gap. Organisasi perlu menerapkan siklus perbaikan berkelanjutan agar kontrol tetap relevan terhadap perubahan proses, sistem, vendor, produk, dan regulasi.", margin, contentWidth, 10, 15, 8);
  [
    "Persentase proses yang tercatat dalam RoPA.",
    "Persentase high-risk processing yang melalui DPIA screening.",
    "Persentase DSR yang diselesaikan sesuai SLA.",
    "Persentase vendor dengan DPA atau klausul PDP.",
    "Persentase akses yang direview sesuai jadwal.",
    "Persentase evidence Adequate atau Strong.",
    "Persentase tindakan retensi/pemusnahan yang memiliki evidence.",
    "Rata-rata waktu eskalasi dugaan Kegagalan PDP.",
  ].forEach((item) => bullet(kit, item));
}

function drawCommunicationPlan(kit: PdfKit) {
  newPage(kit, "Communication Plan");
  drawSectionTitle(kit, "Communication and Collaboration Plan");
  paragraph(kit, "Remediasi gap PDP membutuhkan koordinasi lintas fungsi. Communication plan berikut bertujuan memastikan setiap stakeholder memahami peran, pesan utama, channel, frekuensi, dan output yang diharapkan.", margin, contentWidth, 10, 15, 8);
  const rows = [
    ["DPO/Privacy Office", "Oversight", "Validasi finding dan action plan", "Dashboard/meeting", "Weekly", "DPO", "Review notes"],
    ["Legal", "Legal validation", "Validasi risiko dan pasal relevan", "Meeting/email", "As needed", "Legal", "Legal input"],
    ["IT/Security", "Security remediation", "Kontrol teknis dan evidence", "Ticket/meeting", "Weekly", "IT", "Security evidence"],
    ["Business Unit", "Process ownership", "Perbaikan proses unit", "Dashboard", "Weekly", "Unit Head", "Action update"],
    ["Procurement", "Vendor remediation", "DPA dan due diligence", "Meeting", "Bi-weekly", "Procurement", "Vendor pack"],
    ["HR", "People process", "Training dan employee data", "Meeting", "Monthly", "HR", "Training log"],
    ["Customer Service", "DSR handling", "SLA dan template respons", "Meeting", "Monthly", "CS", "DSR tracker"],
    ["Risk/Compliance", "Monitoring", "Risk and control tracking", "Dashboard", "Monthly", "Compliance", "Status report"],
    ["Management", "Decision", "Priority and resources", "Steerco", "Monthly", "Management", "Decision log"],
  ];
  drawTable(kit, ["Stakeholder", "Purpose", "Key Message", "Channel", "Frequency", "Owner", "Output"], rows, [78, 58, 105, 72, 56, 64, contentWidth - 433], 34);
}

function drawConclusion(kit: PdfKit, metrics: ReportMetrics) {
  newPage(kit, "Conclusion");
  drawSectionTitle(kit, "Conclusion");
  paragraph(kit, `Assessment menunjukkan bahwa unit ${metrics.unitName} memiliki PDP Readiness Score sebesar ${formatScore(metrics.readinessScore)}, Self-Declared Fulfillment Score sebesar ${formatScore(metrics.selfDeclaredFulfillmentScore)}, dan Evidence Confidence sebesar ${formatScore(metrics.evidenceConfidence)}. Overall Compliance Level adalah ${metrics.overallComplianceLevel}. Hasil ini menunjukkan bahwa terdapat area yang telah terpenuhi, namun masih terdapat control gap, partial fulfillment, uncertainty, dan evidence gap yang perlu ditindaklanjuti.`, margin, contentWidth, 10.5, 16, 8);
  paragraph(kit, `Prioritas utama adalah ${metrics.topPriorityAreas}. Tindak lanjut perlu difokuskan pada validasi item Tidak Tahu, penguatan evidence, penyelesaian gap High/Critical, dan pelaksanaan roadmap remediasi.`, margin, contentWidth, 10.5, 16, 8);
  paragraph(kit, "Report ini dapat digunakan sebagai dasar awal untuk diskusi antara unit, DPO, Legal, dan fungsi terkait dalam menyusun action plan dan memastikan pemenuhan UU PDP dapat dibuktikan secara memadai.", margin, contentWidth, 10.5, 16, 8);
}

function drawAppendix(kit: PdfKit, input: PdfAssessment, metrics: ReportMetrics) {
  newPage(kit, "Appendix");
  drawSectionTitle(kit, "Appendix");
  [
    "Appendix A - Full L2 Triggered Responses",
    "Appendix B - N/A List and Reasons",
    "Appendix C - Unknown and Clarification List",
    "Appendix D - Evidence Request List",
    "Appendix E - Scoring Dictionary",
    "Appendix F - Risk Library Summary",
    "Appendix G - Question-to-Category Mapping",
    "Appendix H - Question-to-Principle Mapping",
    "Appendix I - Internal ID Mapping",
    "Appendix J - Excel Metadata Version",
  ].forEach((item) => bullet(kit, item));
  kit.y -= 10;
  drawSectionTitle(kit, "Appendix A - Full L2 Triggered Responses");
  const rows = metrics.reportQuestions.slice(0, 45).map((item) => [
    item.question.id,
    getQuestionAreaDisplayName(item.question),
    item.answer || "Belum dijawab",
    item.normalized,
    item.evidenceFiles.length ? `${item.evidenceFiles.length} file / ${item.evidenceStrength}` : item.isEvidenceGap ? "Evidence Gap" : item.isEvidenceRequest ? "Evidence Request" : item.evidenceStrength,
    item.note || "-",
  ]);
  drawTable(kit, ["Internal ID", "Area Assessment", "Jawaban", "Status", "Evidence Status", "Catatan"], rows, [52, 108, 62, 74, 82, contentWidth - 378], 22);
  drawSectionTitle(kit, "Appendix B - N/A List and Reasons");
  drawTable(kit, ["Internal ID", "Area", "Reason"], metrics.reportQuestions.filter((item) => item.normalized === "NOT_RELEVANT").map((item) => [item.question.id, getQuestionAreaDisplayName(item.question), item.note || "Alasan N/A belum tersedia"]), [60, 160, contentWidth - 220], 24);
  drawSectionTitle(kit, "Appendix C - Unknown and Clarification List");
  drawTable(kit, ["Internal ID", "Area", "Clarification"], metrics.clarificationItems.map((item) => [item.question.id, getQuestionAreaDisplayName(item.question), item.note || "Perlu klarifikasi dengan process owner"]), [60, 160, contentWidth - 220], 24);
  drawSectionTitle(kit, "Appendix D - Evidence Request List");
  drawTable(kit, ["Internal ID", "Area", "Evidence Minimum", "Owner", "Priority"], metrics.reportQuestions.filter((item) => item.isEvidenceGap || item.isEvidenceRequest).slice(0, 60).map((item) => [item.question.id, getQuestionAreaDisplayName(item.question), item.question.minimumEvidence || item.question.evidence || "-", ownerForFinding(item.question), item.priority]), [58, 116, 190, 86, contentWidth - 450], 26);
  drawSectionTitle(kit, "Appendix E - Scoring Calculation Detail");
  drawKeyValueTable(kit, [
    ["Applicable L2", String(metrics.l2Applicable)],
    ["PDP Readiness Score", formatScore(metrics.readinessScore)],
    ["Self-Declared Fulfillment Score", formatScore(metrics.selfDeclaredFulfillmentScore)],
    ["Evidence-Verified Score", metrics.evidenceVerifiedScore === null ? "Not yet verifiable" : formatScore(metrics.evidenceVerifiedScore)],
    ["Gap Rate", formatScore(metrics.gapRate)],
    ["Partial Rate", formatScore(metrics.partialRate)],
    ["Uncertainty Rate", formatScore(metrics.uncertaintyRate)],
    ["Evidence Confidence", formatScore(metrics.evidenceConfidence)],
  ]);
  drawSectionTitle(kit, "Appendix F - Risk Library Summary");
  drawTable(kit, ["Internal ID", "Area", "Risk Metadata", "Article"], metrics.findings.slice(0, 60).map((item) => [item.question.id, getQuestionAreaDisplayName(item.question), item.question.nonComplianceRisk || item.question.riskHint || "-", formatArticles(item.question.articleReference || item.question.reference)]), [58, 116, 230, contentWidth - 404], 26);
  drawSectionTitle(kit, "Appendix G - Question-to-Category Mapping");
  drawTable(kit, ["Internal ID", "Module", "Area Assessment"], metrics.reportQuestions.slice(0, 60).map((item) => [item.question.id, getModuleDisplayName(item.question.module || item.question.triggerOrOwner), getQuestionAreaDisplayName(item.question)]), [58, 190, contentWidth - 248], 24);
  drawSectionTitle(kit, "Appendix H - Question-to-Principle Mapping");
  drawTable(kit, ["Internal ID", "Principle", "Area Assessment"], metrics.reportQuestions.slice(0, 60).map((item) => [item.question.id, getPrincipleDisplayName(item.question.categoryScoring || item.question.principleCategory), getQuestionAreaDisplayName(item.question)]), [58, 190, contentWidth - 248], 24);
  drawSectionTitle(kit, "Appendix I - Internal ID Mapping");
  drawTable(kit, ["Internal ID", "Display Label"], metrics.reportQuestions.slice(0, 60).map((item) => [item.question.id, getQuestionDisplayLabel(item.question.id, item.question)]), [70, contentWidth - 70], 24);
  drawSectionTitle(kit, "Appendix J - Excel Metadata Version");
  drawKeyValueTable(kit, [
    ["Excel Source Version", "Self_Assessment_UU_PDP_Unit_Trigger_Risk_Evidence_ClosedAnswer_Codex_v5_Simplified.xlsx"],
    ["Assessment ID", input.assessmentNumber],
    ["Generated Date", metrics.reportDate],
    ["Template Version", "Self Assessment UU PDP Unit Trigger Risk Evidence v5 Simplified"],
  ]);
}

function drawSummaryBoxes(kit: PdfKit, metrics: ReportMetrics) {
  const boxes = [
    ["Temuan Utama", [`${metrics.counts.compliant} kontrol telah dijawab Ya/Ada.`, `${metrics.counts.partial} kontrol dijawab Sebagian.`, `${metrics.counts.gap} kontrol dijawab Tidak/Tidak Ada.`, `${metrics.counts.unknown} item memerlukan klarifikasi.`, `${metrics.evidenceGapCount} item memerlukan evidence tambahan.`]],
    ["Perhatian Manajemen", [`Fokus manajemen perlu diarahkan pada area ${metrics.topPriorityAreas} karena area tersebut memiliki kombinasi gap, risiko, dan kebutuhan evidence paling tinggi.`]],
    ["Tindakan Cepat", ["Lengkapi evidence untuk kontrol yang sudah dijawab Ya/Ada.", "Validasi jawaban Tidak Tahu dengan owner proses.", "Lengkapi catatan alasan untuk setiap Tidak Relevan/N/A.", "Prioritaskan gap dengan severity High atau Critical."]],
  ] as const;
  boxes.forEach(([title, lines]) => {
    ensureSpace(kit, 118);
    const height = 34 + lines.length * 13;
    drawBox(kit, margin, kit.y, contentWidth, height, pale, border);
    text(kit, title, margin + 12, kit.y - 18, 10.5, kit.bold, navy);
    let y = kit.y - 36;
    lines.forEach((line) => {
      text(kit, `- ${line}`, margin + 14, y, 9, kit.regular, slate, contentWidth - 28);
      y -= 13;
    });
    kit.y -= height + 10;
  });
}

function drawAnswerDistributionDonut(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 210);
  drawSectionSubtitle(kit, "Answer Distribution");
  const rows = [
    ["Area Pemenuhan", metrics.counts.compliant, green],
    ["Partial Fulfillment", metrics.counts.partial, amber],
    ["Area Gap", metrics.counts.gap, red],
    ["Area Perlu Klarifikasi", metrics.counts.unknown + metrics.counts.naInvalid, gray],
    ["Area Tidak Relevan Valid", metrics.counts.naValid, purple],
  ] as const;
  drawDonut(kit, margin + 92, kit.y - 88, 70, rows.map((row) => ({ label: row[0], value: row[1], color: row[2] })));
  let y = kit.y - 24;
  rows.forEach(([label, value, color]) => {
    kit.page.drawRectangle({ x: margin + 210, y: y - 7, width: 10, height: 10, color });
    text(kit, `${label}: ${value}`, margin + 226, y, 9.5, kit.regular, slate, 260);
    y -= 17;
  });
  text(kit, "Figure 1. Answer Distribution", margin, kit.y - 178, 8.5, kit.bold, muted);
  text(
    kit,
    `${metrics.l2Triggered} triggered L2 | ${metrics.l2Applicable} applicable for scoring`,
    margin + 210,
    kit.y - 160,
    8.5,
    kit.bold,
    navy,
  );
  kit.y -= 205;
}

function drawCategoryFulfillmentScore(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 245);
  drawSectionSubtitle(kit, "Category Fulfillment Score");
  const rows = metrics.areaRows.slice(0, 9);
  const labelWidth = 160;
  const barWidth = 280;
  rows.forEach((row) => {
    ensureSpace(kit, 21);
    text(kit, row.area, margin, kit.y, 8.6, kit.regular, slate, labelWidth - 8);
    drawProgressBar(kit, margin + labelWidth, kit.y - 8, barWidth, 8, row.fulfillmentScore ?? 0, colorForScore(row.fulfillmentScore));
    text(kit, formatScore(row.fulfillmentScore), margin + labelWidth + barWidth + 10, kit.y - 1, 8.4, kit.bold, navy);
    kit.y -= 19;
  });
  text(kit, "Figure 2. Category Fulfillment Score", margin, kit.y - 4, 8.5, kit.bold, muted);
  kit.y -= 20;
}

function drawStatusByCategory(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 230);
  drawSectionSubtitle(kit, "Status by Category");
  const rows = metrics.areaRows.slice(0, 8);
  rows.forEach((row) => {
    ensureSpace(kit, 22);
    text(kit, row.area, margin, kit.y, 8.4, kit.regular, slate, 150);
    drawStackedBar(kit, margin + 154, kit.y - 9, 330, 10, [
      { value: row.compliant, color: green },
      { value: row.partial, color: amber },
      { value: row.gap, color: red },
      { value: row.unknown + row.naInvalid, color: gray },
      { value: row.naValid, color: purple },
    ]);
    kit.y -= 20;
  });
  text(kit, "Figure 3. Status by Category", margin, kit.y - 4, 8.5, kit.bold, muted);
  kit.y -= 18;
}

function drawGapSeverityHeatmap(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 250);
  drawSectionSubtitle(kit, "Gap Severity Heatmap");
  const rows = metrics.areaRows.filter((row) => row.gap || row.partial || row.unknown || row.evidenceGap).slice(0, 10);
  drawTable(
    kit,
    ["Area", "Critical", "High", "Medium", "Low", "Gap", "Evidence Gap"],
    rows.map((row) => [row.area, String(row.critical), String(row.high), String(row.medium), String(row.low), String(row.gap), String(row.evidenceGap)]),
    [148, 54, 48, 58, 42, 42, contentWidth - 392],
    26,
  );
  text(kit, "Figure 4. Gap Severity Heatmap", margin, kit.y - 4, 8.5, kit.bold, muted);
  kit.y -= 18;
}

function drawRadarChart(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 345);
  const principleRows = buildPrincipleRows(metrics).slice(0, 8);
  const cx = margin + 170;
  const cy = kit.y - 150;
  const radius = 118;
  for (let ring = 1; ring <= 5; ring += 1) {
    drawRadarPolygon(kit, cx, cy, (radius / 5) * ring, principleRows.length, border, 0.6);
  }
  const points = principleRows.map((row, index) => {
    const angle = -Math.PI / 2 + (index / principleRows.length) * Math.PI * 2;
    const r = ((row.score ?? 0) / 100) * radius;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    kit.page.drawLine({ start: points[i], end: next, thickness: 2, color: blue });
    kit.page.drawCircle({ x: points[i].x, y: points[i].y, size: 3, color: blue });
  }
  principleRows.forEach((row, index) => {
    const angle = -Math.PI / 2 + (index / principleRows.length) * Math.PI * 2;
    const lx = cx + Math.cos(angle) * (radius + 18);
    const ly = cy + Math.sin(angle) * (radius + 18);
    text(kit, row.label, lx - 24, ly, 7.4, kit.regular, slate, 64);
  });
  const tableRows = principleRows.map((row) => [row.label, formatScore(row.score), String(row.applicable), String(row.gap)]);
  drawTableAt(kit, margin + 340, kit.y - 30, ["Principle", "Score", "N", "Gap"], tableRows, [72, 46, 34, 34], 24);
  kit.y -= 315;
}

function drawEvidenceStrengthBar(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 170);
  drawSectionSubtitle(kit, "Evidence Strength Distribution");
  paragraph(
    kit,
    `Required Evidence Items: ${metrics.evidenceRequiredCount}. Evidence Uploaded: ${metrics.evidenceUploadedCount}. Evidence Adequate/Strong: ${metrics.evidenceAdequateCount}. Evidence Gap: ${metrics.evidenceGapCount}. Evidence Confidence: ${formatScore(metrics.evidenceConfidence)}.`,
    margin,
    contentWidth,
    9,
    12,
    4,
  );
  const counts = ["None", "Weak", "Adequate", "Strong"].map((level) => ({
    label: level,
    value: metrics.reportQuestions.filter((item) => item.evidenceStrength === level).length,
    color: level === "Strong" ? green : level === "Adequate" ? blue : level === "Weak" ? amber : gray,
  }));
  const max = Math.max(1, ...counts.map((row) => row.value));
  counts.forEach((row) => {
    ensureSpace(kit, 24);
    text(kit, row.label, margin, kit.y, 9, kit.regular, slate, 80);
    kit.page.drawRectangle({ x: margin + 92, y: kit.y - 9, width: 280, height: 10, color: pale });
    kit.page.drawRectangle({ x: margin + 92, y: kit.y - 9, width: (row.value / max) * 280, height: 10, color: row.color });
    text(kit, String(row.value), margin + 388, kit.y - 1, 8.5, kit.bold, navy);
    kit.y -= 22;
  });
  text(kit, "Figure 6. Evidence Strength Distribution", margin, kit.y - 4, 8.5, kit.bold, muted);
  kit.y -= 18;
}

function drawEvidenceConfidenceByCategory(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 190);
  drawSectionSubtitle(kit, "Evidence Confidence by Category");
  const rows = metrics.areaRows.filter((row) => row.evidenceRequired > 0).slice(0, 8);
  if (!rows.length) {
    paragraph(kit, "Tidak ada pertanyaan applicable yang mensyaratkan evidence wajib pada konfigurasi assessment ini.", margin, contentWidth, 9.5, 14, 2);
  } else {
    rows.forEach((row) => {
      text(kit, row.area, margin, kit.y, 8.5, kit.regular, slate, 160);
      drawProgressBar(kit, margin + 165, kit.y - 8, 260, 8, row.evidenceConfidence ?? 0, colorForScore(row.evidenceConfidence));
      text(kit, formatScore(row.evidenceConfidence), margin + 435, kit.y - 1, 8.4, kit.bold, navy);
      kit.y -= 19;
    });
  }
  text(kit, "Figure 7. Evidence Confidence by Category", margin, kit.y - 4, 8.5, kit.bold, muted);
  kit.y -= 18;
}

function drawGapPrioritizationMatrix(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 260);
  drawSectionSubtitle(kit, "Gap Prioritization Matrix");
  const x = margin + 54;
  const y = kit.y - 30;
  const w = 360;
  const h = 180;
  kit.page.drawRectangle({ x, y: y - h, width: w, height: h, color: white, borderColor: border, borderWidth: 0.8 });
  kit.page.drawLine({ start: { x: x + w / 2, y }, end: { x: x + w / 2, y: y - h }, color: border, thickness: 0.8 });
  kit.page.drawLine({ start: { x, y: y - h / 2 }, end: { x: x + w, y: y - h / 2 }, color: border, thickness: 0.8 });
  text(kit, "Higher risk exposure", x + w + 10, y - 10, 8, kit.regular, muted);
  text(kit, "Higher action urgency", x + w / 2 - 36, y - h - 18, 8, kit.regular, muted);
  text(kit, "Impact / risk exposure", x + 8, y - 12, 8, kit.bold, navy);
  text(kit, "Urgency", x + w - 44, y - h + 12, 8, kit.bold, navy);
  metrics.findings.slice(0, 10).forEach((item, index) => {
    const px = x + 26 + Math.min(1, (priorityRank(item.priority) + 1) / 4) * (w - 52);
    const py = y - h + 26 + (item.normalized === "GAP" ? 0.78 : item.normalized === "UNKNOWN" ? 0.60 : 0.44) * (h - 52);
    kit.page.drawCircle({ x: px, y: py, size: 4, color: priorityColor(item.priority) });
    text(kit, `${index + 1}`, px + 6, py - 2, 7, kit.bold, slate);
  });
  text(kit, "Figure 8. Gap Prioritization Matrix", margin, y - h - 34, 8.5, kit.bold, muted);
  kit.y = y - h - 52;
}

function drawRoadmapTimeline(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 210);
  drawSectionSubtitle(kit, "Implementation Roadmap");
  const phases = [
    ["0-30", red, metrics.findings.filter((item) => item.priority === "Critical" || item.priority === "High").length],
    ["31-60", amber, metrics.findings.filter((item) => item.priority === "Medium").length],
    ["61-90", blue, metrics.evidenceGapCount],
    ["91-180", green, metrics.clarificationCount],
    ["Ongoing", purple, metrics.areaRows.length],
  ] as const;
  const startX = margin;
  const boxW = (contentWidth - 32) / 5;
  phases.forEach(([label, color, count], index) => {
    const x = startX + index * (boxW + 8);
    drawBox(kit, x, kit.y, boxW, 74, rgb(0.98, 0.99, 1), border);
    kit.page.drawRectangle({ x, y: kit.y - 74, width: boxW, height: 5, color });
    text(kit, label, x + 10, kit.y - 22, 12, kit.bold, navy);
    text(kit, `${count} item`, x + 10, kit.y - 42, 9, kit.regular, slate);
    text(kit, index === 4 ? "monitoring" : "remediation", x + 10, kit.y - 58, 8, kit.regular, muted, boxW - 20);
  });
  text(kit, "Figure 9. Implementation Roadmap", margin, kit.y - 92, 8.5, kit.bold, muted);
  kit.y -= 112;
}

function drawRiskExposureCards(kit: PdfKit, metrics: ReportMetrics) {
  paragraph(
    kit,
    "Risk exposure item dihitung dari control gap dan partial fulfillment. Auditability risk dihitung dari Evidence Gap dan Evidence Request yang belum memiliki bukti memadai.",
    margin,
    contentWidth,
    9.4,
    13,
    6,
  );
  const rows = [
    ["Control Gap dengan eksposur administratif", metrics.findings.filter((item) => item.normalized === "GAP" && /administratif|pasal 57/i.test(`${item.question.administrativeRisk} ${item.question.riskId}`)).length, red],
    ["Partial Fulfillment dengan eksposur administratif", metrics.findings.filter((item) => item.normalized === "PARTIAL" && /administratif|pasal 57/i.test(`${item.question.administrativeRisk} ${item.question.riskId}`)).length, amber],
    ["Items Requiring Legal/DPO Validation", metrics.findings.filter((item) => hasCriminalRedFlag(item)).length, purple],
    ["Auditability Risk", metrics.evidenceGapCount + metrics.evidenceRequestCount, blue],
  ] as const;
  drawMetricCards(kit, rows.map(([label, value]) => [label, String(value)]));
}

function drawRecommendationPriorityList(kit: PdfKit, metrics: ReportMetrics) {
  ensureSpace(kit, 150);
  const rows = metrics.findings.slice(0, 8).map((item, index) => [
    String(index + 1),
    getQuestionAreaDisplayName(item.question),
    item.priority,
    item.question.suggestedRemediation || resolveFindingTemplate(item.question).recommendation,
  ]);
  if (rows.length) drawTable(kit, ["No", "Area", "Priority", "Recommendation"], rows, [34, 116, 62, contentWidth - 212], 34);
}

function drawInfoGrid(kit: PdfKit, rows: string[][], columns: number) {
  const gap = 10;
  const cellW = (contentWidth - gap * (columns - 1)) / columns;
  const cellH = 46;
  rows.forEach((row, index) => {
    const col = index % columns;
    const line = Math.floor(index / columns);
    const x = margin + col * (cellW + gap);
    const y = kit.y - line * (cellH + 8);
    drawBox(kit, x, y, cellW, cellH, white, border);
    text(kit, row[0], x + 10, y - 15, 7.8, kit.bold, muted);
    text(kit, row[1], x + 10, y - 31, 9.2, kit.regular, navy, cellW - 20);
  });
  kit.y -= Math.ceil(rows.length / columns) * (cellH + 8);
}

function drawMetricCards(kit: PdfKit, cards: string[][]) {
  const cols = Math.min(3, cards.length);
  const gap = 10;
  const w = (contentWidth - gap * (cols - 1)) / cols;
  const h = 64;
  cards.forEach((card, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = margin + col * (w + gap);
    const y = kit.y - row * (h + 10);
    drawBox(kit, x, y, w, h, pale, border);
    text(kit, card[0], x + 10, y - 17, 8, kit.bold, muted, w - 20);
    text(kit, card[1], x + 10, y - 42, card[1].length > 18 ? 11 : 16, kit.bold, navy, w - 20);
  });
  kit.y -= Math.ceil(cards.length / cols) * (h + 10);
}

function drawKeyValueTable(kit: PdfKit, rows: string[][]) {
  drawTable(kit, ["Field", "Value"], rows, [170, contentWidth - 170], 26);
}

function drawTable(
  kit: PdfKit,
  headers: string[],
  rows: string[][],
  widths: number[],
  rowHeight = 28,
) {
  ensureSpace(kit, 24 + Math.min(rows.length, 6) * rowHeight + 20);
  drawTableRow(kit, margin, kit.y, widths, 24, headers, navy, white, true);
  kit.y -= 24;
  rows.forEach((row, index) => {
    if (kit.y - rowHeight < margin + 34) {
      newPage(kit, kit.section);
      drawTableRow(kit, margin, kit.y, widths, 24, headers, navy, white, true);
      kit.y -= 24;
    }
    drawTableRow(kit, margin, kit.y, widths, rowHeight, row, index % 2 ? white : rgb(0.98, 0.99, 1), slate, false);
    kit.y -= rowHeight;
  });
  kit.y -= 12;
}

function drawTableAt(
  kit: PdfKit,
  x: number,
  startY: number,
  headers: string[],
  rows: string[][],
  widths: number[],
  rowHeight = 28,
) {
  let y = startY;
  drawTableRow(kit, x, y, widths, 24, headers, navy, white, true);
  y -= 24;
  rows.forEach((row, index) => {
    drawTableRow(kit, x, y, widths, rowHeight, row, index % 2 ? white : rgb(0.98, 0.99, 1), slate, false);
    y -= rowHeight;
  });
}

function drawTableRow(
  kit: PdfKit,
  x: number,
  y: number,
  widths: number[],
  height: number,
  values: string[],
  fill: ReturnType<typeof rgb>,
  fontColor: ReturnType<typeof rgb>,
  isHeader = false,
) {
  let currentX = x;
  values.forEach((value, index) => {
    kit.page.drawRectangle({
      x: currentX,
      y: y - height,
      width: widths[index],
      height,
      color: fill,
      borderColor: border,
      borderWidth: 0.5,
    });
    const font = isHeader ? kit.bold : kit.regular;
    const size = isHeader ? 7.4 : 7.2;
    const lines = wrapText(value || "-", font, size, widths[index] - 8).slice(0, Math.max(1, Math.floor((height - 8) / (size + 2))));
    lines.forEach((line, lineIndex) => {
      kit.page.drawText(sanitize(line), {
        x: currentX + 4,
        y: y - 12 - lineIndex * (size + 2),
        size,
        font,
        color: fontColor,
      });
    });
    currentX += widths[index];
  });
}

function paragraph(
  kit: PdfKit,
  value: string,
  x: number,
  width: number,
  size: number,
  lineHeight: number,
  bottomGap = 0,
) {
  const lines = wrapText(value, kit.regular, size, width);
  lines.forEach((line) => {
    ensureSpace(kit, lineHeight + 8);
    text(kit, line, x, kit.y, size, kit.regular, slate);
    kit.y -= lineHeight;
  });
  kit.y -= bottomGap;
}

function bullet(kit: PdfKit, value: string) {
  ensureSpace(kit, 18);
  text(kit, "-", margin, kit.y, 10, kit.bold, blue);
  text(kit, value, margin + 14, kit.y, 9.6, kit.regular, slate, contentWidth - 14);
  kit.y -= 16;
}

function text(
  kit: PdfKit,
  value: string,
  x: number,
  y: number,
  size: number,
  font: PdfKit["regular"],
  color: ReturnType<typeof rgb>,
  maxWidth?: number,
) {
  const sanitized = sanitize(value);
  if (maxWidth) {
    const lines = wrapText(sanitized, font, size, maxWidth);
    lines.slice(0, 4).forEach((line, index) => {
      kit.page.drawText(line, { x, y: y - index * (size + 2), size, font, color });
    });
    return;
  }
  kit.page.drawText(sanitized, { x, y, size, font, color });
}

function wrapText(value: string, font: PdfKit["regular"], size: number, maxWidth: number) {
  const words = sanitize(value).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function drawSectionTitle(kit: PdfKit, title: string) {
  if (bigSections.has(title) && kit.y < pageHeight - 100) newPage(kit, title);
  ensureSpace(kit, 76);
  text(kit, title, margin, kit.y, 16, kit.bold, navy, contentWidth);
  kit.page.drawLine({ start: { x: margin, y: kit.y - 8 }, end: { x: margin + contentWidth, y: kit.y - 8 }, thickness: 0.8, color: border });
  kit.y -= 30;
}

function drawSectionSubtitle(kit: PdfKit, title: string) {
  ensureSpace(kit, 36);
  text(kit, title, margin, kit.y, 12, kit.bold, navy);
  kit.y -= 20;
}

function drawBox(kit: PdfKit, x: number, y: number, width: number, height: number, color: ReturnType<typeof rgb>, borderColor: ReturnType<typeof rgb>) {
  kit.page.drawRectangle({ x, y: y - height, width, height, color, borderColor, borderWidth: 0.8 });
}

function drawDonut(kit: PdfKit, cx: number, cy: number, radius: number, rows: Array<{ label: string; value: number; color: ReturnType<typeof rgb> }>) {
  const total = Math.max(1, rows.reduce((sum, row) => sum + row.value, 0));
  let start = -Math.PI / 2;
  rows.forEach((row) => {
    if (!row.value) return;
    const sweep = (row.value / total) * Math.PI * 2;
    if (Math.abs(sweep - Math.PI * 2) < 0.001) {
      kit.page.drawCircle({ x: cx, y: cy, size: radius, color: row.color });
    } else {
      kit.page.drawSvgPath(pieSectorPath(radius, start, start + sweep), { x: cx, y: cy, color: row.color });
    }
    start += sweep;
  });
  kit.page.drawCircle({ x: cx, y: cy, size: radius * 0.54, color: white, borderColor: border, borderWidth: 0.5 });
  text(kit, String(total), cx - 10, cy + 4, 17, kit.bold, navy);
  text(kit, "items", cx - 14, cy - 11, 8, kit.regular, muted);
}

function pieSectorPath(radius: number, startAngle: number, endAngle: number) {
  const steps = Math.max(5, Math.ceil(((endAngle - startAngle) / (Math.PI * 2)) * 64));
  const points = ["M 0 0"];
  for (let step = 0; step <= steps; step += 1) {
    const angle = startAngle + ((endAngle - startAngle) * step) / steps;
    points.push(`L ${Math.cos(angle) * radius} ${Math.sin(angle) * radius}`);
  }
  points.push("Z");
  return points.join(" ");
}

function drawProgressBar(kit: PdfKit, x: number, y: number, width: number, height: number, value: number, color: ReturnType<typeof rgb>) {
  kit.page.drawRectangle({ x, y, width, height, color: rgb(0.91, 0.94, 0.98) });
  kit.page.drawRectangle({ x, y, width: Math.max(1, Math.min(100, value) * width / 100), height, color });
}

function drawStackedBar(kit: PdfKit, x: number, y: number, width: number, height: number, parts: Array<{ value: number; color: ReturnType<typeof rgb> }>) {
  const total = Math.max(1, parts.reduce((sum, part) => sum + part.value, 0));
  kit.page.drawRectangle({ x, y, width, height, color: rgb(0.91, 0.94, 0.98) });
  let currentX = x;
  parts.forEach((part) => {
    if (!part.value) return;
    const w = (part.value / total) * width;
    kit.page.drawRectangle({ x: currentX, y, width: w, height, color: part.color, borderColor: white, borderWidth: 0.3 });
    currentX += w;
  });
}

function drawRadarPolygon(kit: PdfKit, cx: number, cy: number, radius: number, count: number, color: ReturnType<typeof rgb>, thickness: number) {
  const points = Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    kit.page.drawLine({ start: point, end: next, thickness, color });
  });
}

function twoColumnList(kit: PdfKit, leftTitle: string, leftRows: string[], rightTitle: string, rightRows: string[]) {
  const columnWidth = (contentWidth - 24) / 2;
  const topY = kit.y;
  text(kit, leftTitle, margin, topY, 11, kit.bold, navy);
  text(kit, rightTitle, margin + columnWidth + 24, topY, 11, kit.bold, navy);
  let leftY = topY - 22;
  leftRows.forEach((row) => {
    text(kit, row, margin, leftY, 9, kit.regular, slate, columnWidth);
    leftY -= 16;
  });
  let rightY = topY - 22;
  rightRows.forEach((row) => {
    text(kit, row, margin + columnWidth + 24, rightY, 9, kit.regular, slate, columnWidth);
    rightY -= 16;
  });
  kit.y = Math.min(leftY, rightY) - 16;
}

function ensureSpace(kit: PdfKit, needed: number) {
  if (kit.y - needed > margin + 28) return;
  newPage(kit, kit.section);
}

function newPage(kit: PdfKit, section: string) {
  kit.page = kit.pdf.addPage([pageWidth, pageHeight]);
  kit.section = section;
  drawHeader(kit, section);
  kit.y = pageHeight - 82;
}

function drawHeader(kit: PdfKit, section: string) {
  kit.page.drawRectangle({ x: 0, y: pageHeight - 42, width: pageWidth, height: 42, color: pale });
  kit.page.drawRectangle({ x: 0, y: pageHeight - 45, width: pageWidth, height: 3, color: blue });
  text(kit, "Privacy Bro", margin, pageHeight - 26, 9, kit.bold, blue);
  text(kit, section, margin + 95, pageHeight - 26, 8.5, kit.regular, muted, 320);
}

function addFooters(pdf: PDFDocument, font: PdfKit["regular"]) {
  const pages = pdf.getPages();
  pages.forEach((page, index) => {
    page.drawText(`Page ${index + 1} of ${pages.length}`, { x: pageWidth - margin - 70, y: 20, size: 8, font, color: muted });
    page.drawText("Gap Analysis Report Kepatuhan UU PDP | Untuk Penggunaan Internal", { x: margin, y: 20, size: 8, font, color: muted });
  });
}

function isEvidenceRequiredForReport(question: SelfAssessmentQuestion, answer: string) {
  const normalized = normalizeAnswer(answer);
  const flag = `${question.evidenceRequirementFlag || ""} ${question.minimumUploadEvidence || ""}`.toLowerCase();
  const evidenceAnswers = question.evidenceAnswers ?? [];
  if (normalized === "COMPLIANT" || normalized === "PARTIAL") return true;
  if (flag.includes("wajib") || (question.minimumUploadEvidence ?? 0) > 0) return true;
  return evidenceAnswers.includes(answer) && normalized !== "NOT_RELEVANT";
}

function getOverallComplianceLevel(input: {
  readinessScore: number | null;
  controlGapCount: number;
  highCriticalGapCount: number;
  partialCount: number;
  unknownCount: number;
  evidenceConfidence: number | null;
  evidenceGapCount: number;
  applicableCount: number;
  hasFundamentalCriticalGap: boolean;
}): ReportMetrics["overallComplianceLevel"] {
  const score = input.readinessScore ?? 0;
  let level: ReportMetrics["overallComplianceLevel"] =
    score >= 90 && input.highCriticalGapCount === 0 && input.controlGapCount === 0 && (input.evidenceConfidence ?? 0) >= 70
      ? "Compliance"
      : score < 60 || input.hasFundamentalCriticalGap
        ? "Non-Compliance"
        : "Partial Compliance";
  if ((input.evidenceConfidence ?? 100) < 50 && input.evidenceGapCount > 0 && level === "Compliance") {
    level = "Partial Compliance";
  }
  return level;
}

function hasFundamentalCriticalGap(items: ReportQuestion[]) {
  return items.some((item) => {
    if (item.normalized !== "GAP" || item.priority !== "Critical") return false;
    const moduleCode = (item.question.module || item.question.triggerOrOwner || "").toUpperCase();
    return ["M01", "M02", "M05", "M07", "M12"].includes(moduleCode);
  });
}

function getAuditReadiness(evidenceConfidence: number | null, evidenceGapCount: number): ReportMetrics["auditReadiness"] {
  if ((evidenceConfidence ?? 0) >= 70 && evidenceGapCount === 0) return "High";
  if ((evidenceConfidence ?? 0) >= 40) return "Medium";
  return "Low";
}

function getModuleDisplayName(moduleId?: string | null) {
  const normalized = (moduleId ?? "").trim().toUpperCase();
  return moduleDisplayNames[normalized] ?? (normalized.replace(/^M\d+\s*-\s*/i, "") || "Area assessment tidak tersedia");
}

function getPrincipleDisplayName(principleId?: string | null) {
  const normalized = (principleId ?? "").trim().toUpperCase();
  return principleDisplayNames[normalized] ?? (principleId || "Prinsip PDP tidak tersedia");
}

function getPrincipleShortLabel(principleId?: string | null) {
  const normalized = (principleId ?? "").trim().toUpperCase();
  return principleShortLabels[normalized] ?? getPrincipleDisplayName(principleId);
}

function getQuestionAreaDisplayName(question: SelfAssessmentQuestion) {
  const moduleName = getModuleDisplayName(question.module || question.triggerOrOwner);
  const area = cleanAreaLabel(question.area);
  if (!area || /^M\d+/i.test(area)) return moduleName;
  return area;
}

function getQuestionDisplayLabel(_questionId: string, metadata: SelfAssessmentQuestion) {
  return `${getQuestionAreaDisplayName(metadata)} - ${cleanQuestionToRequirement(metadata.question)}`;
}

function formatConsolidatedQuestionSummary(items: ReportQuestion[]) {
  const clusters = uniqueList(items.map((item) => cleanQuestionToRequirement(item.question.question))).slice(0, 4);
  return `Finding ini mengonsolidasikan kontrol terkait ${clusters.join("; ")}.`;
}

function formatArticles(value?: string | null) {
  const parts = uniqueList(
    (value ?? "")
      .replace(/Pasal/gi, "")
      .split(/[,;]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  ).slice(0, 5);
  if (!parts.length) return "metadata tidak tersedia";
  return parts.map((part) => `Pasal ${part}`).join("; ");
}

function translateStatus(value: string) {
  if (value === "Submitted") return "Telah Dikirim";
  if (value === "Finalized") return "Final";
  if (value === "Draft") return "Draft";
  return value || "metadata tidak tersedia";
}

function colorForComplianceLevel(level: ReportMetrics["overallComplianceLevel"]) {
  if (level === "Compliance") return green;
  if (level === "Partial Compliance") return amber;
  return red;
}

function coverInsight(metrics: ReportMetrics) {
  if (metrics.auditReadiness === "Low") {
    return "Readiness dinyatakan cukup, tetapi pembuktian evidence belum memadai untuk audit-ready compliance.";
  }
  if (metrics.overallComplianceLevel === "Compliance") {
    return "Kontrol applicable telah terpenuhi secara substansi dan evidence utama tersedia untuk mendukung pembuktian.";
  }
  return "Terdapat control gap, partial fulfillment, atau evidence gap yang perlu ditutup melalui action plan.";
}

function hasCriminalRedFlag(item: ReportQuestion) {
  return /sengaja|melawan hukum|tanpa hak|memperoleh|mengumpulkan|mengungkapkan|menggunakan|memalsukan/i.test(
    `${item.note} ${item.question.criminalRisk} ${item.question.nonComplianceRisk}`,
  );
}

function resolveIssueCluster(question: SelfAssessmentQuestion) {
  const moduleCode = (question.module || question.triggerOrOwner || "").toUpperCase();
  const blob = `${question.area} ${question.question} ${question.evidence} ${question.suggestedRemediation}`.toLowerCase();
  if (moduleCode === "M08") {
    if (/due diligence|assessment vendor|vendor.*nilai/.test(blob)) return "Vendor Due Diligence";
    if (/dpa|kontrak|instruksi|klausul/.test(blob)) return "DPA dan Instruksi Pemrosesan";
    if (/sub-processor|subprosesor|audit right|hak audit/.test(blob)) return "Sub-Processor dan Hak Audit";
    if (/insiden|incident|notifikasi|sla/.test(blob)) return "Vendor Incident Notification";
    return "Vendor, Prosesor, dan Berbagi Data";
  }
  if (moduleCode === "M04") {
    if (/anak/.test(blob)) return "Pemrosesan Data Anak";
    if (/disabilitas/.test(blob)) return "Pemrosesan Data Penyandang Disabilitas";
    if (/penarikan|withdrawal|tarik/.test(blob)) return "Consent Withdrawal";
    if (/persetujuan|consent/.test(blob)) return "Consent Management";
    return "Privacy Notice dan Transparansi";
  }
  if (moduleCode === "M07") {
    if (/log|monitor/.test(blob)) return "Logging and Monitoring";
    if (/akses|access|rbac/.test(blob)) return "Access Control";
    return "Security Safeguards";
  }
  if (moduleCode === "M09") {
    if (/legal hold|backup/.test(blob)) return "Legal Hold and Backup Purge";
    if (/hapus|pemusnahan|delete|destroy/.test(blob)) return "Deletion and Destruction Execution";
    if (/notice|pemberitahuan/.test(blob)) return "Retention Notice Consistency";
    return "Retention Schedule";
  }
  if (moduleCode === "M11") {
    if (/risk register|mitigasi|residual/.test(blob)) return "DPIA Risk Mitigation";
    return "DPIA Governance and Implementation";
  }
  if (moduleCode === "M12") {
    if (/notifikasi|3x24|pemberitahuan/.test(blob)) return "Incident Notification Readiness";
    if (/rca|investigasi|data terdampak/.test(blob)) return "Incident Investigation Readiness";
    return "Incident Response Readiness";
  }
  return resolveFindingTemplate(question).title;
}

function actionForFinding(question: SelfAssessmentQuestion) {
  const template = resolveFindingTemplate(question).title;
  if (template.includes("Incident")) {
    return {
      action: "Menyusun incident response playbook PDP",
      owner: "Security",
      supportingOwner: "Legal, DPO, Unit Owner",
      expectedEvidence: "approved playbook, escalation flow, notification template",
      completionCriteria: "approved by DPO/Legal and communicated to relevant units",
      dependency: "incident owner dan escalation channel",
    };
  }
  if (template.includes("Vendor")) {
    return {
      action: "Review vendor yang memproses Data Pribadi dan lengkapi DPA/klausul PDP",
      owner: "Procurement",
      supportingOwner: "Legal, Vendor Owner, DPO",
      expectedEvidence: "vendor list, due diligence checklist, DPA, audit right clause",
      completionCriteria: "all active PDP vendors assessed and contractual safeguards documented",
      dependency: "vendor inventory",
    };
  }
  if (template.includes("Retensi")) {
    return {
      action: "Finalisasi jadwal retensi dan SOP penghapusan/pemusnahan",
      owner: "Data Owner",
      supportingOwner: "IT, Legal/DPO",
      expectedEvidence: "retention schedule, deletion log, berita acara pemusnahan",
      completionCriteria: "retention rules approved and deletion evidence available",
      dependency: "data inventory and system mapping",
    };
  }
  if (template.includes("DPIA")) {
    return {
      action: "Menerapkan DPIA screening dan dokumentasi mitigasi risiko",
      owner: "Product Owner",
      supportingOwner: "Risk, DPO/Legal",
      expectedEvidence: "DPIA screening checklist, risk register, mitigation plan",
      completionCriteria: "high-risk process screened and approved by DPO/Legal",
      dependency: "RoPA and high-risk criteria",
    };
  }
  return {
    action: resolveFindingTemplate(question).recommendation,
    owner: ownerForFinding(question).split("+")[0].trim(),
    supportingOwner: ownerForFinding(question),
    expectedEvidence: question.minimumEvidence || question.evidence || "evidence pack",
    completionCriteria: "control documented, implemented, and evidence uploaded",
    dependency: "process owner confirmation",
  };
}

function classifyRootCauses(items: ReportQuestion[]) {
  const causes = new Set<string>();
  items.forEach((item) => {
    const note = item.note.toLowerCase();
    const textValue = `${item.question.question} ${item.question.evidence} ${item.question.suggestedRemediation}`.toLowerCase();
    if (!item.evidenceFiles.length && (item.isEvidenceGap || item.isEvidenceRequest)) causes.add("No evidence uploaded");
    if (/owner|pic|penanggung jawab/.test(textValue) && !/owner|pic|penanggung jawab/.test(note)) causes.add("No assigned owner");
    if (/sop|procedure|prosedur|playbook/.test(textValue)) causes.add("No documented procedure");
    if (/vendor|prosesor|processor|dpa/.test(textValue)) causes.add("Vendor dependency");
    if (/legal basis|dasar pemrosesan/.test(textValue)) causes.add("Legal basis not mapped");
    if (/dpo|review|approval/.test(textValue)) causes.add("DPO review not yet performed");
    if (item.normalized === "UNKNOWN") causes.add("Assessment answer requires validation");
    if (item.normalized === "PARTIAL") causes.add("Control exists but not formalized");
    if (note === "tidak" || note.length < 5) causes.add("Insufficient unit knowledge");
  });
  return causes.size ? [...causes].slice(0, 4) : ["Assessment answer requires validation"];
}

function resolvePriority(question: SelfAssessmentQuestion, normalized: NormalizedSelfAssessmentAnswer, evidenceGap: boolean): "Critical" | "High" | "Medium" | "Low" {
  const raw = (question.defaultSeverity || "Medium").toLowerCase();
  if (raw.includes("critical")) return "Critical";
  if (raw.includes("high")) return "High";
  if (normalized === "GAP" && /pidana|pasal 65|pasal 66|kegagalan|insiden|transfer|dpia/i.test(`${question.criminalRisk} ${question.area} ${question.question}`)) return "High";
  if (normalized === "GAP" || normalized === "UNKNOWN" || evidenceGap) return "Medium";
  if (normalized === "PARTIAL") return "Medium";
  return "Low";
}

function cleanAreaLabel(value: string) {
  return value.replace(/^\s*(M|L|Q|A)\d+[\s.:/-]*/i, "").trim() || value;
}

function cleanQuestionToRequirement(value: string) {
  return value
    .replace(/^Apakah\s+/i, "")
    .replace(/\?+$/g, "")
    .replace(/^unit\s+/i, "Unit ")
    .trim();
}

function buildPrincipleRows(metrics: ReportMetrics) {
  const map = new Map<string, { label: string; applicable: number; points: number; gap: number }>();
  Object.keys(desiredConditions).forEach((code) => {
    map.set(code, { label: getPrincipleShortLabel(code), applicable: 0, points: 0, gap: 0 });
  });
  metrics.scoringQuestions.forEach((item) => {
    const matched = (item.question.categoryScoring || "").match(/^P0[1-8]$/i);
    if (!matched) return;
    const label = matched[0].toUpperCase();
    const row = map.get(label) ?? { label: getPrincipleShortLabel(label), applicable: 0, points: 0, gap: 0 };
    row.applicable += 1;
    row.points += item.score;
    if (item.normalized === "GAP") row.gap += 1;
    map.set(label, row);
  });
  return [...map.values()].map((row) => ({ ...row, score: row.applicable ? (row.points / row.applicable) * 100 : null }));
}

function resolveFindingTemplate(question: SelfAssessmentQuestion) {
  const moduleCode = (question.module || question.triggerOrOwner || "").toUpperCase();
  if (moduleCode === "M01") return findingTemplates.ropa;
  if (moduleCode === "M02") return findingTemplates.legalBasis;
  if (moduleCode === "M03") return findingTemplates.governance;
  if (moduleCode === "M04") {
    return /consent|persetujuan/i.test(`${question.area} ${question.question}`)
      ? findingTemplates.consent
      : findingTemplates.notice;
  }
  if (moduleCode === "M05") return findingTemplates.dsr;
  if (moduleCode === "M06") return findingTemplates.governance;
  if (moduleCode === "M07") return findingTemplates.security;
  if (moduleCode === "M08") return findingTemplates.vendor;
  if (moduleCode === "M09") return findingTemplates.retention;
  if (moduleCode === "M10") return findingTemplates.transfer;
  if (moduleCode === "M11") return findingTemplates.dpia;
  if (moduleCode === "M12") return findingTemplates.incident;
  const blob = `${question.area} ${question.question} ${question.module}`.toLowerCase();
  if (/ropa|inventory|register/.test(blob)) return findingTemplates.ropa;
  if (/dasar|legal basis|lawful/.test(blob)) return findingTemplates.legalBasis;
  if (/notice|transparansi|informasi/.test(blob)) return findingTemplates.notice;
  if (/consent|persetujuan/.test(blob)) return findingTemplates.consent;
  if (/hak|dsr|subjek/.test(blob)) return findingTemplates.dsr;
  if (/security|akses|keamanan|logging/.test(blob)) return findingTemplates.security;
  if (/vendor|processor|prosesor|pihak ketiga|sharing/.test(blob)) return findingTemplates.vendor;
  if (/transfer|lintas negara|luar negeri/.test(blob)) return findingTemplates.transfer;
  if (/dpia|berisiko tinggi|high risk/.test(blob)) return findingTemplates.dpia;
  if (/kegagalan|incident|insiden|notifikasi/.test(blob)) return findingTemplates.incident;
  if (/retensi|hapus|pemusnahan|delete/.test(blob)) return findingTemplates.retention;
  return findingTemplates.governance;
}

function ownerForFinding(question: SelfAssessmentQuestion) {
  const template = resolveFindingTemplate(question).title;
  if (template.includes("RoPA")) return "Process Owner + DPO/Legal";
  if (template.includes("Legal Basis")) return "Legal + Process Owner + DPO";
  if (template.includes("Security")) return "IT/Security + System Owner";
  if (template.includes("Vendor")) return "Procurement + Legal + Vendor Owner + DPO";
  if (template.includes("DPIA")) return "Product Owner + Risk + DPO/Legal";
  if (template.includes("Incident")) return "Security + DPO + Legal + Unit Owner";
  if (template.includes("Retensi")) return "Data Owner + IT + Legal/DPO";
  if (template.includes("Consent")) return "Business Owner + Product/System Owner + Legal/DPO";
  if (template.includes("Hak SDP")) return "Customer Service/HR + DPO/Legal";
  return "Process Owner + DPO/Legal";
}

const findingTemplates = {
  ropa: {
    title: "RoPA / Data Inventory",
    issue: "Unit belum memiliki atau belum dapat menunjukkan RoPA/data inventory yang memuat proses pemrosesan Data Pribadi secara lengkap. Kondisi ini melemahkan kemampuan organisasi untuk membuktikan tujuan pemrosesan, jenis data, kategori SDP, sistem/media, PIC, dan pihak terkait.",
    desired: "Setiap aktivitas pemrosesan Data Pribadi yang dijalankan unit harus tercatat dalam RoPA/data inventory yang memuat tujuan, kategori SDP, jenis Data Pribadi, sumber data, sistem/media, PIC, dasar pemrosesan, pihak penerima, dan masa retensi.",
    recommendation: "Lengkapi RoPA/data inventory untuk proses unit dan lakukan review bersama DPO/Legal agar seluruh elemen minimum tercatat dan dapat diperbarui secara berkala.",
  },
  legalBasis: {
    title: "Legal Basis",
    issue: "Unit belum dapat membuktikan bahwa dasar pemrosesan telah ditetapkan untuk setiap tujuan pemrosesan. Kondisi ini dapat menimbulkan risiko pemrosesan tanpa dasar yang jelas atau tidak konsisten dengan tujuan yang dinyatakan.",
    desired: "Setiap tujuan pemrosesan harus memiliki dasar pemrosesan yang sah dan terdokumentasi, serta dapat ditelusuri dalam RoPA, legal basis assessment, privacy notice, atau dokumen relevan lainnya.",
    recommendation: "Tetapkan dan dokumentasikan dasar pemrosesan untuk setiap tujuan pemrosesan. Pastikan dasar tersebut konsisten dengan RoPA, privacy notice, consent mechanism, kontrak, atau kewajiban hukum yang relevan.",
  },
  notice: {
    title: "Privacy Notice / Transparency",
    issue: "Informasi pemrosesan kepada SDP belum tersedia, belum lengkap, atau belum konsisten dengan aktivitas pemrosesan aktual. Kondisi ini dapat mengurangi transparansi dan meningkatkan risiko ketidaksesuaian informasi dengan praktik pemrosesan.",
    desired: "SDP harus menerima informasi yang jelas mengenai tujuan, jenis data, dasar pemrosesan, masa retensi, hak SDP, pihak penerima, transfer, dan kanal pelaksanaan hak jika relevan.",
    recommendation: "Perbarui privacy notice atau pemberitahuan pemrosesan agar sesuai dengan aktivitas pemrosesan aktual dan pastikan tersedia pada titik pengumpulan data atau kanal yang relevan.",
  },
  consent: {
    title: "Consent",
    issue: "Unit belum memiliki mekanisme yang memadai untuk mengelola persetujuan, termasuk pencatatan, pembuktian, perubahan, dan penarikan persetujuan. Kondisi ini dapat menyebabkan penggunaan Data Pribadi tetap berjalan meskipun persetujuan tidak valid atau telah ditarik.",
    desired: "Persetujuan harus dapat dibuktikan, dicatat, dan dikelola sepanjang siklus pemrosesan. Jika persetujuan ditarik, sistem atau proses terkait harus dapat menghentikan pemrosesan yang bergantung pada persetujuan tersebut.",
    recommendation: "Perkuat consent management dengan audit trail, preference log, mekanisme penarikan, dan sinkronisasi ke sistem/proses yang menggunakan Data Pribadi berdasarkan persetujuan.",
  },
  dsr: {
    title: "Hak SDP / DSR",
    issue: "Unit belum memiliki mekanisme yang memadai untuk menerima, memverifikasi, mencatat, dan menindaklanjuti permintaan hak SDP. Kondisi ini dapat menyebabkan keterlambatan, inkonsistensi respons, atau lemahnya pembuktian pemenuhan hak SDP.",
    desired: "Permintaan hak SDP harus dikelola melalui prosedur, kanal, SLA, verifikasi identitas, register permintaan, koordinasi internal, dan bukti respons final.",
    recommendation: "Terapkan SOP DSR, register permintaan, template respons, SLA tracker, dan mekanisme eskalasi ke DPO/Legal untuk memastikan permintaan hak SDP ditangani konsisten.",
  },
  security: {
    title: "Security / Access Control",
    issue: "Kontrol keamanan terkait akses, logging, review akses, atau pembatasan kewenangan belum tersedia atau belum dapat dibuktikan. Kondisi ini dapat meningkatkan risiko akses, pengungkapan, perubahan, atau kehilangan Data Pribadi secara tidak sah.",
    desired: "Akses ke Data Pribadi harus dibatasi berdasarkan kebutuhan, disetujui, dicatat, direview berkala, dan dicabut ketika tidak lagi diperlukan.",
    recommendation: "Terapkan access matrix, approval akses, periodic access review, logging, monitoring, dan mekanisme revocation untuk memastikan akses Data Pribadi tetap terkendali.",
  },
  vendor: {
    title: "Vendor / Processor / Sharing",
    issue: "Unit belum dapat membuktikan bahwa vendor, partner, atau pihak penerima Data Pribadi telah dinilai dan diatur melalui kontrak atau instruksi tertulis yang memadai. Kondisi ini dapat melemahkan pengawasan terhadap pemrosesan oleh pihak ketiga.",
    desired: "Setiap vendor atau pihak ketiga yang memproses Data Pribadi harus memiliki dasar sharing, kontrak/DPA, instruksi tertulis, due diligence, ketentuan confidentiality, audit right, sub-processor control, dan SLA insiden jika relevan.",
    recommendation: "Lengkapi vendor due diligence, DPA atau klausul PDP, instruksi pemrosesan, audit right, sub-processor approval, dan SLA insiden untuk pihak ketiga yang memproses Data Pribadi.",
  },
  transfer: {
    title: "Transfer Lintas Negara",
    issue: "Unit belum dapat membuktikan bahwa transfer Data Pribadi ke luar wilayah Indonesia telah melalui penilaian dan safeguard yang memadai. Kondisi ini dapat menimbulkan risiko transfer tanpa dasar dan perlindungan yang sesuai.",
    desired: "Transfer Data Pribadi lintas negara harus didasarkan pada mekanisme yang diperbolehkan, didukung penilaian transfer, kontrak/safeguard, dan dokumentasi persetujuan atau dasar lain jika relevan.",
    recommendation: "Lakukan transfer impact assessment atau transfer checklist, dokumentasikan dasar transfer, dan lengkapi kontrak atau safeguard dengan pihak penerima di luar negeri.",
  },
  dpia: {
    title: "DPIA / High Risk Processing",
    issue: "Proses berisiko tinggi belum melalui screening DPIA atau DPIA belum didukung dokumentasi mitigasi yang memadai. Kondisi ini dapat menyebabkan risiko terhadap SDP tidak teridentifikasi dan tidak dimitigasi sejak awal.",
    desired: "Proses berisiko tinggi harus melalui screening DPIA dan, jika diperlukan, DPIA yang memuat deskripsi proses, risiko terhadap SDP, mitigasi, residual risk, approval, dan monitoring pasca implementasi.",
    recommendation: "Lakukan DPIA screening untuk proses berisiko tinggi. Jika DPIA diperlukan, dokumentasikan risiko, mitigasi, residual risk, approval DPO/Legal, dan monitoring pasca implementasi.",
  },
  incident: {
    title: "Kegagalan PDP / Incident Response",
    issue: "Unit belum memiliki atau belum dapat membuktikan jalur eskalasi, pencatatan, dan mekanisme notifikasi Kegagalan PDP. Kondisi ini dapat menyebabkan keterlambatan deteksi, investigasi, dan pemberitahuan kepada SDP atau lembaga.",
    desired: "Setiap dugaan Kegagalan PDP harus dapat dieskalasi, dicatat, diinvestigasi, dan dinilai untuk menentukan data terdampak, penyebab, dampak, tindakan perbaikan, serta kewajiban notifikasi 3x24 jam jika applicable.",
    recommendation: "Terapkan incident response playbook, escalation channel, incident register, RCA template, notification template, dan mekanisme koordinasi Security, Legal, DPO, dan owner proses.",
  },
  retention: {
    title: "Retensi / Penghapusan / Pemusnahan",
    issue: "Unit belum dapat membuktikan bahwa masa retensi, penghapusan, atau pemusnahan Data Pribadi telah ditetapkan dan dijalankan. Kondisi ini dapat menyebabkan Data Pribadi disimpan lebih lama dari kebutuhan atau tidak dimusnahkan saat wajib.",
    desired: "Data Pribadi harus memiliki jadwal retensi, mekanisme legal hold, proses delete/destroy, pengelolaan backup, dan evidence penghapusan/pemusnahan yang dapat diaudit.",
    recommendation: "Tetapkan jadwal retensi, SOP penghapusan/pemusnahan, mekanisme legal hold, backup purge jika relevan, serta berita acara atau log penghapusan/pemusnahan.",
  },
  governance: {
    title: "Akuntabilitas / Governance",
    issue: "Unit belum memiliki evidence yang cukup untuk membuktikan akuntabilitas pemrosesan Data Pribadi. Kondisi ini dapat menghambat audit, review DPO, dan pembuktian kepatuhan jika terjadi pemeriksaan.",
    desired: "Setiap proses pemrosesan Data Pribadi harus memiliki owner, dokumen pendukung, evidence, mekanisme review, dan pencatatan keputusan yang dapat ditelusuri.",
    recommendation: "Tetapkan owner, lengkapi dokumentasi, simpan evidence, dan lakukan review berkala bersama DPO/Legal untuk memastikan akuntabilitas dapat dibuktikan.",
  },
};

function buildImprovementAreas(metrics: ReportMetrics) {
  const weak = metrics.areaRows.filter((row) => row.gap || row.partial || row.unknown || row.evidenceGap).slice(0, 7);
  if (!weak.length) {
    return [{ area: "Continuous monitoring", actions: "Review berkala atas kontrol PDP.", outputs: "Evidence refresh dan dashboard update.", owner: "DPO/Unit", timeline: "Ongoing" }];
  }
  return weak.map((row) => ({
    area: row.area,
    actions: `Untuk area ${row.area}, tindakan utama yang perlu dilakukan adalah menutup gap, melengkapi partial fulfillment, dan melakukan klarifikasi item yang belum pasti.`,
    outputs: "Dokumen, kontrol, evidence, dan action plan yang telah direview.",
    owner: "Unit owner / DPO",
    timeline: row.high || row.critical ? "0-30 hari" : "31-60 hari",
  }));
}

function buildConsolidatedFindings(items: ReportQuestion[]): ConsolidatedFinding[] {
  const groups = new Map<string, ConsolidatedFinding>();
  items.forEach((item) => {
    const template = resolveFindingTemplate(item.question);
    const moduleCode = item.question.module || item.question.triggerOrOwner || "OTHER";
    const cluster = resolveIssueCluster(item.question);
    const key = `${moduleCode}-${cluster}`;
    const existing = groups.get(key) ?? {
      key,
      title: cluster,
      template,
      items: [],
      priority: "Low",
      area: getQuestionAreaDisplayName(item.question),
      module: moduleCode,
    };
    existing.items.push(item);
    existing.priority =
      priorityRank(item.priority) < priorityRank(existing.priority) ? item.priority : existing.priority;
    groups.set(key, existing);
  });

  return [...groups.values()].sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      b.items.length - a.items.length ||
      a.title.localeCompare(b.title),
  );
}

function summarizeFindingAnswers(items: ReportQuestion[]) {
  const counts = countStatuses(items);
  return [
    counts.compliant ? `${counts.compliant} Ya/Ada` : "",
    counts.partial ? `${counts.partial} Sebagian` : "",
    counts.gap ? `${counts.gap} Tidak/Tidak Ada` : "",
    counts.unknown ? `${counts.unknown} Tidak Tahu` : "",
    counts.naInvalid ? `${counts.naInvalid} N/A tanpa alasan` : "",
  ]
    .filter(Boolean)
    .join(", ") || "metadata tidak tersedia";
}

function summarizeFindingEvidence(items: ReportQuestion[]) {
  const totalFiles = items.reduce((sum, item) => sum + item.evidenceFiles.length, 0);
  const evidenceGap = items.filter((item) => item.isEvidenceGap).length;
  const evidenceRequest = items.filter((item) => item.isEvidenceRequest).length;
  const strengths = uniqueList(items.map((item) => item.evidenceStrength));
  return `${totalFiles} file; Evidence Strength: ${strengths.join(", ")}; Evidence Gap: ${evidenceGap}; Evidence Request: ${evidenceRequest}`;
}

function summarizeNotes(items: ReportQuestion[]) {
  const notes = uniqueList(items.map((item) => item.note).filter(Boolean)).slice(0, 2);
  return notes.length ? notes.join(" | ") : "metadata tidak tersedia";
}

function buildConsolidatedRiskText(items: ReportQuestion[]) {
  const representative = items[0];
  const administrative = uniqueList(items.map((item) => item.question.administrativeRisk).filter(Boolean)).slice(0, 2);
  const civil = uniqueList(items.map((item) => item.question.civilRisk).filter(Boolean)).slice(0, 2);
  const operational = uniqueList(items.map((item) => item.question.nonComplianceRisk || item.question.riskHint).filter(Boolean)).slice(0, 2);
  return [
    `Risiko administratif: ${administrative.join(" ") || categoryRiskFallback(representative.question, "administrative")}.`,
    `Risiko gugatan/ganti rugi: ${civil.join(" ") || categoryRiskFallback(representative.question, "civil")}.`,
    `Criminal Red Flag Items: ${items.some(hasCriminalRedFlag) ? "Perlu validasi Legal/DPO karena terdapat indikasi yang perlu dikaji lebih lanjut." : "Tidak terdapat kesimpulan risiko pidana berdasarkan jawaban self-assessment ini. Validasi Legal diperlukan hanya jika ditemukan indikasi unsur sengaja dan melawan hukum."}`,
    `Risiko operasional/pembuktian: ${operational.join(" ") || categoryRiskFallback(representative.question, "operational")}.`,
  ].join("\n");
}

function categoryRiskFallback(question: SelfAssessmentQuestion, type: "administrative" | "civil" | "operational") {
  const template = resolveFindingTemplate(question).title;
  if (template.includes("Legal Basis")) return "Risiko utama adalah pemrosesan tanpa dasar yang dapat dibuktikan.";
  if (template.includes("RoPA")) return "Risiko utama adalah organisasi tidak dapat membuktikan aktivitas, tujuan, jenis data, PIC, retensi, dan pihak penerima.";
  if (template.includes("Vendor")) return "Risiko utama adalah lemahnya pengawasan prosesor/vendor dan instruksi pemrosesan.";
  if (template.includes("Security")) return "Risiko utama adalah akses, pengungkapan, perubahan, atau kehilangan Data Pribadi secara tidak sah.";
  if (template.includes("Incident")) return "Risiko utama adalah keterlambatan eskalasi dan notifikasi Kegagalan PDP dalam 3x24 jam.";
  if (template.includes("Retensi")) return "Risiko utama adalah Data Pribadi disimpan lebih lama dari kebutuhan atau tidak dimusnahkan.";
  if (template.includes("DPIA")) return "Risiko utama adalah proses berisiko tinggi berjalan tanpa assessment dan mitigasi memadai.";
  if (type === "civil") return "Risiko gugatan/ganti rugi perlu divalidasi jika gap merugikan Subjek Data Pribadi.";
  return "Risiko kepatuhan perlu divalidasi oleh DPO/Legal berdasarkan data assessment.";
}

function uniqueList(values: Array<string | undefined | null>) {
  return [...new Set(values.map((value) => (value ?? "").trim()).filter(Boolean))];
}

function listTopAreas(rows: AreaReportRow[], mode: "weak" | "strong" | "priority") {
  const sorted = [...rows].sort((a, b) => {
    if (mode === "strong") return (b.fulfillmentScore ?? -1) - (a.fulfillmentScore ?? -1);
    return (b.gap + b.partial + b.unknown + b.evidenceGap) - (a.gap + a.partial + a.unknown + a.evidenceGap);
  });
  const names = sorted.filter((row) => row.applicable > 0).slice(0, 3).map((row) => row.area);
  return names.length ? names.join(", ") : "metadata tidak tersedia";
}

function listRiskAreas(findings: ReportQuestion[]) {
  const names = [...new Set(findings.slice(0, 5).map((item) => cleanAreaLabel(item.question.area)))];
  return names.length ? names.join(", ") : "metadata tidak tersedia";
}

function timelineForPriority(priority: string) {
  if (priority === "Critical" || priority === "High") return "0-30 hari";
  if (priority === "Medium") return "31-60 hari";
  return "61-90 hari";
}

function priorityRank(priority: string) {
  if (priority === "Critical") return 0;
  if (priority === "High") return 1;
  if (priority === "Medium") return 2;
  return 3;
}

function priorityColor(priority: string) {
  if (priority === "Critical" || priority === "High") return red;
  if (priority === "Medium") return amber;
  return green;
}

function colorForScore(score: number | null) {
  if (score === null) return gray;
  if (score >= 75) return green;
  if (score >= 50) return amber;
  return red;
}

function formatScore(value: number | null) {
  if (value === null || Number.isNaN(value)) return "N/A";
  return `${Math.round(value)}%`;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "metadata tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
}

function sanitize(value: string) {
  return `${value ?? ""}`
    .normalize("NFKD")
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[ﬀ]/g, "ff")
    .replace(/[ﬁ]/g, "fi")
    .replace(/[ﬂ]/g, "fl")
    .replace(/[ﬃ]/g, "ffi")
    .replace(/[ﬄ]/g, "ffl")
    .replace(/[^\x20-\x7E]/g, " ");
}
