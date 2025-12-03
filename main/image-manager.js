import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";
import sharp from "sharp";
import { app } from "electron";
import { imageSizeFromFile } from "image-size/fromFile";
import log from "electron-log/main";
import { exifToolManager } from "./exiftool-manager.js";
import { IMAGE_CONFIG, CACHE_CONFIG } from "../config/constants.js";
import { processBatchWithProgress } from "./utils/async.js";

class ImageManager {
  constructor() {
    this.lowResFolder = null;
    this.processingQueue = new Map();
  }

  async initialize() {
    this.lowResFolder = path.join(
      app.getPath("pictures"),
      IMAGE_CONFIG.LOWRES_FOLDER_NAME
    );

    await this.ensureLowResFolderExists();
  }

  async ensureLowResFolderExists() {
    if (!this.lowResFolder) {
      this.lowResFolder = path.join(
        app.getPath("pictures"),
        IMAGE_CONFIG.LOWRES_FOLDER_NAME
      );
    }

    try {
      if (!existsSync(this.lowResFolder)) {
        await fs.mkdir(this.lowResFolder, { recursive: true });
        log.info(`Created lowres folder: ${this.lowResFolder}`);
      }
    } catch (error) {
      log.error(`Failed to create lowres folder: ${error.message}`);
      // Don't throw - try to continue anyway
    }
  }

  isValidImage(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return IMAGE_CONFIG.VALID_EXTENSIONS.includes(ext);
  }

  async shouldRegenerateLowRes(sourcePath, targetPath) {
    if (!CACHE_CONFIG.ENABLE_LOWRES_CACHE) {
      return true;
    }

    if (!existsSync(targetPath)) {
      return true;
    }

    if (CACHE_CONFIG.CHECK_MODIFIED_TIME) {
      try {
        const sourceStats = statSync(sourcePath);
        const targetStats = statSync(targetPath);

        // Regenerate if source is newer than target
        if (sourceStats.mtime > targetStats.mtime) {
          log.info(
            `Source modified, regenerating: ${path.basename(sourcePath)}`
          );
          return true;
        }
      } catch (error) {
        log.warn(`Error checking file times: ${error.message}`);
        return true;
      }
    }

    return false;
  }

  async createLowResImage(sourcePath, targetPath) {
    try {
      // Check if we need to regenerate
      if (!(await this.shouldRegenerateLowRes(sourcePath, targetPath))) {
        return targetPath;
      }

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true });
        log.info(`Created directory: ${targetDir}`);
      }

      await sharp(sourcePath)
        .resize(IMAGE_CONFIG.MAX_DIMENSION, IMAGE_CONFIG.MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: IMAGE_CONFIG.JPEG_QUALITY })
        .toFile(targetPath);

      log.info(`Created lowres image: ${path.basename(targetPath)}`);
      return targetPath;
    } catch (error) {
      log.error(`Failed to create lowres image: ${error.message}`);
      throw error;
    }
  }

  async getImageData(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();

      const mimeTypes = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
      };

      const mimeType = mimeTypes[ext] || "image/jpeg";
      return `data:${mimeType};base64,${buffer.toString("base64")}`;
    } catch (error) {
      log.error(`Failed to read image data: ${error.message}`);
      return null;
    }
  }

  async readDirectory(targetFolder, onProgress = null) {
    // Ensure lowres folder exists
    await this.ensureLowResFolderExists();

    log.info(`Reading directory: ${targetFolder}`);

    try {
      const files = await fs.readdir(targetFolder);
      const imageFiles = files.filter((file) => this.isValidImage(file));

      log.info(`Found ${imageFiles.length} images in ${targetFolder}`);

      if (imageFiles.length === 0) {
        return [];
      }

      // Process images in batches
      const processedImages = await processBatchWithProgress(
        imageFiles,
        IMAGE_CONFIG.BATCH_SIZE,
        (filename) => this.processImage(targetFolder, filename),
        onProgress
      );

      const validImages = processedImages.filter((img) => img !== null);
      log.info(`Successfully processed ${validImages.length} images`);

      return validImages;
    } catch (error) {
      log.error(`Error reading directory: ${error.message}`);
      throw error;
    }
  }

  async processImage(targetFolder, filename) {
    try {
      const sourcePath = path.join(targetFolder, filename);
      const lowResPath = path.join(this.lowResFolder, filename);

      // Create lowres version
      await this.createLowResImage(sourcePath, lowResPath);

      // Get dimensions
      const dimensions = await imageSizeFromFile(lowResPath);

      // Get base64 data
      const data = await this.getImageData(lowResPath);

      return {
        filename,
        data,
        path: sourcePath,
        lowResPath,
        width: dimensions.width,
        height: dimensions.height,
        ratio: dimensions.width / dimensions.height,
        faces: [],
        selected: false,
        indexed: false,
        isFootballTeam: false,
      };
    } catch (error) {
      log.error(`Failed to process image ${filename}: ${error.message}`);
      return null;
    }
  }

  async writeCaption(targetFolder, filename, caption) {
    const fullPath = path.join(targetFolder, filename);
    log.info(`Writing caption to: ${fullPath}`);

    const tags = {
      "IPTC:Caption-Abstract": caption,
      "XMP:Description": caption,
      "EXIF:ImageDescription": caption,
    };

    const result = await exifToolManager.writeMetadata(fullPath, tags);

    return {
      written: result.success,
      error: result.error,
    };
  }

  async cleanup() {
    if (!this.lowResFolder || !existsSync(this.lowResFolder)) {
      return;
    }

    try {
      const files = await fs.readdir(this.lowResFolder);
      const cleanupThreshold =
        Date.now() - IMAGE_CONFIG.CLEANUP_DAYS * 24 * 60 * 60 * 1000;

      let cleanedCount = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.lowResFolder, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cleanupThreshold) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          log.warn(`Could not clean file ${file}: ${error.message}`);
        }
      }

      if (cleanedCount > 0) {
        log.info(`Cleaned up ${cleanedCount} old lowres images`);
      }
    } catch (error) {
      log.error(`Cleanup failed: ${error.message}`);
    }
  }

  async cleanupAll() {
    if (!this.lowResFolder || !existsSync(this.lowResFolder)) {
      return;
    }

    try {
      const files = await fs.readdir(this.lowResFolder);

      for (const file of files) {
        try {
          await fs.unlink(path.join(this.lowResFolder, file));
        } catch (error) {
          log.warn(`Could not delete ${file}: ${error.message}`);
        }
      }

      log.info(`Cleaned all lowres images (${files.length} files)`);
    } catch (error) {
      log.error(`Cleanup all failed: ${error.message}`);
    }
  }
}

export const imageManager = new ImageManager();

// Cleanup all lowres images on app quit
app.on("before-quit", async () => {
  log.info("App quitting - cleaning lowres folder...");
  await imageManager.cleanupAll();
});
