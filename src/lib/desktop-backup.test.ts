import { afterEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const backup = require("../../electron/backup.cjs");
let directory: string;
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

describe("desktop backup safety", () => {
  it("round-trips DB, evidence and secret without replacing data until confirmed", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "privacy-bro-backup-"));
    const data = path.join(directory, "data");
    await mkdir(path.join(data, "database"), { recursive: true });
    await mkdir(path.join(data, "storage"));
    await writeFile(path.join(data, "database", "PG_VERSION"), "17");
    await writeFile(path.join(data, "auth-secret"), "a".repeat(96));
    await writeFile(path.join(data, "storage", "evidence.pdf"), "original evidence");
    const file = path.join(directory, "backup.pbbak");
    await expect(backup.createBackup(data, file, "1.0.0", false)).rejects.toThrow("cleanly stopped");
    await backup.createBackup(data, file, "1.0.0", true);
    await expect(backup.stageRestore(data, file, "2.0.0")).rejects.toThrow("same Privacy Bro version");
    const stage = await backup.stageRestore(data, file, "1.0.0");
    await writeFile(path.join(data, "storage", "evidence.pdf"), "new evidence");
    await backup.installRestore(data, stage, true);
    expect(await readFile(path.join(data, "storage", "evidence.pdf"), "utf8")).toBe("original evidence");
    await backup.recoverRestore(data);
    expect(await readFile(path.join(data, "storage", "evidence.pdf"), "utf8")).toBe("new evidence");
  });

  it("rejects traversal and incomplete manifests", () => {
    for (const name of ["../secret", "database/../../secret", "database/CON", "database/a\\b", "auth-secret/child"]) expect(() => backup.safePath(name)).toThrow();
    expect(() => backup.validateManifest({ format: 1, appVersion: "1", entries: [] }, "1")).toThrow("complete local data");
  });
});
