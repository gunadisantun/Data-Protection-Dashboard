"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, Mail, Save, Send, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckboxRow,
  defaultFieldHelp,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/form";
import {
  breachReportSections,
  emptyBreachReportAnswers,
  type BreachReportStatus,
} from "@/lib/breach-report-fields";
import {
  breachReportProfileFieldIds,
  type BreachReportProfileAnswers,
} from "@/lib/breach-report-profile";

type Department = {
  id: string;
  name: string;
};

type BreachReportFormProps = {
  report: {
    id: string;
    reportNumber: string;
    title: string;
    departmentId: string | null;
    status: BreachReportStatus;
    answers: Record<string, string | string[]>;
  };
  departments: Department[];
  viewerRole: "MasterAdmin" | "DPO" | "User";
  lockDepartment: boolean;
  profileDefaults: BreachReportProfileAnswers;
};

export function BreachReportForm({
  report,
  departments,
  viewerRole,
  lockDepartment,
  profileDefaults,
}: BreachReportFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(report.title);
  const [departmentId, setDepartmentId] = useState(report.departmentId ?? "");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    ...emptyBreachReportAnswers(),
    ...report.answers,
  });
  const [status, setStatus] = useState<BreachReportStatus>(report.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [activeSection, setActiveSection] = useState(breachReportSections[0]?.id ?? "");
  const isDpo = viewerRole === "DPO";
  const readOnly = status === "Finalized";

  const activeSectionData = useMemo(
    () => breachReportSections.find((section) => section.id === activeSection),
    [activeSection],
  );

  function updateAnswer(fieldId: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  function toggleAnswer(fieldId: string, option: string) {
    const current = answers[fieldId];
    const values = Array.isArray(current) ? current : [];
    updateAnswer(
      fieldId,
      values.includes(option)
        ? values.filter((item) => item !== option)
        : [...values, option],
    );
  }

  async function save(nextStatus = status) {
    setSaveState("saving");
    const response = await fetch(`/api/breach-reports/${report.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        departmentId,
        answers: {
          ...answers,
          ...profileDefaults,
          systemName: profileDefaults.systemName || title,
        },
        status: nextStatus,
      }),
    });

    if (!response.ok) {
      setSaveState("error");
      return false;
    }

    setStatus(nextStatus);
    setSaveState("idle");
    router.refresh();
    return true;
  }

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">
              Laporan Kegagalan PDP
            </h1>
            <Badge tone={status === "Finalized" ? "green" : status === "Submitted" ? "blue" : "yellow"}>
              {status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {report.reportNumber} - Formulir laporan dugaan kebocoran data pribadi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/breach-reports">
            <Button variant="secondary">Kembali</Button>
          </Link>
          <Link href={`/api/breach-reports/${report.id}/export`}>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              {status === "Finalized" ? "Download PDF Final" : "Preview PDF"}
            </Button>
          </Link>
          <Button onClick={() => void save()} disabled={saveState === "saving" || readOnly}>
            {saveState === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan
          </Button>
          {status === "Draft" && !isDpo ? (
            <Button
              variant="warning"
              onClick={() => void save("Submitted")}
              disabled={saveState === "saving"}
            >
              <Send className="h-4 w-4" />
              Submit ke DPO
            </Button>
          ) : null}
          {isDpo && status !== "Finalized" ? (
            <Button
              variant="dark"
              onClick={() => void save("Finalized")}
              disabled={saveState === "saving"}
            >
              <ShieldCheck className="h-4 w-4" />
              Finalisasi Setelah Reviu
            </Button>
          ) : null}
        </div>
      </div>

      {isDpo && status !== "Finalized" ? (
        <div className="border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <span className="font-bold">Mode reviu DPO.</span> Silakan cek dan sesuaikan
          isi laporan sebelum finalisasi. Setelah difinalisasi, laporan dikunci dan PDF
          final dapat diunduh untuk dikirim ke Komdigi.
        </div>
      ) : null}

      {status === "Finalized" ? (
        <div className="border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">Laporan sudah final.</p>
              <p>
                Download PDF final, lalu kirimkan formulir melalui email{" "}
                <a
                  href="mailto:pengawasanpdp@komdigi.go.id"
                  className="font-bold text-emerald-700 underline"
                >
                  pengawasanpdp@komdigi.go.id
                </a>
                .
              </p>
            </div>
            <Link href={`/api/breach-reports/${report.id}/export`}>
              <Button>
                <Mail className="h-4 w-4" />
                Download PDF Final
              </Button>
            </Link>
          </div>
        </div>
      ) : null}

      {saveState === "error" ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Gagal menyimpan. Pastikan field wajib sudah terisi sebelum submit/finalisasi.
        </div>
      ) : null}

      <Card>
        <CardContent className="grid gap-5 p-6 md:grid-cols-2">
          <div>
            <Label help="Isi judul singkat yang menggambarkan insiden, misalnya jenis sistem atau data yang terdampak.">
              Judul laporan
            </Label>
            <Input
              value={title}
              disabled={readOnly}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Contoh: Dugaan kebocoran data pelanggan CRM"
            />
          </div>
          <div>
            <Label help="Pilih unit yang bertanggung jawab atau paling terkait dengan insiden kegagalan PDP.">
              Departemen / unit
            </Label>
            {lockDepartment ? (
              <Input
                value={
                  departments.find((department) => department.id === departmentId)?.name ??
                  departmentId
                }
                disabled
              />
            ) : (
              <Select
                value={departmentId}
                disabled={readOnly}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">Pilih departemen</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bagian Formulir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {breachReportSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeSection === section.id
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{activeSectionData?.title}</CardTitle>
            {activeSectionData?.description ? (
              <p className="text-sm text-slate-500">{activeSectionData.description}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-5">
            {activeSectionData?.fields.map((field) => {
              const isProfileField = breachReportProfileFieldIds.includes(
                field.id as (typeof breachReportProfileFieldIds)[number],
              );
              const value = isProfileField
                ? profileDefaults[field.id as keyof BreachReportProfileAnswers]
                : answers[field.id];

              return (
                <div key={field.id} className="space-y-2">
                  <Label help={defaultFieldHelp(field.label)}>
                    {field.label}
                    {field.required ? (
                      <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        Wajib
                      </span>
                    ) : null}
                    {isProfileField ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        Otomatis
                      </span>
                    ) : null}
                  </Label>
                  {field.help ? (
                    <p className="text-xs leading-5 text-slate-500">{field.help}</p>
                  ) : null}

                  {field.type === "textarea" ? (
                    <Textarea
                      value={String(value ?? "")}
                      disabled={readOnly || isProfileField}
                      onChange={(event) => updateAnswer(field.id, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "radio" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {field.options?.map((option) => (
                        <CheckboxRow key={option}>
                          <input
                            type="radio"
                            name={field.id}
                            className="mt-1"
                            disabled={readOnly || isProfileField}
                            checked={value === option}
                            onChange={() => updateAnswer(field.id, option)}
                          />
                          <span className="text-sm font-semibold">{option}</span>
                        </CheckboxRow>
                      ))}
                    </div>
                  ) : field.type === "checkbox" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {field.options?.map((option) => (
                        <CheckboxRow key={option}>
                          <input
                            type="checkbox"
                            className="mt-1"
                            disabled={readOnly || isProfileField}
                            checked={Array.isArray(value) && value.includes(option)}
                            onChange={() => toggleAnswer(field.id, option)}
                          />
                          <span className="text-sm font-semibold">{option}</span>
                        </CheckboxRow>
                      ))}
                    </div>
                  ) : (
                    <Input
                      type={field.type === "date" ? "date" : "text"}
                      value={String(value ?? "")}
                      disabled={readOnly || isProfileField}
                      onChange={(event) => updateAnswer(field.id, event.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
