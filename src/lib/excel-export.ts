import type { Workbook, Worksheet } from "exceljs";
import { existsSync } from "node:fs";
import path from "node:path";
import type { assessments, departments, ropaActivities } from "@/db/schema";
import type { DpiaDraft } from "@/lib/dpia-draft";
import type { LiaDraft } from "@/lib/lia-draft";
import type { TiaDraft } from "@/lib/tia-draft";
import { getHighRiskCategoryShortLabel } from "@/lib/high-risk-categories";

type RopaWithDepartment = typeof ropaActivities.$inferSelect & {
  department: typeof departments.$inferSelect;
};

type AssessmentWithRopa = typeof assessments.$inferSelect & {
  department: typeof departments.$inferSelect;
  ropa: typeof ropaActivities.$inferSelect;
};

const templatePaths = {
  ropa:
    process.env.ROPA_EXCEL_TEMPLATE_PATH ??
    "C:/Users/santu/OneDrive/Desktop/RoPA Template.xlsx",
  dpia:
    process.env.DPIA_EXCEL_TEMPLATE_PATH ??
    "C:/Users/santu/OneDrive/Desktop/DPIA.xlsx",
  lia:
    process.env.LIA_EXCEL_TEMPLATE_PATH ??
    "C:/Users/santu/OneDrive/Desktop/LIA.xlsx",
  tia:
    process.env.TIA_EXCEL_TEMPLATE_PATH ??
    "C:/Users/santu/OneDrive/Desktop/Penilaian Instrumen Hukum Transfer Data Pribadi [V.1.1].xlsx",
} as const;

export async function buildRopaWorkbook(activity: RopaWithDepartment) {
  return buildRopaRegistryWorkbook([activity]);
}

export async function buildRopaRegistryWorkbook(activities: RopaWithDepartment[]) {
  const workbook = await loadTemplate("ropa");
  const sheet = getWorksheet(workbook, "Template RoPA");

  activities.forEach((activity, index) => {
    const rowNumber = 13 + index;

    if (index > 0) {
      copyRowStyle(sheet, 13, rowNumber);
    }

    fillRopaRow(sheet, rowNumber, activity, index + 1);
  });

  return writeWorkbook(workbook);
}

export async function buildDpiaWorkbook(
  assessment: AssessmentWithRopa,
  draft: DpiaDraft,
) {
  const workbook = await loadTemplate("dpia");
  const sheet = getWorksheet(workbook, "1. Identifikasi");
  const riskSheet = getWorksheet(workbook, "3. Penilaian Risiko");

  setCells(sheet, {
    F5: draft.activityName,
    F6: draft.metadata.processOwnerPosition,
    F7: draft.metadata.dpo,
    F8: draft.metadata.date,
    F9: draft.metadata.responsiblePerson,
    F10: draft.metadata.relatedUnits,
  });

  const rowMap = [
    "F14",
    "F17",
    "F18",
    "F19",
    "F20",
    "F21",
    "F23",
    "F32",
    "F33",
    "F34",
    "F35",
    "F36",
    "F37",
    "F38",
    "F44",
    "F45",
    "F46",
    "F47",
    "F48",
    "F49",
    "F50",
    "F51",
    "F54",
  ];
  const draftRows = draft.sections.flatMap((section) => section.rows);
  draftRows.forEach((row, index) => {
    const cell = rowMap[index];

    if (cell) {
      setCell(sheet, cell, row.answer);
    }
  });

  draft.risks.slice(0, 12).forEach((risk, index) => {
    const row = 9 + index;
    setRowValues(riskSheet, row, [
      null,
      null,
      null,
      risk.number,
      risk.source,
      risk.event,
      risk.legalImpact,
      null,
      risk.residualProfile.impact,
      risk.residualProfile.likelihood,
      null,
      formatRiskProfile("Residual", risk.residualProfile),
      risk.riskOwner,
      formatExistingTreatments(risk),
      formatRiskProfile("Target", risk.targetProfile),
      formatTreatmentPlans(risk),
      formatTreatmentTimeline(risk),
    ]);
  });

  setCell(riskSheet, "E26", draft.conclusion);
  setCell(riskSheet, "F26", draft.monitoringPlan);
  setCell(riskSheet, "K26", draft.signatures.reviewedBy);
  setCell(riskSheet, "L26", draft.signatures.approvedBy);
  setCell(riskSheet, "M26", draft.signatures.acknowledgedBy);

  void assessment;
  return writeWorkbook(workbook);
}

