import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileWarning,
  Globe2,
  Scale,
} from "lucide-react";
import { DeleteActionButton } from "@/components/delete-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import type { AccessScope } from "@/lib/data";
import { getModuleColumnSettings, listTasks } from "@/lib/data";
import { getModuleColumnDefinitions } from "@/lib/module-columns";
import type { AssessmentType } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type AssessmentTypeDashboardProps = {
  type: AssessmentType;
  scope?: AccessScope;
  canDeleteTasks?: boolean;
};

const assessmentConfig: Record<
  AssessmentType,
  {
    title: string;
    description: string;
    icon: LucideIcon;
    tone: "red" | "yellow" | "blue";
    accent: string;
    hrefSuffix: "dpia" | "tia" | "lia";
    focusLabel: string;
    guidanceTitle: string;
    guidance: string;
  }
> = {
  DPIA: {
    title: "DPIA Dashboard",
    description:
      "Monitor high-risk processing reviews, mitigation progress, and DPIA completion readiness.",
    icon: FileWarning,
    tone: "red",
    accent: "bg-red-50 text-red-600",
    hrefSuffix: "dpia",
    focusLabel: "Critical DPIA",
    guidanceTitle: "Risk Matrix Focus",
    guidance:
      "Prioritize DPIA with high residual risks, automated decision-making, sensitive data, or large-volume processing.",
  },
  TIA: {
    title: "TIA Dashboard",
    description:
      "Track cross-border transfer reviews, destination-country safeguards, and DPO consultation status.",
    icon: Globe2,
    tone: "yellow",
    accent: "bg-amber-50 text-amber-600",
    hrefSuffix: "tia",
    focusLabel: "Required TIA",
    guidanceTitle: "Transfer Safeguard Focus",
    guidance:
      "Review destination regulation category, written agreements, onward transfer, and recipient technical controls.",
  },
  LIA: {
    title: "LIA Dashboard",
    description:
      "Manage legitimate-interest balancing tests, purpose reviews, and legal readiness.",
    icon: Scale,
    tone: "blue",
    accent: "bg-blue-50 text-blue-600",
    hrefSuffix: "lia",
    focusLabel: "Required LIA",
    guidanceTitle: "Balancing Test Focus",
    guidance:
      "Complete purpose, necessity, balance, impact, and decision sections before legal approval.",
  },
};

