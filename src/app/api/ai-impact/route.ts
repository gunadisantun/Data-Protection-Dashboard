import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  createAiImpactAssessmentFromRopa,
  listAiImpactAssessments,
} from "@/lib/data";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    data: await listAiImpactAssessments(toAccessScope(viewer)),
  });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    primaryRopaId?: string;
  } | null;

  if (!payload?.primaryRopaId) {
    return NextResponse.json({ error: "primaryRopaId is required" }, { status: 400 });
  }

  const assessment = await createAiImpactAssessmentFromRopa(
    { primaryRopaId: payload.primaryRopaId },
    toAccessScope(viewer),
    viewer.id,
  );

  if (!assessment) {
    return NextResponse.json(
      { error: "RoPA not found or outside your access scope." },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: assessment }, { status: 201 });
}
