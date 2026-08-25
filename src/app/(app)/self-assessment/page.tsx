import Link from "next/link";
import { ClipboardCheck, FileCheck2 } from "lucide-react";
import { SelfAssessmentCreateForm } from "@/components/self-assessment-create-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { requireViewer, toAccessScope } from "@/lib/access";
import {
  getDepartments,
  getSelfAssessmentDashboard,
} from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SelfAssessmentPageProps = {
  searchParams?: Promise<{ unavailable?: string }>;
};

export default async function SelfAssessmentPage({
  searchParams,
}: SelfAssessmentPageProps) {
  const viewer = await requireViewer();
  const scope = toAccessScope(viewer);
  const params = searchParams ? await searchParams : {};
  const [rows, departments] = await Promise.all([
    getSelfAssessmentDashboard(scope),
    getDepartments(scope),
  ]);
  const activeRows = latestAssessmentPerDepartment(rows);
  const draft = activeRows.filter((row) => row.status === "Draft").length;
  const submitted = activeRows.filter((row) => row.status === "Submitted").length;
  const finalized = activeRows.filter((row) => row.status === "Finalized").length;

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">
          Self Assessment Kepatuhan PDP
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Assessment internal berbasis trigger. Level 1 hanya screening relevansi
          unit, lalu Level 2 yang terpicu dipakai untuk scoring, gap analysis,
          evidence review, dan action plan. Satu unit memiliki satu assessment
          aktif yang bisa diperbarui berkala.
        </p>
      </div>

      {params.unavailable ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent>
            <p className="font-bold text-amber-900">
              Assessment tidak tersedia untuk sesi atau akun saat ini.
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Link detail sebelumnya kemungkinan berasal dari sesi demo lama atau
              unit lain. Buka assessment aktif dari daftar di bawah, atau klik
              tombol buka assessment untuk unit Anda.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Draft" value={draft} />
        <StatCard label="Menunggu Review" value={submitted} />
        <StatCard label="Finalized" value={finalized} />
      </div>

      <SelfAssessmentCreateForm
        departments={departments}
        defaultDepartmentId={viewer.departmentId}
        lockDepartment={viewer.role === "User" && !viewer.isDemo}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            Assessment Aktif per Unit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>No. Assessment</TH>
                <TH>Judul</TH>
                <TH>Unit</TH>
                <TH>Skor</TH>
                <TH>Gap</TH>
                <TH>Status</TH>
                <TH>Update</TH>
                <TH>Aksi</TH>
              </tr>
            </THead>
            <TBody>
              {activeRows.map((row) => (
                <tr key={row.id}>
                  <TD className="font-semibold">{row.assessmentNumber}</TD>
                  <TD>{row.title}</TD>
                  <TD>{row.department?.name ?? "-"}</TD>
                  <TD>
                    {row.summary.percentage === null
                      ? "N/A"
                      : `${Math.round(row.summary.percentage * 100)}%`}
                  </TD>
                  <TD>{row.summary.gaps}</TD>
                  <TD>
                    <Badge
                      tone={
                        row.status === "Finalized"
                          ? "green"
                          : row.status === "Submitted"
                            ? "blue"
                            : "yellow"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TD>
                  <TD>{formatDate(row.updatedAt)}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/self-assessment/${row.id}`}>
                        <Button variant="secondary" size="sm">
                          Buka
                        </Button>
                      </Link>
                      <Link href={`/api/self-assessments/${row.id}/export`}>
                        <Button variant="secondary" size="sm">
                          Full Report
                        </Button>
                      </Link>
                    </div>
                  </TD>
                </tr>
              ))}
              {activeRows.length === 0 ? (
                <tr>
                  <TD colSpan={8} className="py-8 text-center text-slate-500">
                    Belum ada self assessment aktif.
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

function latestAssessmentPerDepartment<T extends { departmentId: string | null; id: string }>(
  rows: T[],
) {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = row.departmentId || row.id;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return [...map.values()];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <FileCheck2 className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}
