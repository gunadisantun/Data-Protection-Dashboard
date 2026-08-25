import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { updateFaqEntry } from "@/lib/data";
import { faqEntryUpdateSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role !== "DPO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = faqEntryUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const updated = await updateFaqEntry(id, parsed.data, toAccessScope(viewer));
  if (!updated) {
    return NextResponse.json({ error: "FAQ tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
