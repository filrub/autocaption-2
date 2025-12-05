import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook to manage sequential processing of photos with queue
 * Prevents overwhelming the recognition server with concurrent requests
 */
export function usePhotoQueue(concurrency = 3) {
  const [processingQueue, setProcessingQueue] = useState([]);
  const [activeCount, setActiveCount] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const queueRef = useRef([]);
  const activeRef = useRef(0);
  const processedRef = useRef(0);
  const concurrencyRef = useRef(concurrency);

  // Update concurrency when it changes
  useEffect(() => {
    concurrencyRef.current = concurrency;
  }, [concurrency]);

  const processNext = useCallback(() => {
    // Process items up to concurrency limit
    while (
      activeRef.current < concurrencyRef.current &&
      queueRef.current.length > 0
    ) {
      const task = queueRef.current.shift();
      if (!task) break;

      activeRef.current++;
      setActiveCount(activeRef.current);
      setProcessingQueue([...queueRef.current]);

      // Execute task
      task
        .fn()
        .then(() => {
          processedRef.current++;
          setProcessedCount(processedRef.current);
        })
        .catch((error) => {
          console.error("Queue task error:", error);
          // Count as processed even on error
          processedRef.current++;
          setProcessedCount(processedRef.current);
        })
        .finally(() => {
          activeRef.current--;
          setActiveCount(activeRef.current);

          // Process next batch
          processNext();
        });
    }
  }, []);

  const addToQueue = useCallback(
    (fn, priority = 0) => {
      const task = { fn, priority };
      queueRef.current.push(task);

      // Sort by priority (higher priority first)
      queueRef.current.sort((a, b) => b.priority - a.priority);

      setProcessingQueue([...queueRef.current]);

      // Start processing
      processNext();
    },
    [processNext]
  );

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setProcessingQueue([]);
  }, []);

  const resetCounters = useCallback(() => {
    processedRef.current = 0;
    setProcessedCount(0);
  }, []);

  return {
    addToQueue,
    clearQueue,
    resetCounters,
    queueLength: processingQueue.length,
    activeCount,
    processedCount,
    isProcessing: activeCount > 0 || processingQueue.length > 0,
  };
}
