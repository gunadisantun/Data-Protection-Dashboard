"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getDictionary,
  localeCookieName,
  type Locale,
  type TranslationKey,
  translateFromDictionary,
} from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const dictionary = getDictionary(locale);
  const value = useMemo(
    () => ({
      locale,
      t: (key: TranslationKey) => translateFromDictionary(dictionary, key),
    }),
    [dictionary, locale],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return value;
}

export function writeLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
