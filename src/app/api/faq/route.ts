import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createFaqEntry, listFaqEntries } from "@/lib/data";
import { faqEntryCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim() || undefined;
  const data = await listFaqEntries(category);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role !== "DPO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = faqEntryCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const created = await createFaqEntry(parsed.data, toAccessScope(viewer));
  if (!created) {
    return NextResponse.json({ error: "Gagal menambah FAQ." }, { status: 500 });
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
