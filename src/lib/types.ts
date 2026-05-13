export const legalBasisValues = [
  "Consent",
  "Contractual",
  "Legal Obligation",
  "Legitimate Interest",
  "Vital Interest",
  "Public Interest",
] as const;

export type LegalBasis = (typeof legalBasisValues)[number];

export const riskLevelValues = ["Low", "Medium", "High"] as const;
export type RiskLevel = (typeof riskLevelValues)[number];

export const assessmentTypeValues = ["DPIA", "TIA", "LIA"] as const;
export type AssessmentType = (typeof assessmentTypeValues)[number];

export const assessmentStatusValues = [
  "Todo",
  "In Progress",
  "Done",
] as const;
export type AssessmentStatus = (typeof assessmentStatusValues)[number];

export const ropaStatusValues = ["Draft", "Active", "Archived"] as const;
export type RopaStatus = (typeof ropaStatusValues)[number];

export type UserRole = "Admin" | "PIC";

export type RuleInput = {
  legalBasis: LegalBasis | string;
  isCrossBorder: boolean;
  destinationCountry?: string | null;
  riskAssessmentLevel: RiskLevel | string;
  personalDataTypes: string[];
  highRiskCategories?: string[] | null;
  volumeLevel?: "Small" | "Medium" | "Large" | string | null;
  usesAutomatedDecisionMaking?: boolean | null;
};

export type RuleTrigger = {
  type: AssessmentType;
  severity: "Required" | "Critical";
  title: string;
  reason: string;
};

export type CreateRopaPayload = {
  activityName: string;
  processDescription: string;
  departmentId: string;
  picName: string;
  picEmail: string;
  controllerProcessorContacts: string;
  dpoContact: string;
  legalBasis: LegalBasis;
  processingPurpose: string;
  transferPurpose: string;
  sourceMechanism: string;
  subjectCategories: string[];
  personalDataTypes: string[];
  recipients: string;
  processorContractLink: string;
  dataReceiverRole: string;
  isCrossBorder: boolean;
  destinationCountry: string;
  exportProtectionMechanism: string;
  transferMechanism: string;
  storageLocation: string;
  retentionPeriod: string;
  technicalMeasures: string;
  organizationalMeasures: string;
  dataSubjectRights: string;
  riskAssessmentLevel: RiskLevel;
  highRiskCategories?: string[];
  riskRegisterReference?: string;
  riskLikelihood?: "Low" | "Medium" | "High";
  riskImpact?: "Low" | "Medium" | "High";
  riskContext?: string;
  existingControls?: string;
  residualRiskLevel?: RiskLevel;
  riskMitigationPlan?: string;
  volumeLevel: "Small" | "Medium" | "Large";
  usesAutomatedDecisionMaking: boolean;
  dataFlowMapping: string;
  previousProcess: string;
  nextProcess: string;
  status?: RopaStatus;
  userId?: string;
};

export type RopaListFilters = {
  department?: string;
  risk?: string;
  status?: string;
};
