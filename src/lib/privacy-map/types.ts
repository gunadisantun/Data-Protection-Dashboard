export type RiskLevel = "Critical" | "High" | "Medium" | "Low" | "Stable";

export type RegulatoryUpdateRiskLevel =
  | "Low"
  | "Medium"
  | "High"
  | "Critical"
  | "Not Assessed";

export type RegulatoryUpdateReviewStatus =
  | "Draft"
  | "Reviewed"
  | "Published"
  | "Rejected";

export type PdpCoverageStatus = "Khusus" | "Parsial" | "Tidak ada" | "Unknown";

export type RequirementLevel =
  | "Mandatory"
  | "Partially Mandatory"
  | "Guideline-Based"
  | "Not Explicit"
  | "Not Applicable"
  | "Under Reform";

export type EffectiveStatus =
  | "In Force"
  | "Partially In Force"
  | "Pending"
  | "Under Reform"
  | "Repealed"
  | "Guideline Only";

export type SourceConfidence = "High" | "Medium" | "Low";

export type PracticalHighlight = {
  label: string;
  value: string;
  tone?: "blue" | "teal" | "red" | "orange" | "purple" | "slate";
};

export type SourceLibraryItem = {
  documentType: string;
  sourceUrl: string;
  sourceConfidence: SourceConfidence;
  lastChecked: string;
  effectiveStatus: EffectiveStatus;
  note?: string;
};

export type Jurisdiction = {
  id: string;
  country: string;
  iso2?: string;
  iso3: string;
  region: string;
  subregion?: string;
  regulator: string;
  mainLaw: string;
  latestUpdate: string;
  effectiveStatus: EffectiveStatus;
  riskLevel: RiskLevel;
  sourceConfidence: SourceConfidence;
  lastChecked: string;
  latitude?: number | null;
  longitude?: number | null;
  regulatoryStatus?: string;
  pdpCategory?: PdpCoverageStatus | string;
  verificationStatus?: string;
  notes?: string;
  practicalHighlights?: PracticalHighlight[];
  practicalAction?: string;
  sourceUrls?: {
    primary?: string;
    breach?: string;
    transfer?: string;
  };
  sourceLibrary?: SourceLibraryItem[];
};

export type LegalVariable = {
  id: string;
  category: string;
  name: string;
  description?: string;
  priority: number;
};

export type CountryVariableMapping = {
  id: string;
  jurisdictionId: string;
  variableId: string;
  requirementLevel: RequirementLevel;
  requirementSummary: string;
  legalBasis: string;
  articleSection?: string;
  sourceUrl?: string;
  effectiveStatus: EffectiveStatus;
  riskLevel: RiskLevel;
  reviewerNote?: string;
  lastChecked: string;
};

export type RegulatoryChange = {
  id: string;
  jurisdictionId: string;
  country?: string;
  iso2?: string;
  iso3?: string;
  region?: string;
  category?: string;
  requirementType?: string;
  title: string;
  changeType: string;
  effectiveDate?: string;
  implementationStatus: EffectiveStatus;
  impactLevel: RiskLevel;
  updateRiskLevel?: RegulatoryUpdateRiskLevel;
  summary: string;
  keyChange?: string;
  businessImpact?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceLastUpdated?: string | null;
  sourceCheckedAt?: string;
  aiConfidence?: number | null;
  reviewStatus?: RegulatoryUpdateReviewStatus;
  reviewerNote?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PrivacyMapFilters = {
  country: string;
  region: string;
  riskLevel: string;
  requirementLevel: string;
  effectiveStatus: string;
  variableCategory: string;
};

export type ObligationDetail = {
  jurisdiction: Jurisdiction;
  variable: LegalVariable;
  mapping: CountryVariableMapping;
};

export type PrivacyMapDataset = {
  sourceWorkbook?: string;
  sourceSheet?: string;
  lastGenerated?: string;
  euBenchmark?: {
    country: string;
    mainLaw: string;
    regulator: string;
    status: string;
    lastChecked: string;
  };
  jurisdictions: Jurisdiction[];
  legalVariables: LegalVariable[];
  mappings: CountryVariableMapping[];
  regulatoryChanges: RegulatoryChange[];
};
