import Link from "next/link";
import { Download, Filter, Plus, ShieldCheck } from "lucide-react";
import { DeleteActionButton } from "@/components/delete-action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { getDepartments, getRegistryStats, listRopa } from "@/lib/data";
import { formatDate } from "@/lib/utils";

type RegistryPageProps = {
  searchParams: Promise<{
    department?: string;
    risk?: string;
    status?: string;
  }>;
};

export default async function RegistryPage({ searchParams }: RegistryPageProps) {
  const filters = await searchParams;
  const rows = listRopa(filters);
  const departments = getDepartments();
  const stats = getRegistryStats();
  const exportParams = new URLSearchParams();
  const selectedDepartment =
    filters.department && filters.department !== "all"
      ? departments.find((department) => department.id === filters.department)
      : null;

  if (filters.department) {
    exportParams.set("department", filters.department);
  }

  if (filters.risk) {
    exportParams.set("risk", filters.risk);
  }

  if (filters.status) {
    exportParams.set("status", filters.status);
  }

  const exportHref = `/api/ropa/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;
  const departmentDistribution = departments
    .map((department) => ({
      id: department.id,
      name: department.name,
      count: rows.filter((activity) => activity.departmentId === department.id).length,
    }))
    .filter((department) => department.count > 0);
  const maxDepartmentCount = Math.max(
    1,
    ...departmentDistribution.map((department) => department.count),
  );

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-slate-950">
            RoPA Registry
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Records of Processing Activities for enterprise-wide compliance monitoring.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={exportHref}
            className={buttonVariantSecondary(rows.length === 0)}
            aria-disabled={rows.length === 0}
          >
            <Download className="h-4 w-4" />
            {selectedDepartment
              ? `Download RoPA ${selectedDepartment.name}`
              : "Download RoPA per Departemen"}
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Counter label="Active" value={stats.active} tone="green" />
            <Counter label="Drafts" value={stats.drafts} tone="yellow" />
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-900">
                Department
              </label>
              <Select name="department" defaultValue={filters.department ?? "all"}>
                <option value="all">All Departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-900">
                Risk Level
              </label>
              <Select name="risk" defaultValue={filters.risk ?? "all"}>
                <option value="all">All Risks</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-900">
                Status
              </label>
              <Select name="status" defaultValue={filters.status ?? "all"}>
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="dark" type="submit" className="w-full">
                <Filter className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Activity Name</TH>
              <TH>Department</TH>
              <TH>Subject Category</TH>
              <TH>Risk Level</TH>
              <TH>Status</TH>
              <TH>DPIA/TIA/LIA</TH>
              <TH>Date Created</TH>
              <TH>Actions</TH>
            </tr>
          </THead>
          <TBody>
            {rows.length ? (
              rows.map((activity) => (
                <tr key={activity.id}>
                  <TD className="font-bold text-slate-950">{activity.activityName}</TD>
                  <TD>{activity.departmentName}</TD>
                  <TD>{activity.subjectCategories[0] ?? "General"}</TD>
                  <TD>
                    <RiskBadge risk={activity.riskAssessmentLevel} />
                  </TD>
                  <TD>
                    <Badge tone={activity.status === "Active" ? "green" : "yellow"}>
                      {activity.status}
                    </Badge>
                  </TD>
                  <TD>
                    <ObligationLinks assessments={activity.assessments} />
                  </TD>
                  <TD>{formatDate(activity.createdAt)}</TD>
                  <TD>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/ropa/${activity.id}/result`}
                        className="font-bold text-blue-600"
                      >
                        Analyze
                      </Link>
                      <DeleteActionButton
                        endpoint={`/api/ropa/${activity.id}`}
                        label="Hapus"
                        confirmMessage={`Hapus aktivitas RoPA "${activity.activityName}" beserta semua DPIA/TIA/LIA terkait?`}
                      />
                    </div>
                  </TD>
                </tr>
              ))
            ) : (
              <tr>
                <TD colSpan={8} className="py-8 text-center text-slate-500">
                  Belum ada aktivitas RoPA.
                </TD>
              </tr>
            )}
          </TBody>
        </Table>
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-600 md:flex-row md:items-center">
          <span>Showing {rows.length} of {rows.length} entries</span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Registry Distribution</CardTitle>
            <p className="text-sm text-slate-500">
              Visual overview of data processing activities categorized by
              department and sensitivity score.
            </p>
          </CardHeader>
          <CardContent>
            {departmentDistribution.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {departmentDistribution.map((department) => (
                  <div key={department.id} className="rounded border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-bold">{department.name}</div>
                      <div className="text-xs font-semibold text-slate-500">
                        {department.count}
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{
                          width: `${(department.count / maxDepartmentCount) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Belum ada data untuk distribusi registry.
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-blue-600 text-white">
          <CardContent className="pt-5">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-white/15">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="mt-8 text-xl font-bold">Quick Analysis</h2>
            <p className="mt-2 text-sm text-blue-50">
              Register one activity and the governance dashboard will generate
              DPIA, TIA, and LIA obligations automatically.
            </p>
            <Link href="/ropa/new" className="mt-5 inline-block">
              <Button variant="secondary">
                <Plus className="h-4 w-4" />
                Tambah Aktivitas
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Counter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "yellow";
}) {
  return (
    <Card className="min-w-32">
      <CardContent className="flex items-center gap-3 pt-4">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded ${
            tone === "green" ? "bg-emerald-100" : "bg-amber-100"
          }`}
        >
          <ShieldCheck className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[11px] font-bold uppercase tracking-wide">
            {label}
          </span>
          <span className="text-xl font-bold">{value}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  const tone = risk === "High" ? "red" : risk === "Medium" ? "yellow" : "blue";
  return <Badge tone={tone}>{risk}</Badge>;
}

function ObligationLinks({
  assessments,
}: {
  assessments: Array<{
    id: string;
    taskType: "DPIA" | "TIA" | "LIA";
    status: "Todo" | "In Progress" | "Done";
    severity: "Required" | "Critical";
  }>;
}) {
  if (!assessments.length) {
    return <span className="text-xs text-slate-400">Tidak ada trigger</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {assessments.map((assessment) => (
        <Link
          key={assessment.id}
          href={`/assessments/${assessment.id}/${assessment.taskType.toLowerCase()}`}
        >
          <Badge
            tone={
              assessment.status === "Done"
                ? "green"
                : assessment.severity === "Critical"
                  ? "red"
                  : assessment.taskType === "TIA"
                    ? "yellow"
                    : "blue"
            }
          >
            {assessment.taskType} - {assessment.status}
          </Badge>
        </Link>
      ))}
    </div>
  );
}

function buttonVariantSecondary(disabled: boolean) {
  return `inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-[color:var(--pv-muted)] ${
    disabled ? "pointer-events-none opacity-50" : ""
  }`;
}
