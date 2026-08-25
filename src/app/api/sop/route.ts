import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  createSopDocumentMetadata,
  listSopDocuments,
  rebuildSopKnowledgeChunks,
  uploadSopFileToStorage,
} from "@/lib/data";
import { extractSopText } from "@/lib/knowledge";
import { sopMetadataSchema, validateSopUploadFile } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await listSopDocuments(toAccessScope(viewer));
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
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File SOP wajib diunggah." }, { status: 400 });
  }

  const fileValidationError = validateSopUploadFile(file);
  if (fileValidationError) {
    return NextResponse.json({ error: fileValidationError }, { status: 400 });
  }

  const metadataPayload = {
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? ""),
    summary: String(formData.get("summary") ?? ""),
  };

  const parsed = sopMetadataSchema.safeParse(metadataPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Metadata SOP tidak valid.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const scope = toAccessScope(viewer);
    const extracted = await extractSopText(file);
    const uploaded = await uploadSopFileToStorage(file, scope);
    if (!uploaded) {
      return NextResponse.json({ error: "Upload SOP ditolak." }, { status: 403 });
    }

    const saved = await createSopDocumentMetadata(
      {
        title: parsed.data.title,
        category: parsed.data.category,
        summary: parsed.data.summary,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        storageBucket: uploaded.bucket,
        storagePath: uploaded.storagePath,
      },
      scope,
    );

    if (!saved) {
      return NextResponse.json({ error: "Gagal menyimpan metadata SOP." }, { status: 500 });
    }

    await rebuildSopKnowledgeChunks(saved, extracted.text, extracted.extractionStatus);

    return NextResponse.json({ data: saved }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat upload SOP.",
      },
      { status: 500 },
    );
  }
}
