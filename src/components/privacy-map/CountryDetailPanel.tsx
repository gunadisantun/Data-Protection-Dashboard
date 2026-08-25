"use client";

import {
  AlertTriangle,
  CalendarCheck,
  ExternalLink,
  FileText,
  Globe2,
  Pencil,
  Scale,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  CountryVariableMapping,
  Jurisdiction,
  PracticalHighlight,
} from "@/lib/privacy-map/types";
import {
  getPdpCoverageLabel,
  getPdpCoverageStatus,
  pdpCoverageColorClass,
} from "@/lib/privacy-map/utils";

type CountryDetailPanelProps = {
  jurisdiction: Jurisdiction;
  mappings: CountryVariableMapping[];
  canEdit?: boolean;
  onEdit?: (jurisdiction: Jurisdiction) => void;
};

export function CountryDetailPanel({
  jurisdiction,
  mappings,
  canEdit = false,
  onEdit,
}: CountryDetailPanelProps) {
  const hasCoverage = mappings.some((mapping) => mapping.jurisdictionId === jurisdiction.id);
  const practicalHighlights = jurisdiction.practicalHighlights ?? [];
  const coverageStatus = getPdpCoverageStatus(jurisdiction);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm xl:h-[594px]">
      <CardHeader className="shrink-0 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
              Country Detail
            </p>
            <CardTitle className="mt-2 text-3xl">{jurisdiction.country}</CardTitle>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {jurisdiction.region}
              {jurisdiction.subregion ? ` / ${jurisdiction.subregion}` : ""}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${pdpCoverageColorClass[coverageStatus]}`}>
            {getPdpCoverageLabel(coverageStatus)}
          </span>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onEdit?.(jurisdiction)}
          >
            <Pencil className="h-4 w-4" />
            Edit Country
          </Button>
        ) : null}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Main law
          </div>
          {jurisdiction.sourceUrls?.primary ? (
            <a
              href={jurisdiction.sourceUrls.primary}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-start gap-2 text-sm font-bold leading-6 text-blue-700 transition hover:text-blue-900"
            >
              <span>{jurisdiction.mainLaw}</span>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0" />
            </a>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
              {jurisdiction.mainLaw}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-3">
        {hasCoverage ? (
          <section>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-950">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              Practical Highlights
            </div>
            <div className="grid gap-3">
              {practicalHighlights.map((highlight) => (
                <PracticalHighlightCard
                  key={highlight.label}
                  highlight={highlight}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="text-lg font-bold text-slate-950">Coming soon</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This jurisdiction is clickable, but it is not covered in the current
              legal matrix yet. Upload or add source material to activate law,
              obligation, heatmap, and update details.
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function PracticalHighlightCard({
  highlight,
}: {
  highlight: PracticalHighlight;
}) {
  const toneClass = highlightToneClass[highlight.tone ?? "slate"];

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          {renderHighlightIcon(highlight.label)}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-950">{highlight.label}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{highlight.value}</p>
        </div>
      </div>
    </article>
  );
}

function renderHighlightIcon(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("subject")) return <Users className="h-4 w-4" />;
  if (normalized.includes("dsr")) return <CalendarCheck className="h-4 w-4" />;
  if (normalized.includes("breach")) return <AlertTriangle className="h-4 w-4" />;
  if (normalized.includes("cross")) return <Globe2 className="h-4 w-4" />;
  if (normalized.includes("dpo")) return <UserCheck className="h-4 w-4" />;
  if (normalized.includes("source")) return <FileText className="h-4 w-4" />;
  return <Scale className="h-4 w-4" />;
}

const highlightToneClass = {
  blue: "bg-blue-100 text-blue-700",
  teal: "bg-teal-100 text-teal-700",
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  purple: "bg-purple-100 text-purple-700",
  slate: "bg-slate-100 text-slate-700",
};
