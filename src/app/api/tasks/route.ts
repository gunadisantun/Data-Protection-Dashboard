import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { listTasks } from "@/lib/data";
import type { AssessmentStatus } from "@/lib/types";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as AssessmentStatus | null;
  const scope = toAccessScope(viewer);

  return NextResponse.json({
    data: await listTasks(status ? [status] : undefined, { scope }),
  });
}
