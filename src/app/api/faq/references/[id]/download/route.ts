import { NextResponse } from "next/server";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import {
  getReferenceSignedDownloadUrl,
  getReferenceStoredFile,
} from "@/lib/data";

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
  const scope = toAccessScope(viewer);

  if (new URL(request.url).searchParams.get("file") === "1") {
    const file = await getReferenceStoredFile(id, scope);
    if (!file) {
      return NextResponse.json({ error: "Referensi PDF belum tersedia." }, { status: 404 });
    }

    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.fileName)}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  const data = await getReferenceSignedDownloadUrl(id, scope);

  if (!data) {
    return NextResponse.json({ error: "Referensi PDF belum tersedia." }, { status: 404 });
  }

  return NextResponse.json({ data });
}
