import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles/main.css";
import "./styles/enhanced.css";

import { AppShell, Center, Loader } from "@mantine/core";
import { MantineProvider } from "@mantine/core";
import { useEffect, useState, useCallback } from "react";
import { Notifications, notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconExclamationCircle,
  IconCloudDownload,
} from "@tabler/icons-react";
import { createClient } from "@supabase/supabase-js";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AutoCaption from "./components/AutoCaption";
import ErrorBoundary from "./components/ErrorBoundary";
import Login from "./components/Login";
import appTheme from "./theme";

import {
  initDB,
  getAllUsers,
  getAllGroups,
  hasLocalData,
  getLastSyncTime,
  getPendingChangesCount,
  formatTimeAgo,
} from "./utils/localDatabase";

import { syncWithSupabase, initialSyncFromSupabase } from "./utils/syncService";

// Validate environment variables
const hasSupabaseConfig =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!hasSupabaseConfig) {
  console.warn("⚠️ Missing Supabase credentials. Using dummy client.");
}

// Create Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://dummy.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "dummy-key-for-development"
);

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTimeState] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // Normalize user descriptor structure
  const normalizeUsers = useCallback((data) => {
    return (
      data?.map((user) => {
        let descriptor = user.descriptor;

        if (typeof descriptor === "string") {
          try {
            descriptor = JSON.parse(descriptor);
          } catch (e) {
            console.error(`Failed to parse descriptor for ${user.name}:`, e);
            return { ...user, descriptor: [], groups: user.groups || [] };
          }
        }

        if (Array.isArray(descriptor)) {
          if (descriptor.length === 1 && Array.isArray(descriptor[0])) {
            if (typeof descriptor[0][0] === "number") {
              descriptor = descriptor;
            } else {
              descriptor = descriptor[0];
            }
          }
        }

        return {
          ...user,
          descriptor,
          groups: user.groups || [],
        };
      }) || []
    );
  }, []);

  // Load users from local database
  const loadUsersFromLocal = useCallback(async () => {
    try {
      const localUsers = await getAllUsers();
      const normalized = normalizeUsers(localUsers);
      setUsers(normalized);
      console.log(`📦 Loaded ${normalized.length} users from local database`);
      return normalized;
    } catch (error) {
      console.error("Error loading from local DB:", error);
      return [];
    }
  }, [normalizeUsers]);

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    const count = await getPendingChangesCount();
    const lastSync = await getLastSyncTime();
    setPendingChanges(count);
    setLastSyncTimeState(lastSync);
  }, []);

  // Initial load
  // Initialize database and load users only after authentication
  useEffect(() => {
    if (!user) return; // Don't load until authenticated

    const initialize = async () => {
      try {
        await initDB();

        const hasData = await hasLocalData();

        if (hasData) {
          // Load from local database (instant!)
          await loadUsersFromLocal();
          await updateSyncStatus();
          setLoadingUsers(false);

          const lastSync = await getLastSyncTime();
          notifications.show({
            title: "Database locale caricato",
            message: `Ultimo sync: ${formatTimeAgo(lastSync)}`,
            color: "blue",
            autoClose: 2000,
          });
        } else if (hasSupabaseConfig) {
          // First run - need to sync from Supabase
          setLoadingUsers(true);
          setSyncingUsers(true);

          notifications.show({
            id: "initial-sync",
            title: "Prima sincronizzazione",
            message: "Scaricamento database...",
            color: "blue",
            loading: true,
            autoClose: false,
          });

          try {
            const result = await initialSyncFromSupabase(supabase);
            await loadUsersFromLocal();
            await updateSyncStatus();

            notifications.update({
              id: "initial-sync",
              title: "Sincronizzazione completata",
              message: `${result.users} utenti importati`,
              color: "green",
              icon: <IconCheck size={18} />,
              loading: false,
              autoClose: 3000,
            });
          } catch (error) {
            notifications.update({
              id: "initial-sync",
              title: "Errore sincronizzazione",
              message: error.message,
              color: "red",
              icon: <IconExclamationCircle size={18} />,
              loading: false,
              autoClose: 5000,
            });
          }
        } else {
          // No Supabase config and no local data
          setLoadingUsers(false);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        notifications.show({
          title: "Errore inizializzazione",
          message: error.message,
          color: "red",
        });
        setLoadingUsers(false);
      } finally {
        setSyncingUsers(false);
      }
    };

    initialize();
  }, [user, loadUsersFromLocal, updateSyncStatus]);

  // Sync with Supabase
  const handleSync = useCallback(async () => {
    if (!hasSupabaseConfig) {
      notifications.show({
        title: "Configurazione mancante",
        message: "Configura le credenziali Supabase nel file .env",
        color: "orange",
      });
      return;
    }

    setSyncingUsers(true);

    notifications.show({
      id: "sync-progress",
      title: "Sincronizzazione in corso",
      message: "Connessione al server...",
      color: "blue",
      loading: true,
      autoClose: false,
    });

    try {
      const result = await syncWithSupabase(supabase, ({ step, message }) => {
        notifications.update({
          id: "sync-progress",
          title: "Sincronizzazione in corso",
          message,
          color: "blue",
          loading: true,
          autoClose: false,
        });
      });

      await loadUsersFromLocal();
      await updateSyncStatus();

      notifications.update({
        id: "sync-progress",
        title: "Sincronizzazione completata",
        message: `${result.pushed} modifiche inviate, ${result.pulled} utenti scaricati`,
        color: "green",
        icon: <IconCloudDownload size={18} />,
        loading: false,
        autoClose: 3000,
      });

      if (result.errors.length > 0) {
        console.warn("Sync errors:", result.errors);
      }
    } catch (error) {
      console.error("Sync error:", error);
      notifications.update({
        id: "sync-progress",
        title: "Errore sincronizzazione",
        message: error.message,
        color: "red",
        icon: <IconExclamationCircle size={18} />,
        loading: false,
        autoClose: 5000,
      });
    } finally {
      setSyncingUsers(false);
    }
  }, [loadUsersFromLocal, updateSyncStatus]);

  // Reload users from local DB (used after local changes)
  const loadUsers = useCallback(async () => {
    await loadUsersFromLocal();
    await updateSyncStatus();
  }, [loadUsersFromLocal, updateSyncStatus]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <MantineProvider theme={appTheme}>
        <Center h="100vh">
          <Loader size="xl" />
        </Center>
      </MantineProvider>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <MantineProvider theme={appTheme}>
        <Login supabase={supabase} onLogin={setUser} />
      </MantineProvider>
    );
  }

  return (
    <ErrorBoundary>
      <MantineProvider theme={appTheme}>
        <Notifications position="top-right" zIndex={1000} />
        <AppShell
          header={{ height: 60 }}
          navbar={{ width: 320, breakpoint: "sm" }}
          footer={{ height: 40 }}
          padding="md"
        >
          <AppShell.Header>
            <Header
              syncingUsers={syncingUsers}
              pendingChanges={pendingChanges}
              lastSyncTime={lastSyncTime}
              onSync={handleSync}
              user={user}
              onLogout={handleLogout}
            />
          </AppShell.Header>

          <AutoCaption
            loadingUsers={loadingUsers}
            users={users}
            setUsers={setUsers}
            supabase={supabase}
            loadUsers={loadUsers}
            onSync={handleSync}
            pendingChanges={pendingChanges}
            lastSyncTime={lastSyncTime}
          />

          <AppShell.Footer>
            <Footer users={users} pendingChanges={pendingChanges} />
          </AppShell.Footer>
        </AppShell>
      </MantineProvider>
    </ErrorBoundary>
  );
}
