"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, Search, ShieldCheck, X } from "lucide-react";
import { CountryDetailPanel } from "@/components/privacy-map/CountryDetailPanel";
import { InteractiveMap } from "@/components/privacy-map/InteractiveMap";
import { RegulatoryUpdateFeed } from "@/components/privacy-map/RegulatoryUpdateFeed";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/form";
import type {
  EffectiveStatus,
  Jurisdiction,
  PracticalHighlight,
  PrivacyMapDataset,
  RiskLevel,
  SourceConfidence,
} from "@/lib/privacy-map/types";
import {
  createPrivacyMapIndexes,
  emptyPrivacyMapFilters,
  filterPrivacyMapData,
  findSearchCountry,
  getPdpCoverageLabel,
} from "@/lib/privacy-map/utils";

type PrivacyRegulatoryMapProps = {
  dataset: PrivacyMapDataset;
  viewerRole: "MasterAdmin" | "DPO" | "User";
};

type PrivacyMapOverrideRecord = {
  jurisdictionId: string;
  patch: Partial<Jurisdiction>;
  updatedAt: string;
  updatedBy: string | null;
};

type PrivacyMapEditDraft = {
  mainLaw: string;
  mainLawUrl: string;
  regulator: string;
  regulatoryStatus: string;
  pdpCategory: "Khusus" | "Parsial" | "Tidak ada" | "Unknown";
  effectiveStatus: EffectiveStatus;
  riskLevel: RiskLevel;
  sourceConfidence: SourceConfidence;
  lastChecked: string;
  practicalAction: string;
  practicalHighlights: PracticalHighlight[];
};

