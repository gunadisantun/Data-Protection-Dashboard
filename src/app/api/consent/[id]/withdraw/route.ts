import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { withdrawConsent } from "@/lib/consent-dsr";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ data: await withdrawConsent((await context.params).id, toAccessScope(viewer)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to withdraw consent" }, { status: 400 }); }
}
