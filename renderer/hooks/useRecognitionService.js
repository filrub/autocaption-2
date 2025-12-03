import { useState, useEffect, useRef, useCallback } from "react";

const HEALTH_CHECK_INTERVAL = 10000;
const INITIAL_RETRY_DELAY = 2000;
const MAX_STARTUP_RETRIES = 5;

export function useRecognitionService(serverUrl = "http://localhost:8000") {
  const [status, setStatus] = useState("checking");
  const [lastError, setLastError] = useState(null);
  const startupRetriesRef = useRef(0);
  const hasTriedStartingLocal = useRef(false);

  // Check if this is a local server URL
  const isLocalServer =
    serverUrl.includes("127.0.0.1") || serverUrl.includes("localhost");

  const checkHealth = useCallback(async () => {
    // Show checking state while we check
    setStatus("checking");

    try {
      // Extract base URL (remove /detect_faces if present)
      const baseUrl = serverUrl.replace("/detect_faces", "");

      const controller = new AbortController();
      const healthTimeout = setTimeout(() => controller.abort(), 5000);

      let isHealthy = false;

      // Try /health endpoint first (works for all new servers)
      try {
        const response = await fetch(`${baseUrl}/health`, {
          signal: controller.signal,
        });

        clearTimeout(healthTimeout);

        if (response.ok) {
          const data = await response.json();
          isHealthy =
            data.status === "healthy" && data.service === "recognition";
        }
      } catch (healthError) {
        // /health endpoint failed, try fallback for old servers
        clearTimeout(healthTimeout);

        if (!isLocalServer) {
          // Fallback: check if /detect_faces endpoint responds
          const fallbackResponse = await fetch(`${baseUrl}/detect_faces`, {
            method: "OPTIONS",
            signal: AbortSignal.timeout(3000),
          }).catch(() => null);

          if (
            fallbackResponse &&
            (fallbackResponse.ok ||
              fallbackResponse.status === 405 ||
              fallbackResponse.status === 422)
          ) {
            isHealthy = true;
          }
        }
      }

      if (isHealthy) {
        setStatus("healthy");
        setLastError(null);
        startupRetriesRef.current = 0;
        hasTriedStartingLocal.current = false;
        return true;
      }

      throw new Error("Service unhealthy");
    } catch (error) {
      setLastError(error.message);
      setStatus("error");
      return false;
    }
  }, [serverUrl, isLocalServer]);

  useEffect(() => {
    // Reset state when server URL changes
    setStatus("checking");
    setLastError(null);
    startupRetriesRef.current = 0;
    hasTriedStartingLocal.current = false;

    let timeoutId;
    let isMounted = true;

    const doHealthCheck = async () => {
      if (!isMounted) return;

      const isHealthy = await checkHealth();

      if (!isHealthy && isLocalServer && !hasTriedStartingLocal.current) {
        // For local server: try to start it after a few failures
        startupRetriesRef.current++;

        if (startupRetriesRef.current >= MAX_STARTUP_RETRIES) {
          window.electronAPI?.startRecognitionServer?.();
          hasTriedStartingLocal.current = true;
          // Reset counter so it can try again later if needed
          startupRetriesRef.current = 0;
        }
      }
    };

    // Initial check
    doHealthCheck();

    // Then check periodically - retry faster initially, then slow down
    const startPeriodicChecks = () => {
      let checkCount = 0;
      const scheduleNextCheck = () => {
        if (!isMounted) return;

        const delay =
          checkCount < 5 ? INITIAL_RETRY_DELAY : HEALTH_CHECK_INTERVAL;
        checkCount++;

        timeoutId = setTimeout(async () => {
          await doHealthCheck();
          scheduleNextCheck();
        }, delay);
      };

      scheduleNextCheck();
    };

    startPeriodicChecks();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [serverUrl, isLocalServer, checkHealth]);

  return { status, lastError, isHealthy: status === "healthy", isLocalServer };
}
