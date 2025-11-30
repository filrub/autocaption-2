import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./styles/main.css";
import "./styles/enhanced.css";

import { AppShell } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { MantineProvider } from "@mantine/core";
import { useEffect, useState } from "react";
import { Notifications, notifications } from "@mantine/notifications";
import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import { createClient } from "@supabase/supabase-js";

import Header from "./components/Header";
import Footer from "./components/Footer";
import AutoCaption from "./components/AutoCaption";
import ErrorBoundary from "./components/ErrorBoundary";
import appTheme from "./theme";

// Validate environment variables
const hasSupabaseConfig =
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!hasSupabaseConfig) {
  console.warn("⚠️ Missing Supabase credentials. Using dummy client.");
  console.info(
    "Copy .env.example to .env and add your credentials for full functionality."
  );
}

// Create Supabase client with fallback to dummy values
// This prevents the app from breaking when .env is not configured
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "https://dummy.supabase.co",
  import.meta.env.VITE_SUPABASE_ANON_KEY || "dummy-key-for-development"
);

export default function App() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  /* const loadUsers = async () => {
    if (!hasSupabaseConfig) {
      console.info("Skipping user load - Supabase not configured");
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("recognized_faces")
        .select("*");

      if (error) throw error;

      // LOG PRIMA DEL PARSING
      console.log("=== DEBUG USERS ===");
      console.log("Raw data from DB:", data);
      console.log("First user descriptor type:", typeof data[0]?.descriptor);
      console.log("First user descriptor:", data[0]?.descriptor);

      // Parse descriptor from JSON string to JavaScript array
      const parsedData =
        data?.map((user) => ({
          ...user,
          descriptor:
            typeof user.descriptor === "string"
              ? JSON.parse(user.descriptor)
              : user.descriptor,
        })) || [];

      // LOG DOPO IL PARSING
      console.log("Parsed data:", parsedData);
      console.log("First parsed descriptor:", parsedData[0]?.descriptor);
      console.log("Is array?", Array.isArray(parsedData[0]?.descriptor));

      setUsers(parsedData);
      notifications.show({
        title: "Database aggiornato",
        message: `${parsedData.length} utenti caricati`,
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      console.error("Supabase error:", error);
      notifications.show({
        title: "Errore database",
        message: error.message || "Impossibile connettersi al database",
        color: "red",
        icon: <IconExclamationCircle size={18} />,
      });
    } finally {
      setLoadingUsers(false);
    }
  }; */

  const loadUsers = async () => {
    if (!hasSupabaseConfig) {
      console.info("Skipping user load - Supabase not configured");
      setLoadingUsers(false);
      return;
    }

    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("recognized_faces")
        .select("*");

      if (error) throw error;

      // Normalize descriptor structure
      const normalizedData =
        data?.map((user) => {
          let descriptor = user.descriptor;

          // STEP 1: Parse descriptor if it's a string (fixes newer records)
          if (typeof descriptor === "string") {
            try {
              descriptor = JSON.parse(descriptor);
            } catch (e) {
              console.error(`Failed to parse descriptor for ${user.name}:`, e);
              return { ...user, descriptor: [] }; // Return empty to skip this user
            }
          }

          // STEP 2: Normalize the array structure
          if (Array.isArray(descriptor)) {
            // Vecchi utenti: [[desc1, desc2, desc3]] -> [desc1, desc2, desc3]
            // Controlla se il primo elemento è un array di numeri
            if (descriptor.length === 1 && Array.isArray(descriptor[0])) {
              // Se descriptor[0][0] è un numero, abbiamo [[desc1, desc2, ...]]
              if (typeof descriptor[0][0] === "number") {
                // È già nel formato corretto: [[512 numeri]]
                descriptor = descriptor;
              } else {
                // È nel vecchio formato: [[desc1, desc2, desc3, ...]]
                // Estraiamo l'array interno: [desc1, desc2, desc3, ...]
                descriptor = descriptor[0];
              }
            }
          }

          return {
            ...user,
            descriptor,
          };
        }) || [];

      console.log("=== NORMALIZED USERS ===");
      console.log("Total users loaded:", normalizedData.length);

      // Check for any malformed descriptors
      normalizedData.forEach((user) => {
        if (!Array.isArray(user.descriptor)) {
          console.error(`❌ USER ${user.name}: descriptor is not an array!`);
        } else if (
          user.descriptor.length > 0 &&
          !Array.isArray(user.descriptor[0])
        ) {
          console.error(
            `❌ USER ${user.name}: descriptor[0] is not an array! Type: ${typeof user.descriptor[0]}`
          );
        }
      });

      // Log samples to verify correct parsing
      const sampleOld = normalizedData.find((u) => u.id < 500);
      const sampleNew = normalizedData.find((u) => u.id >= 534);

      if (sampleOld) {
        console.log("Sample old user:", sampleOld.name);
        console.log("  - descriptor type:", typeof sampleOld.descriptor);
        console.log("  - is array:", Array.isArray(sampleOld.descriptor));
        console.log("  - outer length:", sampleOld.descriptor?.length);
        console.log("  - inner length:", sampleOld.descriptor?.[0]?.length);
      }

      if (sampleNew) {
        console.log("Sample new user:", sampleNew.name);
        console.log("  - descriptor type:", typeof sampleNew.descriptor);
        console.log("  - is array:", Array.isArray(sampleNew.descriptor));
        console.log("  - outer length:", sampleNew.descriptor?.length);
        console.log("  - inner length:", sampleNew.descriptor?.[0]?.length);
      }

      setUsers(normalizedData);
      notifications.show({
        title: "Database aggiornato",
        message: `${normalizedData.length} utenti caricati`,
        color: "green",
        icon: <IconCheck size={18} />,
      });
    } catch (error) {
      console.error("Supabase error:", error);
      notifications.show({
        title: "Errore database",
        message: error.message || "Impossibile connettersi al database",
        color: "red",
        icon: <IconExclamationCircle size={18} />,
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  return (
    <ErrorBoundary>
      <MantineProvider theme={appTheme}>
        <Notifications position="top-right" zIndex={1000} />
        <ModalsProvider>
          <AppShell
            header={{ height: 60 }}
            navbar={{ width: 320, breakpoint: "sm" }}
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
  );
}
