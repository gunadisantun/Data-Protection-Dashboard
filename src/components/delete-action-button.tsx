"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/language-provider";

type DeleteActionButtonProps = {
  endpoint: string;
  label?: string;
  confirmMessage: string;
  redirectTo?: string;
  compact?: boolean;
};

export function DeleteActionButton({
  endpoint,
  label,
  confirmMessage,
  redirectTo,
  compact = false,
}: DeleteActionButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);
  const resolvedLabel = label ?? t("common.delete");

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    const response = await fetch(endpoint, { method: "DELETE" });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      window.alert(payload?.error ?? t("common.deleteFailed"));
      setIsDeleting(false);
      return;
    }

    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }

    router.refresh();
    setIsDeleting(false);
  }

  return (
    <Button
      variant="ghost"
      size={compact ? "icon" : "sm"}
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
      onClick={() => void handleDelete()}
      disabled={isDeleting}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      <Trash2 className="h-4 w-4" />
      {compact ? null : isDeleting ? t("common.deleting") : resolvedLabel}
    </Button>
  );
}
