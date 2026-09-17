"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Save,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea, defaultFieldHelp } from "@/components/ui/form";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import {
  allowedKindsForRole,
  answerOptionsForQuestion,
  calculateSelfAssessmentSummary,
  generateSelfAssessmentActionPlan,
  getSelfAssessmentValidationIssues,
  isSelfAssessmentQuestionApplicable,
  isScoredSelfAssessmentQuestion,
  hasCurrentSelfAssessmentAnswers,
  hasLegacySelfAssessmentAnswers,
  legacySelfAssessmentQuestions,
  kindLabel,
  selfAssessmentActionStatusValues,
  selfAssessmentPriorityValues,
  selfAssessmentQuestions,
  type SelfAssessmentActionPlanItem,
  type SelfAssessmentAnswers,
  type SelfAssessmentEvidenceFile,
  type SelfAssessmentStatus,
} from "@/lib/self-assessment";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/language-provider";
import { AssessmentRevisionHistory, EvidenceReviewControl } from "@/components/self-assessment-review-controls";
import { useUnsavedChanges } from "@/components/use-unsaved-changes";

const SelfAssessmentPpGuidance = dynamic(() => import("@/components/self-assessment-pp-guidance"));

type Department = {
  id: string;
  name: string;
};

type SelfAssessmentWorkspacePayload = {
  id: string;
  assessmentNumber: string;
  title: string;
  departmentId: string | null;
  status: SelfAssessmentStatus;
  version: number;
  revision: number;
  ppGuidanceEnabled: boolean;
  answers: SelfAssessmentAnswers;
  actionPlan: SelfAssessmentActionPlanItem[];
};

type SectionKey = "questions" | "actionPlan";

