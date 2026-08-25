"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BrainCircuit, ExternalLink, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteActionButton } from "@/components/delete-action-button";
import {
  controlEffectivenessOptions,
  friaScreeningFields,
  specialistAssessmentTypes,
  type AiImpactDataProtection,
  type AiImpactDomain,
  type AiImpactFriaItem,
  type AiImpactFriaScreening,
  type AiImpactSpecialistAssessment,
} from "@/lib/ai-impact";
import type { AiImpactAssessmentDetail } from "@/lib/data";
import type { AssessmentType } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

const copy = {
  en: {
    back: "Back",
    save: "Save",
    saving: "Saving...",
    saved: "Saved.",
    saveFailed: "Failed to save AIIA.",
    deleteConfirm: "Delete this AI Impact Assessment?",
    overview: "Overview",
    linkedAssessments: "Linked assessments",
    context: "AI context",
    impact: "Impact domains",
    fria: "FRIA screening",
    dp: "Data protection and specialist assessment",
    source: "Source",
    imported: "Imported from RoPA",
    create: "Create",
    open: "Open",
    notAvailable: "Not available",
    status: "Status",
    approval: "Approval status",
    owner: "Owner",
    aiSystem: "AI system / use case",
    businessOwner: "Business owner",
    purpose: "Intended purpose",
    provider: "Provider / developer",
    persons: "Affected persons",
    jurisdictions: "Jurisdictions",
    benefit: "Intended benefit",
    misuse: "Foreseeable misuse",
    domain: "Domain",
    negativeImpact: "Potential negative impact",
    affectedGroup: "Affected group",
    severity: "Severity",
    likelihood: "Likelihood",
    controls: "Existing controls",
    effectiveness: "Control effectiveness",
    residual: "Residual risk",
    action: "Further action",
    response: "Response",
    evidence: "Evidence reference",
    processPersonalData: "Processes personal data",
    specialistRequired: "Specialist assessment required",
    specialistTypes: "Specialist assessment types",
  },
  id: {
    back: "Kembali",
    save: "Simpan",
    saving: "Menyimpan...",
    saved: "Tersimpan.",
    saveFailed: "Gagal menyimpan AIIA.",
    deleteConfirm: "Hapus AI Impact Assessment ini?",
    overview: "Ringkasan",
    linkedAssessments: "Assessment terkait",
    context: "Konteks AI",
    impact: "Domain dampak",
    fria: "FRIA screening",
    dp: "Pelindungan data dan assessment spesialis",
    source: "Sumber",
    imported: "Diimpor dari RoPA",
    create: "Buat",
    open: "Buka",
    notAvailable: "Tidak tersedia",
    status: "Status",
    approval: "Status persetujuan",
    owner: "Owner",
    aiSystem: "Sistem / use case AI",
    businessOwner: "Business owner",
    purpose: "Tujuan penggunaan",
    provider: "Provider / developer",
    persons: "Subjek terdampak",
    jurisdictions: "Yurisdiksi",
    benefit: "Manfaat yang diharapkan",
    misuse: "Penyalahgunaan yang dapat diperkirakan",
    domain: "Domain",
    negativeImpact: "Potensi dampak negatif",
    affectedGroup: "Kelompok terdampak",
    severity: "Severity",
    likelihood: "Likelihood",
    controls: "Kontrol yang ada",
    effectiveness: "Efektivitas kontrol",
    residual: "Residual risk",
    action: "Tindakan lanjutan",
    response: "Respons",
    evidence: "Referensi evidence",
    processPersonalData: "Memproses data pribadi",
    specialistRequired: "Perlu assessment spesialis",
    specialistTypes: "Jenis assessment spesialis",
  },
} as const;

