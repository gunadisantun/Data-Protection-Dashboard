import type {
  CountryVariableMapping,
  EffectiveStatus,
  Jurisdiction,
  LegalVariable,
  PdpCoverageStatus,
  PrivacyMapDataset,
  PrivacyMapFilters,
  RegulatoryChange,
  RequirementLevel,
  RiskLevel,
} from "@/lib/privacy-map/types";

export const riskColorClass: Record<RiskLevel, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-teal-100 text-teal-700 border-teal-200",
  Stable: "bg-blue-100 text-blue-700 border-blue-200",
};

export const riskMapFill: Record<RiskLevel, string> = {
  Critical: "#DC2626",
  High: "#F97316",
  Medium: "#F59E0B",
  Low: "#14B8A6",
  Stable: "#2563EB",
};

export const pdpCoverageColorClass: Record<PdpCoverageStatus, string> = {
  Khusus: "bg-blue-100 text-blue-700 border-blue-200",
  Parsial: "bg-amber-100 text-amber-700 border-amber-200",
  "Tidak ada": "bg-slate-100 text-slate-600 border-slate-200",
  Unknown: "bg-slate-50 text-slate-500 border-slate-100",
};

export const pdpCoverageMapFill: Record<PdpCoverageStatus, string> = {
  Khusus: "#2563EB",
  Parsial: "#F59E0B",
  "Tidak ada": "#CBD5E1",
  Unknown: "#E5E7EB",
};

export const pdpCoverageLegendItems = [
  {
    label: "Comprehensive privacy law",
    status: "Khusus",
    color: pdpCoverageMapFill.Khusus,
  },
  {
    label: "Partial or sectoral rules",
    status: "Parsial",
    color: pdpCoverageMapFill.Parsial,
  },
  {
    label: "No dedicated privacy law",
    status: "Tidak ada",
    color: pdpCoverageMapFill["Tidak ada"],
  },
  {
    label: "Not covered",
    status: "Unknown",
    color: pdpCoverageMapFill.Unknown,
  },
] as const;

export const requirementColorClass: Record<RequirementLevel, string> = {
  Mandatory: "bg-red-100 text-red-700 border-red-200",
  "Partially Mandatory": "bg-orange-100 text-orange-700 border-orange-200",
  "Guideline-Based": "bg-blue-100 text-blue-700 border-blue-200",
  "Not Explicit": "bg-slate-100 text-slate-600 border-slate-200",
  "Not Applicable": "bg-slate-50 text-slate-400 border-slate-100",
  "Under Reform": "bg-purple-100 text-purple-700 border-purple-200",
};

export const requirementHeatmapClass: Record<RequirementLevel, string> = {
  Mandatory: "bg-red-500 text-white hover:bg-red-600",
  "Partially Mandatory": "bg-orange-400 text-white hover:bg-orange-500",
  "Guideline-Based": "bg-blue-400 text-white hover:bg-blue-500",
  "Not Explicit": "bg-slate-300 text-slate-800 hover:bg-slate-400",
  "Not Applicable": "bg-slate-100 text-slate-500 hover:bg-slate-200",
  "Under Reform": "bg-purple-500 text-white hover:bg-purple-600",
};

export function getPdpCoverageStatus(jurisdiction?: Pick<Jurisdiction, "pdpCategory"> | null): PdpCoverageStatus {
  const normalized = String(jurisdiction?.pdpCategory ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "khusus") return "Khusus";
  if (normalized === "parsial" || normalized === "partial") return "Parsial";
  if (
    normalized === "tidak ada" ||
    normalized === "no" ||
    normalized === "none" ||
    normalized === "belum ada"
  ) {
    return "Tidak ada";
  }

  return "Unknown";
}

export function getPdpCoverageLabel(status: PdpCoverageStatus) {
  if (status === "Khusus") return "Comprehensive privacy law";
  if (status === "Parsial") return "Partial or sectoral rules";
  if (status === "Tidak ada") return "No dedicated privacy law";
  return "Not covered";
}

export const effectiveStatusOptions: EffectiveStatus[] = [
  "In Force",
  "Partially In Force",
  "Pending",
  "Under Reform",
  "Repealed",
  "Guideline Only",
];

export const riskLevelOptions: RiskLevel[] = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Stable",
];

export const requirementLevelOptions: RequirementLevel[] = [
  "Mandatory",
  "Partially Mandatory",
  "Guideline-Based",
  "Not Explicit",
  "Not Applicable",
  "Under Reform",
];

export const emptyPrivacyMapFilters: PrivacyMapFilters = {
  country: "",
  region: "",
  riskLevel: "all",
  requirementLevel: "all",
  effectiveStatus: "all",
  variableCategory: "all",
};

