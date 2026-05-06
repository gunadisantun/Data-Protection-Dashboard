import { NextResponse } from "next/server";
import {
  buildRopaRegistryWorkbook,
  excelFileName,
} from "@/lib/excel-export";
import { getDepartments, listRopaForExport } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const department = searchParams.get("department") ?? undefined;
  const risk = searchParams.get("risk") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const activities = listRopaForExport({ department, risk, status });

  if (!activities.length) {
    return NextResponse.json(
      { error: "Tidak ada aktivitas RoPA untuk filter ini." },
      { status: 404 },
    );
  }

  const departments = getDepartments();
  const departmentName =
    department && department !== "all"
      ? departments.find((item) => item.id === department)?.name
      : "Semua Departemen";

  try {
    const buffer = await buildRopaRegistryWorkbook(activities);
    const fileName = excelFileName(
      "RoPA Departemen",
      departmentName ?? "Semua Departemen",
    );

    return excelResponse(buffer, fileName);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat export RoPA departemen.",
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
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
