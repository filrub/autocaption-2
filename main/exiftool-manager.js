import { ExifTool } from "exiftool-vendored";
import { app } from "electron";
import path from "path";
import log from "electron-log";
import fs from "fs";
import { EXIFTOOL_CONFIG } from "../config/constants.js";
import { retry } from "./utils/async.js";

class ExifToolManager {
  constructor() {
    this.instance = null;
    this.isInitializing = false;
    this.initializationAttempts = 0;
    this.maxInitAttempts = EXIFTOOL_CONFIG.MAX_INIT_ATTEMPTS;
  }

  getBinaryPath() {
    if (!app.isPackaged) {
      return undefined; // Use system ExifTool in development
    }

    const platform = process.platform;
    const binaryName = platform === "win32" ? "exiftool.exe" : "exiftool";
    const vendorPackage = "exiftool-perl";

    const searchPaths = [
      path.join(process.resourcesPath, vendorPackage, binaryName),
      path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "node_modules",
        vendorPackage,
        binaryName
      ),
      path.join(
        process.resourcesPath,
        "node_modules",
        vendorPackage,
        binaryName
      ),
    ];

    for (const testPath of searchPaths) {
      if (fs.existsSync(testPath)) {
        this.makeExecutable(testPath);
        log.info(`ExifTool found: ${testPath}`);
        return testPath;
      }
    }

    log.error("ExifTool binary not found in any expected location");
    this.logResourcesStructure();

    return searchPaths[0]; // Return first path as fallback
  }

  makeExecutable(filePath) {
    if (process.platform === "win32") return;

    try {
      fs.chmodSync(filePath, 0o755);
    } catch (error) {
      log.warn(`Could not set executable permissions: ${error.message}`);
    }
  }

  logResourcesStructure() {
    try {
      const resourcesPath = process.resourcesPath;
      log.info(`Resources path: ${resourcesPath}`);

      const files = fs.readdirSync(resourcesPath);
      log.info(`Resources contents: ${files.join(", ")}`);

      const nodeModulesPath = path.join(resourcesPath, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        const nmFiles = fs.readdirSync(nodeModulesPath);
        log.info(`node_modules packages: ${nmFiles.length}`);
      }

      const unpackedPath = path.join(resourcesPath, "app.asar.unpacked");
      if (fs.existsSync(unpackedPath)) {
        log.info("app.asar.unpacked exists");
      }
    } catch (error) {
      log.error(`Error inspecting resources: ${error.message}`);
    }
  }

  async initialize() {
    if (this.isInitializing) {
      log.warn("ExifTool initialization already in progress");
      return null;
    }

    if (this.instance && !this.instance.ended) {
      return this.instance;
    }

    if (this.initializationAttempts >= this.maxInitAttempts) {
      log.error(
        `Max initialization attempts (${this.maxInitAttempts}) reached`
      );
      return null;
    }

    this.isInitializing = true;
    this.initializationAttempts++;

    try {
      const options = {
        taskTimeoutMillis: EXIFTOOL_CONFIG.TASK_TIMEOUT_MS,
        maxTasksPerProcess: EXIFTOOL_CONFIG.MAX_TASKS_PER_PROCESS,
        maxProcs: EXIFTOOL_CONFIG.MAX_PROCS,
      };

      if (app.isPackaged) {
        const binaryPath = this.getBinaryPath();

        if (!fs.existsSync(binaryPath)) {
          throw new Error(`ExifTool binary not found: ${binaryPath}`);
        }

        options.exiftoolPath = binaryPath;
        log.info(`Initializing ExifTool with custom path: ${binaryPath}`);
      } else {
        log.info("Initializing ExifTool with system binary");
      }

      this.instance = new ExifTool(options);

      // Verify it works
      const version = await this.instance.version();
      log.info(`ExifTool v${version} initialized successfully`);

      this.initializationAttempts = 0; // Reset on success
      return this.instance;
    } catch (error) {
      log.error(
        `ExifTool initialization failed (attempt ${this.initializationAttempts}): ${error.message}`
      );
      this.instance = null;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async getInstance() {
    if (this.instance && !this.instance.ended) {
      return this.instance;
    }

    return await this.initialize();
  }

  async reset() {
    await this.shutdown();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return await this.initialize();
  }

  async shutdown() {
    if (!this.instance || this.instance.ended) return;

    try {
      log.info("Shutting down ExifTool...");
      await this.instance.end();
      log.info("ExifTool shut down successfully");
    } catch (error) {
      log.error(`Error shutting down ExifTool: ${error.message}`);
    } finally {
      this.instance = null;
    }
  }

  async writeMetadata(filePath, tags) {
    try {
      return await retry(
        async () => {
          const exiftool = await this.getInstance();

          if (!exiftool) {
            throw new Error("ExifTool not available");
          }

          const writeArgs = ["-overwrite_original", "-ignoreMinorErrors"];
          await exiftool.write(filePath, tags, writeArgs);

          log.info(`Metadata written successfully: ${filePath}`);
          return { success: true };
        },
        EXIFTOOL_CONFIG.MAX_RETRIES,
        EXIFTOOL_CONFIG.RETRY_DELAY
      );
    } catch (error) {
      log.error(`All write attempts failed for: ${filePath}`);

      // Try to reset ExifTool if it's a batch cluster error
      if (error.message?.includes("BatchCluster has ended")) {
        log.warn("BatchCluster ended, resetting ExifTool...");
        await this.reset();
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
export const exifToolManager = new ExifToolManager();

// Cleanup on app quit
app.on("before-quit", async (event) => {
  if (exifToolManager.instance && !exifToolManager.instance.ended) {
    event.preventDefault();
    await exifToolManager.shutdown();
    app.quit();
  }
});

app.on("window-all-closed", async () => {
  await exifToolManager.shutdown();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
