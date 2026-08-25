import type { BreachReportStatus } from "@/lib/breach-report-fields";

type GovernanceSettingsLike = {
  controllerProcessorContacts?: string | null;
  dpoContact?: string | null;
};

type UserLike = {
  fullName?: string | null;
  email?: string | null;
  role?: "MasterAdmin" | "DPO" | "User" | string | null;
  picName?: string | null;
  picEmail?: string | null;
};

type ProfileSource = {
  governanceSettings?: GovernanceSettingsLike | null;
  user?: UserLike | null;
  departmentName?: string | null;
  title?: string | null;
  status?: BreachReportStatus | string | null;
  date?: Date;
};

export type BreachReportProfileAnswers = Pick<
  Record<string, string>,
  | "organizationName"
  | "organizationAddress"
  | "systemName"
  | "processingPurpose"
  | "responsibleName"
  | "responsibleEmail"
  | "dpoName"
  | "dpoEmail"
  | "signingPlaceDate"
  | "authorizedSigner"
  | "signerPosition"
>;

export const breachReportProfileFieldIds = [
  "organizationName",
  "organizationAddress",
  "systemName",
  "processingPurpose",
  "responsibleName",
  "responsibleEmail",
  "dpoName",
  "dpoEmail",
  "signingPlaceDate",
  "authorizedSigner",
  "signerPosition",
] as const;

export function buildBreachReportProfileAnswers({
  governanceSettings,
  user,
  departmentName,
  title,
  date = new Date(),
}: ProfileSource): BreachReportProfileAnswers {
  const controllerContacts = governanceSettings?.controllerProcessorContacts?.trim() ?? "";
  const dpoContact = governanceSettings?.dpoContact?.trim() ?? "";
  const picName = user?.picName?.trim() || user?.fullName?.trim() || "";
  const picEmail = user?.picEmail?.trim() || user?.email?.trim() || "";
  const dpoEmail = extractEmail(dpoContact);
  const organizationName = parseOrganizationName(controllerContacts);
  const reportTitle = title?.trim() || "Laporan kegagalan pelindungan data pribadi";
  const unitName = departmentName?.trim() || user?.role || "unit terkait";

  return {
    organizationName,
    organizationAddress: "",
    systemName: reportTitle,
    processingPurpose: `Pemrosesan data pribadi oleh ${unitName} terkait kegiatan operasional yang menjadi objek laporan kegagalan PDP ini.`,
    responsibleName: picName,
    responsibleEmail: picEmail,
    dpoName:
      user?.role === "DPO" && picName
        ? picName
        : "Pejabat/Petugas Pelindung Data Pribadi (DPO)",
    dpoEmail: dpoEmail || dpoContact,
    signingPlaceDate: `Jakarta, ${formatIndonesianLongDate(date)}`,
    authorizedSigner: picName,
    signerPosition: roleLabel(user?.role),
  };
}

export function mergeBreachReportProfileAnswers(
  answers: Record<string, string | string[]>,
  profile: BreachReportProfileAnswers,
) {
  return {
    ...answers,
    ...profile,
  };
}

function parseOrganizationName(controllerContacts: string) {
  if (!controllerContacts) {
    return "PT Data Protection Governance";
  }

  return controllerContacts
    .split(";")[0]
    ?.replace(/\([^)]*\)/g, "")
    .split(" - ")[0]
    ?.trim() || controllerContacts;
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function roleLabel(role?: string | null) {
  if (role === "DPO") {
    return "Pejabat/Petugas Pelindung Data Pribadi";
  }

  if (role === "MasterAdmin") {
    return "Master Admin";
  }

  return "Penanggung Jawab Unit";
}

function formatIndonesianLongDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
