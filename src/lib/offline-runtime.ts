import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function isOfflineRuntime() {
  return process.env.PRIVACY_BRO_OFFLINE === "1";
}

export function getOfflineDataDir() {
  return (
    process.env.PRIVACY_BRO_DATA_DIR?.trim() ||
    path.join(process.cwd(), ".privacy-bro-offline")
  );
}

export function getOfflineDatabaseDir() {
  return path.join(getOfflineDataDir(), "database");
}

export function getOfflineStorageDir() {
  return path.join(getOfflineDataDir(), "storage");
}

export function normalizeStoragePath(storagePath: string) {
  return storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function resolveOfflineStoragePath(bucket: string, storagePath: string) {
  const root = path.resolve(getOfflineStorageDir(), bucket);
  const target = path.resolve(root, normalizeStoragePath(storagePath));

  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid local storage path.");
  }

  return target;
}

export async function saveOfflineStorageObject(
  bucket: string,
  storagePath: string,
  payload: Buffer,
) {
  const target = resolveOfflineStoragePath(bucket, storagePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, payload);
}

export async function readOfflineStorageObject(bucket: string, storagePath: string) {
  return readFile(resolveOfflineStoragePath(bucket, storagePath));
}
