"use client";

import { ChevronDown, Plus, RefreshCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/components/language-provider";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type RiskRegisterDashboardProps = {
  initialEntries: RiskRegisterEntry[];
};

type RiskRegisterEntry = {
  id: string;
  riskId: string;
  riskDescription: string;
  potentialImpact: string;
  existingControl: string;
  riskLevel: "Low" | "Medium" | "High";
  recommendedAction: string;
  riskOwner: string;
  targetDate: string;
  status: "Open" | "In Progress" | "Closed";
  remarks: string;
  sourceAssessmentId: string | null;
  sourceRopaId: string | null;
  departmentId: string | null;
  departmentName: string;
  activityName: string;
  createdAt: string;
  updatedAt: string;
};

type RiskLevelFilter = "all" | "Low" | "Medium" | "High";
type RiskStatusFilter = "all" | "Open" | "In Progress" | "Closed";

type RiskRegisterForm = {
  riskId: string;
  riskDescription: string;
  potentialImpact: string;
  existingControl: string;
  riskLevel: "Low" | "Medium" | "High";
  recommendedAction: string;
  riskOwner: string;
  targetDate: string;
  status: "Open" | "In Progress" | "Closed";
  remarks: string;
  activityName: string;
};

const riskLevelOptions = ["Low", "Medium", "High"] as const;
const statusOptions = ["Open", "In Progress", "Closed"] as const;

