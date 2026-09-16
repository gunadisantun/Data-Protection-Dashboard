/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell, Menu, dialog } = require("electron");
const { randomBytes } = require("node:crypto");
const backup = require("./backup.cjs");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

let mainWindow = null;
let nextProcess = null;
let serverUrl = null;
let startup = null;
let busy = false;
let quitting = false;
const desktopToken = randomBytes(32).toString("hex");

app.setName("Privacy Bro");
if (process.env.PRIVACY_BRO_DATA_DIR) {
  const dataDir = path.resolve(process.env.PRIVACY_BRO_DATA_DIR);
  fs.mkdirSync(dataDir, { recursive: true });
  app.setPath("userData", dataDir);
}
const primaryInstance = app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on("second-instance", () => { mainWindow?.show(); mainWindow?.focus(); });

function log(message) {
  const directory = app.getPath("userData");
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, "desktop-startup.log");
  if (fs.existsSync(file) && fs.statSync(file).size > 2 * 1024 * 1024) {
    fs.copyFileSync(file, `${file}.previous`);
    fs.truncateSync(file);
  }
  fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`);
}

async function createWindow() {
  if (!serverUrl) {
    const port = await getAvailablePort();
    serverUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${port}`;
    if (!process.env.ELECTRON_START_URL) {
      startNextServer(port);
      await waitForServer(serverUrl);
    }
  }
  const appUrl = serverUrl;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: `Privacy Bro ${app.getVersion()}`,
    backgroundColor: "#F7F9FC",
    autoHideMenuBar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== new URL(appUrl).origin) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });
  mainWindow.on("closed", () => { mainWindow = null; });

  await mainWindow.loadURL(appUrl);
}

function startNextServer(port) {
  const serverPath = resolveServerPath();
  const serverDir = path.dirname(serverPath);
  const userData = app.getPath("userData");

  nextProcess = spawn(process.execPath, [serverPath], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PRIVACY_BRO_OFFLINE: "1",
      PRIVACY_BRO_DATA_DIR: userData,
      DESKTOP_APP_VERSION: app.getVersion(),
      PRIVACY_BRO_DESKTOP_TOKEN: desktopToken,
      BETTER_AUTH_URL: serverUrl,
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  log(`Starting Privacy Bro ${app.getVersion()}`);
  nextProcess.stdout.on("data", (chunk) => log(String(chunk).trim()));
  nextProcess.stderr.on("data", (chunk) => log(String(chunk).trim()));
  nextProcess.on("error", (error) => log(`Server error: ${error.message}`));

  nextProcess.on("exit", () => {
    nextProcess = null;
    serverUrl = null;
  });
}

function resolveServerPath() {
  const candidates = [
    path.join(process.resourcesPath, "app", ".next", "standalone", "server.js"),
    path.join(app.getAppPath(), ".next", "standalone", "server.js"),
    path.join(process.cwd(), ".next", "standalone", "server.js"),
  ];

  const serverPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!serverPath) {
    throw new Error("Next standalone server.js not found. Run npm run desktop:prepare first.");
  }

  return serverPath;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (typeof address === "object" && address?.port) {
          resolve(address.port);
          return;
        }
        reject(new Error("Could not reserve a local port."));
      });
    });
    server.on("error", reject);
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (!nextProcess) throw new Error("The local server stopped unexpectedly. See desktop-startup.log in the application data folder.");
    try {
      const response = await fetch(`${url}/api/auth/desktop-setup`, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        return;
      }
    } catch {
      // keep waiting for the bundled server to boot
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Privacy Bro offline server did not start in time.");
}

