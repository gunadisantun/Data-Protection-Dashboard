import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { demoSessionCookieName, getViewerFromRequest } from "@/lib/access";
import { cleanupDemoSession } from "@/lib/data";

export async function POST(request: Request) {
  const viewer = await getViewerFromRequest(request);
  if (viewer?.isDemo && viewer.demoSessionId) {
    await cleanupDemoSession(viewer.demoSessionId);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(demoSessionCookieName, "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  try {
    return await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
