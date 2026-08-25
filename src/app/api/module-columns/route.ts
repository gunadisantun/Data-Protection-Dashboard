import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  getAllModuleColumnSettings,
  updateModuleColumnSettings,
} from "@/lib/data";
import { moduleColumnSettingsUpdateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAllModuleColumnSettings();
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.role !== "MasterAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = moduleColumnSettingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = await updateModuleColumnSettings(
    parsed.data.module,
    parsed.data.visibleColumns,
    parsed.data.customColumns,
    toAccessScope(viewer),
  );

  if (!data) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data });
}
