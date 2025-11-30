import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import log from "electron-log/main";
import {
  cosineSimilarity,
  cosineSimilarityPercent,
  validateVectors,
} from "./utils/math.js";
import { RECOGNITION_CONFIG } from "../config/constants.js";

class FaceRecognitionService {
  constructor() {
    this.lowResFolder = path.join(
      app.getPath("pictures"),
      "autocaption-lowres"
    );
  }

  findBestMatch(faceDescriptor, users) {
    console.log("=== FIND BEST MATCH ===");
    console.log("Looking for face, users count:", users.length);
    console.log("Sample user descriptor:", users[0]?.descriptor);
    let bestMatch = {
      user_id: null,
      name: "",
      distance: 0,
      embeddings: 0,
      descriptorIndex: -1,
      descriptor: [],
    };

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      log.warn("Invalid face descriptor provided");
      return bestMatch;
    }

    // DEBUG: Track all scores for analysis
    const allScores = [];

    for (const user of users) {
      if (!user.descriptor || !Array.isArray(user.descriptor)) {
        console.log(
          `SKIP ${user.name}: descriptor not array, type=${typeof user.descriptor}`
        );
        continue;
      }

      let userBestScore = 0;
      let validDescriptors = 0;
      let skippedDescriptors = 0;

      user.descriptor.forEach((userDescriptor, index) => {
        // Validate vectors before comparison
        const validation = validateVectors(faceDescriptor, userDescriptor);
        if (!validation.valid) {
          skippedDescriptors++;
          if (user.name.includes("PICCIONI")) {
            log.warn(
              `PICCIONI descriptor ${index} SKIPPED: ${validation.error}`
            );
            console.log(`  faceDescriptor length: ${faceDescriptor?.length}`);
            console.log(`  userDescriptor type: ${typeof userDescriptor}`);
            console.log(
              `  userDescriptor isArray: ${Array.isArray(userDescriptor)}`
            );
            console.log(`  userDescriptor length: ${userDescriptor?.length}`);
          }
          return;
        }

        validDescriptors++;
        const distance = cosineSimilarityPercent(
          faceDescriptor,
          userDescriptor
        );

        if (distance > userBestScore) {
          userBestScore = distance;
        }

        if (distance > bestMatch.distance) {
          bestMatch = {
            user_id: user.id,
            name: user.name,
            distance,
            embeddings: user.descriptor.length,
            descriptorIndex: index,
            descriptor: user.descriptor,
          };
        }
      });

      // Log scores for specific users
      if (user.name.includes("PICCIONI") || user.name.includes("WOLOSZ")) {
        console.log(
          `${user.name}: best=${userBestScore}%, valid=${validDescriptors}, skipped=${skippedDescriptors}`
        );
      }

      allScores.push({ name: user.name, score: userBestScore });
    }

    // Show top 5 matches
    allScores.sort((a, b) => b.score - a.score);
    console.log("TOP 5 MATCHES:", allScores.slice(0, 5));

    return bestMatch;
  }

  async matchMultipleFaces({ detectedFaces, users }) {
    if (!Array.isArray(detectedFaces) || !Array.isArray(users)) {
      log.error("Invalid input: detectedFaces and users must be arrays");
      return [];
    }

    const results = detectedFaces.map((face) => {
      const match = this.findBestMatch(face.descriptor, users);

      return {
        x: face.x,
        y: face.y,
        top: face.y,
        left: face.x,
        width: face.width,
        height: face.height,
        descriptor: face.descriptor,
        distance: match.distance,
        name: match.name,
        id: match.user_id,
        embeddings: match.embeddings,
        descriptorIndex: match.descriptorIndex,
        match,
        recog: true,
      };
    });

    // Sort by x position (left to right)
    return results.sort((a, b) => a.x - b.x);
  }

  async detectFaces(photo, serverUrl) {
    const imageUrl = path.join(this.lowResFolder, photo.filename);

    try {
      const buffer = await fs.readFile(imageUrl);
      const blob = new Blob([buffer]);
      const formData = new FormData();
      formData.append("file", blob, photo.filename);

      const response = await fetch(serverUrl, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(RECOGNITION_CONFIG.DETECTION_TIMEOUT),
      });

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.faces || !Array.isArray(data.faces)) {
        log.warn("Invalid response format from recognition server");
        return [];
      }

      const faces = data.faces.map((face) => {
        const [x1, y1, x2, y2] = face.bbox;
        const width = x2 - x1;
        const height = y2 - y1;

        return {
          x: x1 / photo.width,
          y: y1 / photo.height,
          top: y1 / photo.height,
          left: x1 / photo.width,
          width: width / photo.width,
          height: height / photo.height,
          descriptor: face.embedding,
          name: "",
          distance: 0,
          recog: false,
          id: null,
          match: {},
        };
      });

      log.info(`Detected ${faces.length} faces in ${photo.filename}`);
      return faces.sort((a, b) => a.x - b.x);
    } catch (error) {
      if (error.name === "AbortError") {
        log.error(`Face detection timeout for ${photo.filename}`);
        throw new Error("Face detection timeout - image might be too large");
      }

      log.error(`Face detection failed: ${error.message}`);
      throw error;
    }
  }

  async enrollPerson(person, supabase) {
    if (!person.descriptor || !person.name) {
      throw new Error("Invalid person data: descriptor and name required");
    }

    const embedding = Array.from(person.descriptor);
    const name = person.name.trim().toUpperCase();

    try {
      const { error } = await supabase.rpc("add_face_descriptor", {
        p_name: name,
        p_descriptor: embedding,
      });

      if (error) {
        log.error(`Database error enrolling ${name}: ${error.message}`);
        throw error;
      }

      log.info(`Successfully enrolled: ${name}`);
      return { success: true };
    } catch (error) {
      log.error(`Failed to enroll person: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  validateFace(face, thresholds = {}) {
    const {
      minSimilarity = 50,
      minSizePercent = 40,
      maxFaces = 20,
      faceIndex = 0,
      maxFaceHeight = 1,
    } = thresholds;

    const heightPercent = (face.height / maxFaceHeight) * 100;

    return {
      isValid:
        face.distance >= minSimilarity &&
        heightPercent >= minSizePercent &&
        faceIndex < maxFaces,
      heightPercent,
      meetsDistance: face.distance >= minSimilarity,
      meetsSize: heightPercent >= minSizePercent,
      meetsCount: faceIndex < maxFaces,
    };
  }
}

export const faceRecognitionService = new FaceRecognitionService();
