import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getSelfAssessmentById, updateSelfAssessment } from "@/lib/data";
import { selfAssessmentUpdateSchema } from "@/lib/validators";

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

  return NextResponse.json({ data: assessment });
}

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = selfAssessmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid self assessment payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  try {
    const assessment = await updateSelfAssessment(id, parsed.data, toAccessScope(viewer));
    if (!assessment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: assessment });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Only DPO")) {
      return NextResponse.json({ error: "Only DPO or Master Admin can finalize" }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes("Finalized self assessment")) {
      return NextResponse.json({ error: "Finalized self assessment cannot be edited" }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes("Forbidden department scope")) {
      return NextResponse.json({ error: "Forbidden department scope" }, { status: 403 });
    }
    return NextResponse.json({ error: "Gagal menyimpan self assessment." }, { status: 500 });
  }
}
