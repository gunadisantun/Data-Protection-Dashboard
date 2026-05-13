import type { Worksheet } from "exceljs";
import { highRiskCategoryOptions } from "@/lib/high-risk-categories";
import type { CreateRopaPayload, LegalBasis, RiskLevel } from "@/lib/types";

type Department = {
  id: string;
  name: string;
};

export type ParsedRopaImportRow = {
  rowNumber: number;
  payload: CreateRopaPayload;
  warnings: string[];
};

export type RopaImportParseResult = {
  rows: ParsedRopaImportRow[];
  errors: Array<{ rowNumber: number; messages: string[] }>;
};

export async function parseRopaImportWorkbook(
  buffer: Buffer,
  departments: Department[],
): Promise<RopaImportParseResult> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const sheet = workbook.getWorksheet("Template RoPA") ?? workbook.worksheets[0];

  if (!sheet) {
    return {
      rows: [],
      errors: [{ rowNumber: 0, messages: ["Workbook tidak memiliki sheet."] }],
    };
  }

  const rows: ParsedRopaImportRow[] = [];
  const errors: RopaImportParseResult["errors"] = [];
  const departmentMap = buildDepartmentMap(departments);
  let blankStreak = 0;

  for (let rowNumber = 13; rowNumber <= Math.max(sheet.rowCount, 13); rowNumber += 1) {
    if (isBlankRopaRow(sheet, rowNumber)) {
      blankStreak += 1;

      if (blankStreak >= 10) {
        break;
      }

      continue;
    }

    blankStreak = 0;

    const parsed = parseRopaRow(sheet, rowNumber, departmentMap);

    if (parsed.messages.length) {
      errors.push({ rowNumber, messages: parsed.messages });
      continue;
    }

    rows.push({
      rowNumber,
      payload: parsed.payload,
      warnings: parsed.warnings,
    });
  }

  if (!rows.length && !errors.length) {
    errors.push({
      rowNumber: 0,
      messages: ["Tidak ada baris RoPA yang bisa di-import. Isi data mulai row 13."],
    });
  }

  return { rows, errors };
}

