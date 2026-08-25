/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

let mainWindow = null;
let nextProcess = null;

app.setName("Privacy Bro");

async function createWindow() {
  const port = await getAvailablePort();
  const appUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${port}`;

  if (!process.env.ELECTRON_START_URL) {
    startNextServer(port);
    await waitForServer(appUrl);
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: "Privacy Bro",
    backgroundColor: "#F7F9FC",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

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
      HOSTNAME: "127.0.0.1",
      PORT: String(port),
    },
    stdio: "ignore",
    windowsHide: true,
  });

  nextProcess.on("exit", () => {
    nextProcess = null;
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
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // keep waiting for the bundled server to boot
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Privacy Bro offline server did not start in time.");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
});
