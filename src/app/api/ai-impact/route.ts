import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  createAiImpactAssessmentFromRopa,
  createStandaloneAiImpactAssessment,
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
    departmentId?: string;
    aiSystem?: string;
  } | null;

  if (!payload?.primaryRopaId && !payload?.aiSystem) {
    return NextResponse.json(
      { error: "primaryRopaId or aiSystem is required" },
      { status: 400 },
    );
  }

  const scope = toAccessScope(viewer);
  const assessment = payload.primaryRopaId
    ? await createAiImpactAssessmentFromRopa(
        { primaryRopaId: payload.primaryRopaId },
        scope,
        viewer.id,
      )
    : await createStandaloneAiImpactAssessment(
        {
          aiSystem: payload.aiSystem ?? "",
          departmentId:
            viewer.role === "User" && !viewer.isDemo
              ? viewer.departmentId
              : payload.departmentId,
        },
        scope,
        viewer.id,
      );

  if (!assessment) {
    return NextResponse.json(
      { error: "Unable to create AIIA in the selected scope." },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: assessment }, { status: 201 });
}
