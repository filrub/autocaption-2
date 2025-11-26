import { ActionIcon, Tooltip } from '@mantine/core'
import { IconCheck, IconLoader2, IconAlertCircle } from '@tabler/icons-react'
import { useRecognitionService } from '../hooks/useRecognitionService'

const STATUS_CONFIG = {
  healthy: {
    color: 'green',
    icon: IconCheck,
    label: 'Servizio attivo'
  },
  checking: {
    color: 'yellow',
    icon: IconLoader2,
    label: 'Connessione in corso...'
  },
  error: {
    color: 'red',
    icon: IconAlertCircle,
    label: 'Servizio non disponibile'
  }
}

export default function RecognitionMonitor({ serverUrl }) {
  const { status } = useRecognitionService(serverUrl)
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.error
  const Icon = config.icon

  return (
    <Tooltip label={config.label} position="right">
      <ActionIcon
        size="sm"
        color={config.color}
        variant="light"
        radius="xl"
        aria-label={config.label}
      >
        <Icon 
          size={14} 
          style={{ 
            animation: status === 'checking' ? 'spin 1s linear infinite' : 'none' 
          }} 
        />
      </ActionIcon>
    </Tooltip>
  )
}
