import { Text, Group } from '@mantine/core'
import { useEffect, useState } from 'react'

export default function Footer({ users }) {
  const [version, setVersion] = useState('')
  useEffect(() => {
    const getVersion = async () => {
      const v = await window.electronAPI.getAppVersion()
      setVersion(v)
    }
    //finchè version è vuota, riprova ogni 5 secondi
    version == '' && setTimeout(() => getVersion(), 5000)
  }, [])
  return (
    <Group gap="xs" justify="flex-end" m="0.5rem">
      <Text>
        &copy; Filippo Rubin 2025 - {users?.length} personaggi nel db - V{version} -
      </Text>
    </Group>
  )
}