export function PrivacyRegulatoryMap({
  dataset,
  viewerRole,
}: PrivacyRegulatoryMapProps) {
  const [filters, setFilters] = useState(emptyPrivacyMapFilters);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryId, setSelectedCountryId] = useState(
    dataset.jurisdictions[0]?.id ?? "",
  );
  const [selectedMapCountry, setSelectedMapCountry] = useState<Jurisdiction | null>(null);
  const [overrides, setOverrides] = useState<PrivacyMapOverrideRecord[]>([]);
  const [editingCountry, setEditingCountry] = useState<Jurisdiction | null>(null);
  const [editDraft, setEditDraft] = useState<PrivacyMapEditDraft | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOverrides() {
      const response = await fetch("/api/privacy-map/overrides", {
        cache: "no-store",
      }).catch(() => null);

      if (!response?.ok) return;

      const payload = (await response.json().catch(() => null)) as {
        data?: PrivacyMapOverrideRecord[];
      } | null;

      if (!cancelled) {
        setOverrides(payload?.data ?? []);
      }
    }

    void loadOverrides();

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveDataset = useMemo(
    () => applyPrivacyMapOverrides(dataset, overrides),
    [dataset, overrides],
  );
  const indexes = useMemo(
    () => createPrivacyMapIndexes(effectiveDataset),
    [effectiveDataset],
  );
  const filtered = useMemo(
    () => filterPrivacyMapData(effectiveDataset, filters, searchQuery),
    [effectiveDataset, filters, searchQuery],
  );
  const selectedCountry =
    selectedMapCountry ??
    indexes.jurisdictionById.get(selectedCountryId) ??
    filtered.jurisdictions[0] ??
    effectiveDataset.jurisdictions[0];

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    const matchedCountry = findSearchCountry(effectiveDataset.jurisdictions, value);
    if (matchedCountry) {
      setSelectedCountryId(matchedCountry.id);
      setSelectedMapCountry(null);
      setFilters((current) => ({ ...current, country: matchedCountry.id, region: "" }));
    }
  }

  function openEditor(jurisdiction: Jurisdiction) {
    setEditingCountry(jurisdiction);
    setEditDraft(createEditDraft(jurisdiction));
    setEditStatus("");
  }

  async function saveEdit() {
    if (!editingCountry || !editDraft) return;

    setIsSavingEdit(true);
    setEditStatus("");

    const mainLawUrl = editDraft.mainLawUrl.trim();
    if (mainLawUrl && !isAllowedMainLawUrl(mainLawUrl)) {
      setEditStatus("Main law link must be a valid http(s) URL and cannot use a restricted source domain.");
      setIsSavingEdit(false);
      return;
    }

    const patch: Partial<Jurisdiction> = {
      mainLaw: editDraft.mainLaw,
      sourceUrls: {
        primary: mainLawUrl,
      },
      regulator: editDraft.regulator,
      regulatoryStatus: editDraft.regulatoryStatus,
      pdpCategory: editDraft.pdpCategory,
      effectiveStatus: editDraft.effectiveStatus,
      riskLevel: editDraft.riskLevel,
      sourceConfidence: editDraft.sourceConfidence,
      lastChecked: editDraft.lastChecked,
      practicalAction: editDraft.practicalAction,
      practicalHighlights: editDraft.practicalHighlights,
    };

    const response = await fetch("/api/privacy-map/overrides", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jurisdictionId: editingCountry.id,
        patch,
      }),
    }).catch(() => null);

    if (!response?.ok) {
      setEditStatus("Failed to save changes. Please make sure the account is a Master Admin.");
      setIsSavingEdit(false);
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      data?: PrivacyMapOverrideRecord;
    } | null;

    if (payload?.data) {
      const savedOverride = payload.data;
      setOverrides((current) => [
        ...current.filter((item) => item.jurisdictionId !== savedOverride.jurisdictionId),
        savedOverride,
      ]);
      setSelectedCountryId(editingCountry.id);
      setSelectedMapCountry(null);
      setEditingCountry(null);
      setEditDraft(null);
    } else {
      setEditStatus("Changes were saved, but the server response was empty.");
    }

    setIsSavingEdit(false);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              Regulatory Intelligence
            </div>
            <h1 className="text-4xl font-bold tracking-normal text-slate-950">
              Global Privacy Regulatory Map
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Interactive view of privacy law status, regulatory changes, and
              practical compliance highlights across global jurisdictions.
            </p>
          </div>

          <div className="w-full max-w-md space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search country, variable, law, regulator..."
                className="pl-9"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_0.9fr]">
        <InteractiveMap
          jurisdictions={effectiveDataset.jurisdictions}
          selectedCountryId={selectedCountry?.id ?? ""}
          onSelectCountry={(jurisdiction) => {
            setSelectedCountryId(jurisdiction.id);
            setSelectedMapCountry(
              indexes.jurisdictionById.has(jurisdiction.id) ? null : jurisdiction,
            );
            setFilters((current) => ({
              ...current,
              country: indexes.jurisdictionById.has(jurisdiction.id)
                ? jurisdiction.id
                : "",
              region: "",
            }));
          }}
        />
        {selectedCountry ? (
          <CountryDetailPanel
            jurisdiction={selectedCountry}
            mappings={effectiveDataset.mappings}
            canEdit={viewerRole === "MasterAdmin"}
            onEdit={openEditor}
          />
        ) : null}
      </div>

      <div>
        <RegulatoryUpdateFeed
          changes={filtered.regulatoryChanges}
          jurisdictions={effectiveDataset.jurisdictions}
        />
      </div>

      {editingCountry && editDraft ? (
        <PrivacyMapEditModal
          country={editingCountry}
          draft={editDraft}
          status={editStatus}
          saving={isSavingEdit}
          onChange={setEditDraft}
          onClose={() => {
            setEditingCountry(null);
            setEditDraft(null);
            setEditStatus("");
          }}
          onSave={() => void saveEdit()}
        />
      ) : null}
    </div>
  );
}