export async function buildLiaWorkbook(draft: LiaDraft) {
  const workbook = await loadTemplate("lia");
  const sectionMap: Record<
    LiaDraft["sections"][number]["id"],
    { sheetName: string; answerRows: number[]; conclusionCell: string }
  > = {
    tujuan: {
      sheetName: "Tujuan",
      answerRows: [6, 7, 8, 9, 10],
      conclusionCell: "E11",
    },
    kebutuhan: {
      sheetName: "Kebutuhan",
      answerRows: [6, 7, 8, 9],
      conclusionCell: "E10",
    },
    keseimbangan: {
      sheetName: "Keseimbangan",
      answerRows: [6, 7, 8, 9, 10, 11, 12],
      conclusionCell: "E13",
    },
    dampak: {
      sheetName: "Penilaian Dampak",
      answerRows: [6, 7, 8, 9, 10, 11, 12],
      conclusionCell: "E13",
    },
  };

  draft.sections.forEach((section) => {
    const map = sectionMap[section.id];
    const sheet = getWorksheet(workbook, map.sheetName);

    section.rows.forEach((row, index) => {
      const targetRow = map.answerRows[index];

      if (targetRow) {
        setCell(sheet, `E${targetRow}`, row.answer);
        setCell(sheet, `F${targetRow}`, row.notes);
      }
    });

    setCell(sheet, map.conclusionCell, section.conclusion);
  });

  const decisionSheet = getWorksheet(workbook, "Keputusan");
  setCell(
    decisionSheet,
    "B6",
    "Kepentingan yang sah dapat digunakan apabila mitigasi dan kontrol yang tercatat pada LIA ini dilaksanakan.",
  );
  setCell(decisionSheet, "B9", draft.decision.signer);
  setCell(decisionSheet, "C9", draft.departmentName);
  setCell(decisionSheet, "C11", draft.decision.date);
  setCell(decisionSheet, "C12", draft.decision.nextReview);

  return writeWorkbook(workbook);
}

export async function buildTiaWorkbook(draft: TiaDraft) {
  const workbook = await loadTemplate("tia");
  const sheet = getWorksheet(workbook, "1. Identifikasi");
  const transfer = draft.transfer;

  setCells(sheet, {
    F5: draft.activityName,
    F6: draft.metadata.dpo,
    F7: draft.metadata.date,
    F8: draft.metadata.responsiblePerson,
    F9: draft.metadata.relatedUnits,
    G13: transfer.legalInstrument,
    G14: transfer.transferPurpose,
    G15: transfer.recipient,
    G16: transfer.destinationCountry,
    G17: transfer.destinationRegulation,
    G18: transfer.regulationCategory,
    G19: transfer.sectorScope,
    G20: transfer.personalDataGeneral,
    H20: transfer.personalDataSpecific,
    G21: transfer.transferMechanism,
    G22: transfer.protectionMechanism,
    G23: transfer.recipientControls,
    G24: transfer.writtenAgreement,
    G25: transfer.onwardTransfer,
  });

  draft.risks.slice(0, 5).forEach((risk, index) => {
    const row = 26 + index;
    setCell(sheet, `F${row}`, risk.title);
    setCell(sheet, `G${row}`, risk.level);
    setCell(sheet, `H${row}`, risk.explanation);
  });

  setCell(
    sheet,
    "G31",
    `${draft.evaluation.recommendation}\n\n${draft.evaluation.proceduralSteps}`,
  );

  return writeWorkbook(workbook);
}

export function excelFileName(prefix: string, name: string) {
  const clean = name
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return `${prefix} - ${clean || "Export"}.xlsx`;
}

async function loadTemplate(kind: keyof typeof templatePaths) {
  const templatePath = templatePaths[kind];

  if (!existsSync(templatePath)) {
    throw new Error(`Template Excel tidak ditemukan: ${templatePath}`);
  }

  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.normalize(templatePath));
  return workbook;
}

function getWorksheet(workbook: Workbook, name: string) {
  const sheet = workbook.getWorksheet(name);

  if (!sheet) {
    throw new Error(`Sheet template tidak ditemukan: ${name}`);
  }

  return sheet;
}

function setCells(sheet: Worksheet, values: Record<string, string | number>) {
  Object.entries(values).forEach(([address, value]) => setCell(sheet, address, value));
}

function setRowValues(
  sheet: Worksheet,
  rowNumber: number,
  values: Array<string | number | boolean | null>,
) {
  const row = sheet.getRow(rowNumber);
  values.forEach((value, index) => {
    if (value !== null) {
      setCell(sheet, row.getCell(index + 1).address, value);
    }
  });
  row.commit();
}

function setCell(
  sheet: Worksheet,
  address: string,
  value: string | number | boolean,
) {
  const cell = sheet.getCell(address);
  cell.value = value;
  cell.alignment = {
    ...cell.alignment,
    wrapText: true,
    vertical: "top",
  };
}

