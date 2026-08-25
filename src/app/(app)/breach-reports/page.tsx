import Link from "next/link";
import { Download, FileWarning, ShieldCheck } from "lucide-react";
import { BreachReportCreateForm } from "@/components/breach-report-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requireViewer, toAccessScope } from "@/lib/access";
import {
  getCurrentUser,
  getDepartments,
  getGovernanceSettings,
  listBreachReports,
} from "@/lib/data";
import { buildBreachReportProfileAnswers } from "@/lib/breach-report-profile";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BreachReportsPage() {
  const viewer = await requireViewer();
  const scope = toAccessScope(viewer);
  const [reports, departments, governanceSettings, currentUser] = await Promise.all([
    listBreachReports(scope),
    getDepartments(scope),
    getGovernanceSettings(scope),
    getCurrentUser(scope),
  ]);
  const openReports = reports.filter((report) => report.status !== "Finalized").length;
  const submitted = reports.filter((report) => report.status === "Submitted").length;
  const finalized = reports.filter((report) => report.status === "Finalized").length;

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">
          Laporan Kegagalan PDP
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Formulir laporan kegagalan pelindungan data pribadi. User membuat draft
          dan submit; DPO melakukan finalisasi.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Open" value={openReports} />
        <StatCard label="Menunggu DPO" value={submitted} />
        <StatCard label="Finalized" value={finalized} />
      </div>

      <BreachReportCreateForm
        departments={departments}
        defaultDepartmentId={viewer.departmentId}
        lockDepartment={viewer.role === "User" && !viewer.isDemo}
        profileDefaults={buildBreachReportProfileAnswers({
          governanceSettings,
          user: currentUser,
          departmentName: currentUser?.department?.name,
        })}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-blue-600" />
            Daftar Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>No. Laporan</TH>
                <TH>Judul</TH>
                <TH>Unit</TH>
                <TH>Status</TH>
                <TH>Dibuat</TH>
                <TH>Aksi</TH>
              </tr>
            </THead>
            <TBody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <TD className="font-semibold">{report.reportNumber}</TD>
                  <TD>{report.title}</TD>
                  <TD>{report.department?.name ?? "-"}</TD>
                  <TD>
                    <Badge
                      tone={
                        report.status === "Finalized"
                          ? "green"
                          : report.status === "Submitted"
                            ? "blue"
                            : "yellow"
                      }
                    >
                      {report.status}
                    </Badge>
                  </TD>
                  <TD>{formatDate(report.createdAt)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/breach-reports/${report.id}`}>
                        <Button variant="secondary" size="sm">
                          Buka
                        </Button>
                      </Link>
                      <Link href={`/api/breach-reports/${report.id}/export`}>
                        <Button variant="secondary" size="sm">
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </Link>
                    </div>
                  </TD>
                </tr>
              ))}
              {reports.length === 0 ? (
                <tr>
                  <TD colSpan={6} className="py-8 text-center text-slate-500">
                    Belum ada laporan kegagalan PDP.
                  </TD>
                </tr>
              ) : null}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ShieldCheck className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
