import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.env.FLOW_QA_URL || "http://localhost:3119";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "QA is local-only",
);
assert.ok(
  process.env.FLOW_QA_USER && process.env.FLOW_QA_PASSWORD,
  "Use an isolated QA account",
);
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  headless: true,
  channel: process.env.QA_BROWSER_CHANNEL || "msedge",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const output = path.resolve("outputs/flow-qa");
await mkdir(output, { recursive: true });
try {
  const login = await page.request.post(`${base}/api/auth/login`, {
    headers: { Origin: base },
    data: {
      username: process.env.FLOW_QA_USER,
      password: process.env.FLOW_QA_PASSWORD,
    },
  });
  assert.equal(login.status(), 200);
  await page.goto(`${base}/ropa/data-flow`);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page
    .getByRole("heading", { name: "Personal Data Flow Map", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  await page.waitForFunction(
    () =>
      !document
        .querySelector(".react-flow__viewport")
        ?.getAttribute("style")
        ?.includes("translate(0px"),
  );
  const before = await page
    .locator(".react-flow__viewport")
    .getAttribute("style");
  await page.getByRole("button", { name: "Zoom Out", exact: true }).click();
  await page.waitForFunction(
    (previous) =>
      document.querySelector(".react-flow__viewport")?.getAttribute("style") !==
      previous,
    before,
  );
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  await page.screenshot({
    path: path.join(output, "desktop.png"),
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Asset Inventory", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Incomplete metadata", exact: true })
    .check();
  await page.screenshot({
    path: path.join(output, "inventory.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add Asset", exact: true }).click();
  const name = `Network retry QA ${Date.now()}`;
  await page
    .getByRole("textbox", { name: "Asset name", exact: true })
    .fill(name);
  await page.route("**/api/ropa/flow", (route) =>
    route.request().method() === "POST"
      ? route.abort("failed")
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("dialog").getByRole("alert").waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Asset name", exact: true })
      .inputValue(),
    name,
  );
  await page.unroute("**/api/ropa/flow");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name, exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete asset", exact: true }).click();
  await page
    .getByRole("button", { name, exact: true })
    .waitFor({ state: "detached" });
  await page.getByRole("tab", { name: "Flow Map", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Fit View", exact: true }).click();
  await page.waitForTimeout(500);
  assert.ok(
    (await page.locator(".react-flow__node").first().boundingBox()).width > 50,
    "Mobile nodes must remain readable",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(output, "mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "ID", exact: true }).click();
  await page
    .getByRole("heading", { name: "Peta Alur Data Pribadi", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: visible flow, zoom, inventory, failed-save recovery, asset deletion, bilingual labels, mobile overflow.",
  );
} finally {
  await browser.close();
}
