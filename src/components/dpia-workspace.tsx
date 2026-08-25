"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Grid3X3,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { defaultFieldHelp, Label } from "@/components/ui/form";
import {
  calculateRiskProfile,
  createEmptyDpiaRisk,
  createEmptyExistingTreatment,
  createEmptyTreatmentPlan,
  serializeDpiaDraftNotes,
  type DpiaDraft,
  type DpiaDraftSection,
  type DpiaExistingTreatment,
  type DpiaRisk,
  type DpiaRiskProfile,
  type DpiaRiskLevel,
  type DpiaTreatmentPlan,
} from "@/lib/dpia-draft";
import type { AssessmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type RiskRegisterReference = {
  id: string;
  riskId: string;
  riskDescription: string;
  potentialImpact: string;
  existingControl: string;
  recommendedAction: string;
  riskOwner: string;
  targetDate: string;
  riskLevel: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Closed";
};

type DpiaWorkspaceProps = {
  draft: DpiaDraft;
  assessmentId: string;
  resultHref: string;
  initialStatus: AssessmentStatus;
  riskRegisterReferences: RiskRegisterReference[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const riskLevels: DpiaRiskLevel[] = [
  "Low",
  "Low to High",
  "Moderate",
  "Moderate to High",
  "High",
];

const dpiaTabs = [
  {
    id: "identity",
    label: "Identity",
    description: "DPIA metadata and accountable owner",
  },
  {
    id: "processing",
    label: "Processing",
    description: "Processing analysis, identification, and parties",
  },
  {
    id: "highRisk",
    label: "High Risk",
    description: "Article 34 high-risk criteria",
  },
  {
    id: "riskMatrix",
    label: "Risk Matrix",
    description: "Risk event, treatment, residual, and target risk",
  },
  {
    id: "decision",
    label: "Decision",
    description: "Conclusion and monitoring",
  },
  {
    id: "approval",
    label: "Approval",
    description: "Document control and approval",
  },
] as const;

type DpiaTabId = (typeof dpiaTabs)[number]["id"];

const monitoringStatusOptions = [
  "Open",
  "In Review",
  "Treatment In Progress",
  "Monitoring",
  "Closed",
];

const mitigationApprovalOptions = [
  "Menunggu Review Risk Owner",
  "Disetujui Risk Owner",
  "Disetujui DPO/Legal",
  "Ditolak / Perlu Revisi",
  "Tidak Berlaku",
];

export function DpiaWorkspace({
  draft,
  assessmentId,
  resultHref,
  initialStatus,
  riskRegisterReferences,
}: DpiaWorkspaceProps) {
  const { locale } = useI18n();
  const text = dpiaWorkspaceText[locale];
  const [dpiaDraft, setDpiaDraft] = useState(draft);
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeTab, setActiveTab] = useState<DpiaTabId>("identity");
  const [activeRiskId, setActiveRiskId] = useState(draft.risks[0]?.id ?? "");
  const [selectedReferenceId, setSelectedReferenceId] = useState(
    riskRegisterReferences[0]?.id ?? "",
  );
  const activeRisk = useMemo(
    () =>
      dpiaDraft.risks.find((risk) => risk.id === activeRiskId) ??
      dpiaDraft.risks[0],
    [activeRiskId, dpiaDraft.risks],
  );
  const activeTabIndex = dpiaTabs.findIndex((tab) => tab.id === activeTab);
  const selectedReference = useMemo(
    () => riskRegisterReferences.find((reference) => reference.id === selectedReferenceId),
    [riskRegisterReferences, selectedReferenceId],
  );

  async function saveDraft(nextStatus: AssessmentStatus) {
    setSaveState("saving");

    const response = await fetch(`/api/tasks/${assessmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
        notes: serializeDpiaDraftNotes(dpiaDraft),
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

  function updateMetadata(
    field: keyof DpiaDraft["metadata"],
    value: string,
  ) {
    setDpiaDraft((current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        [field]: value,
      },
    }));
  }

  function updateRow(
    sectionId: DpiaDraftSection["id"],
    rowId: string,
    field: "answer" | "notes",
    value: string,
  ) {
    setDpiaDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              rows: section.rows.map((row) =>
                row.id === rowId ? { ...row, [field]: value } : row,
              ),
            }
          : section,
      ),
    }));
  }

  function updateHighRiskSignal(id: string, selected: boolean) {
    setDpiaDraft((current) => ({
      ...current,
      highRiskSignals: current.highRiskSignals.map((signal) =>
        signal.id === id ? { ...signal, selected } : signal,
      ),
    }));
  }

  function updateRisk(id: string, patch: Partial<DpiaRisk>) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === id ? { ...risk, ...patch } : risk,
      ),
    }));
  }

  function addRisk() {
    const nextRisk = createEmptyDpiaRisk(nextRiskNumber(dpiaDraft.risks));
    setDpiaDraft((current) => ({
      ...current,
      risks: [...current.risks, nextRisk],
    }));
    setActiveRiskId(nextRisk.id);
  }

  function removeRisk(id: string) {
    const nextRisks = renumberRisks(dpiaDraft.risks.filter((risk) => risk.id !== id));
    setDpiaDraft((current) => ({
      ...current,
      risks: renumberRisks(current.risks.filter((risk) => risk.id !== id)),
    }));

    if (id === activeRiskId) {
      setActiveRiskId(nextRisks[0]?.id ?? "");
    }
  }

  function updateRiskProfile(
    id: string,
    field: "residualProfile",
    impact: number,
    likelihood: number,
  ) {
    updateRisk(id, {
      [field]: calculateRiskProfile(impact, likelihood),
    } as Pick<DpiaRisk, typeof field>);
  }

  function updateTargetRiskLevel(id: string, level: DpiaRiskLevel) {
    updateRisk(id, {
      targetProfile: profileForRiskLevel(level),
    });
  }

  function addExistingTreatment(riskId: string) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              existingTreatments: [
                ...risk.existingTreatments,
                createEmptyExistingTreatment(),
              ],
            }
          : risk,
      ),
    }));
  }

  function updateExistingTreatment(
    riskId: string,
    treatmentId: string,
    patch: Partial<DpiaExistingTreatment>,
  ) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              existingTreatments: risk.existingTreatments.map((treatment) =>
                treatment.id === treatmentId
                  ? { ...treatment, ...patch }
                  : treatment,
              ),
            }
          : risk,
      ),
    }));
  }

  function removeExistingTreatment(riskId: string, treatmentId: string) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              existingTreatments: risk.existingTreatments.filter(
                (treatment) => treatment.id !== treatmentId,
              ),
            }
          : risk,
      ),
    }));
  }

  function addTreatmentPlan(riskId: string) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              treatmentPlans: [...risk.treatmentPlans, createEmptyTreatmentPlan()],
            }
          : risk,
      ),
    }));
  }

  function updateTreatmentPlan(
    riskId: string,
    planId: string,
    patch: Partial<DpiaTreatmentPlan>,
  ) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              treatmentPlans: risk.treatmentPlans.map((plan) =>
                plan.id === planId ? { ...plan, ...patch } : plan,
              ),
            }
          : risk,
      ),
    }));
  }

  function removeTreatmentPlan(riskId: string, planId: string) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              treatmentPlans: risk.treatmentPlans.filter(
                (plan) => plan.id !== planId,
              ),
            }
          : risk,
      ),
    }));
  }

  function addRelatedUnit(riskId: string) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              relatedUnits: [...risk.relatedUnits, ""],
            }
          : risk,
      ),
    }));
  }

  function addRiskFromReference() {
    if (!selectedReference) {
      return;
    }

    let nextRiskId = "";

    setDpiaDraft((current) => {
      const nextRisk = createEmptyDpiaRisk(nextRiskNumber(current.risks));
      const riskWithReference = applyReferenceToRisk(nextRisk, selectedReference);
      nextRiskId = riskWithReference.id;

      return {
        ...current,
        risks: [...current.risks, riskWithReference],
      };
    });

    if (nextRiskId) {
      setActiveRiskId(nextRiskId);
    }
  }

  function applyReferenceToActiveRisk() {
    if (!activeRisk || !selectedReference) {
      return;
    }

    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === activeRisk.id ? applyReferenceToRisk(risk, selectedReference) : risk,
      ),
    }));
  }

  function updateRelatedUnit(riskId: string, index: number, value: string) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              relatedUnits: risk.relatedUnits.map((unit, unitIndex) =>
                unitIndex === index ? value : unit,
              ),
            }
          : risk,
      ),
    }));
  }

  function removeRelatedUnit(riskId: string, index: number) {
    setDpiaDraft((current) => ({
      ...current,
      risks: current.risks.map((risk) =>
        risk.id === riskId
          ? {
              ...risk,
              relatedUnits: risk.relatedUnits.filter(
                (_unit, unitIndex) => unitIndex !== index,
              ),
            }
          : risk,
      ),
    }));
  }

  function updateDraftField(field: keyof DpiaDraft, value: string) {
    setDpiaDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateSignature(
    field: keyof DpiaDraft["signatures"],
    value: string,
  ) {
    setDpiaDraft((current) => ({
      ...current,
      signatures: {
        ...current.signatures,
        [field]: value,
      },
    }));
  }

  function goToRelativeTab(offset: number) {
    const nextIndex = Math.max(
      0,
      Math.min(dpiaTabs.length - 1, activeTabIndex + offset),
    );
    setActiveTab(dpiaTabs[nextIndex].id);
  }

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
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
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                Data Protection Impact Assessment
              </h1>
              <p className="mt-1 text-sm text-slate-600">{dpiaDraft.activityName}</p>
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
            Generate Excel
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
            {text.markDpiaDone}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryItem label="Department" value={dpiaDraft.departmentName} />
          <SummaryItem label="PIC" value={dpiaDraft.picName} />
          <SummaryItem
            label="Process Owner"
            value={dpiaDraft.metadata.processOwnerPosition}
          />
          <SummaryItem label="DPIA Date" value={dpiaDraft.metadata.date} />
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
            ? text.dpiaSaved
            : saveState === "error"
              ? text.dpiaSaveFailed
              : text.savingDpia}
        </div>
      ) : null}

      <DpiaTabStepper activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "identity" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Identitas DPIA</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldInput
            label={text.processOwnerPosition}
            value={dpiaDraft.metadata.processOwnerPosition}
            onChange={(value) => updateMetadata("processOwnerPosition", value)}
          />
          <FieldInput
            label={text.dpo}
            value={dpiaDraft.metadata.dpo}
            onChange={(value) => updateMetadata("dpo", value)}
          />
          <FieldInput
            label={text.dpiaDate}
            value={dpiaDraft.metadata.date}
            onChange={(value) => updateMetadata("date", value)}
          />
          <FieldInput
            label={text.responsiblePerson}
            value={dpiaDraft.metadata.responsiblePerson}
            onChange={(value) => updateMetadata("responsiblePerson", value)}
          />
          <FieldInput
            label={text.relatedUnits}
            value={dpiaDraft.metadata.relatedUnits}
            onChange={(value) => updateMetadata("relatedUnits", value)}
          />
        </CardContent>
      </Card>
      ) : null}

      {activeTab === "processing" ? (
      <div className="grid gap-5">
        {dpiaDraft.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-xl">{section.title}</CardTitle>
              <span className="flex h-10 w-10 items-center justify-center rounded bg-slate-50 text-blue-600">
                <ClipboardCheck className="h-5 w-5" />
              </span>
            </CardHeader>
            <CardContent className="space-y-5">
              {section.rows.map((row) => (
                <div
                  key={row.id}
                  className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4 lg:grid-cols-[0.9fr_1.25fr]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
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
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldTextarea
                      label={text.answer}
                      value={row.answer}
                      onChange={(value) =>
                        updateRow(section.id, row.id, "answer", value)
                      }
                    />
                    <FieldTextarea
                      label={text.notes}
                      value={row.notes}
                      onChange={(value) =>
                        updateRow(section.id, row.id, "notes", value)
                      }
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      ) : null}

      {activeTab === "highRisk" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{text.highRiskPotential}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dpiaDraft.highRiskSignals.map((signal) => (
              <label
                key={signal.id}
                className={cn(
                  "flex min-h-[118px] cursor-pointer items-start gap-3 rounded-lg border p-4 transition",
                  signal.selected
                    ? "border-blue-200 bg-blue-50"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={signal.selected}
                  onChange={(event) =>
                    updateHighRiskSignal(signal.id, event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-950">
                    {signal.label}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-slate-500">
                    {signal.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <FieldTextarea
            label={text.highRiskExplanation}
            value={dpiaDraft.highRiskExplanation}
            onChange={(value) => updateDraftField("highRiskExplanation", value)}
            minRows={4}
          />
        </CardContent>
      </Card>
      ) : null}

      {activeTab === "riskMatrix" ? (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Risk Matrix 5x5</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {text.riskMatrixIntro}
            </p>
          </div>
          <Button onClick={addRisk}>
            <Plus className="h-4 w-4" />
            {text.addRisk}
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div className="w-full lg:max-w-xl">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {text.riskRegisterReference}
                  </span>
                  <select
                    value={selectedReferenceId}
                    onChange={(event) => setSelectedReferenceId(event.target.value)}
                    className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {riskRegisterReferences.length ? (
                      riskRegisterReferences.map((reference) => (
                        <option key={reference.id} value={reference.id}>
                          {reference.riskId} - {reference.riskDescription}
                        </option>
                      ))
                    ) : (
                      <option value="">{text.noRiskReference}</option>
                    )}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={addRiskFromReference}
                  disabled={!selectedReference}
                >
                  <Plus className="h-4 w-4" />
                  {text.addFromReference}
                </Button>
                <Button
                  onClick={applyReferenceToActiveRisk}
                  disabled={!selectedReference || !activeRisk}
                >
                  {text.applyToActiveRisk}
                </Button>
              </div>
            </div>
            {selectedReference ? (
              <p className="mt-3 text-xs text-slate-600">
                {text.source}: <span className="font-semibold">{selectedReference.riskId}</span>{" "}
                {selectedReference.riskDescription}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
            <div className="space-y-3">
            {dpiaDraft.risks.length ? (
              dpiaDraft.risks.map((risk) => (
                <button
                  key={risk.id}
                  type="button"
                  onClick={() => setActiveRiskId(risk.id)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition",
                    risk.id === activeRisk?.id
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Risk {risk.number}
                      </div>
                      <div className="mt-1 text-sm font-bold leading-6 text-slate-950">
                        {risk.event || text.newRiskUntitled}
                      </div>
                    </div>
                    <RiskBadge level={risk.residualProfile.level} />
                  </div>
                  <RiskFlowSummary risk={risk} compact />
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                {text.noRiskStart}
                <Button className="mt-4 w-full" variant="secondary" onClick={addRisk}>
                  <Plus className="h-4 w-4" />
                  {text.addRisk}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {activeRisk ? (
              <>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Risk {activeRisk.number}
                      </div>
                      <h2 className="mt-1 text-lg font-bold text-slate-950">
                        {activeRisk.event || text.newRisk}
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => removeRisk(activeRisk.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {text.deleteRisk}
                    </Button>
                  </div>
                  <RiskFlowSummary risk={activeRisk} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FieldInput
                    label={text.riskSource}
                    value={activeRisk.source}
                    onChange={(value) => updateRisk(activeRisk.id, { source: value })}
                  />
                  <FieldInput
                    label="Risk Owner"
                    value={activeRisk.riskOwner}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { riskOwner: value })
                    }
                  />
                  <FieldTextarea
                    label={text.riskEvent}
                    value={activeRisk.event}
                    onChange={(value) => updateRisk(activeRisk.id, { event: value })}
                    minRows={4}
                  />
                  <FieldTextarea
                    label={text.legalImpact}
                    value={activeRisk.legalImpact}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { legalImpact: value })
                    }
                    minRows={4}
                  />
                </div>

                <TreatmentRepeater
                  title="Existing Treatments"
                  description={text.existingTreatmentDescription}
                  emptyLabel={text.noExistingTreatment}
                  addLabel={text.addExistingTreatment}
                  deleteLabel={text.delete}
                  items={activeRisk.existingTreatments}
                  onAdd={() => addExistingTreatment(activeRisk.id)}
                  onRemove={(itemId) => removeExistingTreatment(activeRisk.id, itemId)}
                  renderItem={(item) => (
                    <ExistingTreatmentFields
                      copy={text}
                      treatment={item}
                      onChange={(patch) =>
                        updateExistingTreatment(activeRisk.id, item.id, patch)
                      }
                    />
                  )}
                />

                <RiskStageCard
                  title="Residual Risk after Treatment"
                  description={text.residualRiskDescription}
                  profile={activeRisk.residualProfile}
                  onChange={(impact, likelihood) =>
                    updateRiskProfile(
                      activeRisk.id,
                      "residualProfile",
                      impact,
                      likelihood,
                    )
                  }
                />

                <TreatmentRepeater
                  title="Treatment Plan"
                  description={text.treatmentPlanDescription}
                  emptyLabel={text.noTreatmentPlan}
                  addLabel={text.addTreatmentPlan}
                  deleteLabel={text.delete}
                  items={activeRisk.treatmentPlans}
                  onAdd={() => addTreatmentPlan(activeRisk.id)}
                  onRemove={(itemId) => removeTreatmentPlan(activeRisk.id, itemId)}
                  renderItem={(item) => (
                    <TreatmentPlanFields
                      copy={text}
                      plan={item}
                      onChange={(patch) =>
                        updateTreatmentPlan(activeRisk.id, item.id, patch)
                      }
                    />
                  )}
                />

                <TargetRiskSelectCard
                  title="Target Risk after Treatment Plan"
                  description={text.targetRiskDescription}
                  profile={activeRisk.targetProfile}
                  onChange={(level) =>
                    updateTargetRiskLevel(activeRisk.id, level)
                  }
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <FieldSelect
                    label="Monitoring Status"
                    value={activeRisk.monitoringStatus}
                    options={selectOptionsWithCurrent(
                      monitoringStatusOptions,
                      activeRisk.monitoringStatus,
                    )}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { monitoringStatus: value })
                    }
                  />
                  <FieldInput
                    label={text.targetTimeline}
                    value={activeRisk.targetTimeline}
                    type="date"
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { targetTimeline: value })
                    }
                  />
                  <FieldSelect
                    label={text.mitigationApproval}
                    value={activeRisk.mitigationApproval}
                    options={selectOptionsWithCurrent(
                      mitigationApprovalOptions,
                      activeRisk.mitigationApproval,
                    )}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { mitigationApproval: value })
                    }
                  />
                  <RelatedUnitsRepeater
                    copy={text}
                    units={activeRisk.relatedUnits}
                    onAdd={() => addRelatedUnit(activeRisk.id)}
                    onChange={(index, value) =>
                      updateRelatedUnit(activeRisk.id, index, value)
                    }
                    onRemove={(index) => removeRelatedUnit(activeRisk.id, index)}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Grid3X3 className="mx-auto h-8 w-8 text-slate-400" />
                <h2 className="mt-3 font-bold text-slate-950">
                  {text.noRisk}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {text.addRiskToStart}
                </p>
                <Button className="mt-5" onClick={addRisk}>
                  <Plus className="h-4 w-4" />
                  {text.addRisk}
                </Button>
              </div>
            )}
          </div>
          </div>
        </CardContent>
      </Card>
      ) : null}

      {activeTab === "decision" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {text.decisionTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <FieldTextarea
            label={text.conclusion}
            value={dpiaDraft.conclusion}
            onChange={(value) => updateDraftField("conclusion", value)}
            minRows={5}
          />
          <FieldTextarea
            label={text.monitoringPlan}
            value={dpiaDraft.monitoringPlan}
            onChange={(value) => updateDraftField("monitoringPlan", value)}
            minRows={5}
          />
          <FieldTextarea
            label={text.publicSummary}
            value={dpiaDraft.publicSummary}
            onChange={(value) => updateDraftField("publicSummary", value)}
            minRows={5}
          />
        </CardContent>
      </Card>
      ) : null}

      {activeTab === "approval" ? (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Kontrol Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldInput
            label={text.documentVersion}
            value={dpiaDraft.signatures.version}
            onChange={(value) => updateSignature("version", value)}
          />
          <FieldInput
            label={text.date}
            value={dpiaDraft.signatures.date}
            onChange={(value) => updateSignature("date", value)}
          />
          <FieldInput
            label={text.preparedBy}
            value={dpiaDraft.signatures.preparedBy}
            onChange={(value) => updateSignature("preparedBy", value)}
          />
          <FieldInput
            label={text.reviewedBy}
            value={dpiaDraft.signatures.reviewedBy}
            onChange={(value) => updateSignature("reviewedBy", value)}
          />
          <FieldInput
            label={text.approvedBy}
            value={dpiaDraft.signatures.approvedBy}
            onChange={(value) => updateSignature("approvedBy", value)}
          />
          <FieldInput
            label={text.acknowledgedBy}
            value={dpiaDraft.signatures.acknowledgedBy}
            onChange={(value) => updateSignature("acknowledgedBy", value)}
          />
        </CardContent>
      </Card>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <Link href={resultHref} className={buttonVariants({ variant: "secondary" })}>
          {text.backToResult}
        </Link>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => goToRelativeTab(-1)}
            disabled={activeTabIndex === 0}
          >
            {text.previous}
          </Button>
          <Button
            variant="secondary"
            onClick={() => goToRelativeTab(1)}
            disabled={activeTabIndex === dpiaTabs.length - 1}
          >
            {text.continue}
          </Button>
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
            {text.markDpiaDone}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DpiaTabStepper({
  activeTab,
  onChange,
}: {
  activeTab: DpiaTabId;
  onChange: (tab: DpiaTabId) => void;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {dpiaTabs.map((tab, index) => {
            const active = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={cn(
                  "flex min-w-[148px] flex-1 items-start gap-3 rounded-lg border p-3 text-left transition",
                  active
                    ? "border-blue-200 bg-blue-50 text-blue-900 shadow-sm"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{tab.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {tab.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RiskFlowSummary({
  risk,
  compact = false,
}: {
  risk: DpiaRisk;
  compact?: boolean;
}) {
  const stages = [
    ["Residual", risk.residualProfile],
    ["Target", risk.targetProfile],
  ] as const;

  return (
    <div
      className={cn(
        "mt-4 grid gap-2",
        compact ? "grid-cols-1" : "md:grid-cols-2",
      )}
    >
      {stages.map(([label, profile]) => (
        <div key={label} className="rounded border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {label}
            </span>
            <RiskBadge level={profile.level} />
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500">
            Score {profile.score} - I{profile.impact} x L{profile.likelihood}
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskStageCard({
  title,
  description,
  profile,
  onChange,
}: {
  title: string;
  description: string;
  profile: DpiaRiskProfile;
  onChange: (impact: number, likelihood: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="shrink-0">
          <RiskBadge level={profile.level} />
          <div className="mt-2 text-xs font-semibold text-slate-500">
            Score {profile.score}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <RiskMatrix profile={profile} onChange={onChange} />
      </div>
    </div>
  );
}

function TargetRiskSelectCard({
  title,
  description,
  profile,
  onChange,
}: {
  title: string;
  description: string;
  profile: DpiaRiskProfile;
  onChange: (level: DpiaRiskLevel) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <div className="min-w-56">
          <FieldSelect
            label="Target Risk"
            value={profile.level}
            options={riskLevels}
            onChange={(value) => onChange(value as DpiaRiskLevel)}
          />
        </div>
      </div>
      <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Target: <span className="font-bold text-slate-950">{profile.level}</span>
      </div>
    </div>
  );
}

function TreatmentRepeater<T extends { id: string }>({
  title,
  description,
  emptyLabel,
  addLabel,
  deleteLabel,
  items,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  addLabel: string;
  deleteLabel: string;
  items: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderItem: (item: T) => ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <h3 className="font-bold text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Item {index + 1}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onRemove(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteLabel}
                </Button>
              </div>
              {renderItem(item)}
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function ExistingTreatmentFields({
  copy,
  treatment,
  onChange,
}: {
  copy: (typeof dpiaWorkspaceText)["en"] | (typeof dpiaWorkspaceText)["id"];
  treatment: DpiaExistingTreatment;
  onChange: (patch: Partial<DpiaExistingTreatment>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FieldInput
        label={copy.controlName}
        value={treatment.name}
        onChange={(value) => onChange({ name: value })}
      />
      <FieldInput
        label="Owner"
        value={treatment.owner}
        onChange={(value) => onChange({ owner: value })}
      />
      <FieldTextarea
        label={copy.existingTreatmentDescriptionLabel}
        value={treatment.description}
        onChange={(value) => onChange({ description: value })}
        minRows={4}
      />
      <FieldTextarea
        label="Evidence / Link"
        value={treatment.evidence}
        onChange={(value) => onChange({ evidence: value })}
        minRows={4}
      />
      <div className="lg:col-span-2">
        <FieldTextarea
          label={copy.effectivenessNote}
          value={treatment.effectivenessNote}
          onChange={(value) => onChange({ effectivenessNote: value })}
          minRows={3}
        />
      </div>
    </div>
  );
}

function TreatmentPlanFields({
  copy,
  plan,
  onChange,
}: {
  copy: (typeof dpiaWorkspaceText)["en"] | (typeof dpiaWorkspaceText)["id"];
  plan: DpiaTreatmentPlan;
  onChange: (patch: Partial<DpiaTreatmentPlan>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FieldTextarea
        label={copy.actionPlan}
        value={plan.action}
        onChange={(value) => onChange({ action: value })}
        minRows={4}
      />
      <FieldTextarea
        label={copy.expectedEffect}
        value={plan.expectedEffect}
        onChange={(value) => onChange({ expectedEffect: value })}
        minRows={4}
      />
      <FieldInput
        label="Owner"
        value={plan.owner}
        onChange={(value) => onChange({ owner: value })}
      />
      <FieldInput
        label={copy.dueDate}
        value={plan.dueDate}
        onChange={(value) => onChange({ dueDate: value })}
      />
      <FieldSelect
        label="Status"
        value={plan.status}
        options={["Planned", "In Progress", "Implemented", "Deferred"]}
        onChange={(value) =>
          onChange({ status: value as DpiaTreatmentPlan["status"] })
        }
      />
    </div>
  );
}

function RelatedUnitsRepeater({
  copy,
  units,
  onAdd,
  onChange,
  onRemove,
}: {
  copy: (typeof dpiaWorkspaceText)["en"] | (typeof dpiaWorkspaceText)["id"];
  units: string[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Related Units for Coordination
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {copy.relatedUnitHelp}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {copy.add}
        </Button>
      </div>

      <div className="mt-3 space-y-2">
        {units.length ? (
          units.map((unit, index) => (
            <div key={`${index}-${unit}`} className="flex gap-2">
              <input
                value={unit}
                onChange={(event) => onChange(index, event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g., Legal, IT Security, Risk Management"
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => onRemove(index)}
                aria-label={copy.deleteUnit}
                title={copy.deleteUnit}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            {copy.noRelatedUnit}
          </div>
        )}
      </div>
    </div>
  );
}

function RiskMatrix({
  profile,
  onChange,
}: {
  profile: DpiaRiskProfile;
  onChange: (impact: number, likelihood: number) => void;
}) {
  const impactValues = [1, 2, 3, 4, 5];
  const likelihoodValues = [5, 4, 3, 2, 1];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 grid grid-cols-[80px_repeat(5,minmax(48px,1fr))] gap-2 text-center text-xs font-bold text-slate-500">
        <div />
        {impactValues.map((impact) => (
          <div key={impact}>I{impact}</div>
        ))}
      </div>
      <div className="grid grid-cols-[80px_repeat(5,minmax(48px,1fr))] gap-2">
        {likelihoodValues.map((likelihood) => (
          <div key={likelihood} className="contents">
            <div className="flex items-center justify-center rounded bg-slate-50 px-2 text-center text-xs font-bold text-slate-500">
              L{likelihood}
            </div>
            {impactValues.map((impact) => {
              const cellProfile = calculateRiskProfile(impact, likelihood);
              const selected =
                profile.impact === impact && profile.likelihood === likelihood;

              return (
                <button
                  key={`${impact}-${likelihood}`}
                  type="button"
                  aria-label={`Impact ${impact}, Likelihood ${likelihood}, ${cellProfile.level}`}
                  onClick={() => onChange(impact, likelihood)}
                  className={cn(
                    "min-h-[58px] rounded-md border px-2 py-2 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-400",
                    riskCellClass(cellProfile.level),
                    selected && "ring-2 ring-blue-600 ring-offset-2",
                  )}
                >
                  <span className="block text-sm font-black">{cellProfile.score}</span>
                  <span className="mt-1 block text-[10px] font-bold uppercase leading-3">
                    {shortRiskLabel(cellProfile.level)}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-5">
        {riskLevels.map((level) => (
          <div key={level} className={cn("rounded px-2 py-1", riskLegendClass(level))}>
            {shortRiskLabel(level)}
          </div>
        ))}
      </div>
    </div>
  );
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

function RiskBadge({ level }: { level: DpiaRiskLevel }) {
  return (
    <Badge
      tone={
        level === "High"
          ? "red"
          : level === "Moderate to High"
            ? "yellow"
            : level === "Moderate"
              ? "blue"
              : "green"
      }
    >
      {level}
    </Badge>
  );
}

function FieldInput({
  label,
  value,
  type = "text",
  onChange,
  help,
}: {
  label: string;
  value: string;
  type?: "date" | "text";
  onChange: (value: string) => void;
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
        type={type}
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
  help,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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
        className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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

function FieldTextarea({
  label,
  value,
  onChange,
  minRows = 5,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
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
        className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

function riskCellClass(level: DpiaRiskLevel) {
  switch (level) {
    case "High":
      return "border-red-200 bg-red-100 text-red-900 hover:bg-red-200";
    case "Moderate to High":
      return "border-orange-200 bg-orange-100 text-orange-900 hover:bg-orange-200";
    case "Moderate":
      return "border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200";
    case "Low to High":
      return "border-lime-200 bg-lime-100 text-lime-900 hover:bg-lime-200";
    default:
      return "border-emerald-200 bg-emerald-100 text-emerald-900 hover:bg-emerald-200";
  }
}

function riskLegendClass(level: DpiaRiskLevel) {
  switch (level) {
    case "High":
      return "bg-red-100 text-red-800";
    case "Moderate to High":
      return "bg-orange-100 text-orange-800";
    case "Moderate":
      return "bg-amber-100 text-amber-800";
    case "Low to High":
      return "bg-lime-100 text-lime-800";
    default:
      return "bg-emerald-100 text-emerald-800";
  }
}

function shortRiskLabel(level: DpiaRiskLevel) {
  switch (level) {
    case "Low to High":
      return "Low-High";
    case "Moderate to High":
      return "Mod-High";
    default:
      return level;
  }
}

function nextRiskNumber(risks: DpiaRisk[]) {
  return risks.reduce((max, risk) => Math.max(max, risk.number), 0) + 1;
}

function renumberRisks(risks: DpiaRisk[]) {
  return risks.map((risk, index) => ({
    ...risk,
    number: index + 1,
  }));
}

function profileForRiskLevel(level: DpiaRiskLevel): DpiaRiskProfile {
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
  }
}

function profileForRiskRegisterLevel(level: RiskRegisterReference["riskLevel"]) {
  if (level === "High") {
    return calculateRiskProfile(5, 4);
  }

  if (level === "Medium") {
    return calculateRiskProfile(3, 3);
  }

  return calculateRiskProfile(2, 2);
}

function applyReferenceToRisk(
  risk: DpiaRisk,
  reference: RiskRegisterReference,
): DpiaRisk {
  const hasExistingControl = Boolean(reference.existingControl.trim());
  const hasRecommendedAction = Boolean(reference.recommendedAction.trim());

  const existingTreatment = hasExistingControl
    ? {
        ...createEmptyExistingTreatment(),
        name: reference.riskId,
        description: reference.existingControl,
        owner: reference.riskOwner,
        effectivenessNote: `Sumber Risk Register (${reference.status})`,
      }
    : null;

  const treatmentPlan = hasRecommendedAction
    ? {
        ...createEmptyTreatmentPlan(),
        action: reference.recommendedAction,
        owner: reference.riskOwner,
        dueDate: reference.targetDate,
        expectedEffect: `Target risk mengacu register ${reference.riskId}`,
      }
    : null;

  return {
    ...risk,
    source: risk.source || reference.riskId,
    event: risk.event || reference.riskDescription,
    legalImpact: risk.legalImpact || reference.potentialImpact,
    riskOwner: risk.riskOwner || reference.riskOwner,
    residualProfile:
      risk.event || risk.legalImpact || risk.source || risk.riskOwner
        ? risk.residualProfile
        : profileForRiskRegisterLevel(reference.riskLevel),
    targetTimeline: risk.targetTimeline || reference.targetDate,
    existingTreatments: existingTreatment
      ? [...risk.existingTreatments, existingTreatment]
      : risk.existingTreatments,
    treatmentPlans: treatmentPlan
      ? [...risk.treatmentPlans, treatmentPlan]
      : risk.treatmentPlans,
  };
}

function selectOptionsWithCurrent(options: string[], current: string) {
  if (!current || options.includes(current)) {
    return options;
  }

  return [current, ...options];
}

const dpiaWorkspaceText = {
  en: {
    backToResult: "Back to result",
    previous: "Back",
    continue: "Continue",
    generateExcel: "Generate Excel",
    saveDraft: "Save Draft",
    markDpiaDone: "Mark DPIA Completed",
    dpiaSaved: "DPIA draft saved.",
    dpiaSaveFailed: "Failed to save DPIA draft.",
    savingDpia: "Saving DPIA draft...",
    dpo: "Data Protection Officer",
    processOwnerPosition: "Process Owner Position",
    dpiaDate: "DPIA Date",
    responsiblePerson: "Responsible Person",
    relatedUnits: "Related Units",
    answer: "Answer",
    notes: "Notes",
    highRiskPotential: "High-Risk Processing Indicators",
    highRiskExplanation: "High-Risk Explanation",
    riskMatrixIntro:
      "Add risks manually, document treatments, assess residual risk with the matrix, then choose the expected target risk.",
    addRisk: "Add Risk",
    riskRegisterReference: "Risk Register Dashboard Reference",
    noRiskReference: "No risk register reference yet",
    addFromReference: "Add from Reference",
    applyToActiveRisk: "Apply to Active Risk",
    source: "Source",
    newRiskUntitled: "New risk has no event yet",
    noRiskStart: "No risks yet. Add a risk to start the assessment.",
    newRisk: "New risk",
    deleteRisk: "Delete Risk",
    riskSource: "Risk Source",
    riskEvent: "Risk Event",
    legalImpact: "Legal Impact",
    existingTreatmentDescription:
      "List all controls that are already in place. The residual risk below should reflect these existing treatments.",
    residualRiskDescription:
      "Select impact and likelihood after all existing treatments have been considered.",
    treatmentPlanDescription:
      "Add further treatment plans to reduce residual risk toward the target risk.",
    targetRiskDescription:
      "Select the target/final risk expected after the treatment plan is completed.",
    noExistingTreatment: "No existing treatment yet.",
    addExistingTreatment: "Add Existing Treatment",
    noTreatmentPlan: "No treatment plan yet.",
    addTreatmentPlan: "Add Treatment Plan",
    targetTimeline: "Target Implementation Date",
    mitigationApproval: "Risk Reduction Approval",
    noRisk: "No risks yet",
    addRiskToStart:
      "Add a risk to start completing treatments, residual risk, and target risk.",
    monitoringPlan: "Monitoring Review and Plan",
    decisionTitle: "Conclusion and Decision on Personal Data Processing",
    conclusion: "Conclusion",
    publicSummary: "Public Summary",
    documentVersion: "Document Version",
    date: "Date",
    preparedBy: "Prepared by",
    reviewedBy: "Reviewed by",
    approvedBy: "Approved by",
    acknowledgedBy: "Acknowledged by",
    delete: "Delete",
    effectivenessNote: "Effectiveness Note",
    actionPlan: "Action Plan",
    controlName: "Control Name",
    existingTreatmentDescriptionLabel: "Existing Treatment Description",
    expectedEffect: "Expected Effect",
    dueDate: "Due Date",
    relatedUnitHelp: "Add each related unit that needs to be involved.",
    add: "Add",
    deleteUnit: "Delete unit",
    noRelatedUnit: "No related unit yet.",
  },
  id: {
    backToResult: "Kembali ke hasil",
    previous: "Kembali",
    continue: "Lanjut",
    generateExcel: "Generate Excel",
    saveDraft: "Simpan Draft",
    markDpiaDone: "Tandai DPIA Selesai",
    dpiaSaved: "Draft DPIA tersimpan.",
    dpiaSaveFailed: "Draft DPIA gagal disimpan.",
    savingDpia: "Menyimpan draft DPIA...",
    dpo: "Pejabat Pelindung Data Pribadi",
    processOwnerPosition: "Kedudukan Pemilik Proses",
    dpiaDate: "Tanggal DPIA",
    responsiblePerson: "Penanggung Jawab",
    relatedUnits: "Unit Terkait",
    answer: "Jawaban",
    notes: "Catatan",
    highRiskPotential: "Potensi Risiko Tinggi",
    highRiskExplanation: "Uraian Risiko Tinggi",
    riskMatrixIntro:
      "Tambahkan risiko secara manual, isi treatment, nilai residual risk dengan matrix, lalu pilih target risk yang diharapkan.",
    addRisk: "Tambah Risk",
    riskRegisterReference: "Referensi dari Risk Register Dashboard",
    noRiskReference: "Belum ada referensi risk register",
    addFromReference: "Tambah dari Referensi",
    applyToActiveRisk: "Gunakan ke Risk Aktif",
    source: "Sumber",
    newRiskUntitled: "Risiko baru belum diberi kejadian",
    noRiskStart: "Belum ada risiko, tambah risk untuk mulai penilaian.",
    newRisk: "Risiko baru",
    deleteRisk: "Hapus Risk",
    riskSource: "Sumber Risiko",
    riskEvent: "Kejadian Risiko",
    legalImpact: "Akibat Hukum",
    existingTreatmentDescription:
      "Isi semua kontrol yang sudah berjalan. Residual risk di bawahnya merupakan hasil setelah treatment ini dipertimbangkan.",
    residualRiskDescription:
      "Pilih impact dan likelihood setelah semua existing treatment diperhitungkan.",
    treatmentPlanDescription:
      "Isi rencana treatment tambahan untuk menurunkan residual risk ke target akhir.",
    targetRiskDescription:
      "Pilih target/final risk yang diharapkan setelah treatment plan selesai dilakukan.",
    noExistingTreatment: "Belum ada existing treatment.",
    addExistingTreatment: "Tambah Existing Treatment",
    noTreatmentPlan: "Belum ada treatment plan.",
    addTreatmentPlan: "Tambah Treatment Plan",
    targetTimeline: "Target Waktu Pelaksanaan",
    mitigationApproval: "Persetujuan Langkah Pengurangan Risiko",
    noRisk: "Belum ada risiko",
    addRiskToStart:
      "Tambahkan risk untuk mulai mengisi treatment, residual risk, dan target risk.",
    monitoringPlan: "Tinjauan dan Rencana Monitoring",
    decisionTitle: "Kesimpulan dan Keputusan terhadap Pemrosesan Data Pribadi",
    conclusion: "Kesimpulan",
    publicSummary: "Ringkasan Publik",
    documentVersion: "Versi Dokumen",
    date: "Tanggal",
    preparedBy: "Disusun oleh",
    reviewedBy: "Ditinjau oleh",
    approvedBy: "Disetujui oleh",
    acknowledgedBy: "Diketahui oleh",
    delete: "Hapus",
    effectivenessNote: "Catatan Efektivitas",
    actionPlan: "Rencana Tindakan",
    controlName: "Nama Kontrol",
    existingTreatmentDescriptionLabel: "Deskripsi Existing Treatment",
    expectedEffect: "Dampak yang Diharapkan",
    dueDate: "Tanggal Jatuh Tempo",
    relatedUnitHelp: "Tambahkan unit yang perlu dilibatkan satu per satu.",
    add: "Tambah",
    deleteUnit: "Hapus unit",
    noRelatedUnit: "Belum ada related unit.",
  },
} as const;

