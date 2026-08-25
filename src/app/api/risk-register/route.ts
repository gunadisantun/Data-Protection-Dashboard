import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { createRiskRegisterEntry, listRiskRegisterEntries } from "@/lib/data";
import { riskRegisterCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = toAccessScope(viewer);

  const data = await listRiskRegisterEntries({
    riskLevel: searchParams.get("riskLevel") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    query: searchParams.get("query") ?? undefined,
  }, scope);

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = riskRegisterCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid risk register payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const created = await createRiskRegisterEntry(parsed.data, toAccessScope(viewer));

  if (!created) {
    return NextResponse.json({ error: "Failed to create risk register entry" }, { status: 500 });
  }

  return NextResponse.json({ data: created }, { status: 201 });
}
