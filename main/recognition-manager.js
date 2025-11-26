import { spawn, exec } from "child_process";
import { app } from "electron";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import log from "electron-log";
import { RECOGNITION_CONFIG } from "../config/constants.js";

const execAsync = promisify(exec);

class RecognitionManager {
  constructor() {
    this.process = null;
    this.baseUrl = RECOGNITION_CONFIG.BASE_URL;
    this.isStarting = false;
    this.startAttempts = 0;
  }

  getExecutablePath() {
    const isDev = !app.isPackaged;

    if (isDev) {
      const devPath = path.join(
        process.cwd(),
        "src",
        "main",
        "recognition",
        process.platform === "win32" ? "recognition.exe" : "recognition"
      );

      if (fs.existsSync(devPath)) {
        log.info(`Development executable found: ${devPath}`);
        return devPath;
      }

      log.warn(
        "Recognition executable not found in development. Run manually or build first."
      );
      return null;
    }

    // Production path
    const platform = process.platform;
    const execName = platform === "win32" ? "recognition.exe" : "recognition";
    const execPath = path.join(process.resourcesPath, "recognition", execName);

    if (!fs.existsSync(execPath)) {
      log.error(`Recognition executable not found: ${execPath}`);
      return null;
    }

    log.info(`Production executable found: ${execPath}`);
    return execPath;
  }

  async isPortInUse(port = RECOGNITION_CONFIG.PORT) {
    try {
      const command =
        process.platform === "win32"
          ? `netstat -ano | findstr :${port}`
          : `lsof -i :${port}`;

      await execAsync(command);
      return true;
    } catch {
      return false;
    }
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        RECOGNITION_CONFIG.healthCheckTimeout
      );

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return data.status === "healthy" && data.service === "recognition";
      }

      return false;
    } catch (error) {
      if (error.name === "AbortError") {
        log.warn("Health check timeout");
      }
      return false;
    }
  }

  async waitForService() {
    log.info("Waiting for recognition service to be ready...");

    for (let i = 0; i < RECOGNITION_CONFIG.maxStartupAttempts; i++) {
      if (await this.checkHealth()) {
        log.info(`Service ready after ${i + 1} attempts`);
        return true;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, RECOGNITION_CONFIG.startupCheckInterval)
      );

      if (i % 10 === 0) {
        log.info(
          `Still waiting... (${i + 1}/${RECOGNITION_CONFIG.maxStartupAttempts})`
        );
      }
    }

    throw new Error(
      `Service failed to start within ${RECOGNITION_CONFIG.maxStartupAttempts} seconds`
    );
  }

  makeExecutable(filePath) {
    if (process.platform === "win32") return;

    try {
      fs.chmodSync(filePath, 0o755);
      log.info(`Set executable permissions: ${filePath}`);
    } catch (error) {
      log.error(`Failed to set executable permissions: ${error.message}`);
    }
  }

  setupProcessHandlers() {
    if (!this.process) return;

    this.process.stdout.on("data", (data) => {
      const message = data.toString().trim();
      if (message) log.info(`[Recognition] ${message}`);
    });

    this.process.stderr.on("data", (data) => {
      const message = data.toString().trim();
      if (message) log.error(`[Recognition Error] ${message}`);
    });

    this.process.on("close", (code) => {
      log.info(`Recognition process exited with code ${code}`);
      this.process = null;
      this.isStarting = false;
    });

    this.process.on("error", (error) => {
      log.error(`Recognition process error: ${error.message}`);
      this.process = null;
      this.isStarting = false;
    });
  }

  async start() {
    if (this.isStarting) {
      log.warn("Service is already starting");
      return false;
    }

    if (this.process) {
      log.info("Service process already exists");
      return await this.checkHealth();
    }

    // Check if service is already running on port
    if (await this.isPortInUse(RECOGNITION_CONFIG.PORT)) {
      log.info(
        `Port ${RECOGNITION_CONFIG.PORT} in use, checking if it's our service...`
      );

      if (await this.checkHealth()) {
        log.info("Recognition service already running and healthy");
        return true;
      }

      log.error(`Port ${RECOGNITION_CONFIG.PORT} occupied by another service`);
      return false;
    }

    const execPath = this.getExecutablePath();
    if (!execPath) {
      log.error("Recognition executable not found");
      return false;
    }

    this.isStarting = true;
    this.startAttempts++;

    try {
      log.info(
        `Starting recognition service (attempt ${this.startAttempts})...`
      );

      this.makeExecutable(execPath);

      this.process = spawn(execPath, [], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
        env: { ...process.env, PORT: RECOGNITION_CONFIG.PORT.toString() },
      });

      this.setupProcessHandlers();

      await this.waitForService();

      log.info("Recognition service started successfully");
      this.startAttempts = 0;
      return true;
    } catch (error) {
      log.error(`Failed to start recognition service: ${error.message}`);
      this.stop();
      return false;
    } finally {
      this.isStarting = false;
    }
  }

  async detectFaces(imageBuffer) {
    if (!(await this.checkHealth())) {
      throw new Error("Recognition service is not available");
    }

    try {
      const formData = new FormData();
      const blob = new Blob([imageBuffer], { type: "image/jpeg" });
      formData.append("file", blob, "image.jpg");

      const response = await fetch(`${this.baseUrl}/detect_faces`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(
          `Detection failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      log.error(`Face detection error: ${error.message}`);
      throw error;
    }
  }

  async stop() {
    if (!this.process) {
      log.info("No recognition process to stop");
      return;
    }

    log.info("Stopping recognition service...");

    try {
      if (process.platform === "win32") {
        // Kill process tree on Windows
        execAsync(`taskkill /pid ${this.process.pid} /T /F`);
      } else {
        this.process.kill("SIGTERM");

        // Force kill after timeout
        setTimeout(() => {
          if (this.process) {
            log.warn("Forcing recognition service shutdown");
            this.process.kill("SIGKILL");
          }
        }, RECOGNITION_CONFIG.shutdownTimeout);
      }
    } catch (error) {
      log.error(`Error stopping process: ${error.message}`);
    }

    this.process = null;
    log.info("Recognition service stopped");
  }

  async restart() {
    log.info("Restarting recognition service...");
    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return await this.start();
  }

  getStatus() {
    return {
      isRunning: this.process !== null,
      isStarting: this.isStarting,
      port: RECOGNITION_CONFIG.PORT,
      baseUrl: this.baseUrl,
      startAttempts: this.startAttempts,
    };
  }
}

export const recognitionManager = new RecognitionManager();

// Cleanup on app quit
app.on("before-quit", async () => {
  await recognitionManager.stop();
});

app.on("window-all-closed", async () => {
  await recognitionManager.stop();
});
