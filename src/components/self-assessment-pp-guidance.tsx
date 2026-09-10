"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { useI18n } from "@/components/language-provider";
import { getControlPpGuidance, ppGuidanceSourceWorkbook } from "@/lib/self-assessment-pp-guidance";
import type { SelfAssessmentQuestion } from "@/lib/self-assessment";

export default function SelfAssessmentPpGuidance({ question }: { question: SelfAssessmentQuestion }) {
  const { locale } = useI18n();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const { articles, unmappedNote } = getControlPpGuidance(question);
  return (
    <div className="mt-4 border-y border-teal-100 bg-teal-50/50" data-testid="pp-guidance">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={`pp-guidance-${question.id}`}
        className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold text-teal-900">
        <BookOpen className="h-4 w-4 shrink-0" />
        <span className="flex-1">{en ? "PP PDP guidance" : "Panduan PP PDP"} <span className="font-normal">({articles.length} {en ? "related articles" : "pasal terkait"})</span></span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <div id={`pp-guidance-${question.id}`} hidden={!open}>
        {open ? (
          <div className="space-y-3 px-3 pb-4 text-sm leading-6">
            {articles.length ? articles.map((article) => (
              <details key={article.id} className="border-t border-teal-100 pt-3" data-testid="pp-article">
                <summary className="cursor-pointer font-semibold text-teal-900">{article.reference}</summary>
                <div className="mt-3 space-y-4 break-words">
                  <p className="whitespace-pre-wrap text-slate-700" lang="id" translate="no">{article.articleText}</p>
                  <div>
                    <h4 className="font-semibold">{en ? "Official explanation" : "Penjelasan resmi"}</h4>
                    <p className="whitespace-pre-wrap text-slate-600" lang="id" translate="no">{article.officialExplanation || (en ? "Not provided in the workbook." : "Tidak tersedia pada workbook.")}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">{en ? "Mapping notes" : "Catatan mapping"}</h4>
                    {article.mappingNotes.map((note) => <div key={note.sourceRow} className="mt-2" lang="id" translate="no">
                      {note.topic ? <p className="font-medium">{note.topic}</p> : null}
                      <p className="whitespace-pre-wrap text-slate-600">{note.note || (en ? "No additional note." : "Tidak ada catatan tambahan.")}</p>
                      <p className="text-xs text-slate-500">Mapping UU ke PP - {en ? "row" : "baris"} {note.sourceRow}</p>
                    </div>)}
                  </div>
                  <div>
                    <h4 className="font-semibold">{en ? "Related documents" : "Dokumen terkait"}</h4>
                    {article.documentReferences.length ? <ul className="mt-2 space-y-3">
                      {article.documentReferences.map((doc) => <li key={doc.name} lang="id" translate="no">
                        <p className="font-medium">{doc.name}{doc.status ? ` (${doc.status})` : ""}</p>
                        {doc.trigger ? <p className="whitespace-pre-wrap text-slate-600">{doc.trigger}</p> : null}
                        {doc.relevance ? <p className="whitespace-pre-wrap text-slate-600">{doc.relevance}</p> : null}
                        <p className="text-xs text-slate-500">Mapping Dokumen - {en ? "row" : "baris"} {doc.sourceRows.join(", ")}</p>
                      </li>)}
                    </ul> : <p className="text-slate-600">{en ? "No document mapping in the workbook." : "Tidak ada mapping dokumen pada workbook."}</p>}
                  </div>
                </div>
              </details>
            )) : <p lang="id" translate="no">{unmappedNote || (en ? "No PP article mapped to this control in the workbook." : "Tidak ada pasal PP yang dipetakan untuk kontrol ini pada workbook.")}</p>}
            <p className="break-words border-t border-teal-100 pt-3 text-xs text-slate-500">{ppGuidanceSourceWorkbook}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
