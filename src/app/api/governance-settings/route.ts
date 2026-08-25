import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  getGovernanceSettings,
  updateGovernanceSettings,
} from "@/lib/data";
import { governanceSettingsUpdateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (viewer.role !== "DPO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getGovernanceSettings(toAccessScope(viewer));
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (viewer.role !== "DPO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = governanceSettingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await updateGovernanceSettings(parsed.data, toAccessScope(viewer));
  if (!updated) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: updated });
}
