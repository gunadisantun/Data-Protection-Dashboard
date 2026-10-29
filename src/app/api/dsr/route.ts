import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createDsrRequest, listDsrRequests } from "@/lib/consent-dsr";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  return NextResponse.json({ data: await listDsrRequests(toAccessScope(viewer), { status: url.searchParams.get("status") ?? undefined, requestType: url.searchParams.get("requestType") ?? undefined, overdue: url.searchParams.get("overdue") === "true" }) });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    return NextResponse.json({ data: await createDsrRequest(body ?? {}, toAccessScope(viewer)) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create request" }, { status: 400 });
  }
}
