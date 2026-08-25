import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getSelfAssessmentById } from "@/lib/data";
import { generateSelfAssessmentPdf } from "@/lib/self-assessment-pdf";
import type {
  SelfAssessmentActionPlanItem,
  SelfAssessmentAnswers,
} from "@/lib/self-assessment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const assessment = await getSelfAssessmentById(id, toAccessScope(viewer));
  if (!assessment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await generateSelfAssessmentPdf({
    ...assessment,
    answers: assessment.answers as SelfAssessmentAnswers,
    actionPlan: assessment.actionPlan as SelfAssessmentActionPlanItem[],
  });
  const fileName = `${assessment.assessmentNumber}-self-assessment-pdp-full-report.pdf`;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
