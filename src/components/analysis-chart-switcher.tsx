"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/language-provider";

type ChartRow = {
  label: string;
  value: number;
};

type AnalysisChartSwitcherProps = {
  rows: ChartRow[];
  emptyLabel: string;
  storageKey?: string;
};

const PIE_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#06b6d4",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#84cc16",
  "#64748b",
];

export function AnalysisChartSwitcher({
  rows,
  emptyLabel,
  storageKey,
}: AnalysisChartSwitcherProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"bar" | "pie">("bar");
  const maxValue = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((accumulator, row) => accumulator + row.value, 0);
  const rowsWithColor = useMemo(
    () =>
      rows.map((row, index) => ({
        ...row,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [rows],
  );

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (saved === "bar" || saved === "pie") {
      queueMicrotask(() => setMode(saved));
    }
  }, [storageKey]);

  function changeMode(nextMode: "bar" | "pie") {
    setMode(nextMode);
    if (storageKey) {
      window.localStorage.setItem(storageKey, nextMode);
    }
  }

  if (!rows.length) {
    return (
      <p className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex rounded-full border border-[color:var(--pv-border)] bg-white/70 p-1 shadow-sm backdrop-blur">
          <Button
            type="button"
            size="sm"
            variant={mode === "bar" ? "default" : "ghost"}
            className="h-8 px-3"
            onClick={() => changeMode("bar")}
          >
            <BarChart3 className="h-4 w-4" />
            {t("charts.bar")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "pie" ? "default" : "ghost"}
            className="h-8 px-3"
            onClick={() => changeMode("pie")}
          >
            <PieChart className="h-4 w-4" />
            {t("charts.pie")}
          </Button>
        </div>
      </div>

      {mode === "bar" ? (
        <div className="space-y-3">
          {rowsWithColor.map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span className="line-clamp-1 font-semibold text-slate-700">{row.label}</span>
                <span className="shrink-0 text-slate-500">{row.value}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div
                  className="h-2.5 rounded-full shadow-[0_3px_8px_rgba(15,23,42,0.08)]"
                  style={{
                    width: `${Math.max(6, (row.value / maxValue) * 100)}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr] lg:items-center">
          <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full border border-[color:var(--pv-border)] bg-white/75 shadow-inner backdrop-blur">
            {total > 0 ? (
              <div
                className="relative h-44 w-44 rounded-full"
                style={{
                  background: `conic-gradient(${rowsWithColor
                    .map((row, index) => {
                      const start =
                        rowsWithColor
                          .slice(0, index)
                          .reduce((sum, item) => sum + item.value, 0) / total;
                      const end = (start * total + row.value) / total;
                      return `${row.color} ${(start * 100).toFixed(2)}% ${(end * 100).toFixed(2)}%`;
                    })
                    .join(", ")})`,
                }}
              >
                <div className="absolute inset-10 flex items-center justify-center rounded-full bg-white text-center shadow-[inset_0_0_0_1px_rgba(148,163,184,0.2)]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t("charts.total")}
                    </p>
                    <p className="text-xl font-bold text-slate-900">{total}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="px-4 text-center text-sm text-slate-500">
                {t("charts.allValuesZero")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {rowsWithColor.map((row) => {
              const percentage = total > 0 ? (row.value / total) * 100 : 0;
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--pv-border)] bg-white/70 px-3 py-2 shadow-sm backdrop-blur"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="line-clamp-1 text-sm font-medium text-slate-700">
                      {row.label}
                    </span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-900">{row.value}</p>
                    <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
