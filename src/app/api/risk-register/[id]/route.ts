import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { deleteRiskRegisterEntry, updateRiskRegisterEntry } from "@/lib/data";
import { riskRegisterUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = riskRegisterUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid risk register update payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const updated = await updateRiskRegisterEntry(id, parsed.data, toAccessScope(viewer));

  if (!updated) {
    return NextResponse.json({ error: "Risk register entry not found" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const deleted = await deleteRiskRegisterEntry(id, toAccessScope(viewer));

  if (!deleted) {
    return NextResponse.json({ error: "Risk register entry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
