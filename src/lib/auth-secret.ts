import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getOfflineDataDir, isOfflineRuntime } from "@/lib/offline-runtime";

export function getAuthSecret() {
  const configured = process.env.BETTER_AUTH_SECRET?.trim();
  if (isOfflineRuntime()) {
    const file = path.join(getOfflineDataDir(), "auth-secret");
    mkdirSync(path.dirname(file), { recursive: true });
    try { writeFileSync(file, randomBytes(48).toString("hex"), { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
    const saved = readFileSync(file, "utf8").trim();
    if (saved.length < 32) throw new Error("Local authentication secret is invalid. Restore it from a trusted backup.");
    return saved;
  }
  if (configured && configured.length >= 32 && !configured.includes("local-development-secret")) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("A unique BETTER_AUTH_SECRET of at least 32 characters is required.");
  return "privacy-bro-development-only-not-for-production";
}
