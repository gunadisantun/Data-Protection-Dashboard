import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { verifyDsrRequest } from "@/lib/consent-dsr";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try { return NextResponse.json({ data: await verifyDsrRequest(id, await request.json(), toAccessScope(viewer)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify request" }, { status: 400 }); }
}
