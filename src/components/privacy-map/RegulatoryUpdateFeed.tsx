"use client";

import { BookOpenText, BriefcaseBusiness, CalendarDays, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Jurisdiction,
  PracticalHighlight,
  RegulatoryChange,
} from "@/lib/privacy-map/types";
import {
  riskColorClass,
  resolveChangeJurisdiction,
  sortChanges,
} from "@/lib/privacy-map/utils";

type RegulatoryUpdateFeedProps = {
  changes: RegulatoryChange[];
  jurisdictions: Jurisdiction[];
};

export function RegulatoryUpdateFeed({
  changes,
  jurisdictions,
}: RegulatoryUpdateFeedProps) {
  const jurisdictionById = new Map(jurisdictions.map((item) => [item.id, item]));
  const sorted = sortChanges(changes, jurisdictionById).slice(0, 8);

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          Privacy Regulatory Reference Summaries
        </CardTitle>
        <p className="text-sm leading-6 text-slate-500">
          Country-level privacy reference cards based on the extracted legal
          matrix. Items are labelled as regulatory updates only when the
          underlying data indicates a real legal change.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((change) => {
          const jurisdiction = resolveChangeJurisdiction(jurisdictions, change);
          const jurisdictionData = jurisdiction ?? undefined;
          const riskLevel = change.updateRiskLevel ?? change.impactLevel;
          const cardKind = getCardKind(change);
          const country = jurisdiction?.country ?? change.country ?? "Global";
          const topic = getTopicName(change);
          const summary = buildSummary(country, jurisdictionData, change);
          const legalReference = getMainLegalReference(jurisdictionData, change);
          const keyPoints = buildKeyRegulatoryPoints(jurisdictionData, change);
          const businessActions = buildBusinessActions(jurisdictionData);

          return (
            <article
              key={change.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      {country}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500">
                      {topic}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold leading-5 text-slate-950">
                    {country} {cardKind}
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Checked: {formatDate(change.sourceCheckedAt ?? jurisdiction?.lastChecked)}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    riskLevel === "Not Assessed"
                      ? "border-slate-200 bg-white text-slate-500"
                      : riskColorClass[riskLevel]
                  }`}
                >
                  {riskLevel}
                </span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.82fr]">
                <section className="rounded-2xl border border-white bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <BookOpenText className="h-4 w-4 text-blue-600" />
                    Summary
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{summary}</p>
                </section>

                <section className="rounded-2xl border border-white bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <BookOpenText className="h-4 w-4 text-blue-600" />
                    Main Legal Reference
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Law name
                      </dt>
                      <dd className="mt-1 font-semibold leading-6 text-slate-900">
                        {legalReference.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Law number / year
                      </dt>
                      <dd className="mt-1 font-semibold leading-6 text-slate-900">
                        {legalReference.numberOrYear}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <section className="rounded-2xl border border-white bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <ListChecks className="h-4 w-4 text-blue-600" />
                    Key Regulatory Points
                  </div>
                  <ul className="space-y-2 text-sm leading-6 text-slate-600">
                    {keyPoints.map((point) => (
                      <li key={point.label} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <span>
                          <strong className="text-slate-900">{point.label}:</strong>{" "}
                          {point.value}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-teal-950">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-teal-700">
                    <BriefcaseBusiness className="h-4 w-4" />
                    Business Impact
                  </div>
                  <ul className="space-y-2 text-sm leading-6">
                    {businessActions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </article>
          );
        })}
        {sorted.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No privacy regulatory reference summaries match the current filters.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getCardKind(change: RegulatoryChange) {
  if (isReferenceOnly(change)) return "Privacy Regulatory Reference Summary";
  return "Regulatory Update";
}

function isReferenceOnly(change: RegulatoryChange) {
  return (
    change.requirementType === "External Reference" ||
    /reference/i.test(change.changeType) ||
    /reference/i.test(change.title)
  );
}

function getTopicName(change: RegulatoryChange) {
  return change.category || change.requirementType || "Privacy reference";
}

function buildSummary(
  country: string,
  jurisdiction: Jurisdiction | undefined,
  change: RegulatoryChange,
) {
  const law = getMeaningfulText(jurisdiction?.mainLaw) ?? extractMainLaw(change.summary);
  const regulator = getAuthorityName(jurisdiction?.regulator);
  const complianceRelevance =
    "This reference is relevant for reviewing privacy notices, DSR handling, breach response, transfer controls, DPO governance, and processor/vendor controls where applicable.";

  if (law && regulator) {
    return `${country} has a privacy regulatory reference for ${law}. The listed regulator or authority is ${regulator}. ${complianceRelevance}`;
  }

  if (law) {
    return `${country} has a privacy regulatory reference for ${law}. The extracted source does not specify a regulator or authority name. ${complianceRelevance}`;
  }

  return `${country} has a privacy regulatory reference available for legal review. The main legal reference is ${NOT_SPECIFIED}. ${complianceRelevance}`;
}

function getMainLegalReference(
  jurisdiction: Jurisdiction | undefined,
  change: RegulatoryChange,
) {
  const name =
    getMeaningfulText(jurisdiction?.mainLaw) ??
    extractMainLaw(change.summary) ??
    NOT_SPECIFIED;

  return {
    name,
    numberOrYear: extractLawNumberOrYear(name),
  };
}

function buildKeyRegulatoryPoints(
  jurisdiction: Jurisdiction | undefined,
  change: RegulatoryChange,
) {
  const highlights = jurisdiction?.practicalHighlights ?? [];
  const law = getMeaningfulText(jurisdiction?.mainLaw) ?? extractMainLaw(change.summary);
  const authority = getAuthorityName(jurisdiction?.regulator);

  return [
    { label: "Main law", value: law ?? NOT_SPECIFIED },
    { label: "Authority reference", value: authority ?? NOT_SPECIFIED },
    {
      label: "DPO requirement",
      value: getHighlightValue(highlights, "dpo"),
    },
    {
      label: "Breach notification",
      value: getHighlightValue(highlights, "breach"),
    },
    {
      label: "International transfer",
      value: getHighlightValue(highlights, "cross"),
    },
  ];
}

function buildBusinessActions(jurisdiction: Jurisdiction | undefined) {
  const law = getMeaningfulText(jurisdiction?.mainLaw) ?? "the listed legal reference";

  return [
    `Confirm whether the local privacy notice reflects ${law}.`,
    "Check whether the DSR intake, verification, tracking, and response process matches the country profile.",
    "Verify whether breach notification obligations, escalation steps, and timing need to be configured for this jurisdiction.",
    "Review the international transfer mechanism and related processor/vendor clauses before transferring personal data.",
    "Confirm whether a DPO, representative, or accountable privacy owner is required or recommended for local operations.",
  ];
}

function getHighlightValue(highlights: PracticalHighlight[], keyword: string) {
  const item = highlights.find((highlight) =>
    highlight.label.toLowerCase().includes(keyword),
  );
  const value = getMeaningfulText(item?.value);
  if (!value) return NOT_SPECIFIED;

  if (
    /no general dpo deadline card value/i.test(value) ||
    /no fixed statutory deadline/i.test(value)
  ) {
    return NOT_SPECIFIED;
  }

  return value;
}

function getAuthorityName(value: string | undefined) {
  const text = getMeaningfulText(value);
  if (!text) return null;
  if (
    /linked source|pdf source|secondary source|secondary \/ repository|source inaccessible|multiple links|official \/ government-linked|reviewed excel-linked/i.test(
      text,
    )
  ) {
    return null;
  }
  return text;
}

function getMeaningfulText(value: string | undefined | null) {
  const text = value?.trim();
  if (!text) return null;
  if (/^(n\/a|-|none|null|undefined)$/i.test(text)) return null;
  if (/privacy regulatory reference available/i.test(text)) return null;
  return text;
}

function extractMainLaw(summary?: string) {
  const match = summary?.match(/main legal reference is ([^.]+)\./i);
  return getMeaningfulText(match?.[1]);
}

function extractLawNumberOrYear(lawName: string) {
  const patterns = [
    /\bLaw\s+No\.?\s*[\w./-]+(?:\s+of\s+\d{4})?/i,
    /\bAct\s+No\.?\s*[\w./-]+(?:\s+of\s+\d{4})?/i,
    /\bNo\.?\s*[\w./-]+(?:\s+of\s+\d{4})?/i,
    /\b\d{4}\b/,
  ];

  for (const pattern of patterns) {
    const match = lawName.match(pattern);
    if (match?.[0]) return match[0];
  }

  return NOT_SPECIFIED;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

const NOT_SPECIFIED = "Not specified in extracted source";
