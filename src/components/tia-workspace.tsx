"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck2,
  Globe2,
  PencilLine,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { defaultFieldHelp, Label } from "@/components/ui/form";
import { countryReferences } from "@/lib/country-references";
import {
  lookupCountryReference,
  recalculateTiaDraft,
  serializeTiaDraftNotes,
  type TiaControlRating,
  type TiaDraft,
  type TiaOnwardTransfer,
  type TiaRegulationCategory,
  type TiaRiskLevel,
  type TiaTransferDetails,
} from "@/lib/tia-draft";
import type { AssessmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type TiaWorkspaceProps = {
  draft: TiaDraft;
  assessmentId: string;
  resultHref: string;
  initialStatus: AssessmentStatus;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const regulationCategories: TiaRegulationCategory[] = [
  "Khusus",
  "Parsial",
  "Tidak ada",
  "Tidak diketahui",
];

const controlRatings: TiaControlRating[] = [
  "Memadai",
  "Cukup memadai",
  "Tidak memadai",
  "Tidak diketahui",
];

const onwardTransferOptions: TiaOnwardTransfer[] = [
  "Ya",
  "Tidak",
  "Tidak diketahui",
];

const riskParameterGuidance = {
  recipientControls: {
    question:
      "Apakah pihak penerima memiliki kontrol teknis dan operasional terkait Pelindungan Data Pribadi?",
    detail:
      "Kontrol teknis dan operasional yang memadai untuk mencegah salah konfigurasi, kehilangan Data Pribadi, kerusakan data, serta untuk memastikan pemulihan data apabila terjadi gangguan?",
  },
  writtenAgreement: {
    question:
      "Apakah terdapat perjanjian atau pengaturan tertulis yang memadai untuk membatasi penggunaan Data Pribadi hanya sesuai tujuan transfer, serta mencegah pengungkapan tanpa otorisasi atau penyalahgunaan oleh pihak penerima?",
  },
  onwardTransfer: {
    question: "Transfer Lanjutan",
    detail:
      "Apakah terdapat kemungkinan Data Pribadi ditransfer lebih lanjut ke negara lain oleh pihak penerima.",
  },
} as const;

export function TiaWorkspace({
  draft,
  assessmentId,
  resultHref,
  initialStatus,
}: TiaWorkspaceProps) {
  const { locale } = useI18n();
  const text = tiaWorkspaceText[locale];
  const [tiaDraft, setTiaDraft] = useState(() => recalculateTiaDraft(draft));
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [canEditCountryReference, setCanEditCountryReference] = useState(false);
  const [canEditRisks, setCanEditRisks] = useState(false);
  const [canEditEvaluation, setCanEditEvaluation] = useState(false);

  async function saveDraft(nextStatus: AssessmentStatus) {
    setSaveState("saving");

    const response = await fetch(`/api/tasks/${assessmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
        notes: serializeTiaDraftNotes(tiaDraft),
      }),
    });

    if (!response.ok) {
      setSaveState("error");
      return false;
    }

    setStatus(nextStatus);
    setSaveState("saved");
    return true;
  }

  async function exportExcel() {
    const saved = await saveDraft(status);

    if (saved) {
      window.location.href = `/api/assessments/${assessmentId}/export`;
    }
  }

  function updateMetadata(field: keyof TiaDraft["metadata"], value: string) {
    setTiaDraft((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        [field]: value,
      },
    }));
  }

  function updateTransfer<K extends keyof TiaTransferDetails>(
    field: K,
    value: TiaTransferDetails[K],
  ) {
    setTiaDraft((current) => {
      let nextTransfer = {
        ...current.transfer,
        [field]: value,
      };

      if (field === "destinationCountry") {
        const reference = lookupCountryReference(String(value));

        if (reference) {
          nextTransfer = {
            ...nextTransfer,
            destinationRegulation: reference.regulation,
            regulationCategory: reference.category,
            regulationSource: reference.source,
          };
        }
      }

      return recalculateTiaDraft({
        ...current,
        transfer: nextTransfer,
      });
    });
  }

  function updateRiskMitigation(id: string, mitigation: string) {
    setTiaDraft((current) =>
      recalculateTiaDraft({
        ...current,
        risks: current.risks.map((risk) =>
          risk.id === id ? { ...risk, mitigation } : risk,
        ),
      }),
    );
  }

  function updateProceduralSteps(value: string) {
    setTiaDraft((current) =>
      recalculateTiaDraft({
        ...current,
        evaluation: {
          ...current.evaluation,
          proceduralSteps: value,
        },
      }),
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <Link
            href={resultHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {text.backToResult}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Globe2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                Penilaian Instrumen Hukum Transfer Data Pribadi
              </h1>
              <p className="mt-1 text-sm text-slate-600">{tiaDraft.activityName}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void exportExcel()}
            disabled={saveState === "saving"}
          >
            <Download className="h-4 w-4" />
            {text.generateExcel}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void saveDraft("In Progress")}
            disabled={saveState === "saving"}
          >
            <Save className="h-4 w-4" />
            {text.saveDraft}
          </Button>
          <Button
            onClick={() => void saveDraft("Done")}
            disabled={saveState === "saving"}
          >
            <CheckCircle2 className="h-4 w-4" />
            {text.markTiaDone}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryItem label="Department" value={tiaDraft.departmentName} />
          <SummaryItem label="PIC" value={tiaDraft.picName} />
          <SummaryItem
            label={text.destinationCountry}
            value={tiaDraft.transfer.destinationCountry}
          />
          <SummaryItem
            label={text.pdpCategory}
            value={tiaDraft.transfer.regulationCategory}
          />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Status
            </div>
            <Badge
              className="mt-2"
              tone={
                status === "Done" ? "green" : status === "In Progress" ? "blue" : "yellow"
              }
            >
              {status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {saveState !== "idle" ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-semibold",
            saveState === "saved"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : saveState === "error"
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-blue-100 bg-blue-50 text-blue-700",
          )}
        >
          {saveState === "saved"
            ? "Draft TIA tersimpan."
            : saveState === "error"
              ? "Draft TIA gagal disimpan."
              : text.savingTia}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Identitas Penilaian</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FieldInput
            label={text.dpo}
            value={tiaDraft.metadata.dpo}
            onChange={(value) => updateMetadata("dpo", value)}
          />
          <FieldInput
            label={text.date}
            value={tiaDraft.metadata.date}
            onChange={(value) => updateMetadata("date", value)}
          />
          <FieldInput
            label={text.responsiblePerson}
            value={tiaDraft.metadata.responsiblePerson}
            onChange={(value) => updateMetadata("responsiblePerson", value)}
          />
          <FieldInput
            label={text.relatedUnits}
            value={tiaDraft.metadata.relatedUnits}
            onChange={(value) => updateMetadata("relatedUnits", value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5">
        {["Informasi Umum", "Mekanisme Transfer", "Penilaian Risiko"].map(
          (section) => (
            <Card key={section}>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-xl">{section}</CardTitle>
                <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-50 text-amber-600">
                  <FileCheck2 className="h-5 w-5" />
                </span>
              </CardHeader>
              <CardContent className="space-y-5">
                {tiaDraft.rows
                  .filter((row) => row.section === section)
                  .map((row) => (
                    <div
                      key={row.id}
                      className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 lg:grid-cols-[0.9fr_1.25fr]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
                            {row.number}
                          </span>
                          <h2 className="text-sm font-bold leading-6 text-slate-950">
                            {row.question}
                          </h2>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-500">
                          {row.guidance}
                        </p>
                      </div>
                      <TransferField
                        field={row.field}
                        value={tiaDraft.transfer[row.field]}
                        onChange={(value) =>
                          updateTransfer(
                            row.field,
                            value as TiaTransferDetails[typeof row.field],
                          )
                        }
                      />
                    </div>
                  ))}
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{text.countryListReference}</CardTitle>
            {!canEditCountryReference ? (
              <p className="mt-1 text-sm text-slate-500">
                {text.countryReferenceLocked}
              </p>
            ) : null}
          </div>
          <Button
            variant={canEditCountryReference ? "secondary" : "default"}
            size="sm"
            onClick={() => setCanEditCountryReference(true)}
            disabled={canEditCountryReference}
          >
            <PencilLine className="h-4 w-4" />
            {canEditCountryReference ? text.editModeActive : text.editReference}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {text.workbookReference}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {text.workbookReferenceHelp}
            </p>
          </div>
          <div className="grid gap-3">
            <FieldSelect
              label={text.regulationCategory}
              value={tiaDraft.transfer.regulationCategory}
              options={regulationCategories}
              disabled={!canEditCountryReference}
              onChange={(value) =>
                updateTransfer("regulationCategory", value as TiaRegulationCategory)
              }
            />
            {canEditCountryReference ? (
              <FieldTextarea
                label={text.regulationSource}
                value={tiaDraft.transfer.regulationSource}
                onChange={(value) => updateTransfer("regulationSource", value)}
                minRows={3}
              />
            ) : (
              <ReadOnlyLinkField
                label={text.regulationSource}
                value={tiaDraft.transfer.regulationSource}
                emptyLabel={text.noRegulationSource}
                help={text.regulationSourceHelp}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-xl">{text.transferRiskParameters}</CardTitle>
          <span className="flex h-10 w-10 items-center justify-center rounded bg-amber-50 text-amber-600">
            <ShieldCheck className="h-5 w-5" />
          </span>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <RiskParameterSelect
            label={text.recipientTechnicalControls}
            value={tiaDraft.transfer.recipientControls}
            options={controlRatings}
            guidance={riskParameterGuidance.recipientControls}
            onChange={(value) =>
              updateTransfer("recipientControls", value as TiaControlRating)
            }
          />
          <RiskParameterSelect
            label={text.writtenArrangement}
            value={tiaDraft.transfer.writtenAgreement}
            options={controlRatings}
            guidance={riskParameterGuidance.writtenAgreement}
            onChange={(value) =>
              updateTransfer("writtenAgreement", value as TiaControlRating)
            }
          />
          <RiskParameterSelect
            label={text.onwardTransfer}
            value={tiaDraft.transfer.onwardTransfer}
            options={onwardTransferOptions}
            guidance={riskParameterGuidance.onwardTransfer}
            onChange={(value) =>
              updateTransfer("onwardTransfer", value as TiaOnwardTransfer)
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{text.potentialRisks}</CardTitle>
            {!canEditRisks ? (
              <p className="mt-1 text-sm text-slate-500">
                {text.risksLocked}
              </p>
            ) : null}
          </div>
          <Button
            variant={canEditRisks ? "secondary" : "default"}
            size="sm"
            onClick={() => setCanEditRisks(true)}
            disabled={canEditRisks}
          >
            <PencilLine className="h-4 w-4" />
            {canEditRisks ? text.editModeActive : text.editPotentialRisks}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiaDraft.risks.map((risk) => (
            <div
              key={risk.id}
              className={cn(
                "grid gap-4 rounded-lg border p-4 lg:grid-cols-[0.9fr_1fr]",
                riskPanelClass(risk.level),
              )}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-950">{risk.title}</h2>
                  <RiskBadge level={risk.level} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {risk.explanation}
                </p>
              </div>
              <FieldTextarea
                label={text.mitigationNotes}
                value={risk.mitigation}
                onChange={(value) => updateRiskMitigation(risk.id, value)}
                minRows={4}
                disabled={!canEditRisks}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">
              {text.transferEvaluation}
            </CardTitle>
            {!canEditEvaluation ? (
              <p className="mt-1 text-sm text-slate-500">
                {text.evaluationLocked}
              </p>
            ) : null}
          </div>
          <Button
            variant={canEditEvaluation ? "secondary" : "default"}
            size="sm"
            onClick={() => setCanEditEvaluation(true)}
            disabled={canEditEvaluation}
          >
            <PencilLine className="h-4 w-4" />
            {canEditEvaluation ? text.editModeActive : text.editEvaluation}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <EvaluationMetric
              label={text.highRisk}
              value={tiaDraft.evaluation.highCount}
              tone="red"
            />
            <EvaluationMetric
              label={text.mediumRisk}
              value={tiaDraft.evaluation.mediumCount}
              tone="yellow"
            />
            <EvaluationMetric
              label={text.lowRisk}
              value={tiaDraft.evaluation.lowCount}
              tone="green"
            />
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {text.evaluationStatus}
              </div>
              <Badge className="mt-3" tone={evaluationTone(tiaDraft.evaluation.status)}>
                {tiaDraft.evaluation.status}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {text.automaticRecommendation}
            </div>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
              {tiaDraft.evaluation.recommendation}
            </p>
          </div>
          <FieldTextarea
            label={text.proceduralEvaluation}
            value={tiaDraft.evaluation.proceduralSteps}
            onChange={updateProceduralSteps}
            minRows={4}
            disabled={!canEditEvaluation}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Link href={resultHref} className={buttonVariants({ variant: "secondary" })}>
          {text.backToResult}
        </Link>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => void exportExcel()}
            disabled={saveState === "saving"}
          >
            <Download className="h-4 w-4" />
            {text.generateExcel}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void saveDraft("In Progress")}
            disabled={saveState === "saving"}
          >
            <Save className="h-4 w-4" />
            {text.saveDraft}
          </Button>
          <Button
            onClick={() => void saveDraft("Done")}
            disabled={saveState === "saving"}
          >
            <CheckCircle2 className="h-4 w-4" />
            {text.markTiaDone}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TransferField({
  field,
  value,
  onChange,
}: {
  field: keyof TiaTransferDetails;
  value: string;
  onChange: (value: string) => void;
}) {
  const { locale } = useI18n();
  const text = tiaWorkspaceText[locale];

  if (field === "regulationCategory") {
    return (
      <FieldSelect
        label={text.answer}
        value={value}
        options={regulationCategories}
        onChange={onChange}
      />
    );
  }

  if (field === "destinationCountry") {
    return (
      <>
        <FieldInput
          label={text.answer}
          value={value}
          onChange={onChange}
          list="tia-country-reference-list"
        />
        <datalist id="tia-country-reference-list">
          {countryReferences.map((reference) => (
            <option key={reference.country} value={reference.country} />
          ))}
        </datalist>
      </>
    );
  }

  return <FieldTextarea label={text.answer} value={value} onChange={onChange} />;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function EvaluationMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "yellow" | "green";
}) {
  const color =
    tone === "red"
      ? "bg-red-50 text-red-700"
      : tone === "yellow"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${color}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function RiskBadge({ level }: { level: TiaRiskLevel }) {
  return (
    <Badge
      tone={
        level === "Risiko Tinggi"
          ? "red"
          : level === "Risiko Menengah"
            ? "yellow"
            : "green"
      }
    >
      {level}
    </Badge>
  );
}

function RiskParameterSelect({
  label,
  value,
  options,
  guidance,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  guidance: {
    question: string;
    detail?: string;
  };
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <FieldSelect
        label={label}
        value={value}
        options={options}
        onChange={onChange}
      />
      <div className="mt-3 space-y-1 text-xs leading-5">
        <p className="font-semibold text-slate-700">{guidance.question}</p>
        {guidance.detail ? (
          <p className="italic text-blue-600">{guidance.detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  list,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  list?: string;
  help?: string;
}) {
  return (
    <div className="block">
      <Label
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
        help={help ?? defaultFieldHelp(label)}
      >
        {label}
      </Label>
      <input
        list={list}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  help,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <div className="block">
      <Label
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
        help={help ?? defaultFieldHelp(label)}
      >
        {label}
      </Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={cn(
          "mt-2 h-10 w-full rounded-md border border-slate-200 px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-500"
            : "bg-white text-slate-950",
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function ReadOnlyLinkField({
  label,
  value,
  emptyLabel,
  help,
}: {
  label: string;
  value: string;
  emptyLabel: string;
  help: string;
}) {
  const segments = linkifySource(value);

  return (
    <div className="block">
      <Label
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
        help={help}
      >
        {label}
      </Label>
      <div className="mt-2 min-h-20 rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm leading-6 text-slate-600 shadow-sm">
        {segments.length ? (
          segments.map((segment, index) =>
            segment.href ? (
              <a
                key={`${segment.href}-${index}`}
                href={segment.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all font-semibold text-blue-600 underline-offset-2 hover:underline"
              >
                {segment.text}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <span key={`${segment.text}-${index}`} className="whitespace-pre-wrap">
                {segment.text}
              </span>
            ),
          )
        ) : (
          <span className="text-slate-400">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  minRows = 5,
  disabled = false,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <div className="block">
      <Label
        className="text-[11px] font-bold uppercase tracking-wide text-slate-500"
        help={help ?? defaultFieldHelp(label)}
      >
        {label}
      </Label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={minRows}
        disabled={disabled}
        className={cn(
          "mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-6 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
          disabled
            ? "cursor-not-allowed bg-slate-100 text-slate-500"
            : "bg-white text-slate-950",
        )}
      />
    </div>
  );
}

function riskPanelClass(level: TiaRiskLevel) {
  if (level === "Risiko Tinggi") {
    return "border-red-100 bg-red-50";
  }

  if (level === "Risiko Menengah") {
    return "border-amber-100 bg-amber-50";
  }

  return "border-emerald-100 bg-emerald-50";
}

function evaluationTone(status: string) {
  if (status === "Transfer tidak disarankan") {
    return "red" as const;
  }

  if (status === "Konsultasi DPO" || status === "Perlu mitigasi tambahan") {
    return "yellow" as const;
  }

  return "green" as const;
}

function linkifySource(value: string) {
  const segments: Array<{ text: string; href?: string }> = [];
  const urlPattern = /https?:\/\/[^\s]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlPattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: value.slice(lastIndex, match.index) });
    }

    const { url, trailing } = trimTrailingUrlPunctuation(match[0]);
    segments.push({ text: url, href: url });

    if (trailing) {
      segments.push({ text: trailing });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    segments.push({ text: value.slice(lastIndex) });
  }

  return segments.filter((segment) => segment.text.length > 0);
}

function trimTrailingUrlPunctuation(rawUrl: string) {
  let url = rawUrl;
  let trailing = "";

  while (/[),.;:!?]$/.test(url)) {
    trailing = `${url.at(-1) ?? ""}${trailing}`;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

const tiaWorkspaceText = {
  en: {
    backToResult: "Back to result",
    generateExcel: "Generate Excel",
    saveDraft: "Save Draft",
    markTiaDone: "Mark TIA Completed",
    destinationCountry: "Destination Country",
    pdpCategory: "PDP Category",
    date: "Date",
    responsiblePerson: "Responsible Person",
    relatedUnits: "Related Units",
    savingTia: "Saving TIA draft...",
    dpo: "Data Protection Officer",
    answer: "Answer",
    editModeActive: "Edit Mode Active",
    editReference: "Edit Reference",
    countryListReference: "Country List Reference",
    countryReferenceLocked:
      "The country reference is locked. Click edit to change the category or manual regulation source.",
    workbookReference: "Workbook reference",
    workbookReferenceHelp:
      "The regulation category follows the country reference workbook. If a country is not in the quick list, Legal/DPO can enter the regulation, category, and source manually.",
    regulationCategory: "Regulation Category",
    regulationSource: "Regulation Source",
    regulationSourceHelp:
      "Use this link as the regulation source or destination country reference.",
    transferRiskParameters: "Transfer Risk Parameters",
    recipientTechnicalControls:
      "Recipient Technical and Operational Controls",
    writtenArrangement: "Written Agreement or Arrangement",
    onwardTransfer: "Onward Transfer",
    potentialRisks: "Potential Risks",
    editPotentialRisks: "Edit Potential Risks",
    risksLocked: "Mitigation and notes are locked. Click edit to change them.",
    mitigationNotes: "Mitigation / Notes",
    transferEvaluation: "Personal Data Transfer Evaluation",
    editEvaluation: "Edit Evaluation",
    evaluationLocked:
      "Procedural steps are locked. Click edit to change them.",
    highRisk: "High Risk",
    mediumRisk: "Medium Risk",
    lowRisk: "Low Risk",
    evaluationStatus: "Evaluation Status",
    automaticRecommendation: "Automatic Recommendation",
    proceduralEvaluation: "Procedural Steps and Evaluation",
    noRegulationSource: "No regulation source yet.",
  },
  id: {
    backToResult: "Kembali ke hasil",
    generateExcel: "Generate Excel",
    saveDraft: "Simpan Draft",
    markTiaDone: "Tandai TIA Selesai",
    destinationCountry: "Negara Tujuan",
    pdpCategory: "Kategori PDP",
    date: "Tanggal",
    responsiblePerson: "Penanggung Jawab",
    relatedUnits: "Unit Terkait",
    savingTia: "Menyimpan draft TIA...",
    dpo: "Pejabat Pelindung Data Pribadi",
    answer: "Jawaban",
    editModeActive: "Mode Edit Aktif",
    editReference: "Edit Reference",
    countryListReference: "Referensi Daftar Negara",
    countryReferenceLocked:
      "Referensi negara dikunci. Klik edit untuk mengubah kategori atau sumber regulasi manual.",
    workbookReference: "Referensi dari workbook",
    workbookReferenceHelp:
      "Kategori regulasi mengikuti workbook referensi negara. Bila negara tidak ada di daftar cepat, Legal/DPO bisa mengisi manual regulasi, kategori, dan sumbernya.",
    regulationCategory: "Kategori Regulasi",
    regulationSource: "Sumber Regulasi",
    regulationSourceHelp:
      "Gunakan tautan ini sebagai rujukan sumber regulasi atau referensi negara tujuan transfer.",
    transferRiskParameters: "Parameter Risiko Transfer",
    recipientTechnicalControls: "Kontrol Teknis dan Operasional Penerima",
    writtenArrangement: "Perjanjian atau Pengaturan Tertulis",
    onwardTransfer: "Transfer Lanjutan",
    potentialRisks: "Potensi Risiko",
    editPotentialRisks: "Edit Potensi Risiko",
    risksLocked: "Mitigasi dan catatan dikunci. Klik edit untuk mengubah.",
    mitigationNotes: "Mitigasi / Catatan",
    transferEvaluation: "Evaluasi Transfer Data Pribadi",
    editEvaluation: "Edit Evaluasi",
    evaluationLocked: "Langkah prosedural dikunci. Klik edit untuk mengubah.",
    highRisk: "Risiko Tinggi",
    mediumRisk: "Risiko Menengah",
    lowRisk: "Risiko Rendah",
    evaluationStatus: "Status Evaluasi",
    automaticRecommendation: "Rekomendasi Otomatis",
    proceduralEvaluation: "Langkah Prosedural dan Evaluasi",
    noRegulationSource: "Belum ada sumber regulasi.",
  },
} as const;
