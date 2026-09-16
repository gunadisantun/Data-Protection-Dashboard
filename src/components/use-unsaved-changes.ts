"use client";

import { useEffect } from "react";

/** Guards document exits and same-tab links, including Next Link navigation.
 * Programmatic router navigation and browser history traversal are not intercepted.
 * Only the dirty flag is retained; form contents are never persisted here.
 */
export function useUnsavedChanges(dirty: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;

    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (!/^https?:$/.test(destination.protocol)) return;
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    window.addEventListener("beforeunload", beforeUnload);
    // Capture before React's delegated Link handler can start a route transition.
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, message]);
}

export function unsavedChangesMessage(locale: "en" | "id") {
  return locale === "id"
    ? "Perubahan belum disimpan. Tinggalkan halaman ini dan buang perubahan?"
    : "You have unsaved changes. Leave this page and discard them?";
}

/** Do not expose raw server errors, which may contain internal or untranslated text. */
export function formSaveError(locale: "en" | "id", status?: number) {
  const messages = {
    auth: ["Your session has expired. Sign in again before saving.", "Sesi Anda telah berakhir. Masuk kembali sebelum menyimpan."],
    forbidden: ["You do not have permission to save this record or change its status.", "Anda tidak berwenang menyimpan data ini atau mengubah statusnya."],
    missing: ["This record is no longer available. Your changes have not been saved.", "Data ini tidak lagi tersedia. Perubahan Anda belum disimpan."],
    conflict: ["This record has changed or is locked. Your changes were not saved. Review the latest version before retrying.", "Data ini telah berubah atau dikunci. Perubahan Anda belum disimpan. Periksa versi terbaru sebelum mencoba lagi."],
    validation: ["Could not save. Check required fields and selected values, then try again.", "Tidak dapat menyimpan. Periksa kolom wajib dan nilai yang dipilih, lalu coba lagi."],
    server: ["The server could not save your changes. Please try again shortly.", "Server tidak dapat menyimpan perubahan Anda. Silakan coba lagi sebentar lagi."],
    network: ["Could not confirm the save. Check your connection and the latest record before retrying; your changes remain on this page.", "Penyimpanan belum dapat dikonfirmasi. Periksa koneksi dan data terbaru sebelum mencoba lagi; perubahan tetap ada di halaman ini."],
  };
  const key = status === 401 ? "auth" : status === 403 ? "forbidden" : status === 404 ? "missing" : status === 409 || status === 412 ? "conflict" : status === 400 || status === 422 ? "validation" : status ? "server" : "network";
  return messages[key][locale === "id" ? 1 : 0];
}

export function savedUpdatedAt(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("data" in payload)) return undefined;
  const data = payload.data;
  return data && typeof data === "object" && "updatedAt" in data && typeof data.updatedAt === "string" ? data.updatedAt : undefined;
}
