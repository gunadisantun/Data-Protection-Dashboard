import { NextResponse } from "next/server";
import { getViewerFromRequest } from "@/lib/access";
import { upsertLegalMappingOverride } from "@/lib/data";
import { legalMappingOverridePatchSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role !== "MasterAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = legalMappingOverridePatchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = await upsertLegalMappingOverride({
    entryId: parsed.data.entryId,
    patch: parsed.data.patch,
    userId: viewer.id,
  });

  if (!data) {
    return NextResponse.json({ error: "Mapping entry tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
