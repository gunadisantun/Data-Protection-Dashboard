import type { RopaTransferItem } from "@/lib/types";

export type AiImpactRiskLevel = "Low" | "Medium" | "High" | "Critical";
export type AiImpactFinalDecision =
  | "APPROVE"
  | "CONDITIONAL APPROVAL"
  | "REMEDIATION REQUIRED"
  | "ESCALATE TO DPO/LEGAL"
  | "DO NOT PROCEED";
export type AiImpactFriaStatus =
  | "FRIA REQUIRED"
  | "FRIA NOT TRIGGERED"
  | "FURTHER ASSESSMENT";
export type AiImpactResponse = "Yes" | "No" | "Potential" | "TBD" | "N/A" | "";
export type AiImpactWorkStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Accepted";

export type AiImpactDomain = {
  id: string;
  domain: string;
  potentialNegativeImpact: string;
  affectedPersonGroup: string;
  severity: number | null;
  likelihood: number | null;
  inherentScore: number | null;
  existingControls: string;
  controlEffectiveness: number;
  residualScore: number | null;
  residualRiskLevel: AiImpactRiskLevel | "";
  furtherAction: string;
  owner: string;
  status: AiImpactWorkStatus;
};

export type AiImpactFriaScreening = Record<string, AiImpactResponse>;

export type AiImpactFriaItem = {
  id: string;
  article: string;
  question: string;
  response: string;
  evidenceReference: string;
  owner: string;
  status: "Not Started" | "In Progress" | "Completed" | "N/A";
};

export type AiImpactDataProtection = {
  processesPersonalData: "Yes" | "No" | "TBD";
  result: string;
};

export type AiImpactSpecialistAssessment = {
  required: "Yes" | "No" | "TBD";
  types: string[];
};

export type AiImpactDraft = {
  impactDomains: AiImpactDomain[];
  friaScreening: AiImpactFriaScreening;
  friaItems: AiImpactFriaItem[];
  dataProtection: AiImpactDataProtection;
  specialistAssessment: AiImpactSpecialistAssessment;
};

export const aiImpactDomainTemplates = [
  {
    id: "fundamental-rights",
    domain: "Fundamental rights and access to services",
  },
  {
    id: "privacy-data-protection",
    domain: "Privacy and data protection",
  },
  {
    id: "fairness-nondiscrimination",
    domain: "Fairness and non-discrimination",
  },
  {
    id: "human-oversight-autonomy",
    domain: "Human oversight and autonomy",
  },
  {
    id: "transparency-explainability",
    domain: "Transparency and explainability",
  },
  {
    id: "safety-security-reliability",
    domain: "Safety, security, and reliability",
  },
  {
    id: "other-material-impact",
    domain: "Other material impact",
  },
] as const;

export const controlEffectivenessOptions = [
  { label: "No control / ineffective", value: 0 },
  { label: "Weak", value: 0.25 },
  { label: "Moderate", value: 0.5 },
  { label: "Strong", value: 0.75 },
  { label: "Very strong", value: 0.9 },
] as const;

export const friaScreeningFields = [
  {
    id: "euAiActApplies",
    label: "EU AI Act context applies",
    description:
      "Use Yes when the AI system is deployed in or affects people in the EU, or when EU AI Act benchmarking is intentionally used.",
  },
  {
    id: "highRiskAiSystem",
    label: "High-risk AI system",
    description:
      "Use Yes when the use case is classified as high risk or materially affects access, rights, safety, or essential services.",
  },
  {
    id: "annexPoint2",
    label: "Annex III point 2 excluded",
    description:
      "Use Yes only if the use case falls under the excluded Article 27 carve-out used in the workbook.",
  },
  {
    id: "publicServiceDeployer",
    label: "Public service or public-equivalent deployer",
    description:
      "Use Yes if the deployer performs a public service or equivalent high-impact service.",
  },
  {
    id: "annexPoint5bc",
    label: "Annex III point 5(b)/(c) context",
    description:
      "Use Yes if the use case relates to eligibility, access, scoring, or similar high-impact decision contexts.",
  },
] as const;

export const specialistAssessmentTypes = [
  "DPIA",
  "LIA",
  "TIA",
  "Security Review",
  "Model Risk Review",
  "Human Rights Review",
] as const;

export function calculateInherentScore(
  severity: number | null | undefined,
  likelihood: number | null | undefined,
) {
  if (!severity || !likelihood) {
    return null;
  }

  return severity * likelihood;
}

export function calculateResidualScore(
  inherentScore: number | null | undefined,
  controlEffectiveness: number | null | undefined,
) {
  if (!inherentScore) {
    return null;
  }

  const effectiveness = Math.min(Math.max(controlEffectiveness ?? 0, 0), 0.9);
  return Math.max(1, Math.round(inherentScore * (1 - effectiveness)));
}

export function riskLevelFromScore(score: number | null | undefined): AiImpactRiskLevel | "" {
  if (!score) {
    return "";
  }
  if (score >= 17) {
    return "Critical";
  }
  if (score >= 10) {
    return "High";
  }
  if (score >= 5) {
    return "Medium";
  }
  return "Low";
}

export function calculateFriaStatus(
  screening: AiImpactFriaScreening,
): AiImpactFriaStatus {
  const requiredFields = friaScreeningFields.map((field) => field.id);
  const hasOpenAnswer = requiredFields.some((field) => {
    const value = screening[field];
    return !value || value === "Potential" || value === "TBD";
  });

  if (hasOpenAnswer) {
    return "FURTHER ASSESSMENT";
  }

  const triggered =
    screening.euAiActApplies === "Yes" &&
    screening.highRiskAiSystem === "Yes" &&
    screening.annexPoint2 === "No" &&
    (screening.publicServiceDeployer === "Yes" ||
      screening.annexPoint5bc === "Yes");

  return triggered ? "FRIA REQUIRED" : "FRIA NOT TRIGGERED";
}

