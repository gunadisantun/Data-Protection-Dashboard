"use client";

import { Languages } from "lucide-react";
import { localeLabels, locales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useI18n, writeLocaleCookie } from "@/components/language-provider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();

  function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }
    writeLocaleCookie(nextLocale);
    window.location.reload();
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-[color:var(--pv-border)] bg-white/80 p-1 shadow-sm backdrop-blur",
        compact && "scale-[0.96]",
      )}
      aria-label={t("common.language")}
    >
      <span className="hidden h-8 w-8 place-items-center rounded-full text-slate-500 sm:grid">
        <Languages className="h-4 w-4" />
      </span>
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => changeLocale(item)}
          className={cn(
            "h-8 rounded-full px-3 text-xs font-bold transition",
            item === locale
              ? "bg-slate-950 text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-950",
          )}
          aria-pressed={item === locale}
          title={localeLabels[item]}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
