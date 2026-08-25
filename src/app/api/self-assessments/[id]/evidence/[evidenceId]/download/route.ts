import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  getSelfAssessmentEvidenceSignedUrl,
  getSelfAssessmentEvidenceStoredFile,
} from "@/lib/data";

type RouteContext = {
  params: Promise<{ id: string; evidenceId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, evidenceId } = await context.params;
  const scope = toAccessScope(viewer);

  if (new URL(request.url).searchParams.get("file") === "1") {
    const file = await getSelfAssessmentEvidenceStoredFile(id, evidenceId, scope);
    if (!file) {
      return NextResponse.json({ error: "Bukti tidak ditemukan." }, { status: 404 });
    }

    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  try {
    const data = await getSelfAssessmentEvidenceSignedUrl(
      id,
      evidenceId,
      scope,
    );
    if (!data) {
      return NextResponse.json({ error: "Bukti tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat link unduhan bukti.",
      },
      { status: 500 },
    );
  }
}