export function calculateFriaCompletion(items: AiImpactFriaItem[]) {
  const applicable = items.filter((item) => item.status !== "N/A");
  if (applicable.length === 0) {
    return 100;
  }

  const completed = applicable.filter((item) => item.status === "Completed").length;
  return Math.round((completed / applicable.length) * 100);
}

export function normalizeImpactDomains(domains: AiImpactDomain[]) {
  return domains.map((domain) => {
    const inherentScore = calculateInherentScore(domain.severity, domain.likelihood);
    const residualScore = calculateResidualScore(
      inherentScore,
      domain.controlEffectiveness,
    );

    return {
      ...domain,
      inherentScore,
      residualScore,
      residualRiskLevel: riskLevelFromScore(residualScore),
    };
  });
}

export function getHighestResidualRisk(domains: AiImpactDomain[]) {
  const rank: Record<AiImpactRiskLevel, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4,
  };

  const levels = domains
    .map((domain) => domain.residualRiskLevel)
    .filter((level): level is AiImpactRiskLevel => Boolean(level));

  if (levels.length === 0) {
    return "Incomplete" as const;
  }

  return levels.reduce((highest, current) =>
    rank[current] > rank[highest] ? current : highest,
  );
}

export function calculateFinalDecision(input: {
  domains: AiImpactDomain[];
  friaStatus: AiImpactFriaStatus;
  friaCompletion: number;
  specialistAssessment: AiImpactSpecialistAssessment;
}): AiImpactFinalDecision {
  const highest = getHighestResidualRisk(input.domains);
  const hasOpenCritical = input.domains.some(
    (domain) =>
      domain.residualRiskLevel === "Critical" && domain.status !== "Accepted",
  );

  if (hasOpenCritical) {
    return "DO NOT PROCEED";
  }

  if (
    highest === "Critical" ||
    input.friaStatus === "FURTHER ASSESSMENT" ||
    input.specialistAssessment.required === "TBD"
  ) {
    return "ESCALATE TO DPO/LEGAL";
  }

  if (highest === "High" || input.friaStatus === "FRIA REQUIRED") {
    return input.friaCompletion >= 100
      ? "CONDITIONAL APPROVAL"
      : "REMEDIATION REQUIRED";
  }

  if (highest === "Medium") {
    return "CONDITIONAL APPROVAL";
  }

  return highest === "Incomplete" ? "ESCALATE TO DPO/LEGAL" : "APPROVE";
}

export function buildDefaultImpactDomains(existingControls = ""): AiImpactDomain[] {
  return aiImpactDomainTemplates.map((template) => ({
    ...template,
    potentialNegativeImpact: "",
    affectedPersonGroup: "",
    severity: null,
    likelihood: null,
    inherentScore: null,
    existingControls,
    controlEffectiveness: 0,
    residualScore: null,
    residualRiskLevel: "",
    furtherAction: "",
    owner: "",
    status: "Not Started",
  }));
}

export function buildDefaultFriaScreening(): AiImpactFriaScreening {
  return Object.fromEntries(
    friaScreeningFields.map((field) => [field.id, ""]),
  ) as AiImpactFriaScreening;
}

export function buildDefaultFriaItems(): AiImpactFriaItem[] {
  return [
    {
      id: "fria-purpose",
      article: "EU AI Act Article 27",
      question: "Describe the deployer's processes in which the AI system will be used.",
      response: "",
      evidenceReference: "",
      owner: "",
      status: "Not Started",
    },
    {
      id: "fria-period-frequency",
      article: "EU AI Act Article 27",
      question: "Identify period and frequency of AI system use.",
      response: "",
      evidenceReference: "",
      owner: "",
      status: "Not Started",
    },
    {
      id: "fria-affected-persons",
      article: "EU AI Act Article 27",
      question: "Identify categories of natural persons and groups likely affected.",
      response: "",
      evidenceReference: "",
      owner: "",
      status: "Not Started",
    },
    {
      id: "fria-risks",
      article: "EU AI Act Article 27",
      question: "Identify specific risks of harm likely to impact affected persons.",
      response: "",
      evidenceReference: "",
      owner: "",
      status: "Not Started",
    },
    {
      id: "fria-human-oversight",
      article: "EU AI Act Article 27",
      question: "Describe human oversight measures and escalation arrangements.",
      response: "",
      evidenceReference: "",
      owner: "",
      status: "Not Started",
    },
    {
      id: "fria-mitigation",
      article: "EU AI Act Article 27",
      question: "Describe mitigation measures and governance controls.",
      response: "",
      evidenceReference: "",
      owner: "",
      status: "Not Started",
    },
  ];
}

export function buildAiImpactDerivedState(draft: AiImpactDraft) {
  const impactDomains = normalizeImpactDomains(draft.impactDomains);
  const friaStatus = calculateFriaStatus(draft.friaScreening);
  const friaCompletion = calculateFriaCompletion(draft.friaItems);
  const highestResidualRisk = getHighestResidualRisk(impactDomains);
  const finalDecision = calculateFinalDecision({
    domains: impactDomains,
    friaStatus,
    friaCompletion,
    specialistAssessment: draft.specialistAssessment,
  });

  return {
    impactDomains,
    friaStatus,
    friaCompletion,
    highestResidualRisk,
    finalDecision,
  };
}

export function joinTransferCountries(transfers: RopaTransferItem[] | null | undefined) {
  const countries = (transfers ?? [])
    .map((transfer) => transfer.destinationCountry?.trim())
    .filter((country): country is string => Boolean(country));

  return Array.from(new Set(countries)).join(", ");
}
