import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

async function copyIfExists(from, to) {
  try {
    await rm(to, { recursive: true, force: true });
    await mkdir(path.dirname(to), { recursive: true });
    await cp(from, to, { recursive: true });
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

await copyIfExists(path.join(root, "public"), path.join(standalone, "public"));
await copyIfExists(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
await copyIfExists(path.join(root, "drizzle"), path.join(standalone, "drizzle"));
await copyIfExists(path.join(root, "templates"), path.join(standalone, "templates"));

console.log("Electron standalone assets prepared.");
