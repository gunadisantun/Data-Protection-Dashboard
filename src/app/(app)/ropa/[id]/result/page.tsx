import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileText, Shield } from "lucide-react";
import { DeleteActionButton } from "@/components/delete-action-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getRopaById } from "@/lib/data";

export const dynamic = "force-dynamic";

type ResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RopaResultPage({ params }: ResultPageProps) {
  const viewer = await requireViewer();
  const { id } = await params;
  const activity = await getRopaById(id, toAccessScope(viewer));

  if (!activity) {
    return (
      <div className="mx-auto max-w-[900px]">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-xl font-bold">RoPA entry not found</h1>
            <Link href="/ropa" className="mt-4 inline-block text-blue-600">
              Back to registry
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orderedAssessments = [...activity.assessments].sort(
    (a, b) => assessmentOrder(a.taskType) - assessmentOrder(b.taskType),
  );
  const activityDestinationCountries = parseDestinationCountries(activity.destinationCountry);

  return (
    <div className="mx-auto max-w-[1180px] space-y-7">
      <Card>
        <CardContent className="flex flex-col justify-between gap-4 pt-6 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Submission Success</h1>
              <p className="text-sm text-slate-500">
                Activity {activity.id.toUpperCase()} has been successfully registered
                and analyzed.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/api/ropa/export?department=${activity.departmentId}`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Download className="h-4 w-4" />
              Generate RoPA Department Excel
            </Link>
            <DeleteActionButton
              endpoint={`/api/ropa/${activity.id}`}
              label="Hapus Aktivitas"
              confirmMessage={`Hapus aktivitas RoPA "${activity.activityName}" beserta semua DPIA/TIA/LIA terkait?`}
              redirectTo="/ropa"
            />
            <Link href="/ropa">
              <Button>View Registry Entry</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activity Summary</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-6">
            <SummaryBlock label="Activity Name" value={activity.activityName} />
            <SummaryBlock
              label="Data Categories"
              value={activity.personalDataTypes.join(", ")}
            />
            <SummaryBlock
              label="Processing Purpose"
              value={activity.processingPurpose}
            />
            <SummaryBlock
              label="Transfer Status"
              value={
                activity.isCrossBorder
                  ? `Cross-Border (${activity.destinationCountry})`
                  : "Domestic only"
              }
              danger={activity.isCrossBorder}
            />
            <SummaryBlock label="Department" value={activity.department.name} />
            <SummaryBlock label="PIC" value={activity.picName} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-5 w-5 text-blue-600" />
              Analysis Results: Triggered Obligations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderedAssessments.length ? (
              orderedAssessments.map((assessment) => (
                <ObligationCard
                  key={assessment.id}
                  assessment={assessment}
                  destinationCountries={
                    assessment.taskType === "TIA"
                      ? getAssessmentDestinationCountries(
                          assessment.notes,
                          activityDestinationCountries,
                        )
                      : activityDestinationCountries
                  }
                />
              ))
            ) : (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <h2 className="font-bold text-emerald-900">
                    No Additional Assessment Triggered
                  </h2>
                </div>
                <p className="mt-2 text-sm text-emerald-800">
                  Current inputs did not trigger DPIA, TIA, or LIA tasks.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function assessmentOrder(type: string) {
  return type === "DPIA" ? 0 : type === "TIA" ? 1 : 2;
}

function SummaryBlock({
  label,
  value,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}

function ObligationCard({
  assessment,
  destinationCountries,
}: {
  assessment: {
    id: string;
    taskType: "DPIA" | "TIA" | "LIA";
    severity: "Required" | "Critical";
    title: string;
    reason: string;
    status: "Todo" | "In Progress" | "Done";
    notes: string;
  };
  destinationCountries: string[];
}) {
  const palette = assessment.taskType === "DPIA"
    ? "border-red-100 bg-red-50 text-red-900"
    : assessment.taskType === "TIA"
      ? "border-amber-100 bg-amber-50 text-amber-900"
      : "border-blue-100 bg-blue-50 text-blue-900";

  const iconTone = assessment.taskType === "DPIA"
    ? "bg-red-500 text-white"
    : assessment.taskType === "TIA"
      ? "bg-amber-500 text-white"
      : "bg-blue-600 text-white";

  const statusLabel = toAssessmentProgress(assessment.status, assessment.notes);
  const statusTone = statusLabel === "Completed"
    ? "green"
    : statusLabel === "In Progress"
      ? "blue"
      : "slate";
  const display = getObligationDisplayCopy(assessment.taskType, destinationCountries);

  return (
    <div className={`rounded-lg border p-5 ${palette}`}>
      <div className="flex items-start gap-4">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded ${iconTone}`}>
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">{display.title}</h2>
            <Badge
              tone={assessment.taskType === "DPIA" ? "red" : assessment.taskType === "TIA" ? "yellow" : "blue"}
            >
              Required
            </Badge>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6">{display.description}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {assessment.taskType === "DPIA" ? (
              <Link
                href={`/assessments/${assessment.id}/dpia`}
                className={buttonVariants({ variant: "danger", size: "sm" })}
              >
                Isi DPIA di Aplikasi
              </Link>
            ) : assessment.taskType === "LIA" ? (
              <Link
                href={`/assessments/${assessment.id}/lia`}
                className={buttonVariants({ variant: "warning", size: "sm" })}
              >
                Isi LIA di Aplikasi
              </Link>
            ) : assessment.taskType === "TIA" ? (
              <Link
                href={`/assessments/${assessment.id}/tia`}
                className={buttonVariants({ variant: "warning", size: "sm" })}
              >
                Isi TIA di Aplikasi
              </Link>
            ) : (
              <Button variant="warning" size="sm">
                Start {assessment.taskType} Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function toAssessmentProgress(status: "Todo" | "In Progress" | "Done", notes: string) {
  if (status === "Done") {
    return "Completed";
  }

  if (status === "In Progress" || hasUserAssessmentDraft(notes)) {
    return "In Progress";
  }

  return "Not Started";
}

function hasUserAssessmentDraft(notes: string) {
  if (!notes.trim()) {
    return false;
  }

  try {
    const parsed = JSON.parse(notes) as { kind?: string };
    return parsed.kind !== "privacyvault.tiaTransfer.v1";
  } catch {
    return true;
  }
}

function parseDestinationCountries(value: string) {
  return [...new Set(
    value
      .split(/[\n,;|]+/)
      .map((item) => item.replace(/^Pengiriman\s+\d+\s*:\s*/i, "").trim())
      .filter(Boolean),
  )];
}

function getAssessmentDestinationCountries(notes: string, fallback: string[]) {
  if (!notes.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(notes) as {
      kind?: string;
      transfer?: { destinationCountry?: string };
      draft?: { transfer?: { destinationCountry?: string } };
    };
    const destinationCountry =
      parsed.kind === "privacyvault.tiaTransfer.v1"
        ? parsed.transfer?.destinationCountry
        : parsed.kind === "privacyvault.tiaDraft.v1"
          ? parsed.draft?.transfer?.destinationCountry
          : "";

    return destinationCountry?.trim() ? [destinationCountry.trim()] : fallback;
  } catch {
    return fallback;
  }
}

function getTiaDescription(destinationCountries: string[]) {
  if (destinationCountries.length === 0) {
    return "Cross-border transfer was identified. Review transfer impact, destination risk, and required safeguards.";
  }

  if (destinationCountries.length === 1) {
    return `Cross-border transfer to ${destinationCountries[0]} was identified. Review transfer impact, destination risk, and required safeguards.`;
  }

  return "Cross-border transfer to multiple countries was identified. Review transfer impact, destination risk, and required safeguards.";
}

function getObligationDisplayCopy(taskType: "DPIA" | "TIA" | "LIA", destinationCountries: string[]) {
  if (taskType === "DPIA") {
    return {
      title: "DPIA Required",
      description:
        "This activity meets a high-risk processing criterion under Article 34(2) of the PDP Law: Processing of Specific Personal Data.",
    };
  }

  if (taskType === "TIA") {
    return {
      title: "TIA Review Required",
      description: getTiaDescription(destinationCountries),
    };
  }

  return {
    title: "LIA Required",
    description:
      "Legitimate Interest was selected as the lawful basis. A balancing assessment must be completed before relying on this basis.",
  };
}