async function stopServer() {
  if (!nextProcess) return true;
  const child = nextProcess;
  let clean = false;
  try {
    const result = await fetch(`${serverUrl}/api/desktop/shutdown`, { method: "POST", headers: { "x-desktop-token": desktopToken }, signal: AbortSignal.timeout(30000) });
    clean = result.ok && (await result.json()).closed === true;
  } catch (error) { log(`Database shutdown: ${error.message}`); }
  await new Promise((resolve, reject) => {
    if (child.exitCode !== null) return resolve();
    const timeout = setTimeout(() => reject(new Error("Local server did not exit. Backup cancelled.")), 15000);
    child.once("exit", () => { clearTimeout(timeout); resolve(); });
    child.kill();
  });
  serverUrl = null;
  log(`Server stopped; database closed: ${clean}`);
  return clean;
}

async function manageBackup(restore) {
  if (busy || process.env.ELECTRON_START_URL) return;
  busy = true;
  let stage;
  let stopped = false;
  try {
    const confirmation = await dialog.showMessageBox(mainWindow, { type: "warning", buttons: ["Cancel", "Continue"], defaultId: 0, cancelId: 0, message: restore ? "Restore local database?" : "Back up local database?", detail: "Save your work first. The app will restart. Backups contain account and assessment data; keep them in a secure location. Restore requires the same app version." });
    if (confirmation.response !== 1) return;
    const dataDir = app.getPath("userData");
    let file;
    if (restore) {
      const selected = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters: [{ name: "Privacy Bro backup", extensions: ["pbbak"] }] });
      if (selected.canceled) return;
      stage = await backup.stageRestore(dataDir, selected.filePaths[0], app.getVersion());
    } else {
      const selected = await dialog.showSaveDialog(mainWindow, { defaultPath: `Privacy-Bro-${new Date().toISOString().slice(0, 10)}-${Date.now()}.pbbak`, filters: [{ name: "Privacy Bro backup", extensions: ["pbbak"] }] });
      if (selected.canceled || !selected.filePath) return;
      file = selected.filePath;
    }
    mainWindow?.destroy();
    stopped = true;
    const clean = await stopServer();
    if (!clean) throw new Error("Database closure could not be confirmed. No backup or restore was performed.");
    if (restore) await backup.installRestore(dataDir, stage, clean);
    else await backup.createBackup(dataDir, file, app.getVersion(), clean);
    await createWindow();
    if (restore) await backup.commitRestore(dataDir);
    await dialog.showMessageBox(mainWindow, { message: restore ? "Restore completed. Sign in to the restored database." : "Backup completed." });
  } catch (error) {
    log(`Backup/restore error: ${error.message}`);
    if (stopped) {
      await stopServer().catch(() => {});
      await backup.recoverRestore(app.getPath("userData")).catch((recovery) => log(recovery.message));
      await createWindow().catch((restart) => log(restart.message));
    }
    dialog.showErrorBox("Privacy Bro", error.message);
  } finally { busy = false; }
}

app.whenReady().then(async () => {
  if (!primaryInstance) return;
  await backup.recoverRestore(app.getPath("userData"));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    { label: "File", submenu: [
      { label: "Back Up Local Data...", enabled: !process.env.ELECTRON_START_URL, click: () => void manageBackup(false) },
      { label: "Restore Local Data...", enabled: !process.env.ELECTRON_START_URL, click: () => void manageBackup(true) },
      { type: "separator" }, { role: "quit" },
    ] },
    { role: "editMenu" },
    { label: "Help", submenu: [{ label: `Privacy Bro ${app.getVersion()}`, click: () => void dialog.showMessageBox({ message: `Privacy Bro ${app.getVersion()}`, detail: `Local data: ${app.getPath("userData")}` }) }] },
  ]));
  startup = createWindow();
  await startup;
}).catch((error) => { log(error.message); dialog.showErrorBox("Privacy Bro startup", error.message); app.quit(); });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !busy) {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (!busy) void (startup = Promise.resolve(startup).then(createWindow));
  }
});

app.on("before-quit", (event) => {
  if (quitting) return;
  if (busy) { event.preventDefault(); return; }
  if (!nextProcess) return;
  event.preventDefault();
  quitting = true;
  mainWindow?.destroy();
  void stopServer().catch((error) => log(error.message)).finally(() => app.quit());
});
