import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createSelfAssessmentRevision, listSelfAssessmentRevisions } from "@/lib/self-assessment-review";
import { ReviewConflict } from "@/lib/review-policy";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listSelfAssessmentRevisions((await context.params).id, toAccessScope(viewer));
  return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function POST(request: Request, context: Context) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ expectedVersion: z.number().int().nonnegative() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid revision request" }, { status: 400 });
  try {
    const data = await createSelfAssessmentRevision((await context.params).id, parsed.data.expectedVersion, toAccessScope(viewer));
    return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ReviewConflict ? error.message : "Revision could not be created" }, { status: error instanceof ReviewConflict ? 409 : 500 });
  }
}
