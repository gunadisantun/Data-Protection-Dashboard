"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookMarked, ChevronDown, Gavel, Link2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { useI18n } from "@/components/language-provider";
import type {
  LegalMappingDirection,
  LegalMappingEntry,
  LegalMappingTrackerData,
} from "@/lib/legal-mapping";

type LegalMappingTrackerProps = {
  data: LegalMappingTrackerData;
};

type TrackerLocale = {
  title: string;
  description: string;
  searchPlaceholder: string;
  byUu: string;
  byPp: string;
  uuCoverage: string;
  ppCoverage: string;
  chapters: string;
  mappingRows: string;
  topics: string;
  articles: string;
  mappedArticles: string;
  sourceRow: string;
  relationship: string;
  mappingNote: string;
  uuArticle: string;
  ppArticle: string;
  ppExplanation: string;
  empty: string;
  expand: string;
  collapse: string;
};

const copy: Record<"en" | "id", TrackerLocale> = {
  en: {
    title: "UU PDP & PP PDP Tracker",
    description:
      "Clickable legal tracker for UU PDP and PP 33/2026 by chapter, topic, article, and mapping relationship.",
    searchPlaceholder: "Search chapter, topic, article, legal text, mapping note...",
    byUu: "By UU PDP",
    byPp: "By PP 33/2026",
    uuCoverage: "UU PDP coverage",
    ppCoverage: "PP 33/2026 coverage",
    chapters: "UU PDP chapters",
    mappingRows: "Mapping rows",
    topics: "topics",
    articles: "articles",
    mappedArticles: "mapped articles",
    sourceRow: "Source row",
    relationship: "Relationship",
    mappingNote: "Mapping note",
    uuArticle: "UU PDP Article",
    ppArticle: "PP 33/2026 Article",
    ppExplanation: "Official PP explanation",
    empty: "No mapping matches the current search.",
    expand: "Expand",
    collapse: "Collapse",
  },
  id: {
    title: "UU PDP & PP PDP Tracker",
    description:
      "Tracker hukum yang bisa diklik untuk menelusuri UU PDP dan PP 33/2026 per BAB, topik, pasal, dan relasi mapping.",
    searchPlaceholder: "Cari BAB, topik, pasal, isi pasal, catatan mapping...",
    byUu: "Urut per UU PDP",
    byPp: "Urut per PP 33/2026",
    uuCoverage: "Coverage UU PDP",
    ppCoverage: "Coverage PP 33/2026",
    chapters: "BAB UU PDP",
    mappingRows: "Baris mapping",
    topics: "topik",
    articles: "pasal",
    mappedArticles: "pasal terkait",
    sourceRow: "Baris sumber",
    relationship: "Jenis hubungan",
    mappingNote: "Catatan mapping",
    uuArticle: "Pasal UU PDP",
    ppArticle: "Pasal PP 33/2026",
    ppExplanation: "Penjelasan resmi PP",
    empty: "Tidak ada mapping yang sesuai pencarian.",
    expand: "Buka",
    collapse: "Tutup",
  },
};

