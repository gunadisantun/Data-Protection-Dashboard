import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "blue" | "green" | "yellow" | "red" | "slate" | "purple";

const tones: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  yellow: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-rose-50 text-rose-700 ring-rose-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-100",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
