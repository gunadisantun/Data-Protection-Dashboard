import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { privacyMapOverrides } from "@/db/schema";

export type PrivacyMapOverrideRecord = {
  jurisdictionId: string;
  patch: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string | null;
};

export async function listPrivacyMapOverrides(): Promise<PrivacyMapOverrideRecord[]> {
  const rows = await db
    .select({
      jurisdictionId: privacyMapOverrides.jurisdictionId,
      patch: privacyMapOverrides.patch,
      updatedAt: privacyMapOverrides.updatedAt,
      updatedBy: privacyMapOverrides.updatedBy,
    })
    .from(privacyMapOverrides);

  return rows.map((row) => ({
    jurisdictionId: row.jurisdictionId,
    patch: row.patch,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  }));
}

export async function upsertPrivacyMapOverride(input: {
  jurisdictionId: string;
  patch: Record<string, unknown>;
  userId: string;
}) {
  const now = new Date().toISOString();
  const id = `privacy-map-override-${input.jurisdictionId}`;

  await db
    .insert(privacyMapOverrides)
    .values({
      id,
      jurisdictionId: input.jurisdictionId,
      patch: input.patch,
      createdAt: now,
      updatedAt: now,
      updatedBy: input.userId,
    })
    .onConflictDoUpdate({
      target: privacyMapOverrides.jurisdictionId,
      set: {
        patch: input.patch,
        updatedAt: now,
        updatedBy: input.userId,
      },
    });

  const [row] = await db
    .select({
      jurisdictionId: privacyMapOverrides.jurisdictionId,
      patch: privacyMapOverrides.patch,
      updatedAt: privacyMapOverrides.updatedAt,
      updatedBy: privacyMapOverrides.updatedBy,
    })
    .from(privacyMapOverrides)
    .where(eq(privacyMapOverrides.jurisdictionId, input.jurisdictionId))
    .limit(1);

  return row
    ? {
        jurisdictionId: row.jurisdictionId,
        patch: row.patch,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy,
      }
    : null;
}
