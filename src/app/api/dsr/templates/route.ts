import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createDsrTemplate, listDsrTemplates } from "@/lib/consent-dsr";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await listDsrTemplates(toAccessScope(viewer)) });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer || (viewer.role !== "DPO" && viewer.role !== "MasterAdmin")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try { return NextResponse.json({ data: await createDsrTemplate(await request.json(), toAccessScope(viewer)) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create template" }, { status: 400 }); }
}
