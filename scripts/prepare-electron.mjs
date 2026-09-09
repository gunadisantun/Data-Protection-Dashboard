import { cp, lstat, mkdir, readdir, realpath, rm } from "node:fs/promises";
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

async function replaceSymlinksWithCopies(target) {
  let stats;
  try {
    stats = await lstat(target);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (stats.isSymbolicLink()) {
    const source = await realpath(target);
    await rm(target, { recursive: true, force: true });
    await cp(source, target, { recursive: true, dereference: true });
    await replaceSymlinksWithCopies(target);
    return;
  }

  if (!stats.isDirectory()) {
    return;
  }

  const entries = await readdir(target);
  await Promise.all(
    entries.map((entry) => replaceSymlinksWithCopies(path.join(target, entry))),
  );
}

await copyIfExists(path.join(root, "public"), path.join(standalone, "public"));
await copyIfExists(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
await copyIfExists(path.join(root, "drizzle"), path.join(standalone, "drizzle"));
await copyIfExists(path.join(root, "templates"), path.join(standalone, "templates"));
await replaceSymlinksWithCopies(standalone);

console.log("Electron standalone assets prepared.");