export function SelfAssessmentWorkspace({
  assessment,
  departments,
  viewerRole,
  lockDepartment,
}: {
  assessment: SelfAssessmentWorkspacePayload;
  departments: Department[];
  viewerRole: "MasterAdmin" | "DPO" | "User";
  lockDepartment: boolean;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const [ppGuidanceEnabled, setPpGuidanceEnabled] = useState(assessment.ppGuidanceEnabled ?? false);
  const [isSavingGuidance, setIsSavingGuidance] = useState(false);
  const [guidanceError, setGuidanceError] = useState("");
  const allowedKinds = useMemo(() => allowedKindsForRole(viewerRole), [viewerRole]);
  const [activeSection, setActiveSection] = useState<SectionKey>("questions");
  const [title, setTitle] = useState(assessment.title);
  const [version, setVersion] = useState(assessment.version);
  const [revision, setRevision] = useState(assessment.revision);
  const [departmentId, setDepartmentId] = useState(assessment.departmentId ?? "");
  const [answers, setAnswers] = useState<SelfAssessmentAnswers>(assessment.answers);
  const [actionPlan, setActionPlan] = useState<SelfAssessmentActionPlanItem[]>(
    assessment.actionPlan.filter((item) => selfAssessmentQuestions.some((question) => question.id === item.questionId)),
  );
  const [status, setStatus] = useState<SelfAssessmentStatus>(
    hasLegacySelfAssessmentAnswers(assessment.answers) && !hasCurrentSelfAssessmentAnswers(assessment.answers) ? "Draft" : assessment.status,
  );
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState("");
  const content = JSON.stringify({ title, departmentId, answers, actionPlan });
  const [savedContent, setSavedContent] = useState(content);
  const dirty = content !== savedContent;
  const readOnly = status === "Finalized";
  useUnsavedChanges(dirty && !readOnly, locale === "en" ? "Unsaved changes will be lost. Leave this page?" : "Perubahan belum tersimpan akan hilang. Tinggalkan halaman?");
  const summary = useMemo(
    () => calculateSelfAssessmentSummary(answers, allowedKinds),
    [answers, allowedKinds],
  );
  const visibleQuestions = selfAssessmentQuestions.filter(
    (question) =>
      allowedKinds.includes(question.kind) &&
      isSelfAssessmentQuestionApplicable(question, answers),
  );
  const questionsByArea = groupByArea(visibleQuestions);

  async function togglePpGuidance(enabled: boolean) {
    setGuidanceError("");
    setIsSavingGuidance(true);
    try {
      const response = await fetch(`/api/self-assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ppGuidanceEnabled: enabled }),
      });
      if (!response.ok) throw new Error("Guidance preference could not be saved");
      setPpGuidanceEnabled(enabled);
    } catch {
      setGuidanceError(locale === "en" ? "Could not save the guidance preference. Please try again." : "Pilihan panduan belum tersimpan. Silakan coba kembali.");
    } finally {
      setIsSavingGuidance(false);
    }
  }

  function updateAnswer(
    questionId: string,
    field: keyof SelfAssessmentAnswers[string],
    value: string,
  ) {
    if (readOnly || isSaving) return;
    const emptyAnswer = {
      answer: "",
      note: "",
      pic: "",
      priority: "",
      evidenceFiles: [],
    } satisfies SelfAssessmentAnswers[string];

    setAnswers((current) => ({
      ...current,
      [questionId]: {
        ...emptyAnswer,
        ...current[questionId],
        ...((field === "answer" || field === "note") && current[questionId]?.[field] !== value ? { evidenceReview: undefined } : {}),
        [field]: value,
      },
    }));
  }

  function updateActionPlan(
    itemId: string,
    field: keyof SelfAssessmentActionPlanItem,
    value: string,
  ) {
    if (readOnly || isSaving) return;
    setActionPlan((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function uploadEvidence(questionId: string, file: File) {
    if (readOnly || isSaving || uploadingQuestionId) return;
    setMessage("");
    setUploadingQuestionId(questionId);
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("file", file);
    formData.append("expectedVersion", String(version));

    try {
    const response = await fetch(`/api/self-assessments/${assessment.id}/evidence`, {
      method: "POST",
      body: formData,
    });

    setUploadingQuestionId("");
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(payload?.error ?? "Gagal upload bukti.");
      return;
    }

    const payload = (await response.json()) as { data?: SelfAssessmentEvidenceFile & { assessmentVersion: number } };
    if (!payload.data) {
      setMessage("Gagal membaca hasil upload bukti.");
      return;
    }

    const uploadedEvidence = payload.data;
    setVersion(uploadedEvidence.assessmentVersion);
    setAnswers((current) => {
      const existingAnswer = current[questionId] ?? {
        answer: "",
        note: "",
        pic: "",
        priority: "",
        evidenceFiles: [],
      };
      return {
        ...current,
        [questionId]: {
          ...existingAnswer,
          evidenceReview: undefined,
          evidenceFiles: [...(existingAnswer.evidenceFiles ?? []), uploadedEvidence],
        },
      };
    });
    setMessage("Bukti berhasil di-upload.");
    } catch {
      setMessage(locale === "en" ? "Upload failed. Your answers are unchanged." : "Upload gagal. Jawaban Anda tetap tersimpan di form.");
    } finally { setUploadingQuestionId(""); }
  }

  async function openEvidence(evidenceId: string) {
    const response = await fetch(
      `/api/self-assessments/${assessment.id}/evidence/${evidenceId}/download`,
    );
    const payload = (await response.json().catch(() => null)) as {
      data?: { url: string };
      error?: string;
    } | null;

    if (!response.ok || !payload?.data?.url) {
      setMessage(payload?.error ?? "Gagal membuka bukti.");
      return;
    }

    window.open(payload.data.url, "_blank", "noopener,noreferrer");
  }

  function syncActionPlanFromAnswers() {
    const generated = generateSelfAssessmentActionPlan(answers, allowedKinds);
    setActionPlan((current) => mergeGeneratedActionPlan(generated, current));
  }

  async function save(
    nextStatus: SelfAssessmentStatus = status,
    options: { downloadAfter?: boolean } = {},
  ) {
    if (readOnly || isSaving || uploadingQuestionId) return;
    setMessage("");
    if (nextStatus !== "Draft") {
      const validationIssues = getSelfAssessmentValidationIssues(answers, allowedKinds);
      if (validationIssues.length) {
        setMessage(
          `Belum bisa ${nextStatus === "Finalized" ? "finalisasi" : "submit"}. ${validationIssues
            .slice(0, 3)
            .map((issue) => issue.message)
            .join(" ")}${validationIssues.length > 3 ? ` +${validationIssues.length - 3} isu lain.` : ""}`,
        );
        return;
      }
    }
    setIsSaving(true);
    try {
    const nextActionPlan = generateSelfAssessmentActionPlan(
      answers,
      allowedKinds,
    );

    const response = await fetch(`/api/self-assessments/${assessment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expectedVersion: version,
        reportLocale: locale,
        title,
        departmentId,
        answers,
        actionPlan: mergeGeneratedActionPlan(nextActionPlan, actionPlan),
        status: nextStatus,
      }),
    });

    if (!response.ok) {
      setMessage(response.status === 409 ? (locale === "en" ? "This assessment changed elsewhere. Your changes remain here; reload only after preserving them." : "Asesmen berubah di sesi lain. Isian Anda masih di sini; periksa perubahan sebelum memuat ulang.") : (locale === "en" ? "Could not save. Please try again." : "Gagal menyimpan. Silakan coba kembali."));
      return;
    }

    const payload = (await response.json()) as {
      data?: {
        status: SelfAssessmentStatus;
        version: number;
        answers: SelfAssessmentAnswers;
        actionPlan: SelfAssessmentActionPlanItem[];
      };
    };

    if (payload.data) {
      setStatus(payload.data.status);
      const savedActions = payload.data.actionPlan.filter((item) => selfAssessmentQuestions.some((question) => question.id === item.questionId));
      setActionPlan(savedActions);
      setAnswers(payload.data.answers);
      setVersion(payload.data.version);
      setSavedContent(JSON.stringify({ title, departmentId, answers: payload.data.answers, actionPlan: savedActions }));
    }

    setMessage(
      nextStatus === "Finalized"
        ? (locale === "en" ? "Self assessment finalized." : "Self assessment sudah difinalisasi.")
        : nextStatus === "Submitted"
          ? (locale === "en" ? "Assessment submitted for DPO review. Downloading the full report." : "Gap assessment sudah disubmit untuk review DPO. Full report sedang di-download.")
          : (locale === "en" ? "Self assessment saved." : "Self assessment tersimpan."),
    );
    router.refresh();

    if (options.downloadAfter) {
      window.location.href = `/api/self-assessments/${assessment.id}/export?locale=${locale}`;
    }
    } catch { setMessage(locale === "en" ? "Connection failed. Your changes remain in this form." : "Koneksi gagal. Isian Anda tetap ada di form ini."); }
    finally { setIsSaving(false); }
  }

  async function revise() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/self-assessments/${assessment.id}/revisions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: version }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setStatus(payload.data.status); setRevision(payload.data.revision); setVersion(payload.data.version);
      setMessage(locale === "en" ? "Revision created. The previous final version is retained." : "Revisi dibuat. Versi final sebelumnya tetap tersimpan.");
    } catch { setMessage(locale === "en" ? "Could not create revision. Reload and try again." : "Revisi gagal dibuat. Muat ulang lalu coba lagi."); }
    finally { setIsSaving(false); }
  }

  async function reviewEvidence(questionId: string, decision: { status: "Accepted" | "NeedsChanges"; strength: "Weak" | "Adequate" | "Strong"; note: string }) {
    if (dirty || readOnly) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/self-assessments/${assessment.id}/evidence-review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId, expectedVersion: version, ...decision }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setAnswers(payload.data.answers); setVersion(payload.data.version);
      setSavedContent(JSON.stringify({ title, departmentId, answers: payload.data.answers, actionPlan }));
      setMessage(locale === "en" ? "Evidence review saved." : "Review bukti tersimpan.");
    } catch { setMessage(locale === "en" ? "Review not saved. Check the latest version and try again." : "Review belum tersimpan. Periksa versi terbaru dan coba kembali."); }
    finally { setIsSaving(false); }
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/self-assessment">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {assessment.assessmentNumber}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Self Assessment Kepatuhan PDP
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Assessment ini dibuat sekali untuk setiap unit dan diperbarui berkala.
            Asesmen kepatuhan Pengendali Data Pribadi berdasarkan kontrol audit per pasal UU PDP.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/api/self-assessments/${assessment.id}/export?locale=${locale}`}>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              Download Full Report
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => void save("Draft")} disabled={isSaving || readOnly || Boolean(uploadingQuestionId)}>
            <Save className="h-4 w-4" />
            Simpan
          </Button>
          {viewerRole === "User" ? (
            <Button
              variant="warning"
              onClick={() => void save("Submitted", { downloadAfter: true })}
              disabled={isSaving || readOnly || Boolean(uploadingQuestionId)}
            >
              <Send className="h-4 w-4" />
              Submit
            </Button>
          ) : (
            <Button
              variant="dark"
              onClick={() => void save("Finalized")}
              disabled={isSaving || readOnly || Boolean(uploadingQuestionId)}
            >
              <ShieldCheck className="h-4 w-4" />
              Finalisasi
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_auto] lg:items-end">
            <div className="space-y-2">
              <Label help="Judul internal untuk snapshot self assessment unit ini.">
                Judul Assessment
              </Label>
              <Input value={title} disabled={readOnly || isSaving} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label help={defaultFieldHelp("Departemen")}>Departemen</Label>
              {lockDepartment || Boolean(assessment.departmentId) ? (
                <Input
                  value={
                    departments.find((department) => department.id === departmentId)
                      ?.name ?? departmentId
                  }
                  disabled
                />
              ) : (
                <Select
                  disabled={readOnly || isSaving}
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                >
                  <option value="">Pilih departemen</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-semibold text-slate-800">Status</span>
              <Badge tone={status === "Finalized" ? "green" : status === "Submitted" ? "blue" : "yellow"}>
                {status}
              </Badge>
            </div>
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">
              <input type="checkbox" role="switch" checked={ppGuidanceEnabled} disabled={isSavingGuidance || isSaving}
                onChange={(event) => void togglePpGuidance(event.target.checked)}
                className="h-4 w-4 accent-teal-600" />
              {locale === "en" ? "PP PDP guidance" : "Panduan PP PDP"}
            </label>
            {guidanceError ? <p role="alert" className="mt-2 text-sm text-rose-700">{guidanceError}</p> : null}
          </div>
          {message ? (
            <p className="mt-4 text-sm font-semibold text-blue-700">{message}</p>
          ) : null}
        </CardContent>
      </Card>

      <AssessmentRevisionHistory id={assessment.id} revision={revision} finalized={readOnly} busy={isSaving} onRevise={() => void revise()} />

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label={locale === "en" ? "Answered Controls" : "Kontrol Terjawab"} value={`${summary.answered}/${summary.totalQuestions}`} />
        <MetricCard label={locale === "en" ? "Applicable Controls" : "Kontrol Dinilai"} value={summary.applicable} />
        <MetricCard
          label={locale === "en" ? "Self-Declared Fulfillment" : "Pemenuhan Berdasarkan Deklarasi"}
          value={summary.percentage === null ? "N/A" : `${Math.round(summary.percentage * 100)}%`}
        />
        <MetricCard label={locale === "en" ? "Not in Place" : "Belum Ada"} value={summary.gaps} tone={summary.gaps ? "red" : "green"} />
        <MetricCard label={locale === "en" ? "In Progress" : "Dalam Proses"} value={summary.partial} />
      </div>

      {hasLegacySelfAssessmentAnswers(answers) ? (
        <details className="rounded-lg border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-semibold">Arsip jawaban kertas kerja sebelumnya</summary>
          <p className="my-3 text-sm text-slate-600">Jawaban dan bukti sebelumnya tetap tersimpan. Kontrol pada kertas kerja baru dinilai kembali secara terpisah.</p>
          {legacySelfAssessmentQuestions.filter((question) => answers[question.id]?.answer || answers[question.id]?.note || answers[question.id]?.evidenceFiles?.length).map((question) => (
            <details key={question.id} className="border-t border-slate-100 py-3">
              <summary className="cursor-pointer text-sm">{question.question} - {answers[question.id]?.answer || "Belum dijawab"}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm">{answers[question.id]?.note}</p>
              {answers[question.id]?.evidenceFiles?.map((file) => <Button key={file.id} variant="secondary" onClick={() => void openEvidence(file.id)}><ExternalLink className="h-4 w-4" />{file.fileName}</Button>)}
            </details>
          ))}
        </details>
      ) : null}

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <SectionButton
              active={activeSection === "questions"}
              onClick={() => setActiveSection("questions")}
            >
              Pertanyaan
            </SectionButton>
            <SectionButton
              active={activeSection === "actionPlan"}
              onClick={() => {
                syncActionPlanFromAnswers();
                setActiveSection("actionPlan");
              }}
            >
              Action Plan
            </SectionButton>
          </div>

          {activeSection === "questions" ? (
            <Questionnaire
              questionsByArea={questionsByArea}
              ppGuidanceEnabled={ppGuidanceEnabled}
              readOnly={readOnly || isSaving}
              canReview={viewerRole !== "User" && !readOnly}
              reviewDisabled={dirty || isSaving || Boolean(uploadingQuestionId)}
              reviewEvidence={reviewEvidence}
              answers={answers}
              updateAnswer={updateAnswer}
              uploadEvidence={uploadEvidence}
              openEvidence={openEvidence}
              uploadingQuestionId={uploadingQuestionId}
            />
          ) : (
            <ActionPlanEditor
              readOnly={readOnly || isSaving}
              canClose={viewerRole !== "User"}
              items={actionPlan}
              onUpdate={updateActionPlan}
              onRegenerate={syncActionPlanFromAnswers}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SectionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant={active ? "default" : "secondary"} onClick={onClick}>
      {children}
    </Button>
  );
}

function MetricCard({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  tone?: "blue" | "green" | "red";
}) {
  const toneClass = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-emerald-600 bg-emerald-50",
    red: "text-rose-600 bg-rose-50",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-lg", toneClass)}>
          <ShieldCheck className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function mergeGeneratedActionPlan(
  generated: SelfAssessmentActionPlanItem[],
  current: SelfAssessmentActionPlanItem[],
) {
  return generated.map((item) => {
    const existing = current.find((row) => row.id === item.id);
    if (!existing) {
      return item;
    }

    return {
      ...item,
      followUp: existing.followUp || item.followUp,
      owner: existing.owner || item.owner,
      targetDate: existing.targetDate || item.targetDate,
      status: existing.status || item.status,
      priority: existing.priority || item.priority,
      note: existing.note || item.note,
      completionEvidence: existing.completionEvidence,
      closedBy: existing.closedBy,
      closedAt: existing.closedAt,
    };
  });
}

function Questionnaire({
  questionsByArea,
  ppGuidanceEnabled,
  readOnly, canReview, reviewDisabled, reviewEvidence,
  answers,
  updateAnswer,
  uploadEvidence,
  openEvidence,
  uploadingQuestionId,
}: {
  questionsByArea: Array<{ area: string; questions: typeof selfAssessmentQuestions }>;
  ppGuidanceEnabled: boolean;
  readOnly: boolean;
  canReview: boolean;
  reviewDisabled: boolean;
  reviewEvidence: (questionId: string, decision: { status: "Accepted" | "NeedsChanges"; strength: "Weak" | "Adequate" | "Strong"; note: string }) => Promise<void>;
  answers: SelfAssessmentAnswers;
  updateAnswer: (
    questionId: string,
    field: keyof SelfAssessmentAnswers[string],
    value: string,
  ) => void;
  uploadEvidence: (questionId: string, file: File) => Promise<void>;
  openEvidence: (evidenceId: string) => Promise<void>;
  uploadingQuestionId: string;
}) {
  const [activeArea, setActiveArea] = useState(questionsByArea[0]?.area ?? "");
  const [controlPage, setControlPage] = useState(0);
  const selectedGroup = questionsByArea.find((group) => group.area === activeArea);
  const pageCount = Math.ceil((selectedGroup?.questions.length ?? 0) / 6);
  const { locale } = useI18n();
  const en = locale === "en";
  const answerLabels: Record<string, string> = { "Sudah Ada": "Implemented", "Dalam Proses": "In Progress", "Belum Ada": "Not Implemented", "Tidak Relevan": "Not Applicable" };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={en ? "Assessment sections" : "Bagian asesmen"}>
        {questionsByArea.map((group) => (
          <button key={group.area} type="button" role="tab" aria-selected={activeArea === group.area}
            onClick={() => { setActiveArea(group.area); setControlPage(0); }}
            className={cn("max-w-full rounded-lg border px-4 py-3 text-left text-sm font-semibold", activeArea === group.area ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600")}>
            {group.area}
            <span className="ml-2 text-xs">{group.questions.filter((q) => answers[q.id]?.answer).length}/{group.questions.length}</span>
          </button>
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button variant="secondary" disabled={controlPage === 0} onClick={() => setControlPage((page) => page - 1)}>{en ? "Previous" : "Sebelumnya"}</Button>
          <span className="text-sm text-slate-600">{en ? "Page" : "Halaman"} {controlPage + 1} / {pageCount}</span>
          <Button variant="secondary" disabled={controlPage >= pageCount - 1} onClick={() => setControlPage((page) => page + 1)}>{en ? "Next" : "Berikutnya"}</Button>
        </div>
      ) : null}

      {questionsByArea.filter((group) => group.area === activeArea).map((group) => (
        <section key={group.area} className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <h2 className="font-bold text-slate-950">{group.area}</h2>
            <Badge tone="blue">{group.questions.length} {en ? "questions" : "pertanyaan"}</Badge>
          </div>
          {group.questions.slice(controlPage * 6, (controlPage + 1) * 6).map((question) => {
            const answer = answers[question.id] ?? {
              answer: "",
              note: "",
              pic: "",
              priority: "",
              evidenceFiles: [],
            };
            return (
              <div
                key={question.id}
                className="rounded-lg border border-[color:var(--pv-border)] bg-white p-5"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                      {en ? "Control" : "Kontrol"} {question.number} - {question.reference}
                    </p>
                    <h3 className="text-base font-bold leading-6 text-slate-950">
                      {question.question}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      <span className="font-semibold text-slate-800">{en ? "Objective:" : "Tujuan:"}</span>{" "}
                      {question.objective || "-"}
                    </p>
                    <details className="text-sm leading-6 text-slate-600">
                      <summary className="cursor-pointer font-semibold">{en ? "Article text" : "Isi pasal"}</summary>
                      <p className="mt-2 whitespace-pre-wrap">{question.articleText}</p>
                    </details>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge tone="slate">{question.reference || "Referensi umum"}</Badge>
                  </div>
                </div>

                {ppGuidanceEnabled ? <SelfAssessmentPpGuidance question={question} /> : null}

                <div
                  className={cn(
                    "mt-5 grid gap-4",
                    isScoredSelfAssessmentQuestion(question)
                      ? "lg:grid-cols-[minmax(220px,0.7fr)_1fr]"
                      : "lg:grid-cols-[minmax(220px,360px)]",
                  )}
                >
                  <div className="space-y-2">
                    <Label help={en ? "Implemented: the control operates. In Progress: preparation or implementation is incomplete. Not Implemented: the control is not operating. Not Applicable: the control does not apply to the assessed process." : "Sudah Ada: kontrol dilaksanakan. Dalam Proses: sedang disiapkan atau belum lengkap. Belum Ada: belum dilaksanakan. Tidak Relevan: tidak berlaku pada proses yang dinilai."}>
                      {en ? "Control status" : "Status Kontrol"}
                    </Label>
                    <Select
                      disabled={readOnly}
                      value={answer.answer}
                      onChange={(event) =>
                        updateAnswer(question.id, "answer", event.target.value)
                      }
                    >
                      <option value="">{en ? "Select answer" : "Pilih jawaban"}</option>
                      {answerOptionsForQuestion(question).map((value) => (
                        <option key={value} value={value}>
                          {en ? answerLabels[value] ?? value : value}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {isScoredSelfAssessmentQuestion(question) ? (
                    <EvidenceUploader
                      readOnly={readOnly}
                      question={question}
                      questionId={question.id}
                      evidenceRequirement={question.evidence}
                      answer={answer}
                      files={answer.evidenceFiles ?? []}
                      isUploading={uploadingQuestionId === question.id}
                      onUpload={uploadEvidence}
                      onOpen={openEvidence}
                    />
                  ) : null}
                </div>

                <EvidenceReviewControl answer={answer} canReview={canReview} disabled={reviewDisabled} onReview={(decision) => reviewEvidence(question.id, decision)} />

                {isScoredSelfAssessmentQuestion(question) ? (
                  <div className="mt-4">
                    <div className="space-y-2">
                      <Label help={en ? "Describe the assessed process, any gaps, and supporting references. A specific reason is needed to exclude an inapplicable control from scoring." : buildNoteHelp(question, answer.answer)}>
                        {answer.answer === "Tidak Relevan" ? (en ? "Reason for N/A (Required)" : "Alasan Tidak Relevan (Wajib)") : (en ? "Notes (Optional)" : "Catatan Lanjutan (Opsional)")}
                      </Label>
                      <Textarea
                        disabled={readOnly}
                        value={answer.note}
                        required={answer.answer === "Tidak Relevan"}
                        onChange={(event) => updateAnswer(question.id, "note", event.target.value)}
                        className="min-h-28"
                        placeholder={en ? "Describe any gap, cause, affected process, and known follow-up plan..." : "Jelaskan gap, penyebab, proses terdampak, dan rencana tindak lanjut bila diketahui..."}
                      />
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label help={en ? "The person responsible for this control." : "Nama penanggung jawab atau narahubung untuk kontrol ini."}>{en ? "Control Owner / Contact (Optional)" : "Penanggung Jawab / CP (Opsional)"}</Label>
                      <Input disabled={readOnly} value={answer.pic} onChange={(event) => updateAnswer(question.id, "pic", event.target.value)} placeholder={en ? "Owner name" : "Nama penanggung jawab"} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function EvidenceUploader({
  readOnly,
  question,
  questionId,
  evidenceRequirement,
  answer,
  files,
  isUploading,
  onUpload,
  onOpen,
}: {
  readOnly: boolean;
  question: (typeof selfAssessmentQuestions)[number];
  questionId: string;
  evidenceRequirement: string;
  answer: SelfAssessmentAnswers[string];
  files: SelfAssessmentEvidenceFile[];
  isUploading: boolean;
  onUpload: (questionId: string, file: File) => Promise<void>;
  onOpen: (evidenceId: string) => Promise<void>;
}) {
  const { locale } = useI18n();
  const en = locale === "en";
  void answer;
  return (
    <div className="space-y-2">
      <Label help={en ? "Attachments are optional and do not affect your declaration score or submission." : "Lampiran bersifat opsional dan tidak memengaruhi skor deklarasi atau pengajuan."}>
        {en ? "Supporting Attachments (Optional)" : "Lampiran Pendukung (Opsional)"}
      </Label>
      <div className="rounded-lg border border-[color:var(--pv-border)] bg-slate-50 p-3">
        <p className="text-xs font-semibold leading-5 text-slate-500">
          {en ? "Optional reference: " : "Referensi opsional: "}{evidenceRequirement || "-"}
        </p>
        {question.recommendedEvidence ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {en ? "Suggested: " : "Saran: "}{question.recommendedEvidence}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="slate">{en ? "Optional" : "Opsional"}</Badge>
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-200 bg-white px-3 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50">
          <Upload className="h-4 w-4" />
          {isUploading ? (en ? "Uploading..." : "Mengunggah...") : (en ? "Upload attachment" : "Unggah lampiran")}
          <input
            type="file"
            className="sr-only"
            disabled={isUploading || readOnly}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void onUpload(questionId, file);
              }
            }}
          />
        </label>
        {files.length ? (
          <div className="mt-3 space-y-2">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-700 ring-1 ring-slate-200 hover:text-blue-700"
                onClick={() => void onOpen(file.id)}
              >
                <span className="min-w-0 truncate font-semibold">{file.fileName}</span>
                <ExternalLink className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs font-semibold text-slate-400">
            {en ? "No attachments; attachments are optional." : "Tidak ada lampiran; lampiran bersifat opsional."}
          </p>
        )}
      </div>
    </div>
  );
}

function buildNoteHelp(
  question: (typeof selfAssessmentQuestions)[number],
  answer: string,
) {
  if (answer === "Tidak Relevan") return "Jelaskan alasan spesifik kontrol tidak berlaku pada unit atau proses ini. Alasan diperlukan untuk mengecualikan kontrol dari penilaian.";
  if (!isScoredSelfAssessmentQuestion(question)) {
    return (
      sanitizeAssessmentHelp(question.noteRequiredWhen) ||
      "Untuk jawaban Ya, Sebagian, atau Tidak Tahu, jelaskan proses, sistem, data, PIC, dan batasan relevansi unit."
    );
  }

  return "Opsional. Gunakan kolom ini jika perlu menjelaskan konteks, gap, penyebab, proses terdampak, atau rencana tindak lanjut.";
}

function sanitizeAssessmentHelp(value?: string) {
  return value
    ?.replace(/N\/A/g, "Tidak Relevan")
    .replace(/Sebagian\/Tidak\/Tidak Tahu\/Tidak Relevan/g, "Sebagian/Tidak Ada/Tidak Tahu/Tidak Relevan")
    .replace(/jawaban Sebagian\/Tidak\/Tidak Tahu\/Tidak Relevan/gi, "jawaban Sebagian/Tidak Ada/Tidak Tahu/Tidak Relevan")
    .replace(/skor 0-2/gi, "jawaban Tidak Ada, Sebagian, atau Tidak Tahu")
    .replace(/skor 3-5/gi, "jawaban Ada")
    .replace(/PIC,?\s*/gi, "")
    .replace(/status Implemented\/Managed\/Optimized/gi, "status Ada");
}

function ActionPlanEditor({
  readOnly, canClose,
  items,
  onUpdate,
  onRegenerate,
}: {
  readOnly: boolean;
  canClose: boolean;
  items: SelfAssessmentActionPlanItem[];
  onUpdate: (
    itemId: string,
    field: keyof SelfAssessmentActionPlanItem,
    value: string,
  ) => void;
  onRegenerate: () => void;
}) {
  return (
    <fieldset disabled={readOnly} className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Action Plan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Dibuat dari jawaban Tidak, Tidak Tahu, atau Sebagian dan bisa
            disesuaikan sebelum disimpan.
          </p>
        </div>
        <Button variant="secondary" onClick={onRegenerate}>
          Sinkronkan Gap
        </Button>
      </div>

      <Table>
        <THead>
          <tr>
            <TH>Finding</TH>
            <TH>Follow Up</TH>
            <TH>Owner</TH>
            <TH>Target</TH>
            <TH>Status</TH>
            <TH>Prioritas</TH>
          </tr>
        </THead>
        <TBody>
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <TD className="min-w-[280px]">
                <p className="font-semibold text-slate-950">{item.finding}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {kindLabel(item.source)}
                </p>
              </TD>
              <TD className="min-w-[320px]">
                <Textarea
                  value={item.followUp}
                  onChange={(event) => onUpdate(item.id, "followUp", event.target.value)}
                  className="min-h-24"
                />
                <Textarea aria-label="Completion evidence" placeholder="Completion evidence / Bukti penyelesaian" value={item.completionEvidence ?? ""} onChange={(event) => onUpdate(item.id, "completionEvidence", event.target.value)} className="mt-2 min-h-20" />
              </TD>
              <TD className="min-w-[180px]">
                <Input
                  value={item.owner}
                  onChange={(event) => onUpdate(item.id, "owner", event.target.value)}
                />
              </TD>
              <TD className="min-w-[160px]">
                <Input
                  type="date"
                  value={item.targetDate}
                  onChange={(event) => onUpdate(item.id, "targetDate", event.target.value)}
                />
              </TD>
              <TD className="min-w-[160px]">
                <Select
                  value={item.status}
                  onChange={(event) => onUpdate(item.id, "status", event.target.value)}
                >
                  {selfAssessmentActionStatusValues.filter((value) => canClose || value !== "Done" || item.status === "Done").map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </TD>
              <TD className="min-w-[150px]">
                <Select
                  value={item.priority}
                  onChange={(event) => onUpdate(item.id, "priority", event.target.value)}
                >
                  {selfAssessmentPriorityValues.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </TD>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <TD colSpan={6} className="py-10 text-center text-slate-500">
                Belum ada action plan. Jawaban Tidak, Tidak Tahu, atau Sebagian
                akan muncul di sini.
              </TD>
            </tr>
          ) : null}
        </TBody>
      </Table>
    </fieldset>
  );
}

function groupByArea(questions: typeof selfAssessmentQuestions) {
  const map = new Map<string, { area: string; questions: typeof selfAssessmentQuestions }>();
  for (const question of questions) {
    const row = map.get(question.area) ?? { area: question.area, questions: [] };
    row.questions.push(question);
    map.set(question.area, row);
  }
  return [...map.values()];
}
