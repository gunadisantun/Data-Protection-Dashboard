import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { deleteRopa } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteRopa(id, toAccessScope(viewer));

  if (!deleted) {
    return NextResponse.json({ error: "RoPA not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
