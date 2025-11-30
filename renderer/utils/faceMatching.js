import { cosineSimilarity, cosineSimilarityPercent } from "./math.js";

/**
 * Match detected faces against a user database
 */
export function matchFaces(detectedFaces, users) {
  return detectedFaces.map((face) => {
    const bestMatch = findBestUserMatch(face.descriptor, users);

    return {
      ...face,
      ...bestMatch,
      recog: true,
    };
  });
}

/**
 * Find the best matching user for a face descriptor
 */
export function findBestUserMatch(faceDescriptor, users) {
  console.log("=== FIND BEST MATCH ===");
  console.log("Looking for face, users count:", users.length);
  console.log("Sample user descriptor:", users[0]?.descriptor);
  console.log("Face descriptor to match:", faceDescriptor);
  console.log("Face descriptor length:", faceDescriptor?.length);

  let bestMatch = {
    user_id: null,
    name: "",
    distance: 0,
    embeddings: 0,
    descriptorIndex: -1,
    descriptor: [],
  };

  if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
    console.log("Invalid face descriptor!");
    return bestMatch;
  }

  let checkedDescriptors = 0;

  for (const user of users) {
    if (!user.descriptor || !Array.isArray(user.descriptor)) {
      console.log(`Skipping user ${user.name} - invalid descriptor`);
      continue;
    }

    user.descriptor.forEach((userDescriptor, index) => {
      checkedDescriptors++;

      // Debug: Check if userDescriptor is valid
      if (!Array.isArray(userDescriptor)) {
        console.error(
          `❌ BROKEN USER: ${user.name}[${index}] - userDescriptor is NOT an array!`
        );
        console.error(`   Type: ${typeof userDescriptor}`);
        console.error(`   Value:`, userDescriptor);
        console.error(`   Full user.descriptor:`, user.descriptor);
        return; // Skip this one
      }

      if (checkedDescriptors <= 3) {
        // Log solo i primi 3 per non intasare la console
        console.log(
          `Checking ${user.name}[${index}]: face=${faceDescriptor.length}, user=${userDescriptor.length}`
        );
      }

      if (faceDescriptor.length !== userDescriptor.length) {
        if (checkedDescriptors <= 3) {
          console.log(`Length mismatch!`);
        }
        return;
      }

      const distance = cosineSimilarityPercent(faceDescriptor, userDescriptor);

      if (checkedDescriptors <= 3) {
        console.log(`Distance: ${distance}%`);
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
  }

  console.log("Total descriptors checked:", checkedDescriptors);
  console.log("Best match:", bestMatch);

  return bestMatch;
}
/**
 * Sort faces from left to right
 */
export function sortFacesLeftToRight(faces) {
  return [...faces].sort((a, b) => a.x - b.x);
}

/**
 * Sort faces by height (largest first)
 */
export function sortFacesByHeight(faces) {
  return [...faces].sort((a, b) => b.height - a.height);
}

/**
 * Filter faces by thresholds
 */
export function filterFacesByThresholds(faces, options = {}) {
  const {
    similarityThreshold = 50,
    faceSizeThreshold = 40,
    maxNumberOfFaces = 20,
  } = options;

  if (faces.length === 0) {
    return [];
  }

  // Find max face height for size comparison
  const maxFaceHeight = Math.max(...faces.map((f) => f.height));

  return faces.filter((face, index) => {
    const meetsName = face.name && face.name !== "";
    const meetsSimilarity = face.distance >= similarityThreshold;
    const meetsSize = (face.height / maxFaceHeight) * 100 >= faceSizeThreshold;
    const meetsCount = index < maxNumberOfFaces;

    return meetsName && meetsSimilarity && meetsSize && meetsCount;
  });
}
