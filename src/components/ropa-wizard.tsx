"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Lightbulb,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckboxRow,
  defaultFieldHelp,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/form";
import {
  countryReferences,
  lookupCountryReference,
} from "@/lib/country-references";
import { highRiskCategoryOptions } from "@/lib/high-risk-categories";

type Department = {
  id: string;
  name: string;
};

type WizardData = {
  activityName: string;
  processDescription: string;
  departmentId: string;
  hasTransfer: boolean;
  legalBasis: string;
  processingPurpose: string;
  transferPurpose: string;
  sourceMechanism: string;
  subjectCategories: string[];
  personalDataTypes: string[];
  recipients: string;
  processorContractLink: string;
  dataReceiverRole: string;
  isCrossBorder: boolean;
  destinationCountry: string;
  exportProtectionMechanism: string;
  transferMechanism: string;
  storageLocation: string;
  retentionPeriod: string;
  technicalMeasures: string;
  organizationalMeasures: string;
  dataSubjectRights: string[];
  riskAssessmentLevel: string;
  highRiskCategories: string[];
  riskRegisterReference: string;
  riskLikelihood: string;
  riskImpact: string;
  riskContext: string;
  existingControls: string;
  residualRiskLevel: string;
  riskMitigationPlan: string;
  volumeLevel: string;
  usesAutomatedDecisionMaking: boolean;
  previousProcess: string;
  nextProcess: string;
  transferItems: TransferItem[];
};

type TransferItem = {
  id: string;
  transferPurpose: string;
  recipients: string;
  dataReceiverRole: string;
  isCrossBorder: boolean;
  destinationCountry: string;
  exportProtectionMechanism: string;
};

const steps = [
  "Identity",
  "Purpose",
  "Data Details",
  "Transfer",
  "Security",
  "Risk",
];

const subjectCategoryOptions = [
  "Karyawan",
  "Pelanggan",
  "Subscriber",
  "Kandidat",
  "Anak",
  "Vendor",
  "Pengunjung",
  "Mitra",
];

const generalPersonalDataOptions = [
  "Nama lengkap",
  "Jenis kelamin",
  "Agama",
  "Status perkawinan",
  "Data pribadi yang dikombinasikan untuk mengidentifikasi seseorang",
  "Alamat atau domisili",
  "Nomor telepon",
  "Email",
  "Nomor identitas",
];

const specificPersonalDataOptions = [
  "Data dan informasi kesehatan",
  "Data biometrik",
  "Data genetika",
  "Catatan kejahatan",
  "Data anak",
  "Data keuangan pribadi",
];

const dataSubjectRightOptions = [
  "Hak Mendapatkan Informasi Pemrosesan Data Pribadi (Pasal 5)",
  "Hak Memutakhirkan Data Pribadinya (Pasal 6)",
  "Hak Akses dan Mendapatkan Salinan (Pasal 7)",
  "Hak Mengakhiri Pemrosesan, Menghapus, dan/atau Memusnahkan Data Pribadinya (Pasal 8)",
  "Hak Menarik Persetujuan (Pasal 9)",
  "Hak Keberatan akan Pemrosesan Otomatis (Automated Decision Making) (Pasal 10)",
  "Hak Menunda atau Membatasi Pemrosesan Data Pribadi (Pasal 11)",
  "Hak atas Gugatan Ganti Rugi (Pasal 12)",
  "Hak Interoperabilitas (Pasal 13)",
];

