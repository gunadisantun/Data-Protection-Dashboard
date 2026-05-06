import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { getDashboardSummary } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const summary = getDashboardSummary();

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            Main Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Comprehensive view of your organization&apos;s privacy compliance posture.
          </p>
        </div>
        <Link href="/ropa/new">
          <Button size="lg" className="w-full shadow-sm lg:w-auto">
            <Plus className="h-4 w-4" />
            Tambah Aktivitas (RoPA)
          </Button>
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[1fr_2.1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-wide text-slate-500">
              Global Compliance Score
            </CardTitle>
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </span>
          </CardHeader>
          <CardContent>
            <div
              className="mx-auto flex h-40 w-40 items-center justify-center rounded-full p-3"
              style={{
                background: `conic-gradient(#2563eb 0 ${summary.complianceScore}%, #eff3fb ${summary.complianceScore}% 100%)`,
              }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white">
                <span className="text-4xl font-bold">{summary.complianceScore}%</span>
                <span className="text-xs font-bold text-slate-400">live score</span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded bg-[#fbf9ff] p-3 text-center">
                <div className="text-xl font-bold">{summary.criticalRisks}</div>
                <div className="text-[11px] text-slate-500">Critical Risks</div>
              </div>
              <div className="rounded bg-[#fbf9ff] p-3 text-center">
                <div className="text-xl font-bold">{summary.controlsActive}</div>
                <div className="text-[11px] text-slate-500">Controls Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-3">
            <MetricCard
              icon={<FileText className="h-5 w-5" />}
              label="Total RoPA"
              value={summary.totalRopa}
              caption={`${summary.activeRopa} active, ${summary.drafts} draft`}
              accent="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Active DPIA/TIA/LIA"
              value={summary.activeAssessments}
              caption={`${summary.criticalRisks} critical open task`}
              accent="bg-cyan-50 text-cyan-700"
            />
            <MetricCard
              icon={<ClipboardList className="h-5 w-5" />}
              label="Pending Tasks"
              value={summary.pendingTasks}
              caption={`${summary.pendingTasks} open task`}
              accent="bg-amber-50 text-amber-700"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
              <Link
                href="/reports"
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View History
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.recentActivity.length ? (
                summary.recentActivity.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      {index === 0 ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm text-slate-900">{event.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(event.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Belum ada aktivitas audit.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Urgent Task List
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              Filter
            </Button>
            <Button variant="secondary" size="sm">
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>Task Title</TH>
                <TH>Asset/System</TH>
                <TH>Status</TH>
                <TH>Due Date</TH>
                <TH>PIC</TH>
                <TH>Actions</TH>
              </tr>
            </THead>
            <TBody>
              {summary.urgentTasks.length ? (
                summary.urgentTasks.map((task) => (
                  <tr key={task.id}>
                    <TD className="font-bold text-slate-950">{task.taskType}</TD>
                    <TD>{task.activityName}</TD>
                    <TD>
                      <Badge tone={task.status === "Todo" ? "yellow" : "blue"}>
                        {task.status}
                      </Badge>
                    </TD>
                    <TD className="font-semibold text-red-600">
                      {formatDate(task.dueDate)}
                    </TD>
                    <TD>{task.picName}</TD>
                    <TD>
                      <Link
                        href={assessmentHref(task)}
                        className="text-sm font-bold text-blue-600"
                      >
                        {task.taskType === "DPIA"
                          ? "Isi DPIA"
                          : task.taskType === "TIA"
                            ? "Isi TIA"
                          : task.taskType === "LIA"
                            ? "Isi LIA"
                            : "Review"}
                      </Link>
                    </TD>
                  </tr>
                ))
              ) : (
                <tr>
                  <TD colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada task urgent.
                  </TD>
                </tr>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function assessmentHref(task: { id: string; taskType: string; ropaId: string }) {
  if (task.taskType === "DPIA") {
    return `/assessments/${task.id}/dpia`;
  }

  if (task.taskType === "TIA") {
    return `/assessments/${task.id}/tia`;
  }

  if (task.taskType === "LIA") {
    return `/assessments/${task.id}/lia`;
  }

  return `/ropa/${task.ropaId}/result`;
}

function MetricCard({
  icon,
  label,
  value,
  caption,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  caption: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent}`}>
            {icon}
          </span>
          <span className="text-xs text-slate-400">Monthly</span>
        </div>
        <div className="mt-8 text-4xl font-bold text-slate-950">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-8 text-xs font-semibold text-emerald-600">{caption}</div>
      </CardContent>
    </Card>
  );
}
