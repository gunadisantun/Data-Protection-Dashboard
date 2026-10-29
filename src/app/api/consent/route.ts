import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createConsentRecord, createConsentTemplate, listConsentRecords, listConsentTemplates } from "@/lib/consent-dsr";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = toAccessScope(viewer);
  return NextResponse.json({ data: await listConsentRecords(scope), templates: await listConsentTemplates(scope) });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const scope = toAccessScope(viewer);
    if (body.kind === "template") return NextResponse.json({ data: await createConsentTemplate(body, scope) }, { status: 201 });
    return NextResponse.json({ data: await createConsentRecord(body, scope) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create consent record" }, { status: 400 }); }
}
