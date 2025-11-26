/**
 * Process items in batches to avoid overwhelming the system
 */
export async function processBatch(items, batchSize, processor) {
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(item => processor(item).catch(err => {
        console.error('Batch item processing failed:', err)
        return null
      }))
    )
    results.push(...batchResults)
  }
  
  return results.filter(result => result !== null)
}

/**
 * Process items in batches with progress callback
 */
export async function processBatchWithProgress(items, batchSize, processor, onProgress) {
  const results = []
  const total = items.length
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(item => processor(item).catch(err => {
        console.error('Batch item processing failed:', err)
        return null
      }))
    )
    results.push(...batchResults)
    
    if (onProgress) {
      const processed = Math.min(i + batchSize, total)
      onProgress(processed, total)
    }
  }
  
  return results.filter(result => result !== null)
}

/**
 * Retry a function with exponential backoff
 */
export async function retry(fn, maxAttempts = 3, delay = 500) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
      
      const backoffDelay = delay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, backoffDelay))
    }
  }
}
