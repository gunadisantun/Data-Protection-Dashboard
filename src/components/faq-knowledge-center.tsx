"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/form";

type FaqCategory = {
  id: string;
  name: string;
  scope: string;
  displayOrder: number;
  entries: FaqEntry[];
};

type FaqEntry = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  legalBasis: string;
  benchmarkSupport: string;
  status: string;
  displayOrder: number;
  updatedAt: string;
};

type FaqReference = {
  id: string;
  groupName: string;
  title: string;
  description: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageBucket: string;
  storagePath: string;
  displayOrder: number;
};

type SopDocument = {
  id: string;
  title: string;
  category: string;
  summary: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageBucket: string;
  storagePath: string;
  uploadedBy: string;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

type FaqAiSource = {
  id: string;
  title: string;
  sourceType: "FAQ" | "REFERENCE" | "SOP";
  url: string | null;
};

type FaqAiResponse = {
  answer: string;
  sources: FaqAiSource[];
  refused: boolean;
  disclaimer: string;
};

type FaqKnowledgeCenterProps = {
  viewerRole: "MasterAdmin" | "DPO" | "User";
  categories: FaqCategory[];
  references: FaqReference[];
  sopDocuments: SopDocument[];
};

type FaqDraft = {
  question: string;
  answer: string;
  legalBasis: string;
  benchmarkSupport: string;
  status: string;
};

const defaultFaqDraft: FaqDraft = {
  question: "",
  answer: "",
  legalBasis: "",
  benchmarkSupport: "",
  status: "",
};

const referenceGroups = [
  "UU PDP",
  "RPP",
  "Aturan Sektoral",
  "Best Practice",
] as const;

const referenceGroupDescriptions: Record<(typeof referenceGroups)[number], string> = {
  "UU PDP": "Undang-Undang Pelindungan Data Pribadi sebagai dasar hukum utama.",
  RPP: "Rancangan peraturan pelaksanaan UU PDP dan dokumen turunannya.",
  "Aturan Sektoral": "Ketentuan sektor tertentu yang relevan dengan pemrosesan data pribadi.",
  "Best Practice":
    "Praktik pembanding seperti aturan negara lain, ISO, NIST, ICO, EDPB, GDPR, dan framework sejenis.",
};

const privacyDocumentGroups = ["Kebijakan", "SOP", "Template"] as const;

function getReferenceGroup(reference: FaqReference): (typeof referenceGroups)[number] {
  if (referenceGroups.includes(reference.groupName as (typeof referenceGroups)[number])) {
    return reference.groupName as (typeof referenceGroups)[number];
  }

  const text = `${reference.title} ${reference.groupName}`.toLowerCase();
  if (text.includes("uu pdp") || text.includes("undang-undang")) {
    return "UU PDP";
  }
  if (text.includes("rpp")) {
    return "RPP";
  }
  if (text.includes("ojk") || text.includes("bi ") || text.includes("komdigi") || text.includes("sektoral")) {
    return "Aturan Sektoral";
  }
  return "Best Practice";
}

function getPrivacyDocumentGroup(document: SopDocument): (typeof privacyDocumentGroups)[number] {
  const text = `${document.category} ${document.title}`.toLowerCase();
  if (text.includes("template")) {
    return "Template";
  }
  if (text.includes("kebijakan") || text.includes("policy")) {
    return "Kebijakan";
  }
  return "SOP";
}

function formatFileSize(sizeInBytes: number) {
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatAiAnswer(answer: string) {
  const withoutCitations = answer
    .replace(/\s*\[S\d+\]/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*/g, "")
    .trim();
  const withSectionBreaks = withoutCitations
    .replace(/^(Kesimpulan|Analisis|Langkah Praktis|Batasan)\s*:\s*/i, "")
    .replace(/\n\s*(Kesimpulan|Analisis|Langkah Praktis|Batasan)\s*:\s*/gi, "\n");

  return withSectionBreaks
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderAiAnswerLine(line: string) {
  return <p className="text-sm leading-7 text-slate-800">{line}</p>;
}

export function FaqKnowledgeCenter({
  viewerRole,
  categories,
  references,
  sopDocuments,
}: FaqKnowledgeCenterProps) {
  const canEdit = viewerRole === "DPO";
  const [categoryList, setCategoryList] = useState(categories);
  const [referenceDocuments, setReferenceDocuments] = useState(references);
  const [sopList, setSopList] = useState(sopDocuments);
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? "");
  const [savingFaqId, setSavingFaqId] = useState<string | null>(null);
  const [isCreatingFaq, setIsCreatingFaq] = useState(false);
  const [faqError, setFaqError] = useState("");
  const [faqMessage, setFaqMessage] = useState("");
  const [newFaq, setNewFaq] = useState<FaqDraft>(defaultFaqDraft);
  const [isUploadingSop, setIsUploadingSop] = useState(false);
  const [sopMessage, setSopMessage] = useState("");
  const [sopError, setSopError] = useState("");
  const [downloadingSopId, setDownloadingSopId] = useState<string | null>(null);
  const [downloadingReferenceId, setDownloadingReferenceId] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isBackfillingReferences, setIsBackfillingReferences] = useState(false);
  const [referenceMessage, setReferenceMessage] = useState("");
  const [referenceError, setReferenceError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [isFaqSectionExpanded, setIsFaqSectionExpanded] = useState(true);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<FaqAiResponse | null>(null);
  const [aiError, setAiError] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [sopForm, setSopForm] = useState({
    title: "",
    category: "SOP",
    summary: "",
    file: null as File | null,
  });
  const [referenceForm, setReferenceForm] = useState({
    title: "",
    groupName: "Best Practice",
    description: "",
    file: null as File | null,
  });

  const selectedCategory = useMemo(
    () => categoryList.find((category) => category.id === selectedCategoryId) ?? categoryList[0],
    [categoryList, selectedCategoryId],
  );

  const groupedReferences = useMemo(() => {
    return referenceGroups.map((groupName) => ({
      groupName,
      references: referenceDocuments.filter((reference) => getReferenceGroup(reference) === groupName),
    }));
  }, [referenceDocuments]);

  const groupedPrivacyDocuments = useMemo(() => {
    return privacyDocumentGroups.map((category) => ({
      category,
      documents: sopList.filter((document) => getPrivacyDocumentGroup(document) === category),
    }));
  }, [sopList]);

  const filteredFaqEntries = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return selectedCategory.entries;
    }

    return selectedCategory.entries.filter((entry) =>
      [entry.question, entry.answer, entry.legalBasis, entry.benchmarkSupport, entry.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, selectedCategory]);

  async function handleCreateFaq() {
    if (!selectedCategory) {
      return;
    }

    setFaqError("");
    setFaqMessage("");
    setIsCreatingFaq(true);

    const response = await fetch("/api/faq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: selectedCategory.id,
        question: newFaq.question,
        answer: newFaq.answer,
        legalBasis: newFaq.legalBasis,
        benchmarkSupport: newFaq.benchmarkSupport,
        status: newFaq.status,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFaqError(payload?.error ?? "Gagal menambah FAQ.");
      setIsCreatingFaq(false);
      return;
    }

    const payload = (await response.json()) as { data: FaqEntry };
    setCategoryList((current) =>
      current.map((item) =>
        item.id === selectedCategory.id
          ? { ...item, entries: [...item.entries, payload.data] }
          : item,
      ),
    );
    setNewFaq(defaultFaqDraft);
    setFaqMessage("FAQ berhasil ditambahkan.");
    setIsCreatingFaq(false);
  }

  async function handleAskAi() {
    const question = aiQuestion.trim();
    if (question.length < 3) {
      setAiError("Pertanyaan minimal 3 karakter.");
      return;
    }

    setAiError("");
    setAiAnswer(null);
    setIsAskingAi(true);

    const response = await fetch("/api/faq/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setAiError(payload?.error ?? "AI gagal menjawab pertanyaan.");
      setIsAskingAi(false);
      return;
    }

    const payload = (await response.json()) as { data: FaqAiResponse };
    setAiAnswer(payload.data);
    setIsAskingAi(false);
  }

  async function handleUpdateFaq(entry: FaqEntry) {
    setFaqError("");
    setFaqMessage("");
    setSavingFaqId(entry.id);

    const response = await fetch(`/api/faq/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: entry.categoryId,
        question: entry.question,
        answer: entry.answer,
        legalBasis: entry.legalBasis,
        benchmarkSupport: entry.benchmarkSupport,
        status: entry.status,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setFaqError(payload?.error ?? "Gagal memperbarui FAQ.");
      setSavingFaqId(null);
      return;
    }

    const payload = (await response.json()) as { data: FaqEntry };
    setCategoryList((current) =>
      current.map((item) => ({
        ...item,
        entries: item.entries.map((existing) =>
          existing.id === payload.data.id ? payload.data : existing,
        ),
      })),
    );
    setFaqMessage("FAQ berhasil diperbarui.");
    setSavingFaqId(null);
  }

  function updateEntryDraft(id: string, patch: Partial<FaqEntry>) {
    setCategoryList((current) =>
      current.map((category) => ({
        ...category,
        entries: category.entries.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...patch,
              }
            : entry,
        ),
      })),
    );
  }

  async function handleUploadSop() {
    if (!sopForm.file) {
      setSopError("Pilih file dokumen terlebih dahulu.");
      return;
    }

    setSopError("");
    setSopMessage("");
    setIsUploadingSop(true);

    const formData = new FormData();
    formData.set("title", sopForm.title);
    formData.set("category", sopForm.category);
    formData.set("summary", sopForm.summary);
    formData.set("file", sopForm.file);

    const response = await fetch("/api/sop", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setSopError(payload?.error ?? "Gagal upload dokumen.");
      setIsUploadingSop(false);
      return;
    }

    const payload = (await response.json()) as { data: SopDocument };
    setSopList((current) => [payload.data, ...current]);
    setSopForm({
      title: "",
      category: "SOP",
      summary: "",
      file: null,
    });
    setSopMessage("Dokumen berhasil diunggah.");
    setIsUploadingSop(false);
  }

  async function handleAccessSop(id: string) {
    setDownloadingSopId(id);
    const response = await fetch(`/api/sop/${id}/download`);
    if (!response.ok) {
      setDownloadingSopId(null);
      return;
    }

    const payload = (await response.json()) as {
      data: { url: string };
    };
    window.open(payload.data.url, "_blank", "noopener,noreferrer");
    setDownloadingSopId(null);
  }

  async function handleDownloadReference(id: string) {
    setDownloadingReferenceId(id);
    const response = await fetch(`/api/faq/references/${id}/download`);
    if (!response.ok) {
      setReferenceError("PDF referensi belum tersedia. DPO dapat menjalankan sinkronisasi referensi.");
      setDownloadingReferenceId(null);
      return;
    }

    const payload = (await response.json()) as {
      data: { url: string };
    };
    window.open(payload.data.url, "_blank", "noopener,noreferrer");
    setDownloadingReferenceId(null);
  }

  async function handleBackfillReferences() {
    setReferenceError("");
    setReferenceMessage("");
    setIsBackfillingReferences(true);

    const formData = new FormData();
    formData.set("action", "backfill");
    const response = await fetch("/api/faq/references", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setReferenceError(payload?.error ?? "Gagal sinkronisasi referensi.");
      setIsBackfillingReferences(false);
      return;
    }

    const referencesResponse = await fetch("/api/faq/references");
    const payload = (await referencesResponse.json()) as { data: FaqReference[] };
    setReferenceDocuments(payload.data);
    setReferenceMessage("Referensi berhasil disinkronkan ke PDF jika sumber mendukung.");
    setIsBackfillingReferences(false);
  }

  async function handleUploadReference() {
    if (!referenceForm.file) {
      setReferenceError("File referensi PDF wajib diunggah.");
      return;
    }

    setReferenceError("");
    setReferenceMessage("");
    setIsUploadingReference(true);
    const formData = new FormData();
    formData.set("title", referenceForm.title);
    formData.set("groupName", referenceForm.groupName);
    formData.set("description", referenceForm.description);
    formData.set("file", referenceForm.file);

    const response = await fetch("/api/faq/references", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const fieldErrors = payload?.issues?.fieldErrors
        ? Object.values(payload.issues.fieldErrors).flat().filter(Boolean).join(" ")
        : "";
      setReferenceError(
        [payload?.error, fieldErrors].filter(Boolean).join(" ") || "Gagal upload referensi.",
      );
      setIsUploadingReference(false);
      return;
    }

    const payload = (await response.json()) as { data: FaqReference };
    setReferenceDocuments((current) => [...current, payload.data]);
    setReferenceForm({
      title: "",
      groupName: "Best Practice",
      description: "",
      file: null,
    });
    setReferenceMessage("Referensi berhasil ditambahkan.");
    setIsUploadingReference(false);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-[color:var(--pv-border)] bg-white/78 p-6 shadow-[var(--pv-shadow-sm)] backdrop-blur-xl">
        <h1 className="text-3xl font-bold text-slate-950">FAQ Knowledge Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Jawaban cepat, referensi regulasi, dan Kebijakan Pelindungan Data Pribadi dalam satu halaman.
        </p>
      </section>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Tanya AI
          </CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Ajukan pertanyaan. AI hanya akan memakai informasi dari FAQ, referensi,
            dan Kebijakan Pelindungan Data Pribadi yang sudah di-upload.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <Textarea
              value={aiQuestion}
              onChange={(event) => setAiQuestion(event.target.value)}
              placeholder="Contoh: Kapan DPIA wajib dilakukan menurut UU PDP?"
              rows={3}
            />
            <Button
              className="lg:self-start"
              onClick={() => void handleAskAi()}
              disabled={isAskingAi}
            >
              {isAskingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Tanya AI
            </Button>
          </div>
          {aiError ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {aiError}
            </div>
          ) : null}
          {aiAnswer ? (
            <div
              className={`rounded-2xl border p-4 ${
                aiAnswer.refused
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-blue-100 bg-blue-50 text-slate-900"
              }`}
            >
              <div className="space-y-4">
                {formatAiAnswer(aiAnswer.answer).map((line, index) => (
                  <div key={`${line}-${index}`}>{renderAiAnswerLine(line)}</div>
                ))}
              </div>
              {aiAnswer.sources.length ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Sumber yang digunakan
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {aiAnswer.sources.map((source) =>
                      source.url ? (
                        <a
                          key={source.id}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm"
                        >
                          {source.id} - {source.title}
                        </a>
                      ) : (
                        <span
                          key={source.id}
                          className="rounded-full border border-white/80 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                        >
                          {source.id} - {source.title}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ) : null}
              <p className="mt-4 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600">
                {aiAnswer.disclaimer}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left"
            onClick={() => setIsFaqSectionExpanded((current) => !current)}
          >
            <div>
              <CardTitle>FAQ per Kategori</CardTitle>
              <p className="mt-1 text-sm text-slate-600">
                Buka kategori untuk melihat daftar FAQ, atau collapse section ini agar halaman lebih ringkas.
              </p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--pv-border)] bg-white/80 text-slate-600 shadow-sm">
              <ChevronDown
                className={`h-4 w-4 transition ${isFaqSectionExpanded ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        </CardHeader>
        {isFaqSectionExpanded ? (
          <CardContent>
            <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
            <aside className="space-y-2 rounded-2xl border border-[color:var(--pv-border)] bg-slate-100/55 p-2 xl:max-h-[760px] xl:overflow-auto">
              {categoryList.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setExpandedFaqId(null);
                    setSearchTerm("");
                    setFaqMessage("");
                    setFaqError("");
                  }}
                  className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                    selectedCategory?.id === category.id
                      ? "border-blue-200 bg-white shadow-sm"
                      : "border-transparent bg-white/70 hover:border-slate-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-900">{category.name}</p>
                    <Badge tone={selectedCategory?.id === category.id ? "blue" : "slate"}>
                      {category.entries.length}
                    </Badge>
                  </div>
                </button>
              ))}
            </aside>

            <div className="space-y-4">
              {selectedCategory ? (
                <>
                  <div className="rounded-2xl border border-[color:var(--pv-border)] bg-white/70 p-4 shadow-sm backdrop-blur">
                    <h3 className="text-lg font-bold text-slate-900">{selectedCategory.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{selectedCategory.scope}</p>
                    <div className="mt-3 flex items-center gap-2 rounded-full border border-[color:var(--pv-border)] bg-white/80 px-3">
                      <Search className="h-4 w-4 text-slate-400" />
                      <Input
                        className="border-0 px-0 focus:ring-0"
                        placeholder="Cari pertanyaan, jawaban, atau dasar hukum..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Menampilkan {filteredFaqEntries.length} dari {selectedCategory.entries.length} FAQ.
                    </p>
                  </div>

                  {faqMessage ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {faqMessage}
                    </div>
                  ) : null}
                  {faqError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {faqError}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {filteredFaqEntries.length ? (
                      filteredFaqEntries.map((entry, index) => {
                        const expanded = expandedFaqId === entry.id;
                        return (
                          <div
                            key={entry.id}
                            className="overflow-hidden rounded-2xl border border-[color:var(--pv-border)] bg-white/82 shadow-sm backdrop-blur"
                          >
                            <button
                              type="button"
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/70"
                              onClick={() =>
                                setExpandedFaqId((current) => (current === entry.id ? null : entry.id))
                              }
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-500">
                                  FAQ #{index + 1}
                                </p>
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {entry.question}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <Badge tone="slate">{entry.status || "Informasi"}</Badge>
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 text-slate-500 transition ${
                                    expanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {expanded ? (
                              <div className="space-y-3 border-t border-slate-100 p-4">
                                {canEdit ? (
                                  <>
                                    <div className="mb-1 flex items-center justify-between gap-3">
                                      <Badge tone="blue">{entry.status || "Informasi"}</Badge>
                                      <Button
                                        size="sm"
                                        onClick={() => void handleUpdateFaq(entry)}
                                        disabled={savingFaqId === entry.id}
                                      >
                                        {savingFaqId === entry.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Save className="h-4 w-4" />
                                        )}
                                        Simpan
                                      </Button>
                                    </div>
                                    <div>
                                      <Label>Pertanyaan</Label>
                                      <Input
                                        value={entry.question}
                                        onChange={(event) =>
                                          updateEntryDraft(entry.id, { question: event.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label>Jawaban</Label>
                                      <Textarea
                                        value={entry.answer}
                                        onChange={(event) =>
                                          updateEntryDraft(entry.id, { answer: event.target.value })
                                        }
                                      />
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      <div>
                                        <Label>Dasar Utama</Label>
                                        <Input
                                          value={entry.legalBasis}
                                          onChange={(event) =>
                                            updateEntryDraft(entry.id, { legalBasis: event.target.value })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <Label>Benchmark Pendukung</Label>
                                        <Input
                                          value={entry.benchmarkSupport}
                                          onChange={(event) =>
                                            updateEntryDraft(entry.id, {
                                              benchmarkSupport: event.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <Label>Status</Label>
                                      <Input
                                        value={entry.status}
                                        onChange={(event) =>
                                          updateEntryDraft(entry.id, { status: event.target.value })
                                        }
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Pertanyaan
                                      </p>
                                      <p className="mt-1 text-sm font-semibold text-slate-900">
                                        {entry.question}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        Jawaban
                                      </p>
                                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                                        {entry.answer}
                                      </p>
                                    </div>
                                    <div className="grid gap-2 md:grid-cols-2">
                                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        <span className="font-semibold">Dasar Utama:</span>{" "}
                                        {entry.legalBasis || "-"}
                                      </p>
                                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                        <span className="font-semibold">Benchmark:</span>{" "}
                                        {entry.benchmarkSupport || "-"}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                        Tidak ada FAQ yang sesuai pencarian.
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      {canEdit ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Tambah FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Pertanyaan</Label>
              <Input
                value={newFaq.question}
                onChange={(event) =>
                  setNewFaq((current) => ({ ...current, question: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Jawaban</Label>
              <Textarea
                value={newFaq.answer}
                onChange={(event) =>
                  setNewFaq((current) => ({ ...current, answer: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Dasar Utama</Label>
                <Input
                  value={newFaq.legalBasis}
                  onChange={(event) =>
                    setNewFaq((current) => ({ ...current, legalBasis: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Benchmark Pendukung</Label>
                <Input
                  value={newFaq.benchmarkSupport}
                  onChange={(event) =>
                    setNewFaq((current) => ({
                      ...current,
                      benchmarkSupport: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <Input
                  value={newFaq.status}
                  onChange={(event) =>
                    setNewFaq((current) => ({ ...current, status: event.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Button onClick={() => void handleCreateFaq()} disabled={isCreatingFaq}>
                {isCreatingFaq ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Simpan FAQ
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Referensi Global</CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Dikelompokkan menjadi UU PDP, RPP, Aturan Sektoral, dan Best Practice.
                  PDF internal dipakai sebagai knowledge AI.
                </p>
              </div>
              {canEdit ? (
                <Button
                  variant="secondary"
                  onClick={() => void handleBackfillReferences()}
                  disabled={isBackfillingReferences}
                >
                  {isBackfillingReferences ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Sinkron PDF
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit ? (
              <div className="grid gap-3 rounded-2xl border border-[color:var(--pv-border)] bg-slate-50/70 p-4 md:grid-cols-2">
                <div>
                  <Label>Judul Referensi</Label>
                  <Input
                    value={referenceForm.title}
                    onChange={(event) =>
                      setReferenceForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Kategori</Label>
                  <Select
                    value={referenceForm.groupName}
                    onChange={(event) =>
                      setReferenceForm((current) => ({
                        ...current,
                        groupName: event.target.value,
                      }))
                    }
                  >
                    {referenceGroups.map((groupName) => (
                      <option key={groupName} value={groupName}>
                        {groupName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={referenceForm.description}
                    onChange={(event) =>
                      setReferenceForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>File PDF</Label>
                  <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) =>
                      setReferenceForm((current) => ({
                        ...current,
                        file: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                  <Button
                    onClick={() => void handleUploadReference()}
                    disabled={isUploadingReference}
                  >
                    {isUploadingReference ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Tambah Referensi
                  </Button>
                  {referenceMessage ? (
                    <span className="text-sm text-emerald-700">{referenceMessage}</span>
                  ) : null}
                  {referenceError ? (
                    <span className="text-sm text-red-600">{referenceError}</span>
                  ) : null}
                </div>
              </div>
            ) : referenceError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {referenceError}
              </div>
            ) : null}
            {groupedReferences.map(({ groupName, references: refs }) => (
              <div
                key={groupName}
                className="space-y-3 rounded-2xl border border-[color:var(--pv-border)] bg-white/65 p-4 shadow-sm"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{groupName}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {referenceGroupDescriptions[groupName]}
                  </p>
                </div>
                <div className="space-y-2">
                  {refs.length ? refs.map((reference) => (
                    <button
                      key={reference.id}
                      type="button"
                      onClick={() => void handleDownloadReference(reference.id)}
                      disabled={downloadingReferenceId === reference.id}
                      className="flex w-full items-start gap-2 rounded-2xl border border-[color:var(--pv-border)] bg-slate-50/70 p-3 text-left text-sm text-slate-700 transition hover:border-sky-200 hover:bg-white disabled:cursor-wait disabled:opacity-70"
                    >
                      {downloadingReferenceId === reference.id ? (
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-600" />
                      ) : (
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                      )}
                      <span>
                        <span className="block font-semibold text-slate-900">{reference.title}</span>
                        <span className="block text-xs text-slate-500">{reference.description}</span>
                        <span className="mt-1 block text-[11px] font-semibold text-slate-400">
                          {reference.storagePath
                            ? `PDF tersimpan${reference.fileSize ? ` - ${formatFileSize(reference.fileSize)}` : ""}`
                            : "PDF belum tersinkron"}
                        </span>
                      </span>
                    </button>
                  )) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-500">
                      Belum ada referensi dalam kategori ini.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Kebijakan Pelindungan Data Pribadi</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              Dokumen internal dibagi menjadi Kebijakan, SOP, dan Template.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {canEdit ? (
              <div className="grid gap-3 rounded-2xl border border-[color:var(--pv-border)] bg-slate-50/70 p-4 md:grid-cols-2">
                <div>
                  <Label>Judul Dokumen</Label>
                  <Input
                    value={sopForm.title}
                    onChange={(event) =>
                      setSopForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Jenis Dokumen</Label>
                  <Select
                    value={sopForm.category}
                    onChange={(event) =>
                      setSopForm((current) => ({ ...current, category: event.target.value }))
                    }
                  >
                    {privacyDocumentGroups.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Ringkasan</Label>
                  <Textarea
                    value={sopForm.summary}
                    onChange={(event) =>
                      setSopForm((current) => ({ ...current, summary: event.target.value }))
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>File Dokumen (PDF/DOC/DOCX, max 10MB)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) =>
                      setSopForm((current) => ({
                        ...current,
                        file: event.target.files?.[0] ?? null,
                      }))
                    }
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-3">
                  <Button onClick={() => void handleUploadSop()} disabled={isUploadingSop}>
                    {isUploadingSop ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload Dokumen
                  </Button>
                  {sopMessage ? <span className="text-sm text-emerald-700">{sopMessage}</span> : null}
                  {sopError ? <span className="text-sm text-red-600">{sopError}</span> : null}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {sopList.length ? (
                groupedPrivacyDocuments.map(({ category, documents }) => (
                  <div
                    key={category}
                    className="space-y-2 rounded-2xl border border-[color:var(--pv-border)] bg-white/65 p-4 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-slate-900">{category}</h3>
                    {documents.length ? (
                      documents.map((document) => (
                        <div
                          key={document.id}
                          className="flex flex-col gap-3 rounded-2xl border border-[color:var(--pv-border)] bg-white/82 p-3 shadow-sm md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-sky-600" />
                              <p className="font-semibold text-slate-900">{document.title}</p>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {document.category} | {document.fileName} |{" "}
                              {formatFileSize(document.fileSize)}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">{document.summary || "-"}</p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={downloadingSopId === document.id}
                            onClick={() => void handleAccessSop(document.id)}
                          >
                            {downloadingSopId === document.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ExternalLink className="h-4 w-4" />
                            )}
                            Akses Dokumen
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-500">
                        Belum ada dokumen {category.toLowerCase()}.
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Belum ada Kebijakan Pelindungan Data Pribadi.</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Dokumen yang diunggah DPO akan tampil otomatis di sini.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
