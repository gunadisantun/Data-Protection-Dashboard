import { NextResponse } from "next/server";
import { deleteRopa } from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = deleteRopa(id);

  if (!deleted) {
    return NextResponse.json({ error: "RoPA not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
