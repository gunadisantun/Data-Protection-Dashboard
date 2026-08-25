import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createSelfAssessment, listSelfAssessments } from "@/lib/data";
import { selfAssessmentCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    data: await listSelfAssessments(toAccessScope(viewer)),
  });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = selfAssessmentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid self assessment payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const assessment = await createSelfAssessment(parsed.data, toAccessScope(viewer));
    return NextResponse.json({ data: assessment });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden department scope")) {
      return NextResponse.json({ error: "Forbidden department scope" }, { status: 403 });
    }
    return NextResponse.json({ error: "Gagal membuat self assessment." }, { status: 500 });
  }
}
