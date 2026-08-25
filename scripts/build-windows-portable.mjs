import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const electronDist = path.join(root, "node_modules", "electron", "dist");
const portableName = process.env.PRIVACY_BRO_PORTABLE_NAME || "Privacy Bro";
const outDir = path.join(root, "dist-windows", portableName);
const appDir = path.join(outDir, "resources", "app");

async function copy(from, to) {
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { recursive: true, dereference: true });
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await copy(electronDist, outDir);
await copy(path.join(root, "electron"), path.join(appDir, "electron"));
await copy(path.join(root, ".next", "standalone"), path.join(appDir, ".next", "standalone"));
await copy(path.join(root, ".next", "static"), path.join(appDir, ".next", "static"));
await copy(path.join(root, "public"), path.join(appDir, "public"));

await writeFile(
  path.join(appDir, "package.json"),
  JSON.stringify(
    {
      name: "privacy-bro-desktop",
      version: "0.1.0",
      main: "electron/main.js",
      private: true,
    },
    null,
    2,
  ),
);

try {
  await rm(path.join(outDir, `${portableName}.exe`), { force: true });
  await cp(path.join(outDir, "electron.exe"), path.join(outDir, `${portableName}.exe`));
} catch {
  // Keep electron.exe if the runtime layout changes.
}

console.log(`Portable Windows app created at ${outDir}`);
