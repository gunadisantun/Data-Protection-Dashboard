import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { uploadSelfAssessmentEvidenceFile } from "@/lib/data";
import { validateSelfAssessmentEvidenceFile } from "@/lib/validators";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const questionId = String(formData.get("questionId") ?? "");
  const file = formData.get("file");

  if (!questionId) {
    return NextResponse.json({ error: "Question ID wajib diisi." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File bukti wajib diunggah." }, { status: 400 });
  }

  const validationError = validateSelfAssessmentEvidenceFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  try {
    const evidence = await uploadSelfAssessmentEvidenceFile(
      id,
      questionId,
      file,
      toAccessScope(viewer),
    );
    if (!evidence) {
      return NextResponse.json({ error: "Self assessment tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ data: evidence }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat upload bukti.",
      },
      { status: 500 },
    );
  }
}
