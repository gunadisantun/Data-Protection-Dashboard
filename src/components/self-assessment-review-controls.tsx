"use client";

import { useEffect, useState } from "react";
import { FileDown, GitBranchPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/form";
import { useI18n } from "@/components/language-provider";
import type { SelfAssessmentAnswerState } from "@/lib/self-assessment";

export function AssessmentRevisionHistory({ id, revision, finalized, busy, onRevise }: { id: string; revision: number; finalized: boolean; busy: boolean; onRevise: () => void }) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [rows, setRows] = useState<Array<{ revision: number; finalizedAt: string }>>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/self-assessments/${id}/revisions`, { signal: controller.signal }).then((response) => response.ok ? response.json() : null).then((payload) => { if (payload?.data) setRows(payload.data); }).catch(() => {});
    return () => controller.abort();
  }, [id, revision, finalized]);
  return <div className="flex flex-wrap items-center gap-3 border-y border-slate-200 py-3 text-sm">
    <span className="font-semibold">{en ? "Revision" : "Revisi"} {revision}</span>
    {finalized ? <Button variant="secondary" onClick={onRevise} disabled={busy}><GitBranchPlus className="h-4 w-4" />{en ? "Create Revision" : "Buat Revisi"}</Button> : null}
    {rows.length ? <details className="min-w-0">
      <summary className="cursor-pointer font-semibold text-blue-700">{en ? "Final version history" : "Riwayat versi final"} ({rows.length})</summary>
      <ul className="mt-2 space-y-2">{rows.map((row) => <li key={row.revision}><a className="inline-flex items-center gap-2 text-blue-700" href={`/api/self-assessments/${id}/export?revision=${row.revision}`}><FileDown className="h-4 w-4" />{en ? "Revision" : "Revisi"} {row.revision} - {new Date(row.finalizedAt).toLocaleDateString(en ? "en-GB" : "id-ID")}</a></li>)}</ul>
    </details> : null}
  </div>;
}

export function EvidenceReviewControl({ answer, canReview, disabled, onReview }: { answer: SelfAssessmentAnswerState; canReview: boolean; disabled: boolean; onReview: (decision: { status: "Accepted" | "NeedsChanges"; strength: "Weak" | "Adequate" | "Strong"; note: string }) => Promise<void> }) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [status, setStatus] = useState<"Accepted" | "NeedsChanges">("Accepted");
  const [strength, setStrength] = useState<"Weak" | "Adequate" | "Strong">("Adequate");
  const [note, setNote] = useState("");
  const review = answer.evidenceReview;
  if (!answer.evidenceFiles?.length) return null;
  return <div className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
    <p className="font-semibold">{en ? "Evidence review" : "Review bukti"}: {review?.status === "Accepted" ? (en ? "Accepted" : "Diterima") : review?.status === "NeedsChanges" ? (en ? "Changes requested" : "Perlu perbaikan") : (en ? "Not reviewed" : "Belum direview")}</p>
    {review ? <p className="text-slate-600">{review.note} <span className="text-xs">({new Date(review.reviewedAt).toLocaleDateString(en ? "en-GB" : "id-ID")})</span></p> : null}
    {canReview ? <details><summary className="cursor-pointer text-blue-700">{en ? "DPO decision" : "Keputusan DPO"}</summary>
      <fieldset disabled={disabled} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select aria-label={en ? "Review decision" : "Keputusan review"} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="Accepted">{en ? "Accept evidence" : "Terima bukti"}</option><option value="NeedsChanges">{en ? "Request changes" : "Minta perbaikan"}</option></Select>
          <Select aria-label={en ? "Evidence strength" : "Kekuatan bukti"} value={strength} disabled={status === "NeedsChanges" || disabled} onChange={(event) => setStrength(event.target.value as typeof strength)}><option value="Adequate">{en ? "Adequate" : "Memadai"}</option><option value="Strong">{en ? "Strong" : "Kuat"}</option></Select>
        </div>
        <Textarea aria-label={en ? "Review note" : "Catatan review"} value={note} onChange={(event) => setNote(event.target.value)} />
        <Button variant="secondary" disabled={disabled || note.trim().length < 3} onClick={() => void onReview({ status, strength, note })}><ShieldCheck className="h-4 w-4" />{en ? "Save review" : "Simpan review"}</Button>
      </fieldset>
    </details> : null}
  </div>;
}
