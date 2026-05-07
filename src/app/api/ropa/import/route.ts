import { NextResponse } from "next/server";
import { createRopa, getDepartments } from "@/lib/data";
import { parseRopaImportWorkbook } from "@/lib/ropa-import";
import { createRopaSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "File Excel wajib diupload dengan field file." },
      { status: 400 },
    );
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json(
      { error: "Format file harus .xlsx." },
      { status: 400 },
    );
  }

  const departments = await getDepartments();
  const parsedWorkbook = await parseRopaImportWorkbook(
    Buffer.from(await file.arrayBuffer()),
    departments,
  );

  const validationErrors = parsedWorkbook.rows
    .map((row) => {
      const parsed = createRopaSchema.safeParse(row.payload);

      if (parsed.success) {
        return null;
      }

      const fieldErrors = parsed.error.flatten().fieldErrors;
      const messages = Object.entries(fieldErrors).flatMap(([field, messages]) =>
        (messages ?? []).map((message) => `${field}: ${message}`),
      );

      return {
        rowNumber: row.rowNumber,
        messages,
      };
    })
    .filter((error): error is { rowNumber: number; messages: string[] } =>
      Boolean(error),
    );

  const errors = [...parsedWorkbook.errors, ...validationErrors];

  if (errors.length) {
    return NextResponse.json(
      {
        error: "Import RoPA gagal. Perbaiki row yang bermasalah lalu upload ulang.",
        issues: errors,
        warnings: parsedWorkbook.rows.flatMap((row) => row.warnings),
      },
      { status: 400 },
    );
  }

  const created = [];

  for (const row of parsedWorkbook.rows) {
    const result = await createRopa(row.payload);
    created.push({
      rowNumber: row.rowNumber,
      id: result.id,
      triggers: result.triggers.map((trigger) => trigger.type),
    });
  }

  return NextResponse.json({
    imported: created.length,
    created,
    warnings: parsedWorkbook.rows.flatMap((row) => row.warnings),
  });
}
