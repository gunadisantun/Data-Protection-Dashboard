import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getBreachReportById, getGovernanceSettings } from "@/lib/data";
import { generateBreachReportPdf } from "@/lib/breach-report-pdf";
import {
  buildBreachReportProfileAnswers,
  mergeBreachReportProfileAnswers,
} from "@/lib/breach-report-profile";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const scope = toAccessScope(viewer);
  const [report, governanceSettings] = await Promise.all([
    getBreachReportById(id, scope),
    getGovernanceSettings(scope),
  ]);

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await generateBreachReportPdf({
    reportNumber: report.reportNumber,
    title: report.title,
    status: report.status,
    createdAt: report.createdAt,
    finalizedAt: report.finalizedAt,
    departmentName: report.department?.name,
    answers: mergeBreachReportProfileAnswers(
      report.answers,
      buildBreachReportProfileAnswers({
        governanceSettings,
        user: report.reporter,
        departmentName: report.department?.name,
        title: report.title,
        status: report.status,
      }),
    ),
  });
  const fileName = `${report.reportNumber}-laporan-kegagalan-pdp.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
