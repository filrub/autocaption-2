import { useState } from 'react'
import {
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Center,
  Box,
  Alert,
  Divider,
  Group,
} from '@mantine/core'
import { IconMail, IconLock, IconAlertCircle, IconCamera } from '@tabler/icons-react'

export default function Login({ supabase, onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw authError
      }

      if (data?.user) {
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message || 'Errore durante il login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center h="100vh" bg="gray.1">
      <Paper shadow="xl" p="xl" radius="lg" w={400}>
        <Stack gap="lg">
          {/* Logo/Header */}
          <Box ta="center">
            <Group justify="center" gap="xs" mb="xs">
              <IconCamera size={40} color="var(--mantine-color-blue-6)" />
            </Group>
            <Title order={2} c="blue.7">AutoCAPTION</Title>
            <Text size="sm" c="dimmed" mt="xs">
              Accedi per utilizzare l'applicazione
            </Text>
          </Box>

          <Divider />

          {/* Error Alert */}
          {error && (
            <Alert 
              icon={<IconAlertCircle size={16} />} 
              color="red" 
              variant="light"
              title="Errore di autenticazione"
            >
              {error}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="nome@esempio.com"
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="md"
              />

              <PasswordInput
                label="Password"
                placeholder="La tua password"
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="md"
              />

              <Button 
                type="submit" 
                fullWidth 
                size="md"
                loading={loading}
                mt="sm"
              >
                Accedi
              </Button>
            </Stack>
          </form>

          <Text size="xs" c="dimmed" ta="center">
            Contatta l'amministratore per ottenere le credenziali
          </Text>
        </Stack>
      </Paper>
    </Center>
  )
}
