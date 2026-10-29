import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createDsrPublicLink } from "@/lib/consent-dsr";

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ data: await createDsrPublicLink(toAccessScope(viewer)) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create public link" }, { status: 400 }); }
}
