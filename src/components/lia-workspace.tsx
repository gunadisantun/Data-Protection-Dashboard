"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Save,
  Scale,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  serializeLiaDraftNotes,
  type LiaDraft,
  type LiaDraftSection,
} from "@/lib/lia-draft";
import type { AssessmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type LiaWorkspaceProps = {
  draft: LiaDraft;
  assessmentId: string;
  resultHref: string;
  initialStatus: AssessmentStatus;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function LiaWorkspace({
  draft,
  assessmentId,
  resultHref,
  initialStatus,
}: LiaWorkspaceProps) {
  const [liaDraft, setLiaDraft] = useState(draft);
  const [status, setStatus] = useState(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function saveDraft(nextStatus: AssessmentStatus) {
    setSaveState("saving");

    const response = await fetch(`/api/tasks/${assessmentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
        notes: serializeLiaDraftNotes(liaDraft),
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

  function updateRow(
    sectionId: LiaDraftSection["id"],
    rowId: string,
    field: "answer" | "notes",
    value: string,
  ) {
    setLiaDraft((current) => ({
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

  function updateConclusion(sectionId: LiaDraftSection["id"], value: string) {
    setLiaDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, conclusion: value } : section,
      ),
    }));
  }

  function updateDecision(field: keyof LiaDraft["decision"], value: string) {
    setLiaDraft((current) => ({
      ...current,
      decision: {
        ...current.decision,
        [field]: value,
      },
    }));
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
            Back to result
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Scale className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-3xl font-bold text-slate-950">
                Legitimate Interest Assessment
              </h1>
              <p className="mt-1 text-sm text-slate-600">{liaDraft.activityName}</p>
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
            Tandai LIA Selesai
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryItem label="Department" value={liaDraft.departmentName} />
          <SummaryItem label="PIC" value={liaDraft.picName} />
          <SummaryItem label="Legal Basis" value={liaDraft.legalBasis} />
          <SummaryItem label="Risk Level" value={liaDraft.riskLevel} />
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
            ? "Draft LIA tersimpan."
            : saveState === "error"
              ? "Draft LIA gagal disimpan."
              : "Menyimpan draft LIA..."}
        </div>
      ) : null}

      <div className="grid gap-5">
        {liaDraft.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {section.conclusionLabel}
                </p>
              </div>
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

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <FieldTextarea
                  label={section.conclusionLabel}
                  value={section.conclusion}
                  onChange={(value) => updateConclusion(section.id, value)}
                  minRows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Keputusan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <FieldTextarea
            label="Tanda tangan"
            value={liaDraft.decision.signer}
            onChange={(value) => updateDecision("signer", value)}
            minRows={3}
          />
          <FieldTextarea
            label="Tanggal"
            value={liaDraft.decision.date}
            onChange={(value) => updateDecision("date", value)}
            minRows={3}
          />
          <FieldTextarea
            label="Rencana reviu selanjutnya"
            value={liaDraft.decision.nextReview}
            onChange={(value) => updateDecision("nextReview", value)}
            minRows={3}
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
            Tandai LIA Selesai
          </Button>
        </div>
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
