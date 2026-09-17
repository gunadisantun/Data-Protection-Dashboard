import { and, eq, inArray, or, type AnyColumn } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { ensureDatabase } from "@/db/init";
import {
  ropaActivities,
  ropaFlowAssets,
  ropaFlowLinks,
  departments,
} from "@/db/schema";
import type { AccessScope } from "@/lib/data";
import type { FlowGraph, FlowKind, FlowNode } from "./ropa-flow-types";

const short = z.string().trim().max(240);
const assetFields = {
  name: short.min(1),
  kind: z.enum(["SOURCE", "SYSTEM", "STORAGE", "RECIPIENT"]),
  departmentId: short.min(1),
  owner: short,
  location: short,
  country: short,
  retention: short,
  description: z.string().trim().max(3000),
};
export const flowMutation = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("asset"), ...assetFields }),
  z.object({
    operation: z.literal("update"),
    id: short.min(1),
    version: z.number().int().nonnegative(),
    ...assetFields,
  }),
  z.object({
    operation: z.literal("link"),
    source: short.min(1),
    target: short.min(1),
    label: short.min(1),
    dataCategories: z.array(short.min(1)).max(50),
    note: z.string().trim().max(3000),
  }),
  z.object({ operation: z.literal("deleteLink"), id: short.min(1) }),
  z.object({
    operation: z.literal("deleteAsset"),
    id: short.min(1),
    version: z.number().int().nonnegative(),
  }),
]);
export class FlowError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function access(scope: AccessScope, department: AnyColumn, creator: AnyColumn) {
  if (!scope.userId) throw new FlowError(401, "Unauthorized");
  if (scope.isDemo) return eq(creator, scope.userId);
  return scope.role === "User"
    ? eq(department, scope.departmentId || "__no_unit__")
    : undefined;
}
const activityAccess = (s: AccessScope) =>
  access(s, ropaActivities.departmentId, ropaActivities.userId);
const assetAccess = (s: AccessScope) =>
  access(s, ropaFlowAssets.departmentId, ropaFlowAssets.createdBy);
const endpoint = (r: string | null, a: string | null) =>
  r ? `activity:${r}` : `asset:${a}`;

export async function getRopaFlow(scope: AccessScope): Promise<FlowGraph> {
  await ensureDatabase();
  const activities = await db
    .select()
    .from(ropaActivities)
    .where(activityAccess(scope))
    .orderBy(ropaActivities.id)
    .limit(501);
  const assets = await db
    .select()
    .from(ropaFlowAssets)
    .where(assetAccess(scope))
    .orderBy(ropaFlowAssets.id)
    .limit(501);
  const nodes: FlowNode[] = [
    ...activities
      .slice(0, 500)
      .map((a) => ({
        id: `activity:${a.id}`,
        recordId: a.id,
        kind: "ACTIVITY" as const,
        name: a.activityName,
        departmentId: a.departmentId,
        owner: a.picName || "",
        location: "",
        country: "",
        retention: a.retentionPeriod || "",
        description: a.processDescription,
        categories: a.personalDataTypes,
        version: 0,
        legacyStorage: a.storageLocation,
        legacyPrevious: a.previousProcess,
        legacyNext: a.nextProcess,
      })),
    ...assets
      .slice(0, 500)
      .map((a) => ({
        ...a,
        id: `asset:${a.id}`,
        recordId: a.id,
        kind: a.kind as FlowKind,
        categories: [],
      })),
  ];
  const ids = new Set(nodes.map((n) => n.id));
  const rows = nodes.length
    ? await db
        .select()
        .from(ropaFlowLinks)
        .where(
          and(
            or(
              inArray(
                ropaFlowLinks.sourceRopaId,
                activities.slice(0, 500).map((a) => a.id),
              ),
              inArray(
                ropaFlowLinks.sourceAssetId,
                assets.slice(0, 500).map((a) => a.id),
              ),
            ),
            or(
              inArray(
                ropaFlowLinks.targetRopaId,
                activities.slice(0, 500).map((a) => a.id),
              ),
              inArray(
                ropaFlowLinks.targetAssetId,
                assets.slice(0, 500).map((a) => a.id),
              ),
            ),
            scope.isDemo
              ? eq(ropaFlowLinks.createdBy, scope.userId!)
              : undefined,
          ),
        )
        .orderBy(ropaFlowLinks.id)
        .limit(2001)
    : [];
  return {
    nodes,
    links: rows
      .slice(0, 2000)
      .map((r) => ({
        id: r.id,
        source: endpoint(r.sourceRopaId, r.sourceAssetId),
        target: endpoint(r.targetRopaId, r.targetAssetId),
        label: r.label,
        dataCategories: r.dataCategories,
        note: r.note,
      }))
      .filter((r) => ids.has(r.source) && ids.has(r.target)),
    truncated:
      activities.length > 500 || assets.length > 500 || rows.length > 2000,
  };
}

