import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getExcelTemplatePath } from "@/lib/excel-export";

export const runtime = "nodejs";

export async function GET() {
  const templatePath = getExcelTemplatePath("ropa");

  if (!existsSync(templatePath)) {
    return NextResponse.json(
      { error: "Template RoPA Excel tidak ditemukan." },
      { status: 404 },
    );
  }

  const buffer = await readFile(path.normalize(templatePath));

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        "attachment; filename*=UTF-8''RoPA%20Template.xlsx",
      "Cache-Control": "no-store",
    },
  });
}
