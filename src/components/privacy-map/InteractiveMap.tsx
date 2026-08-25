"use client";

import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import type { Jurisdiction } from "@/lib/privacy-map/types";
import {
  getPdpCoverageLabel,
  getPdpCoverageStatus,
  pdpCoverageLegendItems,
  pdpCoverageMapFill,
} from "@/lib/privacy-map/utils";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type GeographyLike = {
  rsmKey: string;
  properties?: Record<string, unknown>;
};

type MapTooltip = {
  x: number;
  y: number;
  jurisdiction: Jurisdiction;
};

type InteractiveMapProps = {
  jurisdictions: Jurisdiction[];
  selectedCountryId: string;
  onSelectCountry: (jurisdiction: Jurisdiction) => void;
};

export function InteractiveMap({
  jurisdictions,
  selectedCountryId,
  onSelectCountry,
}: InteractiveMapProps) {
  const [tooltip, setTooltip] = useState<MapTooltip | null>(null);
  const jurisdictionByIso3 = useMemo(
    () => new Map(jurisdictions.map((jurisdiction) => [jurisdiction.iso3, jurisdiction])),
    [jurisdictions],
  );
  const jurisdictionByName = useMemo(
    () => new Map(jurisdictions.map((jurisdiction) => [normalizeName(jurisdiction.country), jurisdiction])),
    [jurisdictions],
  );
  const markerJurisdictions = jurisdictions.filter(
    (jurisdiction) => jurisdiction.longitude && jurisdiction.latitude && markerOnlyIso3.has(jurisdiction.iso3),
  );

  function getJurisdiction(geography: GeographyLike) {
    const name = String(geography.properties?.name ?? "");
    const normalized = normalizeName(name);
    const aliasName = geographyNameAliases[normalized];
    const direct = jurisdictionByName.get(normalized);
    if (direct) return direct;
    if (aliasName) {
      const aliasMatch = jurisdictionByName.get(normalizeName(aliasName));
      if (aliasMatch) return aliasMatch;
    }
    if (!name) return null;

    return createComingSoonJurisdiction(name);
  }

  function handleMouseMove(
    event: React.MouseEvent<SVGPathElement | SVGCircleElement>,
    jurisdiction: Jurisdiction,
  ) {
    setTooltip({
      x: event.clientX,
      y: event.clientY,
      jurisdiction,
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Global Interactive Map</h2>
          <p className="text-sm text-slate-500">
            Color indicates PDP law coverage based on the country list.
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          {pdpCoverageLegendItems.map((item) => (
            <span
              key={item.status}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="h-[520px] bg-[radial-gradient(circle_at_top_left,#E0F2FE,transparent_32%),linear-gradient(180deg,#F8FAFC,#EEF6FF)]">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 148, center: [18, 12] }}
          className="h-full w-full"
        >
          <ZoomableGroup center={[18, 12]} zoom={1} minZoom={1} maxZoom={5}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                (geographies as GeographyLike[]).map((geography) => {
                  const jurisdiction = getJurisdiction(geography);
                  const selected = jurisdiction?.id === selectedCountryId;
                  const covered = jurisdiction ? jurisdictionByIso3.has(jurisdiction.iso3) : false;
                  const coverageStatus = getPdpCoverageStatus(jurisdiction);
                  const fill = covered && jurisdiction
                    ? pdpCoverageMapFill[coverageStatus]
                    : "#E5E7EB";

                  return (
                    <Geography
                      key={geography.rsmKey}
                      geography={geography}
                      onMouseMove={(event) => {
                        if (jurisdiction) handleMouseMove(event, jurisdiction);
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => {
                        if (jurisdiction) onSelectCountry(jurisdiction);
                      }}
                      style={{
                        default: {
                          fill,
                          stroke: selected ? "#0F172A" : "#FFFFFF",
                          strokeWidth: selected ? 1.4 : 0.6,
                          outline: "none",
                          opacity: covered ? 0.92 : 0.58,
                          cursor: jurisdiction ? "pointer" : "default",
                        },
                        hover: {
                          fill: covered ? fill : "#CBD5E1",
                          stroke: "#0F172A",
                          strokeWidth: 1,
                          outline: "none",
                          opacity: 1,
                          cursor: jurisdiction ? "pointer" : "default",
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {markerJurisdictions.map((jurisdiction) => (
              <Marker
                key={jurisdiction.id}
                coordinates={[jurisdiction.longitude ?? 0, jurisdiction.latitude ?? 0]}
              >
                <circle
                  r={selectedCountryId === jurisdiction.id ? 7 : 5}
                  fill={pdpCoverageMapFill[getPdpCoverageStatus(jurisdiction)]}
                  stroke="#0F172A"
                  strokeWidth={selectedCountryId === jurisdiction.id ? 2 : 1}
                  onMouseMove={(event) => handleMouseMove(event, jurisdiction)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => onSelectCountry(jurisdiction)}
                  className="cursor-pointer"
                />
                <text
                  x={9}
                  y={4}
                  className="pointer-events-none fill-slate-900 text-[10px] font-bold"
                >
                  {jurisdiction.country}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl"
          style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}
        >
          <div className="text-base font-bold text-slate-950">
            {tooltip.jurisdiction.country}
          </div>
          <div className="mt-2 space-y-1 text-xs leading-5 text-slate-600">
            <p><strong>Main law:</strong> {tooltip.jurisdiction.mainLaw}</p>
            <p><strong>Region:</strong> {tooltip.jurisdiction.region}{tooltip.jurisdiction.subregion ? ` / ${tooltip.jurisdiction.subregion}` : ""}</p>
            <p><strong>Privacy law coverage:</strong> {getPdpCoverageLabel(getPdpCoverageStatus(tooltip.jurisdiction))}</p>
            <p><strong>Regulator:</strong> {tooltip.jurisdiction.regulator}</p>
            <p><strong>Latest:</strong> {tooltip.jurisdiction.latestUpdate}</p>
            <p><strong>Status:</strong> {tooltip.jurisdiction.effectiveStatus}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const markerOnlyIso3 = new Set(["SGP"]);

const geographyNameAliases: Record<string, string> = {
  "bosnia-and-herzegovina": "Bosnia and Herzegovina",
  "bolivia": "Bolivia (Plurinational State of)",
  "brunei": "Brunei Darussalam",
  "central-african-republic": "Central African Republic",
  "democratic-republic-of-the-congo": "Democratic Republic of the Congo",
  "dem-rep-congo": "Democratic Republic of the Congo",
  "cote-divoire": "Côte d'Ivoire",
  "cote-d-ivoire": "Côte d'Ivoire",
  "czech-republic": "Czechia",
  "dominican-republic": "Dominican Republic",
  "equatorial-guinea": "Equatorial Guinea",
  "iran": "Iran (Islamic Republic of)",
  "laos": "Lao People's Democratic Republic",
  "moldova": "Republic of Moldova",
  "north-korea": "Democratic People's Republic of Korea",
  "south-korea": "Republic of Korea",
  "republic-of-korea": "Republic of Korea",
  "russia": "Russian Federation",
  "syria": "Syrian Arab Republic",
  "tanzania": "United Republic of Tanzania",
  "united-kingdom": "United Kingdom of Great Britain and Northern Ireland",
  "venezuela": "Venezuela (Bolivarian Republic of)",
  "vietnam": "Viet Nam",
};

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createComingSoonJurisdiction(name: string, iso3?: string): Jurisdiction {
  const id = `coming-soon-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

  return {
    id,
    country: name,
    iso3: iso3 ?? id,
    region: "Not covered",
    regulator: "Coming soon",
    mainLaw: "Coming soon. This jurisdiction is not covered in the current legal matrix.",
    latestUpdate: "Add source material to the APAC privacy legal matrix to activate this country.",
    effectiveStatus: "Guideline Only",
    riskLevel: "Stable",
    sourceConfidence: "Low",
    lastChecked: "-",
  };
}
