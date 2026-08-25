import { notFound } from "next/navigation";
import { BreachReportForm } from "@/components/breach-report-form";
import { requireViewer, toAccessScope } from "@/lib/access";
import {
  getBreachReportById,
  getDepartments,
  getGovernanceSettings,
} from "@/lib/data";
import { buildBreachReportProfileAnswers } from "@/lib/breach-report-profile";

export const dynamic = "force-dynamic";

type BreachReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BreachReportDetailPage({
  params,
}: BreachReportDetailPageProps) {
  const viewer = await requireViewer();
  const { id } = await params;
  const scope = toAccessScope(viewer);
  const [report, departments, governanceSettings] = await Promise.all([
    getBreachReportById(id, scope),
    getDepartments(scope),
    getGovernanceSettings(scope),
  ]);

  if (!report) {
    notFound();
  }

  return (
    <BreachReportForm
      report={{
        id: report.id,
        reportNumber: report.reportNumber,
        title: report.title,
        departmentId: report.departmentId,
        status: report.status,
        answers: report.answers,
      }}
      departments={departments}
      viewerRole={viewer.role}
      lockDepartment={viewer.role === "User" && !viewer.isDemo}
      profileDefaults={buildBreachReportProfileAnswers({
        governanceSettings,
        user: report.reporter,
        departmentName: report.department?.name,
        title: report.title,
        status: report.status,
      })}
    />
  );
}