export function LegalMappingTracker({ data }: LegalMappingTrackerProps) {
  const { locale } = useI18n();
  const labels = copy[locale];
  const [direction, setDirection] = useState<LegalMappingDirection>("UU_TO_PP");
  const [query, setQuery] = useState("");
  const [expandedChapter, setExpandedChapter] = useState<string>("");
  const [expandedTopic, setExpandedTopic] = useState<string>("");
  const [expandedArticle, setExpandedArticle] = useState<string>("");

  const rows = direction === "UU_TO_PP" ? data.uuToPp : data.ppToUu;
  const searchedRows = useMemo(() => filterRows(rows, query), [query, rows]);
  const chapters = useMemo(
    () => groupRows(searchedRows, direction),
    [direction, searchedRows],
  );
  const totalRows = direction === "UU_TO_PP" ? data.coverage.uuRows : data.coverage.ppRows;

  function switchDirection(next: LegalMappingDirection) {
    setDirection(next);
    setExpandedChapter("");
    setExpandedTopic("");
    setExpandedArticle("");
  }

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="border-b border-[color:var(--pv-border)] bg-gradient-to-br from-white via-blue-50/60 to-cyan-50/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <BookMarked className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>{labels.title}</CardTitle>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {labels.description}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[520px]">
            <MetricCard label={labels.uuCoverage} value={data.coverage.uuCoverage} />
            <MetricCard label={labels.ppCoverage} value={data.coverage.ppCoverage} />
            <MetricCard label={labels.chapters} value={String(data.coverage.babCount)} />
            <MetricCard label={labels.mappingRows} value={String(totalRows)} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="grid grid-cols-2 gap-2 rounded-full border border-[color:var(--pv-border)] bg-slate-100/80 p-1">
            <button
              type="button"
              onClick={() => switchDirection("UU_TO_PP")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                direction === "UU_TO_PP"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {labels.byUu}
            </button>
            <button
              type="button"
              onClick={() => switchDirection("PP_TO_UU")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                direction === "PP_TO_UU"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {labels.byPp}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[color:var(--pv-border)] bg-white px-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <Input
              className="border-0 px-0 focus:ring-0"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setExpandedChapter("");
                setExpandedTopic("");
                setExpandedArticle("");
              }}
              placeholder={labels.searchPlaceholder}
            />
          </div>
        </div>

        {chapters.length ? (
          <div className="space-y-3">
            {chapters.map((chapter) => {
              const chapterOpen = expandedChapter === chapter.key || Boolean(query.trim());
              return (
                <div
                  key={chapter.key}
                  className="overflow-hidden rounded-2xl border border-[color:var(--pv-border)] bg-white/80 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedChapter((current) => (current === chapter.key ? "" : chapter.key))}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">{chapter.label}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {chapter.topics.length} {labels.topics} · {chapter.articleCount} {labels.articles} ·{" "}
                        {chapter.rows.length} {labels.mappedArticles}
                      </p>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition ${
                        chapterOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {chapterOpen ? (
                    <div className="space-y-3 border-t border-slate-100 bg-slate-50/65 p-3">
                      {chapter.topics.map((topic) => {
                        const topicKey = `${chapter.key}:${topic.key}`;
                        const topicOpen = expandedTopic === topicKey || Boolean(query.trim());
                        return (
                          <div
                            key={topicKey}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTopic((current) => (current === topicKey ? "" : topicKey))
                              }
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-900">{topic.label}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {topic.articles.length} {labels.articles} · {topic.rows.length} mapping
                                </p>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 text-slate-500 transition ${
                                  topicOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {topicOpen ? (
                              <div className="space-y-2 border-t border-slate-100 p-3">
                                {topic.articles.map((article) => {
                                  const articleKey = `${topicKey}:${article.key}`;
                                  const articleOpen = expandedArticle === articleKey || Boolean(query.trim());
                                  return (
                                    <ArticleAccordion
                                      key={articleKey}
                                      article={article}
                                      labels={labels}
                                      direction={direction}
                                      open={articleOpen}
                                      onToggle={() =>
                                        setExpandedArticle((current) =>
                                          current === articleKey ? "" : articleKey,
                                        )
                                      }
                                    />
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-500">
            {labels.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ArticleAccordion({
  article,
  direction,
  labels,
  onToggle,
  open,
}: {
  article: ArticleGroup;
  direction: LegalMappingDirection;
  labels: TrackerLocale;
  onToggle: () => void;
  open: boolean;
}) {
  const primary = direction === "UU_TO_PP" ? article.rows[0]?.pasalUu : article.rows[0]?.pasalPp;
  const mapped = new Set(
    article.rows
      .map((row) => (direction === "UU_TO_PP" ? row.pasalPp : row.pasalUu))
      .filter(Boolean),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">{primary || "-"}</Badge>
            <Badge tone="slate">
              {mapped.size} {labels.mappedArticles}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
            {direction === "UU_TO_PP" ? article.rows[0]?.isiPasalUu : article.rows[0]?.isiPasalPp}
          </p>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-blue-700">
          {open ? labels.collapse : labels.expand}
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/65 p-3">
          {article.rows.map((entry) => (
            <MappingDetail
              key={entry.id}
              entry={entry}
              labels={labels}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MappingDetail({ entry, labels }: { entry: LegalMappingEntry; labels: TrackerLocale }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="slate">{labels.sourceRow}: {entry.sourceRow}</Badge>
        {entry.jenisHubungan ? <Badge tone="purple">{entry.jenisHubungan}</Badge> : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <LegalTextBlock
          icon={<Gavel className="h-4 w-4" />}
          title={`${labels.uuArticle}: ${entry.pasalUu || "-"}`}
          body={entry.isiPasalUu}
        />
        <LegalTextBlock
          icon={<Link2 className="h-4 w-4" />}
          title={`${labels.ppArticle}: ${entry.pasalPp || "-"}`}
          body={entry.isiPasalPp}
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <InfoBlock title={labels.ppExplanation} body={entry.penjelasanResmiPp || "-"} />
        <InfoBlock title={labels.mappingNote} body={entry.catatanMapping || "-"} />
      </div>
    </div>
  );
}

function LegalTextBlock({
  body,
  icon,
  title,
}: {
  body: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {title}
      </p>
      <p className="mt-2 max-h-56 overflow-auto whitespace-pre-line pr-1 text-sm leading-7 text-slate-700">
        {body || "-"}
      </p>
    </div>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

type ArticleGroup = {
  key: string;
  rows: LegalMappingEntry[];
};

type TopicGroup = {
  key: string;
  label: string;
  rows: LegalMappingEntry[];
  articles: ArticleGroup[];
};

type ChapterGroup = {
  key: string;
  label: string;
  rows: LegalMappingEntry[];
  topics: TopicGroup[];
  articleCount: number;
};

function groupRows(rows: LegalMappingEntry[], direction: LegalMappingDirection): ChapterGroup[] {
  const chapterMap = new Map<string, LegalMappingEntry[]>();
  for (const row of rows) {
    const key = row.babUu || "Tanpa BAB";
    const bucket = chapterMap.get(key) ?? [];
    bucket.push(row);
    chapterMap.set(key, bucket);
  }

  return Array.from(chapterMap.entries()).map(([chapter, chapterRows]) => {
    const topicMap = new Map<string, LegalMappingEntry[]>();
    for (const row of chapterRows) {
      const key = row.topik || "Tanpa topik";
      const bucket = topicMap.get(key) ?? [];
      bucket.push(row);
      topicMap.set(key, bucket);
    }

    const topics = Array.from(topicMap.entries()).map(([topic, topicRows]) => {
      const articleMap = new Map<string, LegalMappingEntry[]>();
      for (const row of topicRows) {
        const key = direction === "UU_TO_PP" ? row.pasalUu || row.id : row.pasalPp || row.id;
        const bucket = articleMap.get(key) ?? [];
        bucket.push(row);
        articleMap.set(key, bucket);
      }

      return {
        key: topic,
        label: topic,
        rows: topicRows,
        articles: Array.from(articleMap.entries()).map(([article, articleRows]) => ({
          key: article,
          rows: articleRows,
        })),
      };
    });

    return {
      key: chapter,
      label: chapter,
      rows: chapterRows,
      topics,
      articleCount: topics.reduce((total, topic) => total + topic.articles.length, 0),
    };
  });
}

function filterRows(rows: LegalMappingEntry[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return rows;
  }

  return rows.filter((row) =>
    [
      row.babUu,
      row.topik,
      row.noUu,
      row.pasalUu,
      row.isiPasalUu,
      row.noPp,
      row.pasalPp,
      row.isiPasalPp,
      row.penjelasanResmiPp,
      row.catatanMapping,
      row.jenisHubungan,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  );
}