export function RiskRegisterDashboard({ initialEntries }: RiskRegisterDashboardProps) {
  const { t } = useI18n();
  const [entries, setEntries] = useState(initialEntries);
  const [isExpanded, setIsExpanded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, RiskRegisterEntry>>({});
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<RiskStatusFilter>("all");
  const [query, setQuery] = useState("");
  const [isSavingMap, setIsSavingMap] = useState<Record<string, boolean>>({});
  const [isDeletingMap, setIsDeletingMap] = useState<Record<string, boolean>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingRow, setIsCreatingRow] = useState(false);
  const [createError, setCreateError] = useState("");
  const [rowErrorMap, setRowErrorMap] = useState<Record<string, string>>({});
  const [newEntry, setNewEntry] = useState<RiskRegisterForm>(() =>
    createInitialForm(initialEntries),
  );

  const filteredEntries = useMemo(() => {
    const queryText = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const levelPass = riskLevelFilter === "all" || entry.riskLevel === riskLevelFilter;
      const statusPass = statusFilter === "all" || entry.status === statusFilter;
      const queryPass = queryText
        ? [
            entry.riskId,
            entry.riskDescription,
            entry.activityName,
            entry.riskOwner,
            entry.departmentName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(queryText)
        : true;

      return levelPass && statusPass && queryPass;
    });
  }, [entries, query, riskLevelFilter, statusFilter]);

  const summary = useMemo(
    () => ({
      total: entries.length,
      high: entries.filter((item) => item.riskLevel === "High").length,
      open: entries.filter((item) => item.status === "Open").length,
      closed: entries.filter((item) => item.status === "Closed").length,
    }),
    [entries],
  );

  function updateDraft(id: string, patch: Partial<RiskRegisterEntry>) {
    setDrafts((current) => {
      const base = current[id] ?? entries.find((item) => item.id === id);
      if (!base) {
        return current;
      }

      return {
        ...current,
        [id]: {
          ...base,
          ...patch,
        },
      };
    });
  }

  async function saveRow(id: string) {
    const payload = drafts[id];
    if (!payload) {
      return;
    }

    setIsSavingMap((current) => ({ ...current, [id]: true }));
    setRowErrorMap((current) => ({ ...current, [id]: "" }));

    const response = await fetch(`/api/risk-register/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        riskId: payload.riskId,
        riskDescription: payload.riskDescription,
        potentialImpact: payload.potentialImpact,
        existingControl: payload.existingControl,
        riskLevel: payload.riskLevel,
        recommendedAction: payload.recommendedAction,
        riskOwner: payload.riskOwner,
        targetDate: payload.targetDate,
        status: payload.status,
        remarks: payload.remarks,
        activityName: payload.activityName,
        departmentId: payload.departmentId ?? undefined,
        sourceAssessmentId: payload.sourceAssessmentId ?? undefined,
        sourceRopaId: payload.sourceRopaId ?? undefined,
      }),
    });

    if (!response.ok) {
      const payloadError = await response.json().catch(() => null);
      setRowErrorMap((current) => ({
        ...current,
        [id]: payloadError?.error ?? t("dashboard.saveChangesFailed"),
      }));
      setIsSavingMap((current) => ({ ...current, [id]: false }));
      return;
    }

    const result = (await response.json()) as { data: RiskRegisterEntry };
    setEntries((current) =>
      current.map((item) => (item.id === id ? result.data : item)),
    );
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setIsSavingMap((current) => ({ ...current, [id]: false }));
  }

  async function deleteRow(id: string) {
    if (!window.confirm(t("dashboard.deleteRiskConfirm"))) {
      return;
    }

    setIsDeletingMap((current) => ({ ...current, [id]: true }));
    const response = await fetch(`/api/risk-register/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payloadError = await response.json().catch(() => null);
      window.alert(payloadError?.error ?? t("dashboard.deleteRiskFailed"));
      setIsDeletingMap((current) => ({ ...current, [id]: false }));
      return;
    }

    setEntries((current) => current.filter((item) => item.id !== id));
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setIsDeletingMap((current) => ({ ...current, [id]: false }));
  }

  async function createEntry() {
    setCreateError("");
    setIsCreating(true);

    const response = await fetch("/api/risk-register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...newEntry,
      }),
    });

    if (!response.ok) {
      const payloadError = await response.json().catch(() => null);
      setCreateError(payloadError?.error ?? t("dashboard.createRiskFailed"));
      setIsCreating(false);
      return;
    }

    const result = (await response.json()) as { data: RiskRegisterEntry };
    setEntries((current) => {
      const next = [result.data, ...current];
      setNewEntry(createInitialForm(next));
      return next;
    });
    setIsCreating(false);
    setIsCreatingRow(false);
  }

  function resetFilters() {
    setRiskLevelFilter("all");
    setStatusFilter("all");
    setQuery("");
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{t("dashboard.riskRegister")}</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            {t("dashboard.riskRegisterDescription")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setIsExpanded((current) => !current)}>
            {isExpanded ? t("dashboard.collapse") : t("dashboard.open")}
            <ChevronDown
              className={cn("h-4 w-4 transition", isExpanded ? "rotate-180" : "")}
            />
          </Button>
          <Button
            onClick={() => {
              setIsExpanded(true);
              setIsCreatingRow((current) => !current);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("dashboard.addRisk")}
          </Button>
        </div>
      </CardHeader>
      {isExpanded ? (
        <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RegisterSummaryCard label={t("dashboard.totalRisk")} value={summary.total} tone="slate" />
          <RegisterSummaryCard label={t("dashboard.highRisk")} value={summary.high} tone="red" />
          <RegisterSummaryCard label={t("dashboard.openStatus")} value={summary.open} tone="yellow" />
          <RegisterSummaryCard label={t("dashboard.closedStatus")} value={summary.closed} tone="green" />
        </div>

        {isCreatingRow ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-950">{t("dashboard.addRiskRegisterItem")}</h3>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <FieldInput
                label="Risk ID"
                value={newEntry.riskId}
                onChange={(value) => setNewEntry((current) => ({ ...current, riskId: value }))}
              />
              <FieldInput
                label="Risk Owner"
                value={newEntry.riskOwner}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, riskOwner: value }))
                }
              />
              <FieldTextarea
                label="Risk Description"
                value={newEntry.riskDescription}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, riskDescription: value }))
                }
              />
              <FieldTextarea
                label="Potential Impact"
                value={newEntry.potentialImpact}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, potentialImpact: value }))
                }
              />
              <FieldTextarea
                label="Existing Control"
                value={newEntry.existingControl}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, existingControl: value }))
                }
              />
              <FieldTextarea
                label="Recommended Action"
                value={newEntry.recommendedAction}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, recommendedAction: value }))
                }
              />
              <FieldSelect
                label="Risk Level"
                value={newEntry.riskLevel}
                options={riskLevelOptions}
                onChange={(value) =>
                  setNewEntry((current) => ({
                    ...current,
                    riskLevel: value as "Low" | "Medium" | "High",
                  }))
                }
              />
              <FieldSelect
                label="Status"
                value={newEntry.status}
                options={statusOptions}
                onChange={(value) =>
                  setNewEntry((current) => ({
                    ...current,
                    status: value as "Open" | "In Progress" | "Closed",
                  }))
                }
              />
              <FieldInput
                label="Target Date"
                type="date"
                value={newEntry.targetDate}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, targetDate: value }))
                }
              />
              <FieldInput
                label={t("dashboard.activityNameOptional")}
                value={newEntry.activityName}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, activityName: value }))
                }
              />
              <FieldTextarea
                label="Remarks"
                value={newEntry.remarks}
                onChange={(value) =>
                  setNewEntry((current) => ({ ...current, remarks: value }))
                }
              />
            </div>
            {createError ? (
              <p className="mt-3 text-sm text-red-600">{createError}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void createEntry()} disabled={isCreating}>
                <Save className="h-4 w-4" />
                {isCreating ? t("dashboard.saving") : t("dashboard.saveRisk")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsCreatingRow(false);
                  setCreateError("");
                  setNewEntry(createInitialForm(entries));
                }}
              >
                {t("dashboard.cancel")}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1.2fr_auto]">
          <FieldSelect
            label={t("dashboard.filterRiskLevel")}
            value={riskLevelFilter}
            options={["all", ...riskLevelOptions]}
            onChange={(value) => setRiskLevelFilter(value as RiskLevelFilter)}
          />
          <FieldSelect
            label={t("dashboard.filterStatus")}
            value={statusFilter}
            options={["all", ...statusOptions]}
            onChange={(value) => setStatusFilter(value as RiskStatusFilter)}
          />
          <FieldInput
            label={t("dashboard.search")}
            value={query}
            onChange={setQuery}
            placeholder={t("dashboard.riskSearchPlaceholder")}
          />
          <div className="flex items-end">
            <Button variant="secondary" className="w-full md:w-auto" onClick={resetFilters}>
              <RefreshCcw className="h-4 w-4" />
              {t("dashboard.reset")}
            </Button>
          </div>
        </div>

        <Table className="min-w-[1380px]">
          <THead>
            <tr>
              <TH>Risk ID</TH>
              <TH>Risk Description</TH>
              <TH>Potential Impact</TH>
              <TH>Existing Control</TH>
              <TH>Risk Level</TH>
              <TH>Recommended Action</TH>
              <TH>Risk Owner</TH>
              <TH>Target Date</TH>
              <TH>Status</TH>
              <TH>{t("dashboard.department")}</TH>
              <TH>Activity</TH>
              <TH>Remarks</TH>
              <TH>{t("dashboard.action")}</TH>
            </tr>
          </THead>
          <TBody>
            {filteredEntries.length ? (
              filteredEntries.map((entry) => {
                const row = drafts[entry.id] ?? entry;
                const dirty = Boolean(drafts[entry.id]);
                const saving = Boolean(isSavingMap[entry.id]);
                const deleting = Boolean(isDeletingMap[entry.id]);
                const error = rowErrorMap[entry.id] ?? "";

                return (
                  <tr key={entry.id}>
                    <TD className="align-top">
                      <input
                        value={row.riskId}
                        onChange={(event) => updateDraft(entry.id, { riskId: event.target.value })}
                        className="h-9 w-28 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineTextarea
                        value={row.riskDescription}
                        onChange={(value) => updateDraft(entry.id, { riskDescription: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineTextarea
                        value={row.potentialImpact}
                        onChange={(value) => updateDraft(entry.id, { potentialImpact: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineTextarea
                        value={row.existingControl}
                        onChange={(value) => updateDraft(entry.id, { existingControl: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineSelect
                        value={row.riskLevel}
                        options={riskLevelOptions}
                        onChange={(value) =>
                          updateDraft(entry.id, {
                            riskLevel: value as "Low" | "Medium" | "High",
                          })
                        }
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineTextarea
                        value={row.recommendedAction}
                        onChange={(value) => updateDraft(entry.id, { recommendedAction: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineInput
                        value={row.riskOwner}
                        onChange={(value) => updateDraft(entry.id, { riskOwner: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineInput
                        type="date"
                        value={row.targetDate}
                        onChange={(value) => updateDraft(entry.id, { targetDate: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineSelect
                        value={row.status}
                        options={statusOptions}
                        onChange={(value) =>
                          updateDraft(entry.id, {
                            status: value as "Open" | "In Progress" | "Closed",
                          })
                        }
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineInput
                        value={row.departmentName}
                        onChange={() => {}}
                        readOnly
                        className="bg-slate-100 text-slate-500"
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineInput
                        value={row.activityName}
                        onChange={(value) => updateDraft(entry.id, { activityName: value })}
                      />
                    </TD>
                    <TD className="align-top">
                      <InlineTextarea
                        value={row.remarks}
                        onChange={(value) => updateDraft(entry.id, { remarks: value })}
                      />
                      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
                    </TD>
                    <TD className="align-top">
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant={dirty ? "default" : "secondary"}
                          disabled={!dirty || saving}
                          onClick={() => void saveRow(entry.id)}
                          className={cn("w-full", !dirty && "opacity-70")}
                        >
                          <Save className="h-4 w-4" />
                          {saving ? t("dashboard.saving") : t("dashboard.save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deleting}
                          onClick={() => void deleteRow(entry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleting ? t("dashboard.deleting") : t("dashboard.delete")}
                        </Button>
                      </div>
                    </TD>
                  </tr>
                );
              })
            ) : (
              <tr>
                <TD colSpan={13} className="py-8 text-center text-slate-500">
                  {t("dashboard.noRiskRegisterItems")}
                </TD>
              </tr>
            )}
          </TBody>
        </Table>
        </CardContent>
      ) : null}
    </Card>
  );
}

function RegisterSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "red" | "yellow" | "green";
}) {
  const style =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "yellow"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-lg border p-4 ${style}`}>
      <div className="text-[11px] font-bold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "text";
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
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
  options: readonly string[];
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
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function InlineInput({
  value,
  onChange,
  type = "text",
  readOnly = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "text";
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-9 w-full min-w-[150px] rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
        className,
      )}
    />
  );
}

function InlineSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 min-w-[132px] rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function InlineTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={3}
      className="w-full min-w-[180px] resize-y rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs leading-5 text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
    />
  );
}

function createInitialForm(entries: RiskRegisterEntry[]): RiskRegisterForm {
  return {
    riskId: buildNextRiskId(entries),
    riskDescription: "",
    potentialImpact: "",
    existingControl: "",
    riskLevel: "Medium",
    recommendedAction: "",
    riskOwner: "",
    targetDate: "",
    status: "Open",
    remarks: "",
    activityName: "",
  };
}

function buildNextRiskId(entries: RiskRegisterEntry[]) {
  const max = entries.reduce((currentMax, entry) => {
    const match = entry.riskId.match(/(\d+)$/);
    if (!match) {
      return currentMax;
    }

    const numeric = Number.parseInt(match[1], 10);
    if (!Number.isFinite(numeric)) {
      return currentMax;
    }

    return Math.max(currentMax, numeric);
  }, 0);

  return `RR-${String(max + 1).padStart(3, "0")}`;
}