function parseRopaRow(
  sheet: Worksheet,
  rowNumber: number,
  departmentMap: Map<string, Department>,
) {
  const messages: string[] = [];
  const warnings: string[] = [];
  const departmentRaw = getText(sheet, rowNumber, 3);
  const department = departmentMap.get(normalizeKey(departmentRaw));

  if (!department) {
    messages.push(
      `Unit kerja "${departmentRaw || "(kosong)"}" tidak ditemukan di master department.`,
    );
  }

  const picRaw = getText(sheet, rowNumber, 4);
  const picEmail = extractEmail(picRaw) ?? "imported.pic@privacyvault.local";
  const picName = cleanupPicName(picRaw, picEmail) || "PIC Import";
  const activityName = getText(sheet, rowNumber, 7);
  const processDescription = getText(sheet, rowNumber, 8);
  const processingPurpose = getText(sheet, rowNumber, 9);
  const transferPurpose = getText(sheet, rowNumber, 9) || processingPurpose;
  const legalBasis = normalizeLegalBasis(getText(sheet, rowNumber, 10));
  const subjectCategories = splitList(getText(sheet, rowNumber, 13));
  const personalDataTypes = splitList(getText(sheet, rowNumber, 14));
  const recipients = getText(sheet, rowNumber, 15);
  const dataReceiverRole = getText(sheet, rowNumber, 17);
  const processorContractLink = getText(sheet, rowNumber, 16);
  const storageLocation = getText(sheet, rowNumber, 21);
  const retentionPeriod = getText(sheet, rowNumber, 22);
  const technicalMeasures = getText(sheet, rowNumber, 23);
  const organizationalMeasures = getText(sheet, rowNumber, 24);
  const dataSubjectRights = getText(sheet, rowNumber, 25);
  const previousProcess = getText(sheet, rowNumber, 27);
  const nextProcess = getText(sheet, rowNumber, 28);
  const flowDraft = [previousProcess, activityName, nextProcess]
    .filter(Boolean)
    .join(" -> ");
  const dataFlowMapping =
    flowDraft.length >= 10
      ? flowDraft
      : `Sumber -> ${activityName || "Aktivitas"} -> Retensi`;
  const controllerProcessorContacts = [
    recipients,
    dataReceiverRole ? `Peran: ${dataReceiverRole}` : "",
    processorContractLink ? `Kontak/Referensi: ${processorContractLink}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  const destinationCountry = getText(sheet, rowNumber, 18);
  const riskText = getText(sheet, rowNumber, 26);
  const highRiskCategories = detectHighRiskCategories(riskText, personalDataTypes);
  const usesAutomatedDecisionMaking = highRiskCategories.includes(
    "automated-legal-significant-effect",
  );
  const riskAssessmentLevel = detectRiskLevel(riskText, highRiskCategories);
  const volumeLevel = detectVolumeLevel(riskText);
  const isCrossBorder =
    destinationCountry.length > 0 && !isIndonesiaDestination(destinationCountry);
  const exportProtectionMechanism = getText(sheet, rowNumber, 19);

  if (!activityName) {
    messages.push("Nama Aktivitas wajib diisi.");
  }

  if (processDescription.length < 10) {
    messages.push("Deskripsi Pemrosesan wajib diisi minimal 10 karakter.");
  }

  if (processingPurpose.length < 5) {
    messages.push("Tujuan Pemrosesan Data Pribadi wajib diisi minimal 5 karakter.");
  }

  if (!subjectCategories.length) {
    messages.push("Kategori Subjek Data Pribadi wajib diisi minimal 1 item.");
  }

  if (!personalDataTypes.length) {
    messages.push("Jenis Data Pribadi wajib diisi minimal 1 item.");
  }

  if (!recipients.trim()) {
    messages.push("Pihak selain Pengendali yang dapat mengakses Data Pribadi wajib diisi.");
  }

  if (!extractEmail(picRaw)) {
    warnings.push(
      `PIC row ${rowNumber} tidak memuat email, memakai imported.pic@privacyvault.local.`,
    );
  }

  if (isCrossBorder && !exportProtectionMechanism) {
    warnings.push(
      `Row ${rowNumber} berisi negara tujuan, tetapi mekanisme perlindungan kosong.`,
    );
  }

  const payload: CreateRopaPayload = {
    activityName,
    processDescription,
    departmentId: department?.id ?? "",
    picName,
    picEmail,
    controllerProcessorContacts:
      controllerProcessorContacts || `${picName} (${picEmail})`,
    dpoContact: picEmail,
    legalBasis,
    processingPurpose,
    transferPurpose,
    sourceMechanism:
      getText(sheet, rowNumber, 12) || getText(sheet, rowNumber, 11) || "Direct collection",
    subjectCategories,
    personalDataTypes,
    recipients,
    processorContractLink,
    dataReceiverRole,
    isCrossBorder,
    destinationCountry,
    exportProtectionMechanism:
      exportProtectionMechanism || (isCrossBorder ? "Perlu dilengkapi" : ""),
    transferMechanism: getText(sheet, rowNumber, 20) || "Secure transfer channel",
    storageLocation: storageLocation || "Lokasi penyimpanan perlu dikonfirmasi",
    retentionPeriod: retentionPeriod || "Periode retensi perlu dikonfirmasi",
    technicalMeasures: technicalMeasures || "Kontrol teknis perlu dilengkapi",
    organizationalMeasures:
      organizationalMeasures || "Kontrol organisasi perlu dilengkapi",
    dataSubjectRights: dataSubjectRights || "Perlu konfirmasi hak subjek data",
    riskAssessmentLevel,
    highRiskCategories,
    riskRegisterReference: extractRiskRegisterReference(riskText),
    riskLikelihood: riskAssessmentLevel,
    riskImpact: riskAssessmentLevel,
    riskContext: riskText,
    existingControls: "",
    residualRiskLevel: riskAssessmentLevel,
    riskMitigationPlan: "",
    volumeLevel,
    usesAutomatedDecisionMaking,
    dataFlowMapping,
    previousProcess,
    nextProcess,
    status: "Active",
    userId: "user-admin",
  };

  return { payload, messages, warnings };
}

function buildDepartmentMap(departments: Department[]) {
  const map = new Map<string, Department>();

  departments.forEach((department) => {
    map.set(normalizeKey(department.id), department);
    map.set(normalizeKey(department.name), department);
  });

  return map;
}

function getText(sheet: Worksheet, rowNumber: number, columnNumber: number) {
  return sheet.getRow(rowNumber).getCell(columnNumber).text.trim();
}

function isBlankRopaRow(sheet: Worksheet, rowNumber: number) {
  for (let columnNumber = 3; columnNumber <= 28; columnNumber += 1) {
    if (getText(sheet, rowNumber, columnNumber)) {
      return false;
    }
  }

  return true;
}

function splitList(value: string) {
  return value
    .split(/[\n;,]+/)
    .map((item) =>
      item
        .replace(/^\s*(?:[-•*]|\d+[\).]|[a-gA-G][\).])\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function cleanupPicName(value: string, email: string) {
  return value
    .replace(email, "")
    .replace(/[()<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLegalBasis(value: string): LegalBasis {
  const normalized = value.toLowerCase();

  if (normalized.includes("contract") || normalized.includes("perjanjian")) {
    return "Contractual";
  }

  if (
    normalized.includes("legal") ||
    normalized.includes("hukum") ||
    normalized.includes("compliance")
  ) {
    return "Legal Obligation";
  }

  if (normalized.includes("legitimate") || normalized.includes("kepentingan sah")) {
    return "Legitimate Interest";
  }

  if (normalized.includes("vital")) {
    return "Vital Interest";
  }

  if (normalized.includes("public") || normalized.includes("publik")) {
    return "Public Interest";
  }

  return "Consent";
}

function detectHighRiskCategories(riskText: string, personalDataTypes: string[]) {
  const normalizedRisk = riskText.toLowerCase();
  const normalizedData = personalDataTypes.join(" ").toLowerCase();
  const categories = new Set<string>();

  if (
    normalizedRisk.includes("otomatis") ||
    normalizedRisk.includes("automated") ||
    normalizedRisk.includes("automated decision")
  ) {
    categories.add("automated-legal-significant-effect");
  }

  if (
    normalizedRisk.includes("spesifik") ||
    normalizedData.match(
      /kesehatan|biometrik|genetika|kejahatan|anak|keuangan|spesifik/,
    )
  ) {
    categories.add("specific-personal-data");
  }

  if (normalizedRisk.includes("skala besar") || normalizedRisk.includes("large")) {
    categories.add("large-scale-processing");
  }

  if (
    normalizedRisk.includes("evaluasi") ||
    normalizedRisk.includes("penskoran") ||
    normalizedRisk.includes("pemantauan")
  ) {
    categories.add("systematic-evaluation-scoring-monitoring");
  }

  if (
    normalizedRisk.includes("pencocokan") ||
    normalizedRisk.includes("penggabungan") ||
    normalizedRisk.includes("matching")
  ) {
    categories.add("data-matching-combination");
  }

  if (normalizedRisk.includes("teknologi baru") || normalizedRisk.includes("new technology")) {
    categories.add("new-technology");
  }

  if (
    normalizedRisk.includes("membatasi") ||
    normalizedRisk.includes("hak subjek") ||
    normalizedRisk.includes("restrict")
  ) {
    categories.add("restricts-data-subject-rights");
  }

  highRiskCategoryOptions.forEach((option) => {
    if (
      normalizedRisk.includes(option.id) ||
      normalizedRisk.includes(option.shortLabel.toLowerCase()) ||
      normalizedRisk.includes(option.label.toLowerCase())
    ) {
      categories.add(option.id);
    }
  });

  return [...categories];
}

function detectRiskLevel(riskText: string, highRiskCategories: string[]): RiskLevel {
  const normalized = riskText.toLowerCase();

  if (
    highRiskCategories.length ||
    normalized.includes("high") ||
    normalized.includes("tinggi")
  ) {
    return "High";
  }

  if (normalized.includes("medium") || normalized.includes("sedang")) {
    return "Medium";
  }

  return "Low";
}

function detectVolumeLevel(value: string): "Small" | "Medium" | "Large" {
  const normalized = value.toLowerCase();

  if (normalized.includes("skala besar") || normalized.includes("large")) {
    return "Large";
  }

  if (normalized.includes("medium") || normalized.includes("sedang")) {
    return "Medium";
  }

  return "Small";
}

function extractRiskRegisterReference(value: string) {
  return (
    value.match(/\b(?:RR|RISK|PRIV)[-_A-Z0-9]{2,}\b/i)?.[0] ??
    value.match(/\b[A-Z]{2,}-[A-Z0-9-]{3,}\b/i)?.[0] ??
    ""
  );
}

function isIndonesiaDestination(value: string) {
  return ["indonesia", "id", "ri", "nkri"].includes(value.trim().toLowerCase());
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
