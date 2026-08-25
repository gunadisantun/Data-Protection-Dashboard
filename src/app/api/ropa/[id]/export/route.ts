import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  buildRopaWorkbook,
  excelFileName,
} from "@/lib/excel-export";
import { getRopaById } from "@/lib/data";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const activity = await getRopaById(id, toAccessScope(viewer));

  if (!activity) {
    return NextResponse.json({ error: "RoPA not found" }, { status: 404 });
  }

  try {
    const buffer = await buildRopaWorkbook(activity);
    const fileName = excelFileName("RoPA", activity.activityName);

    return excelResponse(buffer, fileName);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat export RoPA Excel",
      },
      { status: 500 },
    );
  }
}

function excelResponse(buffer: Buffer, fileName: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
