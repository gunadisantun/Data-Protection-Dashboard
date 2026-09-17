import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getSelfAssessmentById } from "@/lib/data";
import { generateSelfAssessmentPdf } from "@/lib/self-assessment-pdf";
import { getFinalRevision } from "@/lib/self-assessment-review";
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

  const requestedRevision = new URL(request.url).searchParams.get("revision");
  const revision = requestedRevision ? Number(requestedRevision) : assessment.status === "Finalized" ? assessment.revision : null;
  if (revision !== null && (!Number.isInteger(revision) || revision < 1)) return NextResponse.json({ error: "Invalid revision" }, { status: 400 });
  const snapshot = revision !== null ? await getFinalRevision(id, revision, toAccessScope(viewer)) : null;
  if (revision !== null && !snapshot) return NextResponse.json({ error: "Revision not found" }, { status: 404 });
  const bytes = snapshot ? Buffer.from(snapshot.pdfBase64, "base64") : await generateSelfAssessmentPdf({
    ...assessment,
    locale: new URL(request.url).searchParams.get("locale") === "en" ? "en" : "id",
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