export function AiImpactWorkspace({
  assessment,
  locale,
  canDelete,
}: {
  assessment: AiImpactAssessmentDetail;
  locale: Locale;
  canDelete: boolean;
}) {
  const router = useRouter();
  const t = copy[locale];
  const [form, setForm] = useState(() => ({
    status: assessment.status,
    approvalStatus: assessment.approvalStatus,
    ownerName: assessment.ownerName,
    aiSystem: assessment.aiSystem,
    businessOwner: assessment.businessOwner,
    intendedPurpose: assessment.intendedPurpose,
    providerDeveloper: assessment.providerDeveloper,
    affectedPersons: assessment.affectedPersons,
    jurisdictions: assessment.jurisdictions,
    intendedBenefit: assessment.intendedBenefit,
    foreseeableMisuse: assessment.foreseeableMisuse,
    impactDomains: assessment.impactDomains,
    friaScreening: assessment.friaScreening,
    friaItems: assessment.friaItems,
    dataProtection: assessment.dataProtection,
    specialistAssessment: assessment.specialistAssessment,
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const related = useMemo(
    () => [
      { type: "DPIA" as const, id: assessment.relatedDpiaId },
      { type: "TIA" as const, id: assessment.relatedTiaId },
      { type: "LIA" as const, id: assessment.relatedLiaId },
    ],
    [assessment.relatedDpiaId, assessment.relatedLiaId, assessment.relatedTiaId],
  );

  async function save() {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/ai-impact/${assessment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);

    setIsSaving(false);
    if (!response?.ok) {
      setMessage(t.saveFailed);
      return;
    }
    setMessage(t.saved);
    router.refresh();
  }

  async function createSupporting(type: AssessmentType) {
    const response = await fetch(
      `/api/ai-impact/${assessment.id}/supporting-assessment`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      },
    ).catch(() => null);

    if (!response?.ok) {
      window.alert("Failed to create supporting assessment.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/assessments/ai-impact"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
          <div className="mt-4 flex items-start gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <BrainCircuit className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                {assessment.assessmentNumber}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                {assessment.aiSystem}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {assessment.department.name} - {assessment.primaryRopa?.activityName ?? t.notAvailable}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={riskTone(assessment.highestResidualRisk)}>
            {assessment.highestResidualRisk}
          </Badge>
          <Badge tone={assessment.friaStatus === "FRIA REQUIRED" ? "yellow" : "slate"}>
            {assessment.friaStatus}
          </Badge>
          <Badge tone={decisionTone(assessment.finalDecision)}>
            {assessment.finalDecision}
          </Badge>
          <Button onClick={() => void save()} disabled={isSaving}>
            <Save className="h-4 w-4" />
            {isSaving ? t.saving : t.save}
          </Button>
          {canDelete ? (
            <DeleteActionButton
              endpoint={`/api/ai-impact/${assessment.id}`}
              confirmMessage={t.deleteConfirm}
              redirectTo="/assessments/ai-impact"
            />
          ) : null}
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t.context}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <TextInput label={t.aiSystem} value={form.aiSystem} onChange={(value) => setForm({ ...form, aiSystem: value })} source={t.imported} />
            <TextInput label={t.owner} value={form.ownerName} onChange={(value) => setForm({ ...form, ownerName: value })} />
            <TextInput label={t.businessOwner} value={form.businessOwner} onChange={(value) => setForm({ ...form, businessOwner: value })} source={t.imported} />
            <TextInput label={t.provider} value={form.providerDeveloper} onChange={(value) => setForm({ ...form, providerDeveloper: value })} source={t.imported} />
            <TextArea label={t.purpose} value={form.intendedPurpose} onChange={(value) => setForm({ ...form, intendedPurpose: value })} source={t.imported} />
            <TextArea label={t.persons} value={form.affectedPersons} onChange={(value) => setForm({ ...form, affectedPersons: value })} source={t.imported} />
            <TextArea label={t.jurisdictions} value={form.jurisdictions} onChange={(value) => setForm({ ...form, jurisdictions: value })} />
            <TextArea label={t.benefit} value={form.intendedBenefit} onChange={(value) => setForm({ ...form, intendedBenefit: value })} />
            <TextArea label={t.misuse} value={form.foreseeableMisuse} onChange={(value) => setForm({ ...form, foreseeableMisuse: value })} />
            <label className="text-sm font-semibold text-slate-700">
              {t.status}
              <select className={selectClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}>
                {["Draft", "In Progress", "Completed", "Archived"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <TextInput label={t.approval} value={form.approvalStatus} onChange={(value) => setForm({ ...form, approvalStatus: value })} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.linkedAssessments}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessment.primaryRopaId ? (
              <LinkPanel
                label="RoPA"
                title={assessment.primaryRopa?.activityName ?? assessment.primaryRopaId}
                href={`/ropa/${assessment.primaryRopaId}/result`}
              />
            ) : null}
            {related.map((item) =>
              item.id ? (
                <LinkPanel
                  key={item.type}
                  label={item.type}
                  title={`${item.type} ${t.open}`}
                  href={`/assessments/${item.id}/${item.type.toLowerCase()}`}
                />
              ) : (
                <div
                  key={item.type}
                  className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      {item.type}
                    </p>
                    <p className="text-sm font-semibold text-slate-700">{t.notAvailable}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => void createSupporting(item.type)}>
                    <Plus className="h-4 w-4" />
                    {t.create}
                  </Button>
                </div>
              ),
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.impact}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.impactDomains.map((domain, index) => (
            <ImpactDomainCard
              key={domain.id}
              domain={domain}
              locale={locale}
              onChange={(next) => {
                const impactDomains = [...form.impactDomains];
                impactDomains[index] = next;
                setForm({ ...form, impactDomains });
              }}
            />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.fria}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              {friaScreeningFields.map((field) => (
                <label key={field.id} className="text-sm font-semibold text-slate-700">
                  {field.label}
                  <select
                    className={selectClass}
                    value={form.friaScreening[field.id] ?? ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        friaScreening: {
                          ...form.friaScreening,
                          [field.id]: event.target.value,
                        } as AiImpactFriaScreening,
                      })
                    }
                  >
                    {["", "Yes", "No", "Potential", "TBD", "N/A"].map((option) => (
                      <option key={option} value={option}>{option || "-"}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                    {field.description}
                  </span>
                </label>
              ))}
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-950">
                FRIA status: {assessment.friaStatus}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Completion: {assessment.friaCompletion}%
              </p>
            </div>
            {form.friaItems.map((item, index) => (
              <FriaItemCard
                key={item.id}
                item={item}
                locale={locale}
                onChange={(next) => {
                  const friaItems = [...form.friaItems];
                  friaItems[index] = next;
                  setForm({ ...form, friaItems });
                }}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.dp}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-semibold text-slate-700">
              {t.processPersonalData}
              <select
                className={selectClass}
                value={form.dataProtection.processesPersonalData}
                onChange={(event) =>
                  setForm({
                    ...form,
                    dataProtection: {
                      ...form.dataProtection,
                      processesPersonalData: event.target.value as AiImpactDataProtection["processesPersonalData"],
                    },
                  })
                }
              >
                {["Yes", "No", "TBD"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <TextArea
              label="Result"
              value={form.dataProtection.result}
              onChange={(value) =>
                setForm({
                  ...form,
                  dataProtection: { ...form.dataProtection, result: value },
                })
              }
            />
            <label className="text-sm font-semibold text-slate-700">
              {t.specialistRequired}
              <select
                className={selectClass}
                value={form.specialistAssessment.required}
                onChange={(event) =>
                  setForm({
                    ...form,
                    specialistAssessment: {
                      ...form.specialistAssessment,
                      required: event.target.value as AiImpactSpecialistAssessment["required"],
                    },
                  })
                }
              >
                {["Yes", "No", "TBD"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <div>
              <p className="text-sm font-semibold text-slate-700">{t.specialistTypes}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {specialistAssessmentTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.specialistAssessment.types.includes(type)}
                      onChange={(event) => {
                        const types = event.target.checked
                          ? [...form.specialistAssessment.types, type]
                          : form.specialistAssessment.types.filter((item) => item !== type);
                        setForm({
                          ...form,
                          specialistAssessment: {
                            ...form.specialistAssessment,
                            types,
                          },
                        });
                      }}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const inputClass =
  "mt-2 w-full rounded-2xl border border-[color:var(--pv-border)] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200";
const selectClass =
  "mt-2 h-11 w-full rounded-2xl border border-[color:var(--pv-border)] bg-white px-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-200";

function TextInput({
  label,
  value,
  onChange,
  source,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  source?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      {source ? <span className="ml-2 text-xs text-blue-600">{source}</span> : null}
      <input className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  source,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  source?: string;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700 md:col-span-2">
      {label}
      {source ? <span className="ml-2 text-xs text-blue-600">{source}</span> : null}
      <textarea
        className={`${inputClass} min-h-28 resize-y leading-6`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LinkPanel({
  label,
  title,
  href,
}: {
  label: string;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-3xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-blue-700 hover:bg-blue-50"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em]">{label}</p>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <ExternalLink className="h-4 w-4" />
    </Link>
  );
}

function ImpactDomainCard({
  domain,
  locale,
  onChange,
}: {
  domain: AiImpactDomain;
  locale: Locale;
  onChange: (domain: AiImpactDomain) => void;
}) {
  const t = copy[locale];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
            {t.domain}
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{domain.domain}</h3>
        </div>
        <Badge tone={riskTone(domain.residualRiskLevel || "Incomplete")}>
          {t.residual}: {domain.residualScore ?? "-"} / {domain.residualRiskLevel || "-"}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextArea label={t.negativeImpact} value={domain.potentialNegativeImpact} onChange={(value) => onChange({ ...domain, potentialNegativeImpact: value })} />
        <TextArea label={t.affectedGroup} value={domain.affectedPersonGroup} onChange={(value) => onChange({ ...domain, affectedPersonGroup: value })} />
        <ScoreSelect label={t.severity} value={domain.severity} onChange={(value) => onChange({ ...domain, severity: value })} />
        <ScoreSelect label={t.likelihood} value={domain.likelihood} onChange={(value) => onChange({ ...domain, likelihood: value })} />
        <TextArea label={t.controls} value={domain.existingControls} onChange={(value) => onChange({ ...domain, existingControls: value })} />
        <label className="text-sm font-semibold text-slate-700">
          {t.effectiveness}
          <select
            className={selectClass}
            value={domain.controlEffectiveness}
            onChange={(event) => onChange({ ...domain, controlEffectiveness: Number(event.target.value) })}
          >
            {controlEffectivenessOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <TextArea label={t.action} value={domain.furtherAction} onChange={(value) => onChange({ ...domain, furtherAction: value })} />
        <label className="text-sm font-semibold text-slate-700">
          {t.status}
          <select className={selectClass} value={domain.status} onChange={(event) => onChange({ ...domain, status: event.target.value as AiImpactDomain["status"] })}>
            {["Not Started", "In Progress", "Completed", "Accepted"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function ScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <select
        className={selectClass}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
      >
        <option value="">-</option>
        {[1, 2, 3, 4, 5].map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function FriaItemCard({
  item,
  locale,
  onChange,
}: {
  item: AiImpactFriaItem;
  locale: Locale;
  onChange: (item: AiImpactFriaItem) => void;
}) {
  const t = copy[locale];
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
        {item.article}
      </p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-950">{item.question}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextArea label={t.response} value={item.response} onChange={(value) => onChange({ ...item, response: value })} />
        <TextArea label={t.evidence} value={item.evidenceReference} onChange={(value) => onChange({ ...item, evidenceReference: value })} />
        <TextInput label={t.owner} value={item.owner} onChange={(value) => onChange({ ...item, owner: value })} />
        <label className="text-sm font-semibold text-slate-700">
          {t.status}
          <select className={selectClass} value={item.status} onChange={(event) => onChange({ ...item, status: event.target.value as AiImpactFriaItem["status"] })}>
            {["Not Started", "In Progress", "Completed", "N/A"].map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

function riskTone(value: string) {
  if (value === "Critical" || value === "High") {
    return "red" as const;
  }
  if (value === "Medium") {
    return "yellow" as const;
  }
  if (value === "Low") {
    return "green" as const;
  }
  return "slate" as const;
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
