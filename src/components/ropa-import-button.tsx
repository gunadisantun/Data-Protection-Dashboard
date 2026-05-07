"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImportResponse = {
  imported?: number;
  created?: Array<{ rowNumber: number; id: string; triggers: string[] }>;
  warnings?: string[];
  error?: string;
  issues?: Array<{ rowNumber: number; messages: string[] }>;
};

export function RopaImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function handleFile(file: File) {
    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ropa/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as ImportResponse | null;

      if (!response.ok) {
        window.alert(formatImportError(payload));
        return;
      }

      const triggerSummary = summarizeTriggers(payload?.created ?? []);
      const warningText = payload?.warnings?.length
        ? `\n\nCatatan:\n${payload.warnings.slice(0, 5).join("\n")}`
        : "";

      window.alert(
        `Berhasil import ${payload?.imported ?? 0} aktivitas RoPA.${triggerSummary}${warningText}`,
      );
      router.refresh();
    } finally {
      setIsImporting(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleFile(file);
          }
        }}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={isImporting}
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {isImporting ? "Importing..." : "Import Excel"}
      </Button>
    </>
  );
}

function formatImportError(payload: ImportResponse | null) {
  const issues = payload?.issues
    ?.slice(0, 8)
    .map((issue) => `Row ${issue.rowNumber}: ${issue.messages.join("; ")}`)
    .join("\n");

  return [
    payload?.error ?? "Import RoPA gagal.",
    issues ? `\nDetail:\n${issues}` : "",
  ].join("");
}

function summarizeTriggers(
  created: Array<{ rowNumber: number; id: string; triggers: string[] }>,
) {
  const counts = created.reduce<Record<string, number>>((accumulator, row) => {
    row.triggers.forEach((trigger) => {
      accumulator[trigger] = (accumulator[trigger] ?? 0) + 1;
    });

    return accumulator;
  }, {});

  const summary = Object.entries(counts)
    .map(([trigger, count]) => `${trigger}: ${count}`)
    .join(", ");

  return summary ? `\nTriggered assessment: ${summary}.` : "";
}
