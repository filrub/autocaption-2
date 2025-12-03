import { app, shell, BrowserWindow } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import log from "electron-log/main";
//import icon from '../../resources/icon.png?asset'

import { exifToolManager } from "./exiftool-manager.js";
import { imageManager } from "./image-manager.js";
import { recognitionManager } from "./recognition-manager.js";
import { registerIPCHandlers } from "./ipc-handlers.js";

// Configure logging
log.initialize();
log.transports.file.level = "info";
log.info("=== Application Starting ===");

let mainWindow = null;
let ipcHandlers = null;

function createWindow() {
  log.info("Creating main window...");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 670,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !is.dev, // Disable only in dev for easier testing
    },
  });

  // Show window when ready
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    log.info("Main window shown");
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // Load app
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    log.info("Loaded dev URL");
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    log.info("Loaded production file");
  }

  return mainWindow;
}

async function initializeServices() {
  log.info("Initializing services...");

  const results = {
    exiftool: false,
    imageManager: false,
    recognition: false,
  };

  // Initialize ExifTool
  try {
    const exiftool = await exifToolManager.initialize();
    if (exiftool) {
      const version = await exiftool.version();
      log.info(`✓ ExifTool v${version} initialized`);
      results.exiftool = true;
    }
  } catch (error) {
    log.error(`✗ ExifTool initialization failed: ${error.message}`);
  }

  // Initialize Image Manager
  try {
    await imageManager.initialize();
    log.info("✓ Image Manager initialized");
    results.imageManager = true;
  } catch (error) {
    log.error(`✗ Image Manager initialization failed: ${error.message}`);
  }

  // Recognition service is started on-demand when user selects local server
  // See useRecognitionService.js and ipc-handlers.js for the startup logic
  log.info("⚡ Recognition service available on-demand (local server mode)");
  results.recognition = true;

  return results;
}

// App lifecycle
app.whenReady().then(async () => {
  log.info(`App ready - Version ${app.getVersion()}`);
  log.info(`Platform: ${process.platform}`);
  log.info(`Architecture: ${process.arch}`);
  log.info(`Dev mode: ${is.dev}`);

  // Set app name
  app.setName("AutoCAPTION");
  electronApp.setAppUserModelId("com.autocaption");

  // Create window first for better UX
  mainWindow = createWindow();

  // Register IPC handlers
  ipcHandlers = registerIPCHandlers(mainWindow);
  log.info("IPC handlers registered");

  // Initialize services in background
  initializeServices();

  // Setup window shortcuts
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // macOS: Re-create window when dock icon clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      ipcHandlers = registerIPCHandlers(mainWindow);
    }
  });
});

// Cleanup before quit
app.on("before-quit", async (event) => {
  log.info("App quitting, cleaning up...");

  // Prevent default to do cleanup
  event.preventDefault();

  try {
    await Promise.all([
      exifToolManager.shutdown(),
      imageManager.cleanup(),
      recognitionManager.stop(),
    ]);

    if (ipcHandlers) {
      ipcHandlers.unregister();
    }

    log.info("Cleanup completed");
  } catch (error) {
    log.error(`Cleanup error: ${error.message}`);
  }

  // Now actually quit
  app.exit(0);
});

// Window closed
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  log.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  log.error("Unhandled rejection at:", promise, "reason:", reason);
});

export { mainWindow };
