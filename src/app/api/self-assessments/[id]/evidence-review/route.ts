import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { reviewSelfAssessmentEvidence } from "@/lib/self-assessment-review";
import { ReviewConflict } from "@/lib/review-policy";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.role === "User") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = z.object({ questionId: z.string(), expectedVersion: z.number().int().nonnegative(), status: z.enum(["NeedsChanges", "Accepted"]), strength: z.enum(["Weak", "Adequate", "Strong"]), note: z.string().trim().min(3).max(4000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "A review decision and note are required" }, { status: 400 });
  try {
    const data = await reviewSelfAssessmentEvidence((await context.params).id, parsed.data.questionId, parsed.data, toAccessScope(viewer));
    return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Review failed" }, { status: error instanceof ReviewConflict ? 409 : 400 });
  }
}
