import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createBreachReport, listBreachReports } from "@/lib/data";
import { breachReportCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    data: await listBreachReports(toAccessScope(viewer)),
  });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = breachReportCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid breach report payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const report = await createBreachReport(parsed.data, toAccessScope(viewer));

    return NextResponse.json({ data: report });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Forbidden department scope")) {
      return NextResponse.json({ error: "Forbidden department scope" }, { status: 403 });
    }

    return NextResponse.json({ error: "Gagal membuat laporan." }, { status: 500 });
  }
}
