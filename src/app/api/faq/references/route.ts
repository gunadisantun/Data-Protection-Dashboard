import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  backfillReferenceDocumentsFromUrls,
  listFaqReferences,
  saveReferenceDocument,
} from "@/lib/data";
import {
  referenceDocumentCreateSchema,
  validateReferenceUploadFile,
} from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await listFaqReferences();
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

  const formData = await request.formData();
  const action = String(formData.get("action") ?? "");
  const scope = toAccessScope(viewer);

  if (action === "backfill") {
    const data = await backfillReferenceDocumentsFromUrls(scope);
    return NextResponse.json({ data });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File referensi PDF wajib diunggah." }, { status: 400 });
  }

  const validationError = validateReferenceUploadFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const rawGroupName = String(formData.get("groupName") ?? "").trim();
  const parsed = referenceDocumentCreateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    groupName: !rawGroupName || rawGroupName === "Referensi" ? "Best Practice" : rawGroupName,
    description: String(formData.get("description") ?? ""),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Metadata referensi tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let saved;
  try {
    saved = await saveReferenceDocument(
      {
        title: parsed.data.title,
        groupName: parsed.data.groupName,
        description: parsed.data.description,
        file,
      },
      scope,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menyimpan referensi. Cek konfigurasi Supabase Storage.",
      },
      { status: 500 },
    );
  }

  if (!saved) {
    return NextResponse.json({ error: "Gagal menyimpan referensi." }, { status: 500 });
  }

  return NextResponse.json({ data: saved }, { status: 201 });
}
