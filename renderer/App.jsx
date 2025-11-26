import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles/main.css'
import './styles/enhanced.css'

import { AppShell } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { MantineProvider } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Notifications, notifications } from '@mantine/notifications'
import { IconCheck, IconExclamationCircle } from '@tabler/icons-react'
import { createClient } from '@supabase/supabase-js'

import Header from './components/Header'
import Footer from './components/Footer'
import AutoCaption from './components/AutoCaption'
import ErrorBoundary from './components/ErrorBoundary'
import appTheme from './theme'

// Validate environment variables
const hasSupabaseConfig = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY

if (!hasSupabaseConfig) {
  console.warn('⚠️ Missing Supabase credentials. Using dummy client.')
  console.info('Copy .env.example to .env and add your credentials for full functionality.')
}

// Create Supabase client with fallback to dummy values
// This prevents the app from breaking when .env is not configured
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy-key-for-development'
)

export default function App() {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    // Skip loading if Supabase is not configured
    if (!hasSupabaseConfig) {
      console.info('Skipping user load - Supabase not configured')
      setLoadingUsers(false)
      return
    }

    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('recognized_faces')
        .select('*')

      if (error) throw error

      setUsers(data || [])
      notifications.show({
        title: 'Database aggiornato',
        message: `${data?.length || 0} utenti caricati`,
        color: 'green',
        icon: <IconCheck size={18} />
      })
    } catch (error) {
      console.error('Supabase error:', error)
      notifications.show({
        title: 'Errore database',
        message: error.message || 'Impossibile connettersi al database',
        color: 'red',
        icon: <IconExclamationCircle size={18} />
      })
    } finally {
      setLoadingUsers(false)
    }
  }

  return (
    <ErrorBoundary>
      <MantineProvider theme={appTheme}>
        <Notifications position="top-right" zIndex={1000} />
        <ModalsProvider>
          <AppShell
            header={{ height: 60 }}
            navbar={{ width: 320, breakpoint: 'sm' }}
            footer={{ height: 40 }}
            padding="md"
          >
            <AppShell.Header>
              <Header />
            </AppShell.Header>

            <AutoCaption
              loadingUsers={loadingUsers}
              users={users}
              setUsers={setUsers}
              supabase={supabase}
            />

            <AppShell.Footer>
              <Footer users={users} />
            </AppShell.Footer>
          </AppShell>
        </ModalsProvider>
      </MantineProvider>
    </ErrorBoundary>
  )
}
