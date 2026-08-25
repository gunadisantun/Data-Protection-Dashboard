import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
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
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { AnalysisChartSwitcher } from "@/components/analysis-chart-switcher";
import { RiskRegisterDashboard } from "@/components/risk-register-dashboard";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requireViewer, toAccessScope } from "@/lib/access";
import { getDashboardSummary } from "@/lib/data";
import { getCurrentLocale } from "@/lib/i18n-server";
import { translate, type Locale, type TranslationKey } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const locale = await getCurrentLocale();

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <DashboardHeader locale={locale} />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent locale={locale} />
      </Suspense>
    </div>
  );
}

function DashboardHeader({ locale }: { locale: Locale }) {
  const t = createT(locale);

  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-slate-950">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {t("dashboard.subtitle")}
        </p>
      </div>
      <Link href="/ropa/new">
        <Button size="lg" className="w-full shadow-sm lg:w-auto">
          <Plus className="h-4 w-4" />
          {t("shell.addActivityRopa")}
        </Button>
      </Link>
    </div>
  );
}

async function DashboardContent({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const viewer = await requireViewer();
  const summary = await getDashboardSummary(toAccessScope(viewer));

  return (
    <>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={<FileText className="h-5 w-5" />}
          label={t("dashboard.totalRopa")}
          value={summary.totalRopa}
          caption={`${summary.activeRopa} ${t("dashboard.active")}`}
          accent="bg-blue-50 text-blue-600"
        />
        <MetricCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label={t("dashboard.openTasks")}
          value={summary.pendingTasks}
          caption={`${summary.criticalRisks} ${t("dashboard.critical")}`}
          accent="bg-cyan-50 text-cyan-700"
        />
        <MetricCard
          icon={<AlertCircle className="h-5 w-5" />}
          label={t("dashboard.draftRopa")}
          value={summary.drafts}
          caption={t("dashboard.needFinalization")}
          accent="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="DPIA"
          value={summary.assessmentByType.DPIA}
          caption={t("dashboard.generatedTask")}
          accent="bg-red-50 text-red-600"
        />
        <MetricCard
          icon={<Globe2 className="h-5 w-5" />}
          label="TIA"
          value={summary.assessmentByType.TIA}
          caption={t("dashboard.generatedTask")}
          accent="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={<Scale className="h-5 w-5" />}
          label="LIA"
          value={summary.assessmentByType.LIA}
          caption={t("dashboard.generatedTask")}
          accent="bg-indigo-50 text-indigo-700"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ExpandableSection
          title={t("dashboard.recentActivity")}
          icon={<Activity className="h-5 w-5 text-blue-600" />}
          defaultOpen
        >
          <div className="mb-2 flex justify-end">
            <Link
              href="/reports"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {t("common.viewHistory")}
            </Link>
          </div>
          <div className="space-y-4">
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
                {t("dashboard.noActivity")}
              </p>
            )}
          </div>
        </ExpandableSection>

        <ExpandableSection
          title={t("dashboard.urgentTaskList")}
          icon={<ClipboardList className="h-5 w-5 text-red-600" />}
          defaultOpen
        >
          <div className="mb-2 flex justify-end">
            <Link
              href="/tasks"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <Table>
            <THead>
              <tr>
                <TH>{t("dashboard.task")}</TH>
                <TH>{t("dashboard.asset")}</TH>
                <TH>{t("dashboard.status")}</TH>
                <TH>{t("dashboard.due")}</TH>
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
                    <TD className="font-semibold text-red-600">{formatDate(task.dueDate)}</TD>
                  </tr>
                ))
              ) : (
                <tr>
                  <TD colSpan={4} className="py-6 text-center text-slate-500">
                    {t("dashboard.noUrgentTasks")}
                  </TD>
                </tr>
              )}
            </TBody>
          </Table>
        </ExpandableSection>
      </section>

      <section>
        <RiskRegisterDashboard initialEntries={summary.riskRegister.rows} />
      </section>

      <section className="grid gap-5">
        <ExpandableSection
          title={t("dashboard.personalDataAnalysis")}
          icon={<FileText className="h-5 w-5 text-blue-600" />}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FactBox
                label={t("dashboard.topPersonalDataTypes")}
                value={summary.ropaAnalysis.dataTypeAnalysis.topDataTypes.length}
              />
              <FactBox
                label={t("dashboard.specificDataActivities")}
                value={summary.ropaAnalysis.dataTypeAnalysis.specificDataActivityCount}
              />
            </div>
            <AnalysisChartSwitcher
              storageKey="privacy-bro.chart.data-types"
              rows={summary.ropaAnalysis.dataTypeAnalysis.topDataTypes.map((row) => ({
                label: row.dataType,
                value: row.activityCount,
              }))}
              emptyLabel={t("dashboard.noPersonalDataTypes")}
            />
            <Table>
              <THead>
                <tr>
                  <TH>{t("dashboard.personalDataType")}</TH>
                  <TH>{t("dashboard.activityCount")}</TH>
                  <TH>{t("dashboard.relatedUnit")}</TH>
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
                      {t("dashboard.noRopaData")}
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </div>
        </ExpandableSection>

        <ExpandableSection
          title={t("dashboard.legalBasisAnalysis")}
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FactBox
                label={t("dashboard.legalBasisDistribution")}
                value={summary.ropaAnalysis.legalBasisAnalysis.distribution.reduce(
                  (total, row) => total + row.count,
                  0,
                )}
              />
              <FactBox
                label={t("dashboard.missingLegalBasisActivities")}
                value={summary.ropaAnalysis.legalBasisAnalysis.missingCount}
              />
            </div>
            <AnalysisChartSwitcher
              storageKey="privacy-bro.chart.legal-basis"
              rows={summary.ropaAnalysis.legalBasisAnalysis.distribution.map((row) => ({
                label: row.legalBasis,
                value: row.count,
              }))}
              emptyLabel={t("dashboard.noLegalBasisData")}
            />
            <Table>
              <THead>
                <tr>
                  <TH>{t("dashboard.activity")}</TH>
                  <TH>{t("dashboard.unit")}</TH>
                  <TH>{t("dashboard.pic")}</TH>
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
                      {t("dashboard.allActivitiesHaveLegalBasis")}
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </div>
        </ExpandableSection>

        <ExpandableSection
          title={t("dashboard.thirdPartyAnalysis")}
          icon={<Globe2 className="h-5 w-5 text-indigo-600" />}
        >
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FactBox
                label={t("dashboard.thirdPartyActivities")}
                value={summary.ropaAnalysis.thirdPartyAnalysis.activitiesWithThirdParty}
              />
              <FactBox
                label={t("dashboard.topThirdParties")}
                value={summary.ropaAnalysis.thirdPartyAnalysis.topThirdParties.length}
              />
            </div>
            <AnalysisChartSwitcher
              storageKey="privacy-bro.chart.third-parties"
              rows={summary.ropaAnalysis.thirdPartyAnalysis.topThirdParties.map((row) => ({
                label: row.name,
                value: row.count,
              }))}
              emptyLabel={t("dashboard.noThirdParties")}
            />
            <Table>
              <THead>
                <tr>
                  <TH>{t("dashboard.activity")}</TH>
                  <TH>{t("dashboard.unit")}</TH>
                  <TH>{t("dashboard.thirdParty")}</TH>
                  <TH>{t("dashboard.role")}</TH>
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
                      {t("dashboard.noThirdPartyActivities")}
                    </TD>
                  </tr>
                )}
              </TBody>
            </Table>
          </div>
        </ExpandableSection>
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-7">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-100" />
              <div className="mt-6 h-8 w-14 animate-pulse rounded-lg bg-slate-200" />
              <div className="mt-3 h-4 w-24 animate-pulse rounded bg-slate-100" />
              <div className="mt-5 h-3 w-20 animate-pulse rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardSkeletonPanel />
        <DashboardSkeletonPanel />
      </section>

      <DashboardSkeletonPanel tall />
      <DashboardSkeletonPanel tall />
    </div>
  );
}

