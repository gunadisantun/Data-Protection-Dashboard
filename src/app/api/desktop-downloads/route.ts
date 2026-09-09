import { NextResponse } from "next/server";
import { getViewerFromRequest } from "@/lib/access";
import { getDesktopDownloadLinks } from "@/lib/desktop-downloads";

export async function GET(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (viewer.isDemo) {
    return NextResponse.json(
      { error: "Desktop download is not available in demo mode." },
      { status: 403 },
    );
  }

  const data = await getDesktopDownloadLinks();
  return NextResponse.json(
    { data },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
