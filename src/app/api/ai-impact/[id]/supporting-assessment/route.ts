import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createAiImpactSupportingAssessment } from "@/lib/data";
import type { AssessmentType } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as {
    type?: AssessmentType;
  } | null;
  const type = payload?.type;

  if (!type || !["DPIA", "TIA", "LIA"].includes(type)) {
    return NextResponse.json({ error: "Invalid assessment type" }, { status: 400 });
  }

  const task = await createAiImpactSupportingAssessment(
    id,
    type,
    toAccessScope(viewer),
    viewer.id,
  );

  if (!task) {
    return NextResponse.json({ error: "AIIA not found" }, { status: 404 });
  }

  return NextResponse.json({ data: task }, { status: 201 });
}
