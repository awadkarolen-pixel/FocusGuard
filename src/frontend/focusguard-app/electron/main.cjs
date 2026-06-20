const { app, BrowserWindow } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");

const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = 8000;
const HEALTH_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/health`;
const DEV_SERVER_URL = "http://localhost:5173";

let mainWindow = null;
let backendProcess = null;

/** Locates the unchanged FastAPI backend (src/backend). */
function resolveBackendDir() {
  if (app.isPackaged) {
    // Bundled via electron-builder extraResources.
    return path.join(process.resourcesPath, "backend");
  }
  // electron/ -> focusguard-app -> frontend -> src -> backend
  return path.resolve(__dirname, "..", "..", "..", "backend");
}

/** Prefers the project's virtualenv, falls back to a Python on PATH. */
function resolvePython(backendDir) {
  const venvPython =
    process.platform === "win32"
      ? path.join(backendDir, ".venv", "Scripts", "python.exe")
      : path.join(backendDir, ".venv", "bin", "python");

  if (fs.existsSync(venvPython)) return venvPython;
  return process.platform === "win32" ? "python" : "python3";
}

function startBackend() {
  const backendDir = resolveBackendDir();
  const python = resolvePython(backendDir);

  console.log(`[FocusGuard] starting backend: ${python} (cwd=${backendDir})`);

  backendProcess = spawn(
    python,
    [
      "-m",
      "uvicorn",
      "app.main:app",
      "--host",
      BACKEND_HOST,
      "--port",
      String(BACKEND_PORT),
    ],
    { cwd: backendDir, env: process.env },
  );

  backendProcess.stdout.on("data", (d) =>
    process.stdout.write(`[backend] ${d}`),
  );
  backendProcess.stderr.on("data", (d) =>
    process.stderr.write(`[backend] ${d}`),
  );
  backendProcess.on("error", (err) =>
    console.error(`[FocusGuard] failed to launch backend: ${err.message}`),
  );
  backendProcess.on("exit", (code) => {
    console.log(`[FocusGuard] backend exited with code ${code}`);
    backendProcess = null;
  });
}

function stopBackend() {
  if (!backendProcess) return;
  const pid = backendProcess.pid;
  // Kill the whole tree so uvicorn/python children don't linger.
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"]);
  } else {
    backendProcess.kill("SIGTERM");
  }
  backendProcess = null;
}

function checkHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkHealth()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 920,
    title: "FocusGuard",
    backgroundColor: "#eef2f7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  await loadRenderer();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Loads the UI. In production this is the bundled file; in development it's the
 * Vite dev server, which may still be starting — so we retry until it responds
 * (avoids a startup race and IPv4/IPv6 localhost mismatches).
 */
async function loadRenderer() {
  if (app.isPackaged) {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    return;
  }

  const maxAttempts = 60; // ~30s at 500ms
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mainWindow.loadURL(DEV_SERVER_URL);
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(
          `[FocusGuard] could not reach Vite dev server at ${DEV_SERVER_URL}: ${err.message}`,
        );
        return;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

app.whenReady().then(async () => {
  startBackend();

  const healthy = await waitForBackend();
  if (!healthy) {
    console.error(
      "[FocusGuard] backend did not report healthy in time; opening UI anyway",
    );
  }

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopBackend);
process.on("exit", stopBackend);