export async function AssessmentTypeDashboard({
  type,
  scope,
  canDeleteTasks = false,
}: AssessmentTypeDashboardProps) {
  const config = assessmentConfig[type];
  const Icon = config.icon;
  const tasks = (await listTasks(undefined, { scope })).filter(
    (task) => task.taskType === type,
  );
  const columnSettings = await getModuleColumnSettings(config.hrefSuffix);
  const visibleColumns = getModuleColumnDefinitions(
    config.hrefSuffix,
    columnSettings.customColumns,
  ).filter((column) => columnSettings.visibleColumns.includes(column.key));
  const openTasks = tasks.filter((task) => task.status !== "Done");
  const doneTasks = tasks.filter((task) => task.status === "Done");
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress");
  const criticalTasks = tasks.filter((task) => task.severity === "Critical");
  const dueSoon = openTasks.filter((task) => daysUntil(task.dueDate) <= 7);
  const completion =
    tasks.length === 0 ? 100 : Math.round((doneTasks.length / tasks.length) * 100);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${config.accent}`}
          >
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-slate-950">{config.title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              {config.description}
            </p>
          </div>
        </div>
        <Link href="/ropa/new">
          <Button>New RoPA Analysis</Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Icon}
          label={`Total ${type}`}
          value={tasks.length}
          caption={`${openTasks.length} open assessment${openTasks.length === 1 ? "" : "s"}`}
          accent={config.accent}
        />
        <SummaryCard
          icon={Clock3}
          label="In Progress"
          value={inProgressTasks.length}
          caption={`${dueSoon.length} due within 7 days`}
          accent="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          icon={AlertCircle}
          label={config.focusLabel}
          value={criticalTasks.length || openTasks.length}
          caption={type === "DPIA" ? "Critical processing reviews" : "Needs review"}
          accent={
            type === "DPIA" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          }
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Completion"
          value={completion}
          suffix="%"
          caption={`${doneTasks.length} completed`}
          accent="bg-emerald-50 text-emerald-600"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              {type} Work Queue
            </CardTitle>
            <Badge tone={config.tone}>{openTasks.length} Open</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <tr>
                  {visibleColumns.map((column) => (
                    <TH key={column.key}>{column.label}</TH>
                  ))}
                </tr>
              </THead>
              <TBody>
                {openTasks.map((task) => (
                  <tr key={task.id}>
                    {visibleColumns.map((column) => (
                      <AssessmentDashboardCell
                        key={column.key}
                        columnKey={column.key}
                        task={task}
                        hrefSuffix={config.hrefSuffix}
                        type={type}
                        canDeleteTasks={canDeleteTasks}
                        actionLabel={`Open ${type}`}
                      />
                    ))}
                  </tr>
                ))}
              </TBody>
            </Table>
            {openTasks.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                Tidak ada {type} yang masih terbuka.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle>{config.guidanceTitle}</CardTitle>
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.accent}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-600">{config.guidance}</p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <MiniMetric label="Todo" value={countStatus(tasks, "Todo")} />
                <MiniMetric
                  label="Progress"
                  value={countStatus(tasks, "In Progress")}
                />
                <MiniMetric label="Done" value={countStatus(tasks, "Done")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Due Soon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dueSoon.slice(0, 4).map((task) => (
                <Link
                  key={task.id}
                  href={`/assessments/${task.id}/${config.hrefSuffix}`}
                  className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <div className="text-sm font-bold text-slate-950">
                    {task.activityName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Due {formatDate(task.dueDate)} - {task.picName}
                  </div>
                </Link>
              ))}
              {dueSoon.length === 0 ? (
                <p className="text-sm text-slate-500">No urgent {type} due this week.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {type} yang Sudah Dikerjakan
          </CardTitle>
          <Badge tone="green">{doneTasks.length} Done</Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                {visibleColumns.map((column) => (
                  <TH key={column.key}>{column.label}</TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {doneTasks.map((task) => (
                <tr key={task.id}>
                  {visibleColumns.map((column) => (
                    <AssessmentDashboardCell
                      key={column.key}
                      columnKey={column.key}
                      task={task}
                      hrefSuffix={config.hrefSuffix}
                      type={type}
                      canDeleteTasks={canDeleteTasks}
                      actionLabel={`Lihat ${type}`}
                    />
                  ))}
                </tr>
              ))}
            </TBody>
          </Table>
          {doneTasks.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Belum ada {type} yang ditandai selesai.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  accent,
  suffix = "",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  caption: string;
  accent: string;
  suffix?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="relative p-7 pt-7 sm:p-7 sm:pt-7">
        <div className="absolute right-6 top-6 h-14 w-14 rounded-full bg-slate-100/70 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/80 ${accent}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="pt-1 text-xs font-semibold text-slate-400">Monthly</span>
        </div>
        <div className="relative mt-8 text-4xl font-bold text-slate-950">
          {value}
          {suffix}
        </div>
        <div className="relative text-sm font-semibold text-slate-600">{label}</div>
        <div className="relative mt-8 text-xs font-semibold text-emerald-600">{caption}</div>
      </CardContent>
    </Card>
  );
}

function AssessmentDashboardCell({
  columnKey,
  task,
  hrefSuffix,
  type,
  canDeleteTasks,
  actionLabel,
}: {
  columnKey: string;
  task: Awaited<ReturnType<typeof listTasks>>[number];
  hrefSuffix: "dpia" | "tia" | "lia";
  type: AssessmentType;
  canDeleteTasks: boolean;
  actionLabel: string;
}) {
  if (columnKey === "activityName") {
    return (
      <TD>
        <div className="font-bold text-slate-950">{task.activityName}</div>
        <div className="text-xs text-slate-500">{task.reason}</div>
      </TD>
    );
  }

  if (columnKey === "departmentName") {
    return <TD>{task.departmentName}</TD>;
  }

  if (columnKey === "status") {
    return (
      <TD>
        <Badge tone={statusTone(task.status)}>{task.status}</Badge>
      </TD>
    );
  }

  if (columnKey === "severity") {
    return (
      <TD>
        <Badge tone={task.severity === "Critical" ? "red" : "yellow"}>
          {task.severity}
        </Badge>
      </TD>
    );
  }

  if (columnKey === "dueDate") {
    return <TD>{formatDate(task.dueDate)}</TD>;
  }

  if (columnKey === "picName") {
    return <TD>{task.picName}</TD>;
  }

  if (columnKey === "reason") {
    return <TD>{task.reason}</TD>;
  }

  if (columnKey === "title") {
    return <TD>{task.title}</TD>;
  }

  if (columnKey === "createdAt") {
    return <TD>{formatDate(task.createdAt)}</TD>;
  }

  if (columnKey === "updatedAt") {
    return <TD>{formatDate(task.updatedAt)}</TD>;
  }

  if (columnKey === "action") {
    return (
      <TD>
        <div className="flex flex-wrap gap-2">
          <Link href={`/assessments/${task.id}/${hrefSuffix}`}>
            <Button variant="secondary" size="sm">
              {actionLabel}
            </Button>
          </Link>
          {canDeleteTasks ? (
            <DeleteActionButton
              endpoint={`/api/tasks/${task.id}`}
              label="Hapus"
              confirmMessage={`Hapus task ${type} untuk "${task.activityName}"?`}
            />
          ) : null}
        </div>
      </TD>
    );
  }

  if (columnKey.startsWith("custom_")) {
    return <TD className="text-slate-400">-</TD>;
  }

  return <TD>-</TD>;
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-slate-50 p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function countStatus(
  tasks: Array<{ status: string }>,
  status: "Todo" | "In Progress" | "Done",
) {
  return tasks.filter((task) => task.status === status).length;
}

function statusTone(status: string) {
  if (status === "Done") {
    return "green" as const;
  }

  if (status === "In Progress") {
    return "blue" as const;
  }

  return "yellow" as const;
}

function daysUntil(dueDate: string) {
  const due = new Date(dueDate).getTime();
  const now = new Date().getTime();

  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}
