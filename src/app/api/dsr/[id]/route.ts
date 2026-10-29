import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getDsrRequest, updateDsrRequest } from "@/lib/consent-dsr";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const data = await getDsrRequest(id, toAccessScope(viewer));
  return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    return NextResponse.json({ data: await updateDsrRequest(id, await request.json(), toAccessScope(viewer)) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update request" }, { status: 400 });
  }
}