async function requireEndpoint(id: string, scope: AccessScope) {
  const split = id.indexOf(":");
  const kind = id.slice(0, split);
  const recordId = id.slice(split + 1);
  const rows =
    kind === "activity"
      ? await db
          .select({ id: ropaActivities.id })
          .from(ropaActivities)
          .where(and(eq(ropaActivities.id, recordId), activityAccess(scope)))
      : kind === "asset"
        ? await db
            .select({ id: ropaFlowAssets.id })
            .from(ropaFlowAssets)
            .where(and(eq(ropaFlowAssets.id, recordId), assetAccess(scope)))
        : [];
  if (!rows.length) throw new FlowError(404, "Endpoint unavailable");
  return { kind, recordId };
}

export async function mutateRopaFlow(
  input: z.infer<typeof flowMutation>,
  scope: AccessScope,
) {
  await ensureDatabase();
  access(scope, ropaFlowAssets.departmentId, ropaFlowAssets.createdBy);
  if (input.operation === "asset" || input.operation === "update") {
    if (
      (scope.role === "User" || scope.isDemo) &&
      (!scope.departmentId || input.departmentId !== scope.departmentId)
    )
      throw new FlowError(403, "Forbidden unit");
    if (
      !(
        await db
          .select({ id: departments.id })
          .from(departments)
          .where(eq(departments.id, input.departmentId))
      ).length
    )
      throw new FlowError(400, "Invalid unit");
    const values = Object.fromEntries(
      Object.keys(assetFields).map((key) => [
        key,
        input[key as keyof typeof assetFields],
      ]),
    ) as z.infer<z.ZodObject<typeof assetFields>>;
    if (input.operation === "update") {
      await requireEndpoint(`asset:${input.id}`, scope);
      const result = await db
        .update(ropaFlowAssets)
        .set({
          ...values,
          version: input.version + 1,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(ropaFlowAssets.id, input.id),
            eq(ropaFlowAssets.version, input.version),
            assetAccess(scope),
          ),
        )
        .returning();
      if (!result.length)
        throw new FlowError(
          409,
          "Changed by another user. Reload before editing.",
        );
    } else
      await db
        .insert(ropaFlowAssets)
        .values({
          ...values,
          id: crypto.randomUUID(),
          createdBy: scope.userId!,
          updatedAt: new Date().toISOString(),
        });
  } else if (input.operation === "link") {
    if (input.source === input.target)
      throw new FlowError(400, "Source and destination must differ");
    const source = await requireEndpoint(input.source, scope);
    const target = await requireEndpoint(input.target, scope);
    const added = await db
      .insert(ropaFlowLinks)
      .values({
        id: crypto.randomUUID(),
        sourceRopaId: source.kind === "activity" ? source.recordId : null,
        sourceAssetId: source.kind === "asset" ? source.recordId : null,
        targetRopaId: target.kind === "activity" ? target.recordId : null,
        targetAssetId: target.kind === "asset" ? target.recordId : null,
        label: input.label,
        dataCategories: [...new Set(input.dataCategories)],
        note: input.note,
        createdBy: scope.userId!,
        createdAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .returning();
    if (!added.length) throw new FlowError(409, "Connection already exists");
  } else if (input.operation === "deleteAsset") {
    await requireEndpoint(`asset:${input.id}`, scope);
    const attached = await db
      .select({ id: ropaFlowLinks.id })
      .from(ropaFlowLinks)
      .where(
        or(
          eq(ropaFlowLinks.sourceAssetId, input.id),
          eq(ropaFlowLinks.targetAssetId, input.id),
        ),
      )
      .limit(1);
    if (attached.length)
      throw new FlowError(
        409,
        "Asset still has connections. Remove connections first.",
      );
    const deleted = await db
      .delete(ropaFlowAssets)
      .where(
        and(
          eq(ropaFlowAssets.id, input.id),
          eq(ropaFlowAssets.version, input.version),
          assetAccess(scope),
        ),
      )
      .returning();
    if (!deleted.length)
      throw new FlowError(
        409,
        "Changed by another user. Reload before editing.",
      );
  } else {
    const [link] = await db
      .select()
      .from(ropaFlowLinks)
      .where(eq(ropaFlowLinks.id, input.id));
    if (!link || (scope.isDemo && link.createdBy !== scope.userId))
      throw new FlowError(404, "Connection unavailable");
    await requireEndpoint(
      endpoint(link.sourceRopaId, link.sourceAssetId),
      scope,
    );
    await requireEndpoint(
      endpoint(link.targetRopaId, link.targetAssetId),
      scope,
    );
    await db.delete(ropaFlowLinks).where(eq(ropaFlowLinks.id, input.id));
  }
  return getRopaFlow(scope);
}
