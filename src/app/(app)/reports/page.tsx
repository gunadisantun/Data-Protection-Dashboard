import { BarChart3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { getAuditEvents, getReportSummary } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [summary, events] = await Promise.all([
    getReportSummary(),
    getAuditEvents(12),
  ]);
  const totalRisk =
    summary.riskDistribution.Low +
    summary.riskDistribution.Medium +
    summary.riskDistribution.High;

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Executive Reports</h1>
        <p className="mt-1 text-sm text-slate-600">
          Management view of aggregate compliance, risk, and task throughput.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        <ReportStat label="Compliance Score" value={`${summary.complianceScore}%`} />
        <ReportStat label="Total RoPA" value={summary.totalRopa} />
        <ReportStat label="Open Tasks" value={summary.pendingTasks} />
        <ReportStat label="Task Completion" value={`${summary.taskCompletionRate}%`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {Object.entries(summary.riskDistribution).map(([label, value]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-bold">{label}</span>
                  <span className="text-slate-500">{value} activities</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className={`h-3 rounded-full ${
                      label === "High"
                        ? "bg-red-500"
                        : label === "Medium"
                          ? "bg-amber-400"
                          : "bg-blue-500"
                    }`}
                    style={{
                      width: `${totalRisk ? Math.max(12, (value / totalRisk) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Assessment Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {Object.entries(summary.assessmentMix).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded border border-slate-100 p-4"
              >
                <span className="font-bold">{label}</span>
                <Badge tone={label === "DPIA" ? "red" : label === "TIA" ? "yellow" : "blue"}>
                  {value} tasks
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <tr>
                <TH>Event</TH>
                <TH>Entity</TH>
                <TH>Message</TH>
                <TH>Date</TH>
              </tr>
            </THead>
            <TBody>
              {events.length ? (
                events.map((event) => (
                  <tr key={event.id}>
                    <TD>
                      <Badge tone="slate">{event.eventType}</Badge>
                    </TD>
                    <TD>{event.entityType}</TD>
                    <TD>{event.message}</TD>
                    <TD>{formatDate(event.createdAt)}</TD>
                  </tr>
                ))
              ) : (
                <tr>
                  <TD colSpan={4} className="py-8 text-center text-slate-500">
                    Belum ada audit event.
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

function ReportStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-3 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
