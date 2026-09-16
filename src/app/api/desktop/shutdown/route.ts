import { timingSafeEqual } from "node:crypto";
import { closeQueryClient } from "@/db/client";
import { isOfflineRuntime } from "@/lib/offline-runtime";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.PRIVACY_BRO_DESKTOP_TOKEN;
  const supplied = request.headers.get("x-desktop-token") ?? "";
  if (!isOfflineRuntime() || !secret || secret.length < 32 || Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  await closeQueryClient();
  return Response.json({ closed: true });
}
