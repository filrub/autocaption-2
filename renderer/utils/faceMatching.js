import { cosineSimilarity, cosineSimilarityPercent } from './math.js'

/**
 * Match detected faces against a user database
 */
export function matchFaces(detectedFaces, users) {
  return detectedFaces.map(face => {
    const bestMatch = findBestUserMatch(face.descriptor, users)
    
    return {
      ...face,
      ...bestMatch,
      recog: true
    }
  })
}

/**
 * Find the best matching user for a face descriptor
 */
export function findBestUserMatch(faceDescriptor, users) {
  let bestMatch = {
    user_id: null,
    name: '',
    distance: 0,
    embeddings: 0,
    descriptorIndex: -1,
    descriptor: []
  }

  if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
    return bestMatch
  }

  for (const user of users) {
    if (!user.descriptor || !Array.isArray(user.descriptor)) {
      continue
    }

    user.descriptor.forEach((userDescriptor, index) => {
      if (faceDescriptor.length !== userDescriptor.length) {
        return
      }

      const distance = cosineSimilarityPercent(faceDescriptor, userDescriptor)

      if (distance > bestMatch.distance) {
        bestMatch = {
          user_id: user.id,
          name: user.name,
          distance,
          embeddings: user.descriptor.length,
          descriptorIndex: index,
          descriptor: user.descriptor
        }
      }
    })
  }

  return bestMatch
}

/**
 * Sort faces from left to right
 */
export function sortFacesLeftToRight(faces) {
  return [...faces].sort((a, b) => a.x - b.x)
}

/**
 * Sort faces by height (largest first)
 */
export function sortFacesByHeight(faces) {
  return [...faces].sort((a, b) => b.height - a.height)
}

/**
 * Filter faces by thresholds
 */
export function filterFacesByThresholds(faces, options = {}) {
  const {
    similarityThreshold = 50,
    faceSizeThreshold = 40,
    maxNumberOfFaces = 20
  } = options

  if (faces.length === 0) {
    return []
  }

  // Find max face height for size comparison
  const maxFaceHeight = Math.max(...faces.map(f => f.height))

  return faces
    .filter((face, index) => {
      const meetsName = face.name && face.name !== ''
      const meetsSimilarity = face.distance >= similarityThreshold
      const meetsSize = (face.height / maxFaceHeight) * 100 >= faceSizeThreshold
      const meetsCount = index < maxNumberOfFaces

      return meetsName && meetsSimilarity && meetsSize && meetsCount
    })
}
