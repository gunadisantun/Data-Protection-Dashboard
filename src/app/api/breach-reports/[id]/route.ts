import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getBreachReportById, updateBreachReport } from "@/lib/data";
import { breachReportUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const report = await getBreachReportById(id, toAccessScope(viewer));

  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: report });
}

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = breachReportUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid breach report payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const report = await updateBreachReport(id, parsed.data, toAccessScope(viewer));

    if (!report) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: report });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Only DPO")) {
      return NextResponse.json({ error: "Only DPO can finalize" }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes("Finalized report")) {
      return NextResponse.json({ error: "Finalized report cannot be edited" }, { status: 409 });
    }

    if (error instanceof Error && error.message.includes("Forbidden department scope")) {
      return NextResponse.json({ error: "Forbidden department scope" }, { status: 403 });
    }

    return NextResponse.json({ error: "Gagal menyimpan laporan." }, { status: 500 });
  }
}
