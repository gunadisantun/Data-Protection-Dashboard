import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe2,
  Plus,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { getDashboardSummary } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();
  const dataTypeTotal = Math.max(
    1,
    ...summary.ropaAnalysis.dataTypeAnalysis.topDataTypes.map((row) => row.activityCount),
  );
  const legalBasisTotal = Math.max(
    1,
    ...summary.ropaAnalysis.legalBasisAnalysis.distribution.map((row) => row.count),
  );
  const thirdPartyTotal = Math.max(
    1,
    ...summary.ropaAnalysis.thirdPartyAnalysis.topThirdParties.map((row) => row.count),
  );

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            Main Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ringkasan faktual aktivitas RoPA dan status tindak lanjut DPIA, TIA, serta LIA.
          </p>
        </div>
        <Link href="/ropa/new">
          <Button size="lg" className="w-full shadow-sm lg:w-auto">
            <Plus className="h-4 w-4" />
            Tambah Aktivitas (RoPA)
          </Button>
        </Link>
      </div>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label="Total RoPA"
          value={summary.totalRopa}
          caption={`${summary.activeRopa} aktif`}
          accent="bg-blue-50 text-blue-600"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Open Tasks"
          value={summary.pendingTasks}
          caption={`${summary.criticalRisks} critical`}
          accent="bg-cyan-50 text-cyan-700"
        />
        <MetricCard
          icon={<AlertCircle className="h-5 w-5" />}
          label="Draft RoPA"
          value={summary.drafts}
          caption="Perlu finalisasi"
          accent="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="DPIA"
          value={summary.assessmentByType.DPIA}
          caption="Generated task"
          accent="bg-red-50 text-red-600"
        />
        <MetricCard
          icon={<Globe2 className="h-5 w-5" />}
          label="TIA"
          value={summary.assessmentByType.TIA}
          caption="Generated task"
          accent="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={<Scale className="h-5 w-5" />}
          label="LIA"
          value={summary.assessmentByType.LIA}
          caption="Generated task"
          accent="bg-indigo-50 text-indigo-700"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
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
                    <p className="mt-1 text-xs text-slate-400">{formatDate(event.createdAt)}</p>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-red-600" />
              Urgent Task List
            </CardTitle>
            <Link
              href="/tasks"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <tr>
                  <TH>Task</TH>
                  <TH>Asset</TH>
                  <TH>Status</TH>
                  <TH>Due</TH>
                </tr>
              </THead>
              <TBody>
                {summary.urgentTasks.length ? (
                  summary.urgentTasks.slice(0, 6).map((task) => (
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TD colSpan={4} className="py-6 text-center text-slate-500">
                      Belum ada task urgent.
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Analisis Jenis Data Pribadi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FactBox
                label="Top 10 jenis Data Pribadi"
                value={summary.ropaAnalysis.dataTypeAnalysis.topDataTypes.length}
              />
              <FactBox
                label="Aktivitas memproses Data Pribadi Spesifik"
                value={summary.ropaAnalysis.dataTypeAnalysis.specificDataActivityCount}
              />
            </div>
            <SimpleBarChart
              rows={summary.ropaAnalysis.dataTypeAnalysis.topDataTypes.map((row) => ({
                label: row.dataType,
                value: row.activityCount,
              }))}
              maxValue={dataTypeTotal}
              emptyLabel="Belum ada data jenis Data Pribadi."
            />
            <Table>
              <THead>
                <tr>
                  <TH>Jenis Data Pribadi</TH>
                  <TH>Jumlah Aktivitas</TH>
                  <TH>Unit Terkait</TH>
                </tr>
              </THead>
              <TBody>
                {summary.ropaAnalysis.dataTypeAnalysis.tableRows.length ? (
                  summary.ropaAnalysis.dataTypeAnalysis.tableRows.map((row) => (
                    <tr key={row.dataType}>
                      <TD className="font-semibold text-slate-900">{row.dataType}</TD>
                      <TD>{row.activityCount}</TD>
                      <TD>{row.units || "-"}</TD>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TD colSpan={3} className="py-6 text-center text-slate-500">
                      Belum ada data RoPA untuk dianalisis.
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analisis Dasar Pemrosesan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FactBox
                label="Distribusi dasar pemrosesan"
                value={summary.ropaAnalysis.legalBasisAnalysis.distribution.reduce(
                  (total, row) => total + row.count,
                  0,
                )}
              />
              <FactBox
                label="Aktivitas tanpa dasar pemrosesan"
                value={summary.ropaAnalysis.legalBasisAnalysis.missingCount}
              />
            </div>
            <SimpleBarChart
              rows={summary.ropaAnalysis.legalBasisAnalysis.distribution.map((row) => ({
                label: row.legalBasis,
                value: row.count,
              }))}
              maxValue={legalBasisTotal}
              emptyLabel="Belum ada data dasar pemrosesan."
            />
            <Table>
              <THead>
                <tr>
                  <TH>Aktivitas</TH>
                  <TH>Unit</TH>
                  <TH>PIC</TH>
                </tr>
              </THead>
              <TBody>
                {summary.ropaAnalysis.legalBasisAnalysis.missingActivities.length ? (
                  summary.ropaAnalysis.legalBasisAnalysis.missingActivities.map((row) => (
                    <tr key={row.id}>
                      <TD className="font-semibold text-slate-900">{row.activityName}</TD>
                      <TD>{row.departmentName}</TD>
                      <TD>{row.picName}</TD>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TD colSpan={3} className="py-6 text-center text-slate-500">
                      Semua aktivitas sudah memiliki dasar pemrosesan.
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analisis Pihak Ketiga</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FactBox
                label="Aktivitas melibatkan pihak ketiga"
                value={summary.ropaAnalysis.thirdPartyAnalysis.activitiesWithThirdParty}
              />
              <FactBox
                label="Top 10 pihak ketiga"
                value={summary.ropaAnalysis.thirdPartyAnalysis.topThirdParties.length}
              />
            </div>
            <SimpleBarChart
              rows={summary.ropaAnalysis.thirdPartyAnalysis.topThirdParties.map((row) => ({
                label: row.name,
                value: row.count,
              }))}
              maxValue={thirdPartyTotal}
              emptyLabel="Belum ada pihak ketiga yang tercatat."
            />
            <Table>
              <THead>
                <tr>
                  <TH>Aktivitas</TH>
                  <TH>Unit</TH>
                  <TH>Pihak Ketiga</TH>
                  <TH>Peran</TH>
                </tr>
              </THead>
              <TBody>
                {summary.ropaAnalysis.thirdPartyAnalysis.tableRows.length ? (
                  summary.ropaAnalysis.thirdPartyAnalysis.tableRows.map((row, index) => (
                    <tr key={`${row.id}-${row.thirdParty}-${index}`}>
                      <TD className="font-semibold text-slate-900">{row.activityName}</TD>
                      <TD>{row.departmentName}</TD>
                      <TD>{row.thirdParty}</TD>
                      <TD>{row.role}</TD>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <TD colSpan={4} className="py-6 text-center text-slate-500">
                      Belum ada aktivitas yang melibatkan pihak ketiga.
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
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
          <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${accent}`}>
            {icon}
          </span>
        </div>
        <div className="mt-6 text-3xl font-bold text-slate-950">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-4 text-xs font-semibold text-slate-500">{caption}</div>
      </CardContent>
    </Card>
  );
}

function FactBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function SimpleBarChart({
  rows,
  maxValue,
  emptyLabel,
}: {
  rows: Array<{ label: string; value: number }>;
  maxValue: number;
  emptyLabel: string;
}) {
  if (!rows.length) {
    return (
      <p className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="line-clamp-1 font-semibold text-slate-700">{row.label}</span>
            <span className="shrink-0 text-slate-500">{row.value}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{
                width: `${Math.max(6, (row.value / Math.max(1, maxValue)) * 100)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
