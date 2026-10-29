import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { updateDsrRequest } from "@/lib/consent-dsr";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer || (viewer.role !== "DPO" && viewer.role !== "MasterAdmin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  try { return NextResponse.json({ data: await updateDsrRequest((await context.params).id, { assignedOwnerId: body.assignedOwnerId ?? null, departmentId: body.departmentId ?? null, status: "In Progress" }, toAccessScope(viewer)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to assign request" }, { status: 400 }); }
}
