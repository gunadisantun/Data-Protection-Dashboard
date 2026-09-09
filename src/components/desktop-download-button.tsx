"use client";

import { useState } from "react";
import { Download, ExternalLink, Laptop, Loader2, MonitorDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/language-provider";

type DesktopDownloadLinks = {
  version: string | null;
  windowsUrl: string | null;
  macUrl: string | null;
  releaseUrl: string | null;
  updatedAt: string | null;
};

export function DesktopDownloadButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [downloads, setDownloads] = useState<DesktopDownloadLinks | null>(null);
  const [error, setError] = useState("");

  async function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || downloads || isLoading) {
      return;
    }

    setError("");
    setIsLoading(true);
    const response = await fetch("/api/desktop-downloads", {
      cache: "no-store",
    }).catch(() => null);

    if (!response?.ok) {
      setError(t("desktopDownload.loadFailed"));
      setIsLoading(false);
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      data?: DesktopDownloadLinks;
    } | null;
    setDownloads(payload?.data ?? null);
    setIsLoading(false);
  }

  return (
    <div className="relative">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="hidden bg-white/90 text-blue-700 hover:text-blue-800 lg:inline-flex"
        onClick={() => void toggleOpen()}
        aria-expanded={open}
      >
        <MonitorDown className="h-4 w-4" />
        {t("desktopDownload.button")}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="lg:hidden"
        onClick={() => void toggleOpen()}
        aria-label={t("desktopDownload.button")}
        aria-expanded={open}
      >
        <MonitorDown className="h-4 w-4" />
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
          <div className="px-2 pb-3">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <Laptop className="h-4 w-4 text-blue-600" />
              {t("desktopDownload.title")}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t("desktopDownload.description")}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              {t("desktopDownload.loading")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              {error}
            </div>
          ) : (
            <div className="space-y-2">
              <DownloadLink
                href={downloads?.windowsUrl}
                label={t("desktopDownload.windows")}
                unavailableLabel={t("desktopDownload.preparing")}
              />
              <DownloadLink
                href={downloads?.macUrl}
                label={t("desktopDownload.mac")}
                unavailableLabel={t("desktopDownload.preparing")}
              />
              {downloads?.releaseUrl ? (
                <a
                  href={downloads.releaseUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex h-11 items-center justify-between rounded-2xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-700"
                >
                  {t("desktopDownload.releaseNotes")}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
              <p className="px-2 pt-1 text-xs leading-5 text-slate-500">
                {downloads?.version
                  ? `${t("desktopDownload.version")} ${downloads.version}`
                  : t("desktopDownload.preparing")}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DownloadLink({
  href,
  label,
  unavailableLabel,
}: {
  href?: string | null;
  label: string;
  unavailableLabel: string;
}) {
  if (!href) {
    return (
      <div className="flex h-12 items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-400">
        {label}
        <span className="text-xs">{unavailableLabel}</span>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      {label}
      <Download className="h-4 w-4" />
    </a>
  );
}