function createTransferItem(): TransferItem {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `transfer-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    transferPurpose: "",
    recipients: "",
    dataReceiverRole: "",
    isCrossBorder: false,
    destinationCountry: "",
    exportProtectionMechanism: "",
  };
}

const initialData: WizardData = {
  activityName: "",
  processDescription: "",
  departmentId: "",
  hasTransfer: false,
  legalBasis: "Consent",
  processingPurpose: "",
  transferPurpose: "",
  sourceMechanism: "Direct collection",
  subjectCategories: ["Pelanggan"],
  personalDataTypes: ["Nama lengkap"],
  recipients: "",
  processorContractLink: "",
  dataReceiverRole: "Processor",
  isCrossBorder: false,
  destinationCountry: "",
  exportProtectionMechanism: "",
  transferMechanism: "",
  storageLocation: "",
  retentionPeriod: "7 years",
  technicalMeasures: "",
  organizationalMeasures: "",
  dataSubjectRights: [
    "Hak Mendapatkan Informasi Pemrosesan Data Pribadi (Pasal 5)",
    "Hak Akses dan Mendapatkan Salinan (Pasal 7)",
  ],
  riskAssessmentLevel: "Low",
  highRiskCategories: [],
  riskRegisterReference: "",
  riskLikelihood: "Low",
  riskImpact: "Low",
  riskContext: "",
  existingControls: "",
  residualRiskLevel: "Low",
  riskMitigationPlan: "",
  volumeLevel: "Small",
  usesAutomatedDecisionMaking: false,
  previousProcess: "",
  nextProcess: "",
  transferItems: [],
};

type RopaWizardProps = {
  departments: Department[];
  defaultDepartmentId?: string;
  lockDepartment?: boolean;
  allowFreeDepartment?: boolean;
  governanceSettings?: {
    controllerProcessorContacts: string;
    dpoContact: string;
  } | null;
  activePicName?: string;
};

export function RopaWizard({
  departments,
  defaultDepartmentId = "",
  lockDepartment = false,
  allowFreeDepartment = false,
  governanceSettings = null,
  activePicName = "",
}: RopaWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(() => ({
    ...initialData,
    departmentId: defaultDepartmentId || initialData.departmentId,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checklist = useMemo(
    () => [
      {
        done: Boolean(data.departmentId),
        label: "Select the correct business unit to assign accountability.",
      },
      {
        done: Boolean(
          governanceSettings?.controllerProcessorContacts?.trim() &&
            governanceSettings?.dpoContact?.trim(),
        ),
        label:
          "Pastikan kontak Pengendali/Prosesor dan DPO sudah diatur pada menu Account/Settings.",
      },
      {
        done: Boolean(
          data.legalBasis &&
          data.processingPurpose &&
          data.sourceMechanism &&
          (!data.hasTransfer ||
            data.transferItems.some(
              (item) =>
                item.transferPurpose.trim().length >= 5 &&
                item.recipients.trim().length >= 3 &&
                item.dataReceiverRole.trim(),
            )),
        ),
        label:
          "Pastikan dasar, tujuan pemrosesan, sumber data, dan parameter transfer tercatat.",
      },
    ],
    [
      data.departmentId,
      data.hasTransfer,
      data.legalBasis,
      data.processingPurpose,
      data.sourceMechanism,
      data.transferItems,
      governanceSettings?.controllerProcessorContacts,
      governanceSettings?.dpoContact,
    ],
  );

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(
    key: "subjectCategories" | "personalDataTypes" | "dataSubjectRights",
    value: string,
  ) {
    setData((current) => {
      const values = current[key];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return { ...current, [key]: next };
    });
  }

  async function submit() {
    setError(null);
    setIsSubmitting(true);

    const hasHighRiskCategory = data.highRiskCategories.length > 0;
    const isAutomatedHighRisk = data.highRiskCategories.includes(
      "automated-legal-significant-effect",
    );
    const isLargeScaleHighRisk = data.highRiskCategories.includes(
      "large-scale-processing",
    );
    const derivedRiskLevel = hasHighRiskCategory ? "High" : "Low";
    const transferItems = data.hasTransfer ? normalizeTransferItems(data.transferItems) : [];
    const hasCrossBorderTransfer = transferItems.some((item) => item.isCrossBorder);
    const transferSummary = summarizeTransferItems(transferItems);

    const response = await fetch("/api/ropa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        hasTransfer: data.hasTransfer,
        transferPurpose: data.hasTransfer ? transferSummary.transferPurpose : "",
        recipients: data.hasTransfer ? transferSummary.recipients : "",
        processorContractLink: data.hasTransfer ? data.processorContractLink : "",
        dataReceiverRole: data.hasTransfer ? transferSummary.dataReceiverRole : "",
        transferMechanism: data.hasTransfer ? transferSummary.transferMechanism : "",
        isCrossBorder: data.hasTransfer ? hasCrossBorderTransfer : false,
        destinationCountry: data.hasTransfer && hasCrossBorderTransfer
          ? transferSummary.destinationCountry
          : "",
        exportProtectionMechanism: data.hasTransfer && hasCrossBorderTransfer
          ? transferSummary.exportProtectionMechanism
          : "",
        controllerProcessorContacts:
          governanceSettings?.controllerProcessorContacts ?? "",
        dpoContact: governanceSettings?.dpoContact ?? "",
        dataSubjectRights: data.dataSubjectRights.join("; "),
        legalBasis: data.legalBasis,
        riskAssessmentLevel: derivedRiskLevel,
        residualRiskLevel: derivedRiskLevel,
        riskLikelihood: hasHighRiskCategory ? "Medium" : "Low",
        riskImpact: hasHighRiskCategory ? "High" : "Low",
        volumeLevel: isLargeScaleHighRisk ? "Large" : "Small",
        usesAutomatedDecisionMaking: isAutomatedHighRisk,
        dataFlowMapping: "",
        status: "Active",
      }),
    });

    if (!response.ok) {
      setIsSubmitting(false);
      setError(await buildSubmissionError(response));
      return;
    }

    const result = (await response.json()) as { id: string };
    router.push(`/ropa/${result.id}/result`);
  }

  return (
    <div className="mx-auto grid max-w-[1180px] gap-7 xl:grid-cols-[1fr_236px]">
      <section className="space-y-5">
        <Card>
          <CardContent className="p-5 sm:p-6 sm:pt-6">
            <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
              {steps.map((label, index) => (
                <button
                  key={label}
                  className="flex min-w-24 flex-col items-center gap-3 rounded-xl px-2 py-1 text-sm"
                  onClick={() => setStep(index)}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-bold ${
                      index === step
                        ? "border-blue-600 bg-blue-600 text-white"
                        : index < step
                          ? "border-blue-200 bg-blue-50 text-blue-600"
                          : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className={index === step ? "text-blue-600" : "text-slate-400"}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-7 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold">
                  Record of Processing Activity (RoPA)
                </h1>
                <p className="text-sm text-slate-500">
                  Section {step + 1}: {sectionSubtitle(step)}
                </p>
              </div>
              <Badge tone="blue">Draft</Badge>
            </div>

            {step === 0 ? (
              <IdentityStep
                data={data}
                departments={departments}
                update={update}
                lockDepartment={lockDepartment}
                allowFreeDepartment={allowFreeDepartment}
                governanceSettings={governanceSettings}
                activePicName={activePicName}
              />
            ) : null}
            {step === 1 ? <PurposeStep data={data} update={update} /> : null}
            {step === 2 ? (
              <DataDetailsStep data={data} update={update} toggleArray={toggleArray} />
            ) : null}
            {step === 3 ? <TransferStep data={data} update={update} /> : null}
            {step === 4 ? (
              <SecurityStep data={data} update={update} toggleArray={toggleArray} />
            ) : null}
            {step === 5 ? <RiskAssessmentStep data={data} update={update} /> : null}

            {error ? <p className="mt-5 text-sm font-semibold text-red-600">{error}</p> : null}

            <div className="mt-8 flex justify-between border-t border-slate-100 pt-5">
              <Button
                variant="secondary"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
              >
                Back
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep((current) => current + 1)}>
                  Continue
                </Button>
              ) : (
                <Button onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit and Analyze
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-5">
        <div className="rounded-lg bg-[#342e86] p-5 text-white shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Lightbulb className="h-5 w-5" />
          </div>
          <h2 className="mt-7 text-base font-bold">Why {steps[step]} Matters?</h2>
          <p className="mt-4 text-sm leading-6 text-white/90">
            Naming and describing this activity correctly ensures transparency
            across the organization and keeps generated obligations precise.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5">
            <h2 className="text-sm font-semibold text-slate-400">Guidance checklist</h2>
            <div className="mt-4 space-y-4">
              {checklist.map((item) => (
                <div key={item.label} className="flex gap-3 text-sm text-slate-600">
                  {item.done ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                  )}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </aside>
    </div>
  );
}

async function buildSubmissionError(response: Response) {
  const fallback = "Please complete the required RoPA fields before submitting.";

  try {
    const payload = (await response.json()) as {
      issues?: {
        fieldErrors?: Record<string, string[]>;
      };
    };
    const fieldErrors = payload.issues?.fieldErrors;

    if (!fieldErrors) {
      return fallback;
    }

    const details = Object.entries(fieldErrors)
      .flatMap(([field, messages]) =>
        messages.map((message) => `${fieldLabel(field)}: ${message}`),
      )
      .slice(0, 4);

    return details.length ? `Mohon cek kembali: ${details.join("; ")}` : fallback;
  } catch {
    return fallback;
  }
}

function normalizeTransferItems(items: TransferItem[]) {
  return items
    .map((item) => ({
      ...item,
      transferPurpose: item.transferPurpose.trim(),
      recipients: item.recipients.trim(),
      dataReceiverRole: item.dataReceiverRole.trim(),
      destinationCountry: item.destinationCountry.trim(),
      exportProtectionMechanism: item.exportProtectionMechanism.trim(),
    }))
    .filter(
      (item) =>
        item.transferPurpose ||
        item.recipients ||
        item.dataReceiverRole ||
        item.destinationCountry ||
        item.exportProtectionMechanism,
    );
}

function summarizeTransferItems(items: TransferItem[]) {
  const line = (value: string, index: number) => `Pengiriman ${index + 1}: ${value}`;
  const crossBorderItems = items.filter((item) => item.isCrossBorder);

  return {
    transferPurpose: items
      .map((item, index) => line(item.transferPurpose, index))
      .join("\n"),
    recipients: items.map((item, index) => line(item.recipients, index)).join("\n"),
    dataReceiverRole: items
      .map((item, index) => line(item.dataReceiverRole, index))
      .join("\n"),
    transferMechanism: items
      .map((item, index) => line(item.dataReceiverRole || "Belum ditentukan", index))
      .join("\n"),
    destinationCountry: crossBorderItems
      .map((item, index) => line(item.destinationCountry, index))
      .join("\n"),
    exportProtectionMechanism: crossBorderItems
      .map((item, index) => line(item.exportProtectionMechanism, index))
      .join("\n"),
  };
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    activityName: "Nama Aktivitas",
    processDescription: "Deskripsi Aktivitas",
    departmentId: "Unit Kerja",
    controllerProcessorContacts:
      "Nama dan Kontak Pengendali/Pengendali Bersama/Prosesor",
    dpoContact: "Kontak DPO",
    hasTransfer: "Apakah terdapat transfer data pribadi",
    transferPurpose: "Tujuan Pengiriman Data Pribadi",
    processingPurpose: "Tujuan Pemrosesan",
    sourceMechanism: "Sumber Pengumpulan Data Pribadi",
    subjectCategories: "Kategori Subjek Data",
    personalDataTypes: "Jenis Data Pribadi",
    recipients: "Pihak penerima Data Pribadi",
    processorContractLink: "Lokasi penerima",
    dataReceiverRole: "Jenis transfer",
    transferMechanism: "Rincian Transfer Data Pribadi",
    storageLocation: "Penyimpanan",
    retentionPeriod: "Retensi",
    technicalMeasures: "Langkah Teknis",
    organizationalMeasures: "Langkah Organisasi",
    destinationCountry: "Negara Transfer",
    exportProtectionMechanism: "Mekanisme Pelindungan Ekspor",
    dataSubjectRights: "Hak Subjek Data Pribadi",
  };

  return labels[field] ?? field;
}

function IdentityStep({
  data,
  departments,
  update,
  lockDepartment,
  allowFreeDepartment,
  governanceSettings,
  activePicName,
}: {
  data: WizardData;
  departments: Department[];
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  lockDepartment: boolean;
  allowFreeDepartment: boolean;
  governanceSettings: {
    controllerProcessorContacts: string;
    dpoContact: string;
  } | null;
  activePicName: string;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field
        label="Nama Aktivitas *"
        help="Wajib, minimal 3 karakter. Gunakan nama yang spesifik, misalnya Payroll Karyawan, bukan Data Entry."
      >
        <Input
          placeholder="e.g., Pengelolaan Payroll Karyawan"
          value={data.activityName}
          onChange={(event) => update("activityName", event.target.value)}
        />
      </Field>
      <Field label="Unit Kerja *" help="Wajib pilih satu unit kerja penanggung jawab.">
        {allowFreeDepartment ? (
          <Input
            value={data.departmentId}
            onChange={(event) => update("departmentId", event.target.value)}
            placeholder="Contoh: Finance, HR, Marketing, Demo Unit"
          />
        ) : (
          <Select
            value={data.departmentId}
            onChange={(event) => update("departmentId", event.target.value)}
            disabled={lockDepartment}
          >
            <option value="">Select Department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        )}
        {lockDepartment ? (
          <p className="mt-2 text-xs text-slate-500">
            Unit kerja dikunci sesuai mapping akun user.
          </p>
        ) : null}
      </Field>
      <Field
        label="Person In Charge (PIC)"
        className="md:col-span-2"
        requirement="optional"
        help="PIC tidak diinput per RoPA. PIC diambil dari pengaturan akun user yang membuat aktivitas."
      >
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          {activePicName.trim() || "PIC belum diatur pada profil akun."}
        </div>
      </Field>
      <Field
        label="Nama dan Kontak Pengendali/Pengendali Bersama/Prosesor"
        className="md:col-span-2"
        requirement="optional"
        help="Dikelola oleh akun DPO/Master Admin pada pengaturan akun, dan otomatis dipakai di setiap RoPA."
      >
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {governanceSettings?.controllerProcessorContacts?.trim() ||
            "Belum diatur. Silakan minta DPO mengisi pada Account/Settings."}
        </div>
      </Field>
      <Field
        label="Kontak Pejabat/Petugas Pelindung Data Pribadi (DPO)"
        className="md:col-span-2"
        requirement="optional"
        help="Dikelola oleh akun DPO/Master Admin pada pengaturan akun, dan otomatis dipakai di setiap RoPA."
      >
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {governanceSettings?.dpoContact?.trim() ||
            "Belum diatur. Silakan minta DPO mengisi pada Account/Settings."}
        </div>
      </Field>
      <Field
        label="Deskripsi Aktivitas *"
        className="md:col-span-2"
        help="Wajib, minimal 10 karakter. Jelaskan apa yang diproses, oleh siapa, dan konteks aktivitasnya."
      >
        <Textarea
          placeholder="Explain the processing activity..."
          value={data.processDescription}
          onChange={(event) => update("processDescription", event.target.value)}
        />
      </Field>
    </div>
  );
}

function PurposeStep({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <Field
        label="Tujuan Pemrosesan *"
        help="Wajib, minimal 5 karakter. Tuliskan tujuan bisnis/operasional yang jelas."
      >
        <Textarea
          placeholder="Explain why this data is being processed..."
          value={data.processingPurpose}
          onChange={(event) => update("processingPurpose", event.target.value)}
        />
        <p className="mt-2 text-xs text-slate-400">
          Describe the primary business objective for this data activity.
        </p>
      </Field>
      <Field
        label="Dasar Pemrosesan (Lawful Basis) *"
        help="Wajib pilih salah satu dasar pemrosesan. Jika memilih Legitimate Interest, LIA otomatis dibuat."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["Consent", "Subject has given explicit consent."],
            ["Contractual", "Necessary for performance of a contract."],
            ["Legal Obligation", "Required by applicable law."],
            ["Legitimate Interest", "Kepentingan sah of the controller."],
            [
              "Vital Interest",
              "Necessary to protect vital interests of the data subject or another person.",
            ],
            [
              "Public Interest",
              "Necessary for public interest or official authority duties.",
            ],
          ].map(([value, description]) => (
            <CheckboxRow key={value}>
              <input
                type="radio"
                name="legalBasis"
                className="mt-1"
                checked={data.legalBasis === value}
                onChange={() => update("legalBasis", value)}
              />
              <span>
                <span className="block font-bold text-slate-950">{value}</span>
                <span className="text-xs text-slate-500">{description}</span>
              </span>
            </CheckboxRow>
          ))}
        </div>
      </Field>
      <Field
        label="Sumber Pengumpulan Data Pribadi *"
        help="Wajib. Jelaskan sumber pengumpulan data, misalnya form, CRM, HRIS, vendor, API, atau kanal lainnya."
      >
        <Input
          value={data.sourceMechanism}
          onChange={(event) => update("sourceMechanism", event.target.value)}
        />
      </Field>
    </div>
  );
}

function DataDetailsStep({
  data,
  toggleArray,
  update,
}: {
  data: WizardData;
  toggleArray: (
    key: "subjectCategories" | "personalDataTypes" | "dataSubjectRights",
    value: string,
  ) => void;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  const [customSubjectCategory, setCustomSubjectCategory] = useState("");
  const [customGeneralData, setCustomGeneralData] = useState("");
  const [customSpecificData, setCustomSpecificData] = useState("");
  const allConfiguredDataTypes = [
    ...generalPersonalDataOptions,
    ...specificPersonalDataOptions,
  ];
  const customPersonalDataTypes = data.personalDataTypes.filter(
    (item) => !allConfiguredDataTypes.includes(item),
  );
  const customSubjectCategories = data.subjectCategories.filter(
    (item) => !subjectCategoryOptions.includes(item),
  );

  function addArrayValue(
    key: "subjectCategories" | "personalDataTypes",
    value: string,
    reset: (value: string) => void,
  ) {
    const normalized = value.trim();

    if (!normalized) {
      return;
    }

    const current = data[key];
    if (!current.includes(normalized)) {
      update(key, [...current, normalized]);
    }

    reset("");
  }

  return (
    <div className="space-y-5">
      <Field label="Kategori Subjek Data" requirement="required">
        <div className="grid gap-3 md:grid-cols-3">
          {subjectCategoryOptions.map((item) => (
            <CheckboxRow key={item}>
              <input
                type="checkbox"
                className="mt-1"
                checked={data.subjectCategories.includes(item)}
                onChange={() => toggleArray("subjectCategories", item)}
              />
              <span className="font-semibold">{item}</span>
            </CheckboxRow>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <Input
            value={customSubjectCategory}
            onChange={(event) => setCustomSubjectCategory(event.target.value)}
            placeholder="Tambah kategori subjek data lain..."
          />
          <Button
            variant="secondary"
            onClick={() =>
              addArrayValue(
                "subjectCategories",
                customSubjectCategory,
                setCustomSubjectCategory,
              )
            }
          >
            Tambah
          </Button>
        </div>
        {customSubjectCategories.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {customSubjectCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleArray("subjectCategories", item)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-red-200 hover:text-red-600"
              >
                {item} x
              </button>
            ))}
          </div>
        ) : null}
      </Field>

      <div className="grid gap-5 xl:grid-cols-2">
        <Field label="Data Pribadi Umum" requirement="conditional">
          <p className="mb-3 text-xs leading-5 text-slate-500">
            Mengacu pada data pribadi yang bersifat umum, termasuk identitas dasar
            dan data yang bila dikombinasikan dapat mengidentifikasi seseorang.
          </p>
          <div className="grid gap-3">
            {generalPersonalDataOptions.map((item) => (
              <CheckboxRow key={item}>
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={data.personalDataTypes.includes(item)}
                  onChange={() => toggleArray("personalDataTypes", item)}
                />
                <span className="font-semibold">{item}</span>
              </CheckboxRow>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <div className="flex-1">
              <Label className="mb-2 block text-[11px] text-slate-500">
                Data Pribadi Umum Lainnya
              </Label>
              <Input
                value={customGeneralData}
                onChange={(event) => setCustomGeneralData(event.target.value)}
                placeholder="Tulis Data Pribadi Umum lainnya..."
              />
            </div>
            <Button
              variant="secondary"
              className="self-end"
              onClick={() =>
                addArrayValue(
                  "personalDataTypes",
                  customGeneralData,
                  setCustomGeneralData,
                )
              }
            >
              Tambah
            </Button>
          </div>
        </Field>

        <Field label="Data Pribadi Spesifik" requirement="conditional">
          <p className="mb-3 text-xs leading-5 text-slate-500">
            Data pribadi yang bersifat spesifik meliputi kesehatan, biometrik,
            genetika, catatan kejahatan, data anak, dan data keuangan pribadi.
            Data spesifik lainnya ditulis manual di kolom bawah.
          </p>
          <div className="grid gap-3">
            {specificPersonalDataOptions.map((item) => (
              <CheckboxRow key={item}>
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={data.personalDataTypes.includes(item)}
                  onChange={() => toggleArray("personalDataTypes", item)}
                />
                <span className="font-semibold">{item}</span>
              </CheckboxRow>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <div className="flex-1">
              <Label className="mb-2 block text-[11px] text-slate-500">
                Data Pribadi Spesifik Lainnya
              </Label>
              <Input
                value={customSpecificData}
                onChange={(event) => setCustomSpecificData(event.target.value)}
                placeholder="Tulis Data Pribadi Spesifik lainnya..."
              />
            </div>
            <Button
              variant="secondary"
              className="self-end"
              onClick={() =>
                addArrayValue(
                  "personalDataTypes",
                  customSpecificData,
                  setCustomSpecificData,
                )
              }
            >
              Tambah
            </Button>
          </div>
        </Field>
      </div>

      {customPersonalDataTypes.length ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Data pribadi tambahan
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {customPersonalDataTypes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggleArray("personalDataTypes", item)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-red-200 hover:text-red-600"
              >
                {item} x
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
        Minimal pilih satu kategori subjek data dan satu jenis data pribadi. Data
        spesifik tidak wajib jika aktivitas hanya memproses data pribadi umum.
      </p>
    </div>
  );
}

function TransferStep({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  const transferItems = data.transferItems.length
    ? data.transferItems
    : [createTransferItem()];

  function updateTransferItem<K extends keyof TransferItem>(
    itemId: string,
    key: K,
    value: TransferItem[K],
  ) {
    const next = transferItems.map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item,
    );
    update("transferItems", next);
  }

  function updateItemCrossBorder(itemId: string, enabled: boolean) {
    const next = transferItems.map((item) =>
      item.id === itemId
        ? {
            ...item,
            isCrossBorder: enabled,
            destinationCountry: enabled ? item.destinationCountry : "",
            exportProtectionMechanism: enabled ? item.exportProtectionMechanism : "",
          }
        : item,
    );

    update("transferItems", next);
  }

  function updateHasTransfer(enabled: boolean) {
    update("hasTransfer", enabled);

    if (!enabled) {
      update("transferPurpose", "");
      update("recipients", "");
      update("processorContractLink", "");
      update("dataReceiverRole", "");
      update("transferMechanism", "");
      update("isCrossBorder", false);
      update("destinationCountry", "");
      update("exportProtectionMechanism", "");
      update("transferItems", []);
      return;
    }

    if (!data.transferItems.length) {
      update("transferItems", [createTransferItem()]);
    }
  }

  function addTransferItem() {
    update("transferItems", [...transferItems, createTransferItem()]);
  }

  function removeTransferItem(itemId: string) {
    const next = transferItems.filter((item) => item.id !== itemId);
    update("transferItems", next.length ? next : [createTransferItem()]);
  }

  return (
    <div className="space-y-5">
      <Field
        label="Apakah terdapat transfer data pribadi?"
        requirement="required"
        help="Pilih Ya jika ada pengiriman/berbagi data pribadi ke pihak lain. Jika Tidak, kolom transfer lanjutan tidak ditampilkan."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <CheckboxRow>
            <input
              type="radio"
              name="hasTransfer"
              className="mt-1"
              checked={data.hasTransfer}
              onChange={() => updateHasTransfer(true)}
            />
            <span className="font-semibold">Ya</span>
          </CheckboxRow>
          <CheckboxRow>
            <input
              type="radio"
              name="hasTransfer"
              className="mt-1"
              checked={!data.hasTransfer}
              onChange={() => updateHasTransfer(false)}
            />
            <span className="font-semibold">Tidak</span>
          </CheckboxRow>
        </div>
      </Field>

      {!data.hasTransfer ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Tidak ada transfer data pribadi pada aktivitas ini. Field rincian transfer
          tidak perlu diisi.
        </div>
      ) : (
        <div className="space-y-4">
          {transferItems.map((item, index) => (
            <TransferItemCard
              key={item.id}
              item={item}
              index={index}
              canRemove={transferItems.length > 1}
              onChange={updateTransferItem}
              onCrossBorderChange={updateItemCrossBorder}
              onRemove={removeTransferItem}
            />
          ))}

          <Button type="button" variant="secondary" onClick={addTransferItem}>
            <Plus className="h-4 w-4" />
            Tambah Pengiriman
          </Button>
        </div>
      )}
    </div>
  );
}

function TransferItemCard({
  item,
  index,
  canRemove,
  onChange,
  onCrossBorderChange,
  onRemove,
}: {
  item: TransferItem;
  index: number;
  canRemove: boolean;
  onChange: <K extends keyof TransferItem>(
    itemId: string,
    key: K,
    value: TransferItem[K],
  ) => void;
  onCrossBorderChange: (itemId: string, enabled: boolean) => void;
  onRemove: (itemId: string) => void;
}) {
  const countryReference = lookupCountryReference(item.destinationCountry);
  const sourceLinks = splitSourceLinks(countryReference?.source);
  const protectionPlaceholder =
    countryReference?.category === "Khusus"
      ? "Contoh: DPA/SCC/vendor clause; verifikasi kecukupan safeguard"
      : countryReference?.category === "Parsial"
        ? "Contoh: SCC + TIA mitigation + contractual safeguards"
        : countryReference?.category === "Tidak ada"
          ? "Contoh: SCC + enhanced due diligence + DPO approval"
          : "SCCs, adequacy, consent, DPA, atau mekanisme lain...";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Pengiriman Data Pribadi {index + 1}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Isi satu penerima atau tujuan pengiriman per blok agar analisis TIA lebih
            rapi.
          </p>
        </div>
        {canRemove ? (
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Tujuan Pengiriman Data Pribadi *"
          help="Wajib. Isi tujuan pengiriman/berbagi data pribadi."
          className="md:col-span-2"
        >
          <Textarea
            value={item.transferPurpose}
            onChange={(event) =>
              onChange(item.id, "transferPurpose", event.target.value)
            }
            placeholder="Contoh: verifikasi vendor, payroll processor, pelaporan regulator."
          />
        </Field>
        <Field label="Pihak penerima *" help="Wajib. Isi pihak yang menerima data pribadi.">
          <Input
            value={item.recipients}
            onChange={(event) => onChange(item.id, "recipients", event.target.value)}
            placeholder="Vendor A, Partner B, regulator..."
          />
        </Field>
        <Field label="Jenis transfer *" help="Wajib. Pilih jenis transfer yang paling sesuai.">
          <Select
            value={item.dataReceiverRole}
            onChange={(event) =>
              onChange(item.id, "dataReceiverRole", event.target.value)
            }
          >
            <option value="">Pilih jenis transfer</option>
            <option value="Internal Sharing">Internal Sharing</option>
            <option value="Processor/Vendor">Processor/Vendor</option>
            <option value="Pengendali Data Pribadi Lain">
              Pengendali Data Pribadi Lain
            </option>
            <option value="Joint Controller">Joint Controller</option>
            <option value="Regulator">Regulator</option>
            <option value="Affiliate Group">Affiliate Group</option>
          </Select>
        </Field>

        <Field
          label="Cross-Border Transfer *"
          requirement="required"
          className="md:col-span-2"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxRow>
              <input
                type="radio"
                name={`crossBorder-${item.id}`}
                className="mt-1"
                checked={item.isCrossBorder}
                onChange={() => onCrossBorderChange(item.id, true)}
              />
              <span className="font-semibold">Ya</span>
            </CheckboxRow>
            <CheckboxRow>
              <input
                type="radio"
                name={`crossBorder-${item.id}`}
                className="mt-1"
                checked={!item.isCrossBorder}
                onChange={() => onCrossBorderChange(item.id, false)}
              />
              <span className="font-semibold">Tidak</span>
            </CheckboxRow>
          </div>
        </Field>

        {item.isCrossBorder ? (
          <>
            <Field
              label="Negara Transfer"
              requirement="conditional"
              help="Wajib jika transfer luar negeri aktif. Pilih/ketik negara dari daftar referensi."
            >
              <Input
                list="country-reference-list"
                value={item.destinationCountry}
                onChange={(event) =>
                  onChange(item.id, "destinationCountry", event.target.value)
                }
                placeholder="e.g., Singapore, USA"
              />
              <datalist id="country-reference-list">
                {countryReferences.map((reference) => (
                  <option key={reference.country} value={reference.country} />
                ))}
              </datalist>
            </Field>
            <Field
              label="Mekanisme Pelindungan Ekspor"
              requirement="conditional"
              help="Wajib jika transfer luar negeri aktif. Isi instrumen/safeguard transfer, misalnya SCC, DPA, consent, atau approval DPO."
            >
              <Input
                value={item.exportProtectionMechanism}
                onChange={(event) =>
                  onChange(item.id, "exportProtectionMechanism", event.target.value)
                }
                placeholder={protectionPlaceholder}
              />
            </Field>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900 md:col-span-2">
              {countryReference ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">Aturan negara tujuan:</span>
                    <Badge tone={countryReference.category === "Khusus" ? "green" : "yellow"}>
                      {countryReference.category}
                    </Badge>
                  </div>
                  <div>{countryReference.regulation}</div>
                  {sourceLinks.length ? (
                    <div className="flex flex-wrap gap-2">
                      {sourceLinks.map((source, sourceIndex) => (
                        <a
                          key={source}
                          href={source}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-blue-700 underline underline-offset-2"
                        >
                          Sumber {sourceLinks.length > 1 ? sourceIndex + 1 : ""}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  Negara ini belum ditemukan di referensi workbook. Legal/DPO perlu
                  melengkapi nama aturan, kategori PDP, dan sumbernya pada TIA.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600 md:col-span-2">
            Tidak ada transfer lintas negara. Kolom negara tujuan dan mekanisme
            pelindungan ekspor tidak perlu diisi.
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityStep({
  data,
  update,
  toggleArray,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
  toggleArray: (
    key: "subjectCategories" | "personalDataTypes" | "dataSubjectRights",
    value: string,
  ) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field
        label="Penyimpanan"
        requirement="required"
        help="Wajib. Isi lokasi/sistem penyimpanan, misalnya Jakarta private cloud atau HRIS."
      >
        <Input
          value={data.storageLocation}
          onChange={(event) => update("storageLocation", event.target.value)}
          placeholder="Cloud region, system, repository..."
        />
      </Field>
      <Field
        label="Retensi"
        requirement="required"
        help="Wajib. Isi periode retensi, misalnya 2 tahun, 7 tahun, atau sampai consent ditarik."
      >
        <Input
          value={data.retentionPeriod}
          onChange={(event) => update("retentionPeriod", event.target.value)}
        />
      </Field>
      <Field
        label="Langkah Teknis"
        requirement="required"
        help="Wajib, minimal 3 karakter. Isi kontrol teknis seperti enkripsi, RBAC, logging, masking, atau backup."
      >
        <Textarea
          value={data.technicalMeasures}
          onChange={(event) => update("technicalMeasures", event.target.value)}
          placeholder="Encryption, RBAC, logging..."
        />
      </Field>
      <Field
        label="Langkah Organisasi"
        requirement="required"
        help="Wajib, minimal 3 karakter. Isi kontrol organisasi seperti SOP, training, approval, review akses, atau vendor due diligence."
      >
        <Textarea
          value={data.organizationalMeasures}
          onChange={(event) => update("organizationalMeasures", event.target.value)}
          placeholder="Policies, training, reviews..."
        />
      </Field>
      <Field
        label="Hak Subjek Data Pribadi dapat dipenuhi / diakomodir"
        requirement="required"
        className="md:col-span-2"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {dataSubjectRightOptions.map((right) => (
            <CheckboxRow key={right}>
              <input
                type="checkbox"
                className="mt-1"
                checked={data.dataSubjectRights.includes(right)}
                onChange={() => toggleArray("dataSubjectRights", right)}
              />
              <span className="text-sm font-semibold leading-5">{right}</span>
            </CheckboxRow>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Centang hak yang sudah dapat dipenuhi oleh proses, kanal, atau SOP yang
          tersedia. Pilihan ini akan masuk ke ringkasan RoPA dan draft asesmen.
        </p>
      </Field>
      <Field label="Konteks Historis - Sebelum" requirement="optional">
        <Input
          value={data.previousProcess}
          onChange={(event) => update("previousProcess", event.target.value)}
        />
      </Field>
      <Field label="Konteks Historis - Setelah" requirement="optional">
        <Input
          value={data.nextProcess}
          onChange={(event) => update("nextProcess", event.target.value)}
        />
      </Field>
    </div>
  );
}

function RiskAssessmentStep({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void;
}) {
  const selectedCategories = highRiskCategoryOptions.filter((category) =>
    data.highRiskCategories.includes(category.id),
  );

  function toggleHighRiskCategory(categoryId: string) {
    const next = data.highRiskCategories.includes(categoryId)
      ? data.highRiskCategories.filter((item) => item !== categoryId)
      : [...data.highRiskCategories, categoryId];
    const hasHighRisk = next.length > 0;

    update("highRiskCategories", next);
    update("riskAssessmentLevel", hasHighRisk ? "High" : "Low");
    update("residualRiskLevel", hasHighRisk ? "High" : "Low");
    update("riskLikelihood", hasHighRisk ? "Medium" : "Low");
    update("riskImpact", hasHighRisk ? "High" : "Low");
    update(
      "volumeLevel",
      next.includes("large-scale-processing") ? "Large" : "Small",
    );
    update(
      "usesAutomatedDecisionMaking",
      next.includes("automated-legal-significant-effect"),
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        Bagian RoPA ini hanya mencatat hasil analisis kategori Risiko Tinggi
        sesuai Pasal 34 ayat (2) UU PDP atau referensi ke Risk Register. Risk
        matrix 5x5 tetap dikerjakan di workspace DPIA.
      </div>

      <Field
        label="Kategori Risiko Tinggi Pasal 34 ayat (2) UU PDP"
        requirement="optional"
        help="Centang semua kategori yang relevan. Kosongkan jika hasil analisis menunjukkan tidak ada kategori Risiko Tinggi; minimal satu centang akan otomatis membuat task DPIA."
      >
        <div className="grid gap-3">
          {highRiskCategoryOptions.map((category) => (
            <CheckboxRow
              key={category.id}
              className={`items-start gap-4 rounded-2xl p-4 ${
                data.highRiskCategories.includes(category.id)
                  ? "border-blue-300 bg-blue-50/70 shadow-sm"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={data.highRiskCategories.includes(category.id)}
                onChange={() => toggleHighRiskCategory(category.id)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-5 text-slate-950">
                  {category.shortLabel}
                </span>
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {category.label}
                </span>
              </span>
            </CheckboxRow>
          ))}
        </div>
      </Field>

      {selectedCategories.length ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm leading-6 text-red-900">
          <div className="font-semibold">DPIA akan dibuat otomatis</div>
          <p className="mt-1 text-red-800">
            Kategori terpilih:{" "}
            {selectedCategories.map((category) => category.shortLabel).join(", ")}.
            Detail scoring dan mitigasi lanjut bisa diisi di halaman DPIA.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Belum ada kategori Risiko Tinggi yang dicentang. Sistem tetap bisa membuat
          LIA atau TIA jika dasar hukum atau transfer lintas negara memicunya.
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
  requirement,
  help,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  requirement?: "required" | "optional" | "conditional";
  help?: string;
}) {
  const isRequired = label.trim().endsWith("*") || requirement === "required";
  const displayLabel = label.replace(/\s*\*$/, "");
  const requirementLabel =
    requirement === "optional"
      ? "Opsional"
      : requirement === "conditional"
        ? "Kondisional"
        : isRequired
          ? "Wajib"
          : null;
  const badgeClass =
    requirement === "optional"
      ? "bg-slate-100 text-slate-500"
      : requirement === "conditional"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <Label help={defaultFieldHelp(displayLabel)}>{displayLabel}</Label>
        {requirementLabel ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}>
            {requirementLabel}
          </span>
        ) : null}
      </div>
      {children}
      {help ? <p className="mt-2 text-xs leading-5 text-slate-500">{help}</p> : null}
    </div>
  );
}

function sectionSubtitle(step: number) {
  return [
    "General Identity & Activity Identification",
    "Purpose & Lawful Basis",
    "Subject Categories & Personal Data",
    "Recipients & Cross-Border Transfer",
    "Retention, Security & Historical Context",
    "Pasal 34 High-Risk Checklist",
  ][step];
}

function splitSourceLinks(source: string | undefined) {
  return (source ?? "")
    .split("|")
    .map((value) => value.trim())
    .filter((value) => /^https?:\/\//i.test(value));
}