function applyPrivacyMapOverrides(
  dataset: PrivacyMapDataset,
  overrides: PrivacyMapOverrideRecord[],
): PrivacyMapDataset {
  if (!overrides.length) return dataset;

  const overrideById = new Map(
    overrides.map((override) => [override.jurisdictionId, override.patch]),
  );
  const jurisdictions = dataset.jurisdictions.map((jurisdiction) => {
    const patch = overrideById.get(jurisdiction.id);
    if (!patch) return jurisdiction;

    return {
      ...jurisdiction,
      ...patch,
      sourceUrls: {
        ...jurisdiction.sourceUrls,
        ...(patch.sourceUrls ?? {}),
      },
      practicalHighlights:
        patch.practicalHighlights ?? jurisdiction.practicalHighlights,
    } as Jurisdiction;
  });
  const jurisdictionById = new Map(jurisdictions.map((item) => [item.id, item]));
  const variableByLabel = new Map([
    ["Data Subject Rights", "data-subject-rights"],
    ["DSR Response Deadline", "dsr-response-deadline"],
    ["Breach Notification Deadline", "breach-notification-deadline"],
    ["Cross-Border Transfer", "cross-border-transfer"],
    ["DPO Requirement", "dpo-requirement"],
  ]);
  const highlightByJurisdictionAndVariable = new Map<string, PracticalHighlight>();

  for (const jurisdiction of jurisdictions) {
    for (const highlight of jurisdiction.practicalHighlights ?? []) {
      const variableId = variableByLabel.get(highlight.label);
      if (variableId) {
        highlightByJurisdictionAndVariable.set(
          `${jurisdiction.id}:${variableId}`,
          highlight,
        );
      }
    }
  }

  const mappings = dataset.mappings.map((mapping) => {
    const jurisdiction = jurisdictionById.get(mapping.jurisdictionId);
    const highlight = highlightByJurisdictionAndVariable.get(
      `${mapping.jurisdictionId}:${mapping.variableId}`,
    );
    const patch = overrideById.get(mapping.jurisdictionId);
    if (!jurisdiction || (!highlight && !patch)) return mapping;

    return {
      ...mapping,
      requirementSummary: highlight?.value ?? mapping.requirementSummary,
      legalBasis: jurisdiction.mainLaw,
      sourceUrl:
        mapping.variableId === "breach-notification-deadline"
          ? jurisdiction.sourceUrls?.breach ?? mapping.sourceUrl
          : jurisdiction.sourceUrls?.primary ?? mapping.sourceUrl,
      effectiveStatus: jurisdiction.effectiveStatus,
      riskLevel: jurisdiction.riskLevel,
      lastChecked: jurisdiction.lastChecked,
    };
  });

  return {
    ...dataset,
    jurisdictions,
    mappings,
  };
}

function createEditDraft(jurisdiction: Jurisdiction): PrivacyMapEditDraft {
  const highlights = normalizeHighlights(jurisdiction.practicalHighlights);

  return {
    mainLaw: jurisdiction.mainLaw,
    mainLawUrl: jurisdiction.sourceUrls?.primary ?? "",
    regulator: jurisdiction.regulator,
    regulatoryStatus: jurisdiction.regulatoryStatus ?? "",
    pdpCategory: normalizePdpCategory(jurisdiction.pdpCategory),
    effectiveStatus: jurisdiction.effectiveStatus,
    riskLevel: jurisdiction.riskLevel,
    sourceConfidence: jurisdiction.sourceConfidence,
    lastChecked: jurisdiction.lastChecked,
    practicalAction: jurisdiction.practicalAction ?? "",
    practicalHighlights: highlights,
  };
}

function isAllowedMainLawUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return !/dla\s*piper|dlapiperdataprotection/i.test(url);
  } catch {
    return false;
  }
}

function normalizeHighlights(highlights: PracticalHighlight[] = []) {
  const defaults: PracticalHighlight[] = [
    { label: "Data Subject Rights", value: "", tone: "blue" },
    { label: "DSR Response Deadline", value: "", tone: "teal" },
    { label: "Breach Notification Deadline", value: "", tone: "red" },
    { label: "Cross-Border Transfer", value: "", tone: "orange" },
    { label: "DPO Requirement", value: "", tone: "purple" },
  ];
  const byLabel = new Map(highlights.map((item) => [item.label, item]));

  return defaults.map((item) => ({
    ...item,
    value: byLabel.get(item.label)?.value ?? item.value,
  }));
}

