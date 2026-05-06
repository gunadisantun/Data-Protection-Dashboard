import { NextResponse } from "next/server";
import {
  buildRopaWorkbook,
  excelFileName,
} from "@/lib/excel-export";
import { getRopaById } from "@/lib/data";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const activity = await getRopaById(id);

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