function formatRiskProfile(
  label: string,
  profile: DpiaDraft["risks"][number]["residualProfile"],
) {
  return `${label}: ${profile.level} (Score ${profile.score}; Impact ${profile.impact} x Likelihood ${profile.likelihood})`;
}

function formatExistingTreatments(risk: DpiaDraft["risks"][number]) {
  if (!risk.existingTreatments.length) {
    return "Belum ada existing treatment.";
  }

  return risk.existingTreatments
    .map((treatment, index) =>
      [
        `${index + 1}. ${treatment.name || "Existing Treatment"}`,
        treatment.description,
        treatment.owner ? `Owner: ${treatment.owner}` : "",
        treatment.evidence ? `Evidence: ${treatment.evidence}` : "",
        treatment.effectivenessNote
          ? `Efektivitas: ${treatment.effectivenessNote}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatTreatmentPlans(risk: DpiaDraft["risks"][number]) {
  if (!risk.treatmentPlans.length) {
    return "Belum ada treatment plan.";
  }

  return risk.treatmentPlans
    .map((plan, index) =>
      [
        `${index + 1}. ${plan.action || "Treatment Plan"}`,
        plan.owner ? `Owner: ${plan.owner}` : "",
        plan.dueDate ? `Due: ${plan.dueDate}` : "",
        `Status: ${plan.status}`,
        plan.expectedEffect ? `Expected effect: ${plan.expectedEffect}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatTreatmentTimeline(risk: DpiaDraft["risks"][number]) {
  const dueDates = risk.treatmentPlans
    .map((plan) => plan.dueDate)
    .filter(Boolean)
    .join("; ");

  return [
    risk.targetTimeline ? `Target waktu: ${risk.targetTimeline}` : "",
    risk.monitoringStatus ? `Monitoring: ${risk.monitoringStatus}` : "",
    dueDates ? `Plan due dates: ${dueDates}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function fillRopaRow(
  sheet: Worksheet,
  rowNumber: number,
  activity: RopaWithDepartment,
  rowIndex: number,
) {
  const highRisk = riskSummary(activity);

  setRowValues(sheet, rowNumber, [
    rowIndex,
    rowIndex,
    activity.department.name,
    `${activity.picName} (${activity.picEmail})`,
    "Pengendali",
    "",
    activity.activityName,
    activity.processDescription,
    activity.processingPurpose,
    activity.legalBasis,
    activity.sourceMechanism,
    activity.sourceMechanism,
    joinList(activity.subjectCategories),
    joinList(activity.personalDataTypes),
    activity.recipients,
    activity.processorContractLink,
    activity.dataReceiverRole,
    activity.isCrossBorder ? activity.destinationCountry : "",
    activity.isCrossBorder ? activity.exportProtectionMechanism : "",
    activity.transferMechanism,
    activity.storageLocation,
    activity.retentionPeriod,
    activity.technicalMeasures,
    activity.organizationalMeasures,
    activity.dataSubjectRights,
    highRisk,
    activity.previousProcess,
    activity.nextProcess,
  ]);

  sheet.getCell(`A${rowNumber}`).value = rowIndex;
  sheet.getCell(`B${rowNumber}`).value = rowIndex;
  sheet.getRow(rowNumber).height = 72;
}

function copyRowStyle(sheet: Worksheet, sourceRowNumber: number, targetRowNumber: number) {
  const sourceRow = sheet.getRow(sourceRowNumber);
  const targetRow = sheet.getRow(targetRowNumber);
  targetRow.height = sourceRow.height;

  sourceRow.eachCell({ includeEmpty: true }, (sourceCell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);
    targetCell.style = structuredClone(sourceCell.style);
    targetCell.numFmt = sourceCell.numFmt;
    targetCell.alignment = sourceCell.alignment
      ? structuredClone(sourceCell.alignment)
      : targetCell.alignment;
  });
}

async function writeWorkbook(workbook: Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function joinList(value: string[] | null | undefined) {
  return value?.filter(Boolean).join(", ") ?? "";
}

function riskSummary(activity: RopaWithDepartment) {
  const categories = activity.highRiskCategories?.length
    ? activity.highRiskCategories.map(getHighRiskCategoryShortLabel).join("; ")
    : "Tidak ada kategori Risiko Tinggi yang dicentang.";
  const context = activity.riskContext ? ` Catatan: ${activity.riskContext}` : "";
  const register = activity.riskRegisterReference
    ? ` Referensi Risk Register: ${activity.riskRegisterReference}`
    : "";

  return `${categories}${context}${register}`;
}
