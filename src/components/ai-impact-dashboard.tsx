"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrainCircuit, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteActionButton } from "@/components/delete-action-button";
import type { AiImpactAssessmentListRow } from "@/lib/data";
import type { Locale } from "@/lib/i18n";

type RopaOption = {
  id: string;
  activityName: string;
  departmentName?: string;
  status?: string;
};

const copy = {
  en: {
    title: "AI Impact Assessment",
    subtitle:
      "Assess AI use cases by reusing RoPA, DPIA, LIA, and TIA context without duplicate entry.",
    create: "Create AIIA",
    selectRopa: "Select RoPA activity",
    choose: "Choose RoPA",
    creating: "Creating...",
    open: "Open",
    deleteConfirm: "Delete this AI Impact Assessment?",
    noData: "No AI Impact Assessment has been created yet.",
    aiSystem: "AI system / use case",
    source: "Linked RoPA",
    owner: "Owner",
    risk: "Residual risk",
    fria: "FRIA",
    decision: "Decision",
    updated: "Updated",
    actions: "Actions",
    createFailed: "Failed to create AIIA.",
  },
  id: {
    title: "AI Impact Assessment",
    subtitle:
      "Nilai penggunaan AI dengan memakai ulang konteks RoPA, DPIA, LIA, dan TIA tanpa input berulang.",
    create: "Buat AIIA",
    selectRopa: "Pilih aktivitas RoPA",
    choose: "Pilih RoPA",
    creating: "Membuat...",
    open: "Buka",
    deleteConfirm: "Hapus AI Impact Assessment ini?",
    noData: "Belum ada AI Impact Assessment.",
    aiSystem: "Sistem / use case AI",
    source: "RoPA terkait",
    owner: "Owner",
    risk: "Residual risk",
    fria: "FRIA",
    decision: "Keputusan",
    updated: "Diperbarui",
    actions: "Aksi",
    createFailed: "Gagal membuat AIIA.",
  },
} as const;

export function AiImpactDashboard({
  assessments,
  ropaActivities,
  initialRopaId,
  locale,
  canDelete,
}: {
  assessments: AiImpactAssessmentListRow[];
  ropaActivities: RopaOption[];
  initialRopaId: string;
  locale: Locale;
  canDelete: boolean;
}) {
  const router = useRouter();
  const t = copy[locale];
  const [selectedRopaId, setSelectedRopaId] = useState(initialRopaId);
  const [isCreating, setIsCreating] = useState(false);
  const stats = useMemo(
    () => ({
      total: assessments.length,
      high: assessments.filter((item) =>
        ["High", "Critical"].includes(item.highestResidualRisk),
      ).length,
      fria: assessments.filter((item) => item.friaStatus === "FRIA REQUIRED").length,
      open: assessments.filter((item) => item.status !== "Completed").length,
    }),
    [assessments],
  );

  async function createAssessment() {
    if (!selectedRopaId || isCreating) {
      return;
    }

    setIsCreating(true);
    const response = await fetch("/api/ai-impact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primaryRopaId: selectedRopaId }),
    }).catch(() => null);

    if (!response?.ok) {
      window.alert(t.createFailed);
      setIsCreating(false);
      return;
    }

    const payload = (await response.json()) as { data?: { id?: string } };
    router.push(payload.data?.id ? `/assessments/ai-impact/${payload.data.id}` : "/assessments/ai-impact");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            AIIA
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{t.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t.subtitle}
          </p>
        </div>
        <Card className="w-full lg:w-[520px]">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-semibold text-slate-700">
              {t.selectRopa}
              <select
                className="mt-2 h-11 w-full rounded-2xl border border-[color:var(--pv-border)] bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                value={selectedRopaId}
                onChange={(event) => setSelectedRopaId(event.target.value)}
              >
                <option value="">{t.choose}</option>
                {ropaActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activityName} - {activity.departmentName}
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={() => void createAssessment()} disabled={!selectedRopaId || isCreating}>
              <Plus className="h-4 w-4" />
              {isCreating ? t.creating : t.create}
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <AiImpactMetric label="Total AIIA" value={stats.total} tone="blue" />
        <AiImpactMetric label="High / Critical" value={stats.high} tone="red" />
        <AiImpactMetric label="FRIA Required" value={stats.fria} tone="yellow" />
        <AiImpactMetric label="Open" value={stats.open} tone="purple" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-4">{t.aiSystem}</th>
                    <th className="px-4 py-4">{t.source}</th>
                    <th className="px-4 py-4">{t.owner}</th>
                    <th className="px-4 py-4">{t.risk}</th>
                    <th className="px-4 py-4">{t.fria}</th>
                    <th className="px-4 py-4">{t.decision}</th>
                    <th className="px-4 py-4">{t.updated}</th>
                    <th className="px-4 py-4">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assessments.map((assessment) => (
                    <tr key={assessment.id} className="align-top">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">{assessment.aiSystem}</p>
                        <p className="text-xs font-semibold text-slate-500">
                          {assessment.assessmentNumber} - {assessment.departmentName}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {assessment.activityName ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">{assessment.ownerName || "-"}</td>
                      <td className="px-4 py-4">
                        <RiskBadge value={assessment.highestResidualRisk} />
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={assessment.friaStatus === "FRIA REQUIRED" ? "yellow" : "slate"}>
                          {assessment.friaStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={decisionTone(assessment.finalDecision)}>
                          {assessment.finalDecision}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {new Date(assessment.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link href={`/assessments/ai-impact/${assessment.id}`}>
                            <Button variant="secondary" size="sm">{t.open}</Button>
                          </Link>
                          {canDelete ? (
                            <DeleteActionButton
                              endpoint={`/api/ai-impact/${assessment.id}`}
                              confirmMessage={t.deleteConfirm}
                              compact
                            />
                          ) : (
                            <Button variant="ghost" size="icon" disabled title="Locked">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 text-center">
              <BrainCircuit className="h-10 w-10 text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-slate-600">{t.noData}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AiImpactMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "red" | "yellow" | "purple";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    red: "bg-rose-50 text-rose-700",
    yellow: "bg-amber-50 text-amber-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl ${colors[tone]}`}>
          <BrainCircuit className="h-5 w-5" />
        </span>
        <div>
          <p className="text-3xl font-bold text-slate-950">{value}</p>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ value }: { value: string }) {
  const tone =
    value === "Critical" ? "red" : value === "High" ? "red" : value === "Medium" ? "yellow" : value === "Low" ? "green" : "slate";
  return <Badge tone={tone}>{value}</Badge>;
}

function decisionTone(value: string) {
  if (value === "APPROVE") {
    return "green" as const;
  }
  if (value === "DO NOT PROCEED" || value === "ESCALATE TO DPO/LEGAL") {
    return "red" as const;
  }
  if (value === "REMEDIATION REQUIRED") {
    return "yellow" as const;
  }
  return "blue" as const;
}
