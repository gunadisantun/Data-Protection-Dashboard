import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { dsrEvents } from "@/db/schema";
import { getViewerFromRequest, toAccessScope } from "@/lib/access";
import { getDsrRequest } from "@/lib/consent-dsr";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await getViewerFromRequest(request);
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = (await context.params).id;
  const result = await getDsrRequest(id, toAccessScope(viewer));
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: await db.select().from(dsrEvents).where(eq(dsrEvents.requestId, id)).orderBy(asc(dsrEvents.timestamp)) });
}
