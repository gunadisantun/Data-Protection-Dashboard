import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getDsrRequest, updateDsrRequest } from "@/lib/consent-dsr";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const scope = toAccessScope(viewer);
  const current = await getDsrRequest(id, scope);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (current.request.identityVerificationStatus !== "Verified" && viewer.role !== "DPO" && viewer.role !== "MasterAdmin") return NextResponse.json({ error: "Identity verification is required before response" }, { status: 409 });
  try { return NextResponse.json({ data: await updateDsrRequest(id, { responseBody: String(body.responseBody ?? ""), status: viewer.role === "DPO" || viewer.role === "MasterAdmin" ? "Responded" : "DPO Review" }, scope) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare response" }, { status: 400 }); }
}
