import { NextResponse } from "next/server";
import { getViewerFromRequest } from "@/lib/access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/templates/ropa-template.xlsx", request.url));
}
