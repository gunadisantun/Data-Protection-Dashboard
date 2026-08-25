import { NextResponse } from "next/server";
import { cleanupDemoSession, createDemoSession } from "@/lib/data";
import { demoSessionCookieName } from "@/lib/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const existingDemoSessionId = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${demoSessionCookieName}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  if (existingDemoSessionId) {
    await cleanupDemoSession(decodeURIComponent(existingDemoSessionId));
  }

  const demoSessionId = crypto.randomUUID();
  await createDemoSession(demoSessionId);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(demoSessionCookieName, demoSessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 4,
  });

  return response;
}
