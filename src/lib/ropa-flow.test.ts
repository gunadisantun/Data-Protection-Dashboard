import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  connectedNodes,
  missingAssetMetadata,
  traceCategory,
  type FlowGraph,
} from "./ropa-flow-types";
import type { AccessScope } from "./data";

describe("RoPA flow local persistence and scope", () => {
  let dir: string;
  let client: typeof import("@/db/client");
  let flow: typeof import("./ropa-flow");
  const unit: AccessScope = {
    userId: "flow-unit",
    role: "User",
    departmentId: "dept-hr",
  };
  const other: AccessScope = {
    userId: "flow-other",
    role: "User",
    departmentId: "dept-finance",
  };
  const admin: AccessScope = {
    userId: "flow-admin",
    role: "DPO",
    departmentId: "dept-legal",
  };
  const asset = {
    operation: "asset" as const,
    kind: "SYSTEM" as const,
    name: "HRIS",
    departmentId: "dept-hr",
    owner: "HR",
    location: "Jakarta",
    country: "Indonesia",
    retention: "5 years",
    description: "Test",
  };
  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "privacy-flow-test-"));
    vi.stubEnv("PRIVACY_BRO_OFFLINE", "1");
    vi.stubEnv("PRIVACY_BRO_DATA_DIR", dir);
    client = await import("@/db/client");
    flow = await import("./ropa-flow");
    await (await import("@/db/init")).ensureDatabase();
    const { users } = await import("@/db/schema");
    for (const s of [unit, other, admin])
      await client.db
        .insert(users)
        .values({
          id: s.userId!,
          username: s.userId!,
          fullName: s.userId!,
          email: `${s.userId}@example.test`,
          role: s.role,
          departmentId: s.departmentId,
          picName: "QA",
          picEmail: "qa@example.test",
          createdAt: new Date().toISOString(),
        });
  }, 120000);
  afterAll(async () => {
    await client?.closeQueryClient();
    if (dir) await rm(dir, { recursive: true, force: true });
    vi.unstubAllEnvs();
  });
  it("persists explicit connections, hides both endpoints outside unit, and rejects duplicates", async () => {
    const first = await flow.mutateRopaFlow(asset, unit);
    const second = await flow.mutateRopaFlow(
      { ...asset, name: "Archive", kind: "STORAGE" },
      unit,
    );
    const source = first.nodes[0].id;
    const target = second.nodes.find((n) => n.name === "Archive")!.id;
    const link = {
      operation: "link" as const,
      source,
      target,
      label: "Archive records",
      dataCategories: ["Employee"],
      note: "Approved export",
    };
    const result = await flow.mutateRopaFlow(link, unit);
    expect(result.links).toHaveLength(1);
    expect((await flow.getRopaFlow(other)).nodes).toHaveLength(0);
    expect((await flow.getRopaFlow(other)).links).toHaveLength(0);
    await expect(flow.mutateRopaFlow(link, other)).rejects.toMatchObject({
      status: 404,
    });
    await expect(flow.mutateRopaFlow(link, unit)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      flow.mutateRopaFlow({ ...link, target: source }, unit),
    ).rejects.toMatchObject({ status: 400 });
    const foreign = await flow.mutateRopaFlow(
      { ...asset, name: "Finance", departmentId: "dept-finance" },
      other,
    );
    await flow.mutateRopaFlow({ ...link, target: foreign.nodes[0].id }, admin);
    expect((await flow.getRopaFlow(unit)).links).toHaveLength(1);
    expect((await flow.getRopaFlow(admin)).links).toHaveLength(2);
  });
  it("rejects stale edits, missing unit, demo bypass, and inaccessible deletion", async () => {
    const graph = await flow.getRopaFlow(unit);
    const n = graph.nodes.find((n) => n.name === "HRIS")!;
    const edit = {
      ...asset,
      operation: "update" as const,
      id: n.recordId,
      version: 0,
    };
    await expect(
      flow.mutateRopaFlow(
        { operation: "deleteAsset", id: n.recordId, version: 0 },
        unit,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await flow.mutateRopaFlow(edit, unit);
    await expect(flow.mutateRopaFlow(edit, unit)).rejects.toMatchObject({
      status: 409,
    });
    await expect(
      flow.mutateRopaFlow(asset, { ...unit, departmentId: null }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      (
        await flow.getRopaFlow({ ...other, role: "MasterAdmin", isDemo: true })
      ).nodes.every((n) => n.name === "Finance"),
    ).toBe(true);
    await expect(
      flow.mutateRopaFlow(
        { operation: "deleteLink", id: graph.links[0].id },
        other,
      ),
    ).rejects.toMatchObject({ status: 404 });
    await flow.mutateRopaFlow(
      { operation: "deleteLink", id: graph.links[0].id },
      unit,
    );
    expect((await flow.getRopaFlow(unit)).links).toHaveLength(0);
    const isolated = await flow.mutateRopaFlow(
      { ...asset, name: "Temporary" },
      unit,
    );
    const temporary = isolated.nodes.find((n) => n.name === "Temporary")!;
    expect(missingAssetMetadata(temporary)).toEqual([]);
    await expect(
      flow.mutateRopaFlow(
        { operation: "deleteAsset", id: temporary.recordId, version: 0 },
        other,
      ),
    ).rejects.toMatchObject({ status: 404 });
    const after = await flow.mutateRopaFlow(
      { operation: "deleteAsset", id: temporary.recordId, version: 0 },
      unit,
    );
    expect(after.nodes.some((n) => n.id === temporary.id)).toBe(false);
  });
  it("connects existing RoPA activities without inventing legacy-text links", async () => {
    const { ropaActivities } = await import("@/db/schema");
    const { createRopaSchema } = await import("./validators");
    const parsed = createRopaSchema.parse({
      activityName: "Employee onboarding",
      processDescription: "Register employees in the HR system",
      departmentId: "dept-hr",
      legalBasis: "Contractual",
      processingPurpose: "Employment administration",
      sourceMechanism: "Employee application",
      subjectCategories: ["Employees"],
      personalDataTypes: ["Employee identity"],
      storageLocation: "HRIS reference text",
      retentionPeriod: "5 years",
      technicalMeasures: "Access control",
      organizationalMeasures: "HR policy",
      dataSubjectRights: "Access",
      previousProcess: "Same name as another process",
    });
    const now = new Date().toISOString();
    await client.db
      .insert(ropaActivities)
      .values({
        ...parsed,
        id: "flow-ropa-a",
        userId: unit.userId,
        createdAt: now,
        updatedAt: now,
      });
    await client.db
      .insert(ropaActivities)
      .values({
        ...parsed,
        id: "flow-ropa-b",
        activityName: "Payroll",
        userId: unit.userId,
        createdAt: now,
        updatedAt: now,
      });
    const before = await flow.getRopaFlow(unit);
    expect(before.nodes.filter((n) => n.kind === "ACTIVITY")).toHaveLength(2);
    expect(before.links.some((e) => e.source === "activity:flow-ropa-a")).toBe(
      false,
    );
    const result = await flow.mutateRopaFlow(
      {
        operation: "link",
        source: "activity:flow-ropa-a",
        target: "activity:flow-ropa-b",
        label: "Approved payroll transfer",
        dataCategories: ["Employee identity"],
        note: "",
      },
      unit,
    );
    expect(
      result.links.some(
        (e) =>
          e.source === "activity:flow-ropa-a" &&
          e.target === "activity:flow-ropa-b",
      ),
    ).toBe(true);
    expect(
      (await flow.getRopaFlow(other)).nodes.some((n) => n.kind === "ACTIVITY"),
    ).toBe(false);
  });
});
it("does not infer onward transfer and handles cycles", () => {
  const graph: FlowGraph = {
    nodes: [],
    truncated: false,
    links: [
      {
        id: "1",
        source: "a",
        target: "b",
        label: "",
        note: "",
        dataCategories: ["Employee"],
      },
      {
        id: "2",
        source: "b",
        target: "c",
        label: "",
        note: "",
        dataCategories: [],
      },
      {
        id: "3",
        source: "c",
        target: "a",
        label: "",
        note: "",
        dataCategories: [],
      },
    ],
  };
  expect([...traceCategory(graph, "Employee").ids]).toEqual(["a", "b"]);
  expect(connectedNodes(graph, "a").size).toBe(3);
  const chain = { ...graph, links: graph.links.slice(0, 2) };
  expect([...connectedNodes(chain, "b", "upstream")]).toEqual(["b", "a"]);
  expect([...connectedNodes(chain, "b", "downstream")]).toEqual(["b", "c"]);
});
