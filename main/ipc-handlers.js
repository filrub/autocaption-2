import { ipcMain, dialog, shell } from "electron";
import log from "electron-log";
import fs from "fs";
import { imageManager } from "./image-manager.js";
import { faceRecognitionService } from "./face-recognition-service.js";
import { recognitionManager } from "./recognition-manager.js";

class IPCHandlers {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
  }

  register() {
    this.registerImageHandlers();
    this.registerRecognitionHandlers();
    this.registerDialogHandlers();
    this.registerUtilityHandlers();
    this.registerLogHandlers();
  }

  registerImageHandlers() {
    // List images in directory
    ipcMain.handle("list-images", async (event, targetFolder) => {
      try {
        log.info(`Listing images from: ${targetFolder}`);

        // Progress callback
        const onProgress = (processed, total) => {
          event.sender.send("image-loading-progress", { processed, total });
        };

        const images = await imageManager.readDirectory(
          targetFolder,
          onProgress
        );
        log.info(`Found ${images.length} images`);
        return images;
      } catch (error) {
        log.error(`Failed to list images: ${error.message}`);
        throw error;
      }
    });

    // Get image data as base64
    ipcMain.handle("getImageData", async (event, imagePath) => {
      try {
        return await imageManager.getImageData(imagePath);
      } catch (error) {
        log.error(`Failed to get image data: ${error.message}`);
        throw error;
      }
    });

    // Write IPTC caption to image
    ipcMain.handle(
      "writeIptc",
      async (event, targetFolder, filename, caption, options = {}) => {
        try {
          log.info(`Writing IPTC for: ${filename}`);
          const result = await imageManager.writeCaption(
            targetFolder,
            filename,
            caption,
            options
          );
          
          // Distinguish between success, skipped, and error
          if (result.written) {
            log.info(`Write result: success`);
          } else if (result.error === "No fields selected for writing") {
            log.info(`Write result: skipped (no recognized faces)`);
          } else {
            log.warn(`Write result: failed - ${result.error}`);
          }
          
          return result;
        } catch (error) {
          log.error(`Failed to write IPTC: ${error.message}`);
          return { written: false, error: error.message };
        }
      }
    );
  }

  registerRecognitionHandlers() {
    // Detect faces using InsightFace
    ipcMain.handle("insightFaceDetection", async (event, photo, serverUrl) => {
      try {
        log.info(`Detecting faces in: ${photo.filename}`);
        const faces = await faceRecognitionService.detectFaces(
          photo,
          serverUrl
        );
        log.info(`Detected ${faces.length} faces`);
        return faces;
      } catch (error) {
        log.error(`Face detection failed: ${error.message}`);
        return [];
      }
    });

    // Match multiple faces against user database
    ipcMain.handle(
      "matchMultipleFaces",
      async (event, { detectedFaces, users }) => {
        try {
          log.info(
            `Matching ${detectedFaces.length} faces against ${users.length} users`
          );
          const matches = await faceRecognitionService.matchMultipleFaces({
            detectedFaces,
            users,
          });
          log.info(
            `Matched ${matches.filter((m) => m.distance > 0).length} faces`
          );
          return matches;
        } catch (error) {
          log.error(`Face matching failed: ${error.message}`);
          return [];
        }
      }
    );

    // Enroll person in database
    ipcMain.handle("handleEnrollPerson", async (event, person, supabase) => {
      try {
        log.info(`Enrolling person: ${person.name}`);
        const result = await faceRecognitionService.enrollPerson(
          person,
          supabase
        );
        return result.success;
      } catch (error) {
        log.error(`Failed to enroll person: ${error.message}`);
        return false;
      }
    });

    // Detect faces from buffer (for recognition service)
    ipcMain.handle("detect-faces", async (event, imageBuffer) => {
      try {
        return await recognitionManager.detectFaces(imageBuffer);
      } catch (error) {
        log.error(`Detection service error: ${error.message}`);
        throw error;
      }
    });

    // Check recognition service health
    ipcMain.handle("check-recognition-service", async () => {
      try {
        const isHealthy = await recognitionManager.checkHealth();
        return { healthy: isHealthy, ...recognitionManager.getStatus() };
      } catch (error) {
        log.error(`Health check failed: ${error.message}`);
        return { healthy: false, error: error.message };
      }
    });

    // Start recognition server
    ipcMain.handle("startRecognitionServer", async () => {
      try {
        log.info("Starting recognition server from IPC...");
        const started = await recognitionManager.start();
        return { success: started };
      } catch (error) {
        log.error(`Failed to start server: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    // Restart recognition server
    ipcMain.handle("restartRecognitionServer", async () => {
      try {
        log.info("Restarting recognition server...");
        const restarted = await recognitionManager.restart();
        return { success: restarted };
      } catch (error) {
        log.error(`Failed to restart server: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
  }

  registerDialogHandlers() {
    // Select directory dialog
    ipcMain.handle("selectDirectory", async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ["openDirectory"],
          title: "Select Image Folder",
        });

        if (result.canceled) {
          return null;
        }

        log.info(`Directory selected: ${result.filePaths[0]}`);
        return result.filePaths[0];
      } catch (error) {
        log.error(`Directory selection failed: ${error.message}`);
        return null;
      }
    });

    // Select lowres folder (legacy, could be removed)
    ipcMain.handle("selectLowResFolder", async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ["openDirectory"],
          title: "Select Low Resolution Folder",
        });

        if (result.canceled) {
          return null;
        }

        return result.filePaths[0];
      } catch (error) {
        log.error(`Lowres folder selection failed: ${error.message}`);
        return null;
      }
    });
  }

  registerUtilityHandlers() {
    // Get app version
    ipcMain.handle("getAppVersion", () => {
      const { app } = require("electron");
      const version = app.getVersion();
      log.info(`App version requested: ${version}`);
      return version;
    });
  }

  registerLogHandlers() {
    // Get log file path
    ipcMain.handle("getLogPath", () => {
      const logPath = log.transports.file.getFile().path;
      log.info(`Log path requested: ${logPath}`);
      return logPath;
    });

    // Read log file contents
    ipcMain.handle("readLogFile", async (event, lines = 500) => {
      try {
        const logPath = log.transports.file.getFile().path;
        
        if (!fs.existsSync(logPath)) {
          return { success: false, error: "Log file not found", content: "" };
        }

        const content = fs.readFileSync(logPath, "utf-8");
        
        // Get last N lines
        const allLines = content.split("\n");
        const lastLines = allLines.slice(-lines).join("\n");
        
        return { 
          success: true, 
          content: lastLines,
          path: logPath,
          totalLines: allLines.length
        };
      } catch (error) {
        log.error(`Failed to read log file: ${error.message}`);
        return { success: false, error: error.message, content: "" };
      }
    });

    // Open log file location in Finder/Explorer
    ipcMain.handle("openLogLocation", async () => {
      try {
        const logPath = log.transports.file.getFile().path;
        shell.showItemInFolder(logPath);
        log.info(`Opened log location: ${logPath}`);
        return { success: true };
      } catch (error) {
        log.error(`Failed to open log location: ${error.message}`);
        return { success: false, error: error.message };
      }
    });

    // Clear log file
    ipcMain.handle("clearLogFile", async () => {
      try {
        const logPath = log.transports.file.getFile().path;
        fs.writeFileSync(logPath, "");
        log.info("Log file cleared");
        return { success: true };
      } catch (error) {
        log.error(`Failed to clear log file: ${error.message}`);
        return { success: false, error: error.message };
      }
    });
  }

  unregister() {
    // Remove all handlers
    const channels = [
      "list-images",
      "getImageData",
      "writeIptc",
      "insightFaceDetection",
      "matchMultipleFaces",
      "handleEnrollPerson",
      "detect-faces",
      "check-recognition-service",
      "startRecognitionServer",
      "restartRecognitionServer",
      "selectDirectory",
      "selectLowResFolder",
      "getAppVersion",
      "getLogPath",
      "readLogFile",
      "openLogLocation",
      "clearLogFile",
    ];

    channels.forEach((channel) => {
      ipcMain.removeHandler(channel);
    });

    log.info("All IPC handlers unregistered");
  }
}

export function registerIPCHandlers(mainWindow) {
  const handlers = new IPCHandlers(mainWindow);
  handlers.register();
  return handlers;
}
