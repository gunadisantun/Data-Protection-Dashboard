import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { demoSessions } from "@/db/schema";

export async function validDemoSession(id: string | undefined | null) {
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return false;
  const [row] = await db.select().from(demoSessions).where(eq(demoSessions.id, id)).limit(1);
  return Boolean(row && Date.parse(row.expiresAt) > Date.now());
}
