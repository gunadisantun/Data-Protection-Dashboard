import { getHighRiskCategoryShortLabel } from "@/lib/high-risk-categories";
import type { RuleInput, RuleTrigger } from "@/lib/types";

const sensitiveSignals = [
  "biometric",
  "biometrik",
  "health",
  "kesehatan",
  "informasi kesehatan",
  "financial",
  "keuangan",
  "keuangan pribadi",
  "geolocation",
  "geolokasi",
  "location",
  "lokasi",
  "children",
  "anak",
  "criminal",
  "kejahatan",
  "catatan kejahatan",
  "pidana",
  "genetic",
  "genetika",
  "spesifik",
];

export function analyzeRopa(input: RuleInput): RuleTrigger[] {
  const triggers: RuleTrigger[] = [];
  const legalBasis = normalize(input.legalBasis);
  const risk = normalize(input.riskAssessmentLevel);
  const destinationCountry = normalize(input.destinationCountry ?? "");
  const dataTypes = input.personalDataTypes.map(normalize);
  const highRiskCategories = input.highRiskCategories ?? [];
  const volumeLevel = normalize(input.volumeLevel ?? "");

  if (legalBasis.includes("legitimate") || legalBasis.includes("kepentingan sah")) {
    triggers.push({
      type: "LIA",
      severity: "Required",
      title: "LIA Required",
      reason:
        "Legitimate Interest was selected as the lawful basis, so a balancing assessment must be completed.",
    });
  }

  if (
    input.isCrossBorder ||
    (destinationCountry.length > 0 &&
      !["indonesia", "id", "ri", "nkri"].includes(destinationCountry))
  ) {
    triggers.push({
      type: "TIA",
      severity: "Required",
      title: "TIA Triggered",
      reason:
        "A destination country outside Indonesia was detected, so transfer impact and safeguards must be reviewed.",
    });
  }

  const hasSensitiveData = dataTypes.some((value) =>
    sensitiveSignals.some((signal) => value.includes(signal)),
  );
  const highRiskCategoryLabels = highRiskCategories.map((category) =>
    getHighRiskCategoryShortLabel(category),
  );

  if (
    risk === "high" ||
    volumeLevel === "large" ||
    hasSensitiveData ||
    highRiskCategories.length > 0 ||
    Boolean(input.usesAutomatedDecisionMaking)
  ) {
    const reasons = [
      risk === "high" ? "high residual risk" : null,
      volumeLevel === "large" ? "large data volume" : null,
      hasSensitiveData ? "sensitive personal data" : null,
      highRiskCategories.length > 0
        ? `Kategori Risiko Tinggi Pasal 34 ayat (2): ${highRiskCategoryLabels.join("; ")}`
        : null,
      input.usesAutomatedDecisionMaking ? "automated decision-making" : null,
    ].filter(Boolean);

    triggers.push({
      type: "DPIA",
      severity: "Critical",
      title: "DPIA Required",
      reason: `A Data Protection Impact Assessment is required due to ${reasons.join(
        ", ",
      )}.`,
    });
  }

  return triggers;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
