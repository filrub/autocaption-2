import { useState, useEffect } from 'react'

const MAX_RETRIES = 3
const RETRY_DELAY = 3000
const HEALTH_CHECK_INTERVAL = 10000

export function useRecognitionService(serverUrl = 'http://localhost:8000') {
  const [status, setStatus] = useState('checking')
  const [retries, setRetries] = useState(0)
  const [lastError, setLastError] = useState(null)

  useEffect(() => {
    let intervalId
    let timeoutId

    const checkHealth = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        const response = await fetch(`${serverUrl}/health`, {
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const data = await response.json()
          if (data.status === 'healthy' && data.service === 'recognition') {
            setStatus('healthy')
            setRetries(0)
            setLastError(null)
            return true
          }
        }
        throw new Error('Service unhealthy')
      } catch (error) {
        setLastError(error.message)
        setStatus('error')
        setRetries(prev => prev + 1)
        return false
      }
    }

    const startMonitoring = async () => {
      const isHealthy = await checkHealth()
      
      if (!isHealthy && retries < MAX_RETRIES) {
        timeoutId = setTimeout(startMonitoring, RETRY_DELAY)
      } else if (!isHealthy && retries >= MAX_RETRIES) {
        window.electronAPI?.startRecognitionServer?.()
        setRetries(0)
      } else {
        intervalId = setInterval(checkHealth, HEALTH_CHECK_INTERVAL)
      }
    }

    startMonitoring()

    return () => {
      clearInterval(intervalId)
      clearTimeout(timeoutId)
    }
  }, [serverUrl, retries])

  return { status, retries, lastError, isHealthy: status === 'healthy' }
}
