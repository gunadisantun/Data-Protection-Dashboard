"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileCheck2,
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
  countTriggeredL2Questions,
  generateSelfAssessmentActionPlan,
  getEvidenceStrength,
  getSelfAssessmentValidationIssues,
  isSelfAssessmentQuestionApplicable,
  isScoredSelfAssessmentQuestion,
  kindLabel,
  selfAssessmentActionStatusValues,
  selfAssessmentPriorityValues,
  selfAssessmentQuestions,
  type SelfAssessmentActionPlanItem,
  type SelfAssessmentAnswers,
  type SelfAssessmentEvidenceFile,
  type SelfAssessmentKind,
  type SelfAssessmentStatus,
} from "@/lib/self-assessment";
import { cn } from "@/lib/utils";

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
  const allowedKinds = useMemo(() => allowedKindsForRole(viewerRole), [viewerRole]);
  const [activeSection, setActiveSection] = useState<SectionKey>("questions");
  const [activeKind, setActiveKind] = useState<SelfAssessmentKind>(allowedKinds[0]);
  const [title, setTitle] = useState(assessment.title);
  const [departmentId, setDepartmentId] = useState(assessment.departmentId ?? "");
  const [answers, setAnswers] = useState<SelfAssessmentAnswers>(assessment.answers);
  const [actionPlan, setActionPlan] = useState<SelfAssessmentActionPlanItem[]>(
    assessment.actionPlan,
  );
  const [status, setStatus] = useState<SelfAssessmentStatus>(assessment.status);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState("");
  const summary = useMemo(
    () => calculateSelfAssessmentSummary(answers, allowedKinds),
    [answers, allowedKinds],
  );
  const triggeredL2Count = countTriggeredL2Questions(answers);
  const visibleQuestions = selfAssessmentQuestions.filter(
    (question) =>
      question.kind === activeKind &&
      isSelfAssessmentQuestionApplicable(question, answers),
  );
  const questionsByArea = groupByArea(visibleQuestions);

  function updateAnswer(
    questionId: string,
    field: keyof SelfAssessmentAnswers[string],
    value: string,
  ) {
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
        [field]: value,
      },
    }));
  }

  function updateActionPlan(
    itemId: string,
    field: keyof SelfAssessmentActionPlanItem,
    value: string,
  ) {
    setActionPlan((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function uploadEvidence(questionId: string, file: File) {
    setMessage("");
    setUploadingQuestionId(questionId);
    const formData = new FormData();
    formData.append("questionId", questionId);
    formData.append("file", file);

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

    const payload = (await response.json()) as { data?: SelfAssessmentEvidenceFile };
    if (!payload.data) {
      setMessage("Gagal membaca hasil upload bukti.");
      return;
    }

    const uploadedEvidence = payload.data;
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
          evidenceFiles: [...(existingAnswer.evidenceFiles ?? []), uploadedEvidence],
        },
      };
    });
    setMessage("Bukti berhasil di-upload.");
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
    const nextActionPlan = generateSelfAssessmentActionPlan(
      answers,
      allowedKinds,
    );

    const response = await fetch(`/api/self-assessments/${assessment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        departmentId,
        answers,
        actionPlan: mergeGeneratedActionPlan(nextActionPlan, actionPlan),
        status: nextStatus,
      }),
    });

    setIsSaving(false);
    if (!response.ok) {
      setMessage("Gagal menyimpan. Cek kembali field dan akses akun.");
      return;
    }

    const payload = (await response.json()) as {
      data?: {
        status: SelfAssessmentStatus;
        actionPlan: SelfAssessmentActionPlanItem[];
      };
    };

    if (payload.data) {
      setStatus(payload.data.status);
      setActionPlan(payload.data.actionPlan);
    }

    setMessage(
      nextStatus === "Finalized"
        ? "Self assessment sudah difinalisasi."
        : nextStatus === "Submitted"
          ? "Gap assessment sudah disubmit untuk review DPO. Full report sedang di-download."
          : "Self assessment tersimpan.",
    );
    router.refresh();

    if (options.downloadAfter) {
      window.location.href = `/api/self-assessments/${assessment.id}/export`;
    }
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
            Level 1 hanya untuk menentukan relevansi unit. Skor, gap analysis,
            evidence review, dan rekomendasi remediasi dihitung dari Level 2 yang
            terpicu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/api/self-assessments/${assessment.id}/export`}>
            <Button variant="secondary">
              <Download className="h-4 w-4" />
              Download Full Report
            </Button>
          </Link>
          <Button variant="secondary" onClick={() => void save("Draft")} disabled={isSaving}>
            <Save className="h-4 w-4" />
            Simpan
          </Button>
          {viewerRole === "User" ? (
            <Button
              variant="warning"
              onClick={() => void save("Submitted", { downloadAfter: true })}
              disabled={isSaving}
            >
              <Send className="h-4 w-4" />
              Submit
            </Button>
          ) : (
            <Button
              variant="dark"
              onClick={() => void save("Finalized")}
              disabled={isSaving}
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
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label help={defaultFieldHelp("Departemen")}>Departemen</Label>
              {lockDepartment ? (
                <Input
                  value={
                    departments.find((department) => department.id === departmentId)
                      ?.name ?? departmentId
                  }
                  disabled
                />
              ) : (
                <Select
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
          {message ? (
            <p className="mt-4 text-sm font-semibold text-blue-700">{message}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard label="L2 Terjawab" value={`${summary.answered}/${summary.totalQuestions}`} />
        <MetricCard label="L2 Dinilai" value={summary.applicable} />
        <MetricCard
          label="Nilai L2"
          value={summary.percentage === null ? "N/A" : `${Math.round(summary.percentage * 100)}%`}
        />
        <MetricCard label="Gap L2" value={summary.gaps} tone={summary.gaps ? "red" : "green"} />
        <MetricCard label="L2 Terpicu" value={triggeredL2Count} />
      </div>

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
              allowedKinds={allowedKinds}
              activeKind={activeKind}
              setActiveKind={setActiveKind}
              questionsByArea={questionsByArea}
              answers={answers}
              updateAnswer={updateAnswer}
              uploadEvidence={uploadEvidence}
              openEvidence={openEvidence}
              uploadingQuestionId={uploadingQuestionId}
              triggeredL2Count={triggeredL2Count}
            />
          ) : (
            <ActionPlanEditor
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
    };
  });
}

function Questionnaire({
  allowedKinds,
  activeKind,
  setActiveKind,
  questionsByArea,
  answers,
  updateAnswer,
  uploadEvidence,
  openEvidence,
  uploadingQuestionId,
  triggeredL2Count,
}: {
  allowedKinds: SelfAssessmentKind[];
  activeKind: SelfAssessmentKind;
  setActiveKind: (kind: SelfAssessmentKind) => void;
  questionsByArea: Array<{ area: string; questions: typeof selfAssessmentQuestions }>;
  answers: SelfAssessmentAnswers;
  updateAnswer: (
    questionId: string,
    field: keyof SelfAssessmentAnswers[string],
    value: string,
  ) => void;
  uploadEvidence: (questionId: string, file: File) => Promise<void>;
  openEvidence: (evidenceId: string) => Promise<void>;
  uploadingQuestionId: string;
  triggeredL2Count: number;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {allowedKinds.map((kind) => {
          const questionCount =
            kind === "ADDITIONAL"
              ? triggeredL2Count
              : selfAssessmentQuestions.filter((item) => item.kind === kind).length;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => setActiveKind(kind)}
              className={cn(
                "rounded-lg border p-4 text-left transition",
                activeKind === kind
                  ? "border-blue-200 bg-blue-50 shadow-sm"
                  : "border-[color:var(--pv-border)] bg-white hover:border-blue-200",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    activeKind === kind
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <FileCheck2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold text-slate-950">{kindLabel(kind)}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {questionCount} pertanyaan
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {questionsByArea.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-bold text-slate-950">Belum ada modul L2 yang wajib diisi.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Isi L1 Unit Core terlebih dahulu. Modul L2 akan muncul jika jawaban L1
            memicu consent, data spesifik, vendor, transfer, CCTV, HR, marketing,
            proyek baru, atau skenario lain yang relevan.
          </p>
        </div>
      ) : null}

      {questionsByArea.map((group) => (
        <section key={group.area} className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <h2 className="font-bold text-slate-950">{group.area}</h2>
            <Badge tone="blue">{group.questions.length} pertanyaan</Badge>
          </div>
          {group.questions.map((question) => {
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
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600">
                      {question.id} - {question.triggerOrOwner || "Core"}
                    </p>
                    <h3 className="text-base font-bold leading-6 text-slate-950">
                      {question.question}
                    </h3>
                    <p className="text-sm leading-6 text-slate-600">
                      <span className="font-semibold text-slate-800">Applicable:</span>{" "}
                      {question.applicability || "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {question.kind === "ADDITIONAL" ? (
                      <Badge tone="blue">Terpicu dari L1</Badge>
                    ) : null}
                    <Badge tone="slate">{question.reference || "Referensi umum"}</Badge>
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-5 grid gap-4",
                    isScoredSelfAssessmentQuestion(question)
                      ? "lg:grid-cols-[minmax(220px,0.7fr)_1fr]"
                      : "lg:grid-cols-[minmax(220px,360px)]",
                  )}
                >
                  <div className="space-y-2">
                    <Label help={isScoredSelfAssessmentQuestion(question) ? "Pilih kondisi implementasi kontrol atau kewajiban pada unit/proses ini. Catatan dan bukti pendukung bersifat opsional." : "Level 1 hanya menentukan relevansi unit. Jawaban Ya, Sebagian, atau Tidak Tahu akan memicu module Level 2 terkait."}>
                      Jawaban
                    </Label>
                    <Select
                      value={answer.answer}
                      onChange={(event) =>
                        updateAnswer(question.id, "answer", event.target.value)
                      }
                    >
                      <option value="">Pilih jawaban</option>
                      {answerOptionsForQuestion(question).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {isScoredSelfAssessmentQuestion(question) ? (
                    <EvidenceUploader
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

                {isScoredSelfAssessmentQuestion(question) ? (
                  <div className="mt-4">
                    <div className="space-y-2">
                      <Label help={buildNoteHelp(question, answer.answer)}>
                        Catatan Lanjutan (Opsional)
                      </Label>
                      <Textarea
                        value={answer.note}
                        onChange={(event) => updateAnswer(question.id, "note", event.target.value)}
                        className="min-h-28"
                        placeholder="Jelaskan gap, penyebab, proses terdampak, dan rencana tindak lanjut bila diketahui..."
                      />
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
  question,
  questionId,
  evidenceRequirement,
  answer,
  files,
  isUploading,
  onUpload,
  onOpen,
}: {
  question: (typeof selfAssessmentQuestions)[number];
  questionId: string;
  evidenceRequirement: string;
  answer: SelfAssessmentAnswers[string];
  files: SelfAssessmentEvidenceFile[];
  isUploading: boolean;
  onUpload: (questionId: string, file: File) => Promise<void>;
  onOpen: (evidenceId: string) => Promise<void>;
}) {
  const strength = getEvidenceStrength(question, answer);
  return (
    <div className="space-y-2">
      <Label help={question.evidenceValidation || "Evidence bersifat opsional. Jika diunggah, pastikan relevan dengan unit/proses, memiliki tanggal atau periode, versi/status berlaku jika dokumen, serta konsisten dengan jawaban assessment."}>
        Bukti Pendukung
      </Label>
      <div className="rounded-lg border border-[color:var(--pv-border)] bg-slate-50 p-3">
        <p className="text-xs font-semibold leading-5 text-slate-500">
          Opsional: {evidenceRequirement || "dokumen pendukung yang relevan."}
        </p>
        {question.recommendedEvidence ? (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Tambahan disarankan: {question.recommendedEvidence}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="slate">Bukti opsional</Badge>
          {files.length ? (
            <Badge tone={strength === "None" || strength === "Weak" ? "yellow" : "green"}>
              Kualitas bukti: {strength}
            </Badge>
          ) : null}
        </div>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-blue-200 bg-white px-3 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50">
          <Upload className="h-4 w-4" />
          {isUploading ? "Uploading..." : "Upload Bukti"}
          <input
            type="file"
            className="sr-only"
            disabled={isUploading}
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
            Belum ada bukti yang di-upload.
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
  void answer;
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
  items,
  onUpdate,
  onRegenerate,
}: {
  items: SelfAssessmentActionPlanItem[];
  onUpdate: (
    itemId: string,
    field: keyof SelfAssessmentActionPlanItem,
    value: string,
  ) => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-4">
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
                  {selfAssessmentActionStatusValues.map((value) => (
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
    </div>
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