function DashboardSkeletonPanel({ tall = false }: { tall?: boolean }) {
  return (
    <Card>
      <CardContent className={tall ? "h-80 p-6" : "h-64 p-6"}>
        <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: tall ? 6 : 4 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </CardContent>
    </Card>
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
    <Card className="overflow-hidden">
      <CardContent className="relative p-7 pt-7 sm:p-7 sm:pt-7">
        <div className="absolute right-6 top-6 h-16 w-16 rounded-full bg-blue-50/60 blur-2xl" />
        <div className="relative flex items-start justify-between">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/80 ${accent}`}
          >
            {icon}
          </span>
        </div>
        <div className="relative mt-6 text-3xl font-bold text-slate-950">{value}</div>
        <div className="relative text-sm font-semibold text-slate-600">{label}</div>
        <div className="relative mt-4 text-xs font-semibold text-slate-500">{caption}</div>
      </CardContent>
    </Card>
  );
}

function ExpandableSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <details className="group" open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 outline-none transition hover:bg-white/55 focus-visible:ring-4 focus-visible:ring-blue-100/80 sm:p-6 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{title}</CardTitle>
          </div>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--pv-border)] bg-white/70 text-slate-500 shadow-sm transition group-open:rotate-180">
            <ChevronDown className="h-4 w-4" />
          </span>
        </summary>
        <CardContent className="border-t border-slate-100/80 pt-5">{children}</CardContent>
      </details>
    </Card>
  );
}

function FactBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--pv-border)] bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="text-xs font-semibold text-slate-600">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function createT(locale: Locale) {
  return (key: TranslationKey) => translate(locale, key);
}