function normalizePdpCategory(value: unknown): PrivacyMapEditDraft["pdpCategory"] {
  if (value === "Khusus" || value === "Parsial" || value === "Tidak ada") {
    return value;
  }
  return "Unknown";
}

const pdpCoverageOptions: Array<{
  value: PrivacyMapEditDraft["pdpCategory"];
  label: string;
}> = [
  { value: "Khusus", label: getPdpCoverageLabel("Khusus") },
  { value: "Parsial", label: getPdpCoverageLabel("Parsial") },
  { value: "Tidak ada", label: getPdpCoverageLabel("Tidak ada") },
  { value: "Unknown", label: getPdpCoverageLabel("Unknown") },
];

function PrivacyMapEditModal({
  country,
  draft,
  status,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  country: Jurisdiction;
  draft: PrivacyMapEditDraft;
  status: string;
  saving: boolean;
  onChange: (draft: PrivacyMapEditDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  function update<K extends keyof PrivacyMapEditDraft>(
    key: K,
    value: PrivacyMapEditDraft[K],
  ) {
    onChange({ ...draft, [key]: value });
  }

  function updateHighlight(index: number, value: string) {
    onChange({
      ...draft,
      practicalHighlights: draft.practicalHighlights.map((item, itemIndex) =>
        itemIndex === index ? { ...item, value } : item,
      ),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
              Master Admin Edit
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              {country.country}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Changes are saved as an override without changing the source workbook.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close edit modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Main law or instrument</Label>
            <Textarea
              value={draft.mainLaw}
              onChange={(event) => update("mainLaw", event.target.value)}
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Main law link</Label>
            <Input
              value={draft.mainLawUrl}
              onChange={(event) => update("mainLawUrl", event.target.value)}
              placeholder="https://..."
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Optional. This link is shown on the Main Law card when it uses a
              permitted http(s) source.
            </p>
          </div>
          <div>
            <Label>Regulator / authority</Label>
            <Input
              value={draft.regulator}
              onChange={(event) => update("regulator", event.target.value)}
            />
          </div>
          <div>
            <Label>Regulatory status</Label>
            <Input
              value={draft.regulatoryStatus}
              onChange={(event) => update("regulatoryStatus", event.target.value)}
            />
          </div>
          <div>
            <Label>Privacy law coverage</Label>
            <Select
              value={draft.pdpCategory}
              onChange={(event) =>
                update("pdpCategory", event.target.value as PrivacyMapEditDraft["pdpCategory"])
              }
            >
              {pdpCoverageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Effective status</Label>
            <Select
              value={draft.effectiveStatus}
              onChange={(event) =>
                update("effectiveStatus", event.target.value as EffectiveStatus)
              }
            >
              {["In Force", "Partially In Force", "Pending", "Under Reform", "Repealed", "Guideline Only"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Risk level</Label>
            <Select
              value={draft.riskLevel}
              onChange={(event) => update("riskLevel", event.target.value as RiskLevel)}
            >
              {["Critical", "High", "Medium", "Low", "Stable"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Source confidence</Label>
            <Select
              value={draft.sourceConfidence}
              onChange={(event) =>
                update("sourceConfidence", event.target.value as SourceConfidence)
              }
            >
              {["High", "Medium", "Low"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Last checked</Label>
            <Input
              value={draft.lastChecked}
              onChange={(event) => update("lastChecked", event.target.value)}
              placeholder="2026-06-09"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Practical action</Label>
            <Textarea
              value={draft.practicalAction}
              onChange={(event) => update("practicalAction", event.target.value)}
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <h3 className="mb-3 text-sm font-bold text-slate-950">
              Practical Highlights
            </h3>
            <div className="grid gap-3">
              {draft.practicalHighlights.map((highlight, index) => (
                <div key={highlight.label}>
                  <Label>{highlight.label}</Label>
                  <Textarea
                    value={highlight.value}
                    onChange={(event) => updateHighlight(index, event.target.value)}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            {status || "Only Master Admin can save changes."}
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
