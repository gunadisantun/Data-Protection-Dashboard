import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { updateDsrRequest } from "@/lib/consent-dsr";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer || (viewer.role !== "DPO" && viewer.role !== "MasterAdmin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  try { return NextResponse.json({ data: await updateDsrRequest(id, { status: "Closed" }, toAccessScope(viewer)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to close request" }, { status: 400 }); }
}
