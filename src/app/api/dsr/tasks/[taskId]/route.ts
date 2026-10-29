import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { updateDsrTask } from "@/lib/consent-dsr";

export async function PATCH(request: Request, context: { params: Promise<{ taskId: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ data: await updateDsrTask((await context.params).taskId, await request.json(), toAccessScope(viewer)) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update task" }, { status: 400 }); }
}
