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

type DpiaWorkspaceProps = {
  draft: DpiaDraft;
  assessmentId: string;
  resultHref: string;
  initialStatus: AssessmentStatus;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const riskLevels: DpiaRiskLevel[] = [
  "Low",
  "Low to High",
  "Moderate",
  "Moderate to High",
  "High",
];

export function DpiaWorkspace({
  draft,
  assessmentId,
  resultHref,
  initialStatus,
}: DpiaWorkspaceProps) {
  const [dpiaDraft, setDpiaDraft] = useState(draft);
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [activeRiskId, setActiveRiskId] = useState(draft.risks[0]?.id ?? "");
  const activeRisk = useMemo(
    () =>
      dpiaDraft.risks.find((risk) => risk.id === activeRiskId) ??
      dpiaDraft.risks[0],
    [activeRiskId, dpiaDraft.risks],
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

  return (
    <div className="mx-auto max-w-[1240px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <Link
            href={resultHref}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to result
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
            Simpan Draft
          </Button>
          <Button
            onClick={() => void saveDraft("Done")}
            disabled={saveState === "saving"}
          >
            <CheckCircle2 className="h-4 w-4" />
            Tandai DPIA Selesai
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
            ? "Draft DPIA tersimpan."
            : saveState === "error"
              ? "Draft DPIA gagal disimpan."
              : "Menyimpan draft DPIA..."}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Identitas DPIA</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldInput
            label="Kedudukan Pemilik Proses"
            value={dpiaDraft.metadata.processOwnerPosition}
            onChange={(value) => updateMetadata("processOwnerPosition", value)}
          />
          <FieldInput
            label="Pejabat Pelindung Data Pribadi"
            value={dpiaDraft.metadata.dpo}
            onChange={(value) => updateMetadata("dpo", value)}
          />
          <FieldInput
            label="Tanggal DPIA"
            value={dpiaDraft.metadata.date}
            onChange={(value) => updateMetadata("date", value)}
          />
          <FieldInput
            label="Penanggung Jawab"
            value={dpiaDraft.metadata.responsiblePerson}
            onChange={(value) => updateMetadata("responsiblePerson", value)}
          />
          <FieldInput
            label="Unit Terkait"
            value={dpiaDraft.metadata.relatedUnits}
            onChange={(value) => updateMetadata("relatedUnits", value)}
          />
        </CardContent>
      </Card>

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
                      label="Jawaban"
                      value={row.answer}
                      onChange={(value) =>
                        updateRow(section.id, row.id, "answer", value)
                      }
                    />
                    <FieldTextarea
                      label="Catatan"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Potensi Risiko Tinggi</CardTitle>
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
            label="Uraian Risiko Tinggi"
            value={dpiaDraft.highRiskExplanation}
            onChange={(value) => updateDraftField("highRiskExplanation", value)}
            minRows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Risk Matrix 5x5</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Tambahkan risiko secara manual, isi treatment, nilai residual risk
              dengan matrix, lalu pilih target risk yang diharapkan.
            </p>
          </div>
          <Button onClick={addRisk}>
            <Plus className="h-4 w-4" />
            Tambah Risk
          </Button>
        </CardHeader>
        <CardContent className="grid gap-5 xl:grid-cols-[0.75fr_1.25fr]">
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
                        {risk.event || "Risiko baru belum diberi kejadian"}
                      </div>
                    </div>
                    <RiskBadge level={risk.residualProfile.level} />
                  </div>
                  <RiskFlowSummary risk={risk} compact />
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Belum ada risiko, tambah risk untuk mulai penilaian.
                <Button className="mt-4 w-full" variant="secondary" onClick={addRisk}>
                  <Plus className="h-4 w-4" />
                  Tambah Risk
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
                        {activeRisk.event || "Risiko baru"}
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => removeRisk(activeRisk.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus Risk
                    </Button>
                  </div>
                  <RiskFlowSummary risk={activeRisk} />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FieldInput
                    label="Sumber Risiko"
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
                    label="Kejadian Risiko"
                    value={activeRisk.event}
                    onChange={(value) => updateRisk(activeRisk.id, { event: value })}
                    minRows={4}
                  />
                  <FieldTextarea
                    label="Akibat Hukum"
                    value={activeRisk.legalImpact}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { legalImpact: value })
                    }
                    minRows={4}
                  />
                </div>

                <TreatmentRepeater
                  title="Existing Treatments"
                  description="Isi semua kontrol yang sudah berjalan. Residual risk di bawahnya merupakan hasil setelah treatment ini dipertimbangkan."
                  emptyLabel="Belum ada existing treatment."
                  addLabel="Tambah Existing Treatment"
                  items={activeRisk.existingTreatments}
                  onAdd={() => addExistingTreatment(activeRisk.id)}
                  onRemove={(itemId) => removeExistingTreatment(activeRisk.id, itemId)}
                  renderItem={(item) => (
                    <ExistingTreatmentFields
                      treatment={item}
                      onChange={(patch) =>
                        updateExistingTreatment(activeRisk.id, item.id, patch)
                      }
                    />
                  )}
                />

                <RiskStageCard
                  title="Residual Risk after Treatment"
                  description="Pilih impact dan likelihood setelah semua existing treatment diperhitungkan."
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
                  description="Isi rencana treatment tambahan untuk menurunkan residual risk ke target akhir."
                  emptyLabel="Belum ada treatment plan."
                  addLabel="Tambah Treatment Plan"
                  items={activeRisk.treatmentPlans}
                  onAdd={() => addTreatmentPlan(activeRisk.id)}
                  onRemove={(itemId) => removeTreatmentPlan(activeRisk.id, itemId)}
                  renderItem={(item) => (
                    <TreatmentPlanFields
                      plan={item}
                      onChange={(patch) =>
                        updateTreatmentPlan(activeRisk.id, item.id, patch)
                      }
                    />
                  )}
                />

                <TargetRiskSelectCard
                  title="Target Risk after Treatment Plan"
                  description="Pilih target/final risk yang diharapkan setelah treatment plan selesai dilakukan."
                  profile={activeRisk.targetProfile}
                  onChange={(level) =>
                    updateTargetRiskLevel(activeRisk.id, level)
                  }
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <FieldInput
                    label="Monitoring Status"
                    value={activeRisk.monitoringStatus}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { monitoringStatus: value })
                    }
                  />
                  <FieldInput
                    label="Target Waktu Pelaksanaan"
                    value={activeRisk.targetTimeline}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { targetTimeline: value })
                    }
                  />
                  <FieldTextarea
                    label="Persetujuan Langkah Pengurangan Risiko"
                    value={activeRisk.mitigationApproval}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, { mitigationApproval: value })
                    }
                    minRows={3}
                  />
                  <FieldTextarea
                    label="Related Units for Coordination"
                    value={activeRisk.relatedUnits.join(", ")}
                    onChange={(value) =>
                      updateRisk(activeRisk.id, {
                        relatedUnits: value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                    minRows={3}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <Grid3X3 className="mx-auto h-8 w-8 text-slate-400" />
                <h2 className="mt-3 font-bold text-slate-950">
                  Belum ada risiko
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Tambahkan risk untuk mulai mengisi treatment, residual risk,
                  dan target risk.
                </p>
                <Button className="mt-5" onClick={addRisk}>
                  <Plus className="h-4 w-4" />
                  Tambah Risk
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Kesimpulan dan Keputusan terhadap Pemrosesan Data Pribadi
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <FieldTextarea
            label="Kesimpulan"
            value={dpiaDraft.conclusion}
            onChange={(value) => updateDraftField("conclusion", value)}
            minRows={5}
          />
          <FieldTextarea
            label="Tinjauan dan Rencana Monitoring"
            value={dpiaDraft.monitoringPlan}
            onChange={(value) => updateDraftField("monitoringPlan", value)}
            minRows={5}
          />
          <FieldTextarea
            label="Ringkasan Publik"
            value={dpiaDraft.publicSummary}
            onChange={(value) => updateDraftField("publicSummary", value)}
            minRows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Kontrol Dokumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldInput
            label="Versi Dokumen"
            value={dpiaDraft.signatures.version}
            onChange={(value) => updateSignature("version", value)}
          />
          <FieldInput
            label="Tanggal"
            value={dpiaDraft.signatures.date}
            onChange={(value) => updateSignature("date", value)}
          />
          <FieldInput
            label="Disusun oleh"
            value={dpiaDraft.signatures.preparedBy}
            onChange={(value) => updateSignature("preparedBy", value)}
          />
          <FieldInput
            label="Ditinjau oleh"
            value={dpiaDraft.signatures.reviewedBy}
            onChange={(value) => updateSignature("reviewedBy", value)}
          />
          <FieldInput
            label="Disetujui oleh"
            value={dpiaDraft.signatures.approvedBy}
            onChange={(value) => updateSignature("approvedBy", value)}
          />
          <FieldInput
            label="Diketahui oleh"
            value={dpiaDraft.signatures.acknowledgedBy}
            onChange={(value) => updateSignature("acknowledgedBy", value)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Link href={resultHref} className={buttonVariants({ variant: "secondary" })}>
          Back to Results
        </Link>
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
            Simpan Draft
          </Button>
          <Button
            onClick={() => void saveDraft("Done")}
            disabled={saveState === "saving"}
          >
            <CheckCircle2 className="h-4 w-4" />
            Tandai DPIA Selesai
          </Button>
        </div>
      </div>
    </div>
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
  items,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  addLabel: string;
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
                  Hapus
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
  treatment,
  onChange,
}: {
  treatment: DpiaExistingTreatment;
  onChange: (patch: Partial<DpiaExistingTreatment>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FieldInput
        label="Nama Kontrol"
        value={treatment.name}
        onChange={(value) => onChange({ name: value })}
      />
      <FieldInput
        label="Owner"
        value={treatment.owner}
        onChange={(value) => onChange({ owner: value })}
      />
      <FieldTextarea
        label="Deskripsi Existing Treatment"
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
          label="Catatan Efektivitas"
          value={treatment.effectivenessNote}
          onChange={(value) => onChange({ effectivenessNote: value })}
          minRows={3}
        />
      </div>
    </div>
  );
}

function TreatmentPlanFields({
  plan,
  onChange,
}: {
  plan: DpiaTreatmentPlan;
  onChange: (patch: Partial<DpiaTreatmentPlan>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FieldTextarea
        label="Rencana Tindakan"
        value={plan.action}
        onChange={(value) => onChange({ action: value })}
        minRows={4}
      />
      <FieldTextarea
        label="Expected Effect"
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
        label="Due Date"
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
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
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
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  minRows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={minRows}
        className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
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
