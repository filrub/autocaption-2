import { Text, Group, Badge, Anchor } from "@mantine/core";
import { useEffect, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import LogViewer from "./LogViewer";

export default function Footer({ users, pendingChanges = 0 }) {
  const [version, setVersion] = useState("");
  const [logModalOpened, { open: openLogModal, close: closeLogModal }] =
    useDisclosure(false);

  useEffect(() => {
    const getVersion = async () => {
      const v = await window.electronAPI.getAppVersion();
      setVersion(v);
    };
    //finchè version è vuota, riprova ogni 5 secondi
    version == "" && setTimeout(() => getVersion(), 5000);
  }, []);

  return (
    <>
      <Group gap="xs" justify="flex-end" m="0.5rem">
        <Text>
          &copy; Filippo Rubin 2025 - {users?.length} personaggi nel db locale
          {pendingChanges > 0 && (
            <Badge color="orange" variant="light" size="sm" ml="xs">
              {pendingChanges} modifiche non sincronizzate
            </Badge>
          )}{" "}
          - V{version} -{" "}
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={openLogModal}
          >
            Log
          </Anchor>
        </Text>
      </Group>

      <LogViewer opened={logModalOpened} onClose={closeLogModal} />
    </>
  );
}