export function createPrivacyMapIndexes(dataset: PrivacyMapDataset) {
  return {
    jurisdictionById: new Map(dataset.jurisdictions.map((item) => [item.id, item])),
    jurisdictionByIso3: new Map(dataset.jurisdictions.map((item) => [item.iso3, item])),
    variableById: new Map(dataset.legalVariables.map((item) => [item.id, item])),
  };
}

export function filterPrivacyMapData(
  dataset: PrivacyMapDataset,
  filters: PrivacyMapFilters,
  searchQuery: string,
) {
  const query = normalizeText(searchQuery);
  const { jurisdictionById, variableById } = createPrivacyMapIndexes(dataset);

  const matchedMappings = dataset.mappings.filter((mapping) => {
    const jurisdiction = jurisdictionById.get(mapping.jurisdictionId);
    const variable = variableById.get(mapping.variableId);

    if (!jurisdiction || !variable) return false;
    if (filters.country && filters.country !== "all" && jurisdiction.id !== filters.country) return false;
    if (filters.region && filters.region !== "all" && jurisdiction.region !== filters.region) return false;
    if (filters.riskLevel !== "all" && mapping.riskLevel !== filters.riskLevel) return false;
    if (
      filters.requirementLevel !== "all" &&
      mapping.requirementLevel !== filters.requirementLevel
    ) {
      return false;
    }
    if (
      filters.effectiveStatus !== "all" &&
      mapping.effectiveStatus !== filters.effectiveStatus
    ) {
      return false;
    }
    if (
      filters.variableCategory !== "all" &&
      variable.category !== filters.variableCategory
    ) {
      return false;
    }

    if (!query) return true;

    const searchable = [
      jurisdiction.country,
      jurisdiction.mainLaw,
      jurisdiction.regulator,
      jurisdiction.latestUpdate,
      variable.name,
      variable.category,
      mapping.legalBasis,
      mapping.requirementSummary,
      mapping.articleSection,
      mapping.reviewerNote,
    ];

    return searchable.some((value) => normalizeText(value).includes(query));
  });

  const matchedJurisdictionIds = new Set(
    matchedMappings.map((mapping) => mapping.jurisdictionId),
  );
  const matchedVariableIds = new Set(matchedMappings.map((mapping) => mapping.variableId));
  const matchedJurisdictions = dataset.jurisdictions.filter((jurisdiction) => {
    if (filters.country && filters.country !== "all" && jurisdiction.id !== filters.country) return false;
    if (filters.region && filters.region !== "all" && jurisdiction.region !== filters.region) return false;
    if (filters.riskLevel !== "all" && jurisdiction.riskLevel !== filters.riskLevel) {
      return matchedJurisdictionIds.has(jurisdiction.id);
    }
    if (!query) return matchedJurisdictionIds.has(jurisdiction.id);
    return (
      matchedJurisdictionIds.has(jurisdiction.id) ||
      [jurisdiction.country, jurisdiction.mainLaw, jurisdiction.regulator].some((value) =>
        normalizeText(value).includes(query),
      )
    );
  });
  const matchedChanges = dataset.regulatoryChanges.filter((change) => {
    const jurisdiction = resolveChangeJurisdiction(dataset.jurisdictions, change);
    if (!jurisdiction) return false;
    if (!matchedJurisdictionIds.has(jurisdiction.id)) return false;
    if (filters.effectiveStatus !== "all" && change.implementationStatus !== filters.effectiveStatus) {
      return false;
    }
    if (filters.riskLevel !== "all" && change.impactLevel !== filters.riskLevel) {
      return false;
    }
    if (
      filters.requirementLevel !== "all" &&
      change.requirementType !== filters.requirementLevel
    ) {
      return false;
    }
    if (
      filters.variableCategory !== "all" &&
      change.category !== filters.variableCategory
    ) {
      return false;
    }
    if (!query) return true;
    return [
      jurisdiction.country,
      jurisdiction.mainLaw,
      jurisdiction.regulator,
      change.title,
      change.summary,
      change.changeType,
      change.category,
      change.requirementType,
      change.keyChange,
      change.businessImpact,
      change.sourceName,
    ].some((value) => normalizeText(value).includes(query));
  });

  return {
    jurisdictions: matchedJurisdictions,
    mappings: matchedMappings,
    variables: dataset.legalVariables.filter((variable) =>
      matchedVariableIds.has(variable.id),
    ),
    regulatoryChanges: matchedChanges,
  };
}

