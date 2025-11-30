/**
 * Calculate cosine similarity between two vectors
 * Returns a value between 0 and 1 (higher = more similar)
 */
export function cosineSimilarity(vectorA, vectorB) {
  if (!vectorA || !vectorB) {
    return 0;
  }

  /* if (vectorA.length !== vectorB.length) {
    console.warn(
      "Vector length mismatch:",
      vectorA.length,
      "vs",
      vectorB.length
    );
    return 0;
  } */

  const dotProduct = vectorA.reduce((sum, val, i) => sum + val * vectorB[i], 0);
  const normA = Math.sqrt(vectorA.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(vectorB.reduce((sum, val) => sum + val * val, 0));

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate cosine similarity as percentage (0-100)
 */
export function cosineSimilarityPercent(vectorA, vectorB) {
  return Math.round(cosineSimilarity(vectorA, vectorB) * 100);
}

/**
 * Validate that vectors are suitable for comparison
 */
export function validateVectors(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    return { valid: false, error: "Vectors must be arrays" };
  }

  if (vectorA.length === 0 || vectorB.length === 0) {
    return { valid: false, error: "Vectors cannot be empty" };
  }

  if (vectorA.length !== vectorB.length) {
    return { valid: false, error: "Vector length mismatch" };
  }

  return { valid: true };
}