export function findSearchCountry(
  jurisdictions: Jurisdiction[],
  searchQuery: string,
) {
  const query = normalizeText(searchQuery);
  if (!query) return null;

  return (
    jurisdictions.find((jurisdiction) =>
      normalizeText(jurisdiction.country).includes(query),
    ) ?? null
  );
}

export function getTopMandatoryObligations(
  jurisdiction: Jurisdiction,
  mappings: CountryVariableMapping[],
  variables: LegalVariable[],
) {
  const variableById = new Map(variables.map((variable) => [variable.id, variable]));

  return mappings
    .filter((mapping) => mapping.jurisdictionId === jurisdiction.id)
    .map((mapping) => ({
      mapping,
      variable: variableById.get(mapping.variableId),
    }))
    .filter((item): item is { mapping: CountryVariableMapping; variable: LegalVariable } =>
      Boolean(item.variable),
    )
    .sort((a, b) => {
      const requirementRank =
        requirementPriority(b.mapping.requirementLevel) -
        requirementPriority(a.mapping.requirementLevel);
      if (requirementRank !== 0) return requirementRank;
      return a.variable.priority - b.variable.priority;
    })
    .slice(0, 5);
}

export function recommendedActionsForJurisdiction(
  jurisdiction: Jurisdiction,
  mappings: CountryVariableMapping[],
  variables: LegalVariable[],
) {
  const top = getTopMandatoryObligations(jurisdiction, mappings, variables)
    .map((item) => item.variable.name);
  const actions = new Set<string>();

  actions.add("Update privacy notice against local transparency requirements");
  actions.add("Review RoPA coverage for processing activities in this jurisdiction");

  if (top.includes("DPIA")) actions.add("Review DPIA template and high-risk screening");
  if (top.includes("Cross-Border Transfer")) {
    actions.add("Review cross-border transfer mechanism and safeguards");
  }
  if (top.includes("Processor Agreement")) {
    actions.add("Update vendor and processor clauses");
  }
  if (top.includes("Breach Notification")) {
    actions.add("Validate breach notification timeline and escalation playbook");
  }

  if (jurisdiction.effectiveStatus === "Under Reform" || jurisdiction.effectiveStatus === "Pending") {
    actions.add("Monitor implementation date and prepare reform impact memo");
  }

  return [...actions].slice(0, 6);
}

export function getCategoryOptions(variables: LegalVariable[]) {
  return [...new Set(variables.map((variable) => variable.category))].sort();
}

export function getMappingDetail(
  dataset: PrivacyMapDataset,
  mapping: CountryVariableMapping,
) {
  const { jurisdictionById, variableById } = createPrivacyMapIndexes(dataset);
  const jurisdiction = jurisdictionById.get(mapping.jurisdictionId);
  const variable = variableById.get(mapping.variableId);

  if (!jurisdiction || !variable) return null;
  return { jurisdiction, variable, mapping };
}

export function sortChanges(
  changes: RegulatoryChange[],
  jurisdictionById: Map<string, Jurisdiction>,
) {
  return [...changes].sort((a, b) => {
    const aDate = a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0;
    const bDate = b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0;
    if (bDate !== aDate) return bDate - aDate;
    return (resolveChangeJurisdiction([...jurisdictionById.values()], a)?.country ?? "").localeCompare(
      resolveChangeJurisdiction([...jurisdictionById.values()], b)?.country ?? "",
    );
  });
}

export function resolveChangeJurisdiction(
  jurisdictions: Jurisdiction[],
  change: Pick<RegulatoryChange, "jurisdictionId" | "country" | "iso3" | "iso2">,
) {
  const normalizedId = normalizeText(change.jurisdictionId);
  const normalizedCountry = normalizeText(change.country);
  const iso3 = normalizeText(change.iso3);
  const iso2 = normalizeText(change.iso2);

  return (
    jurisdictions.find((jurisdiction) => normalizeText(jurisdiction.id) === normalizedId) ??
    jurisdictions.find((jurisdiction) => normalizeText(jurisdiction.iso3) === normalizedId) ??
    jurisdictions.find((jurisdiction) => normalizeText(jurisdiction.iso3) === iso3) ??
    jurisdictions.find((jurisdiction) => normalizeText(jurisdiction.iso2) === iso2) ??
    jurisdictions.find((jurisdiction) => normalizeText(jurisdiction.country) === normalizedCountry) ??
    null
  );
}

function requirementPriority(requirementLevel: RequirementLevel) {
  const priority: Record<RequirementLevel, number> = {
    Mandatory: 6,
    "Partially Mandatory": 5,
    "Under Reform": 4,
    "Guideline-Based": 3,
    "Not Explicit": 2,
    "Not Applicable": 1,
  };

  return priority[requirementLevel];
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}
