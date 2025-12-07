import {
  Drawer,
  ScrollArea,
  Code,
  Group,
  Text,
  CopyButton,
  ActionIcon,
  Tooltip,
  Stack,
  Badge,
} from "@mantine/core";
import {
  IconRefresh,
  IconFolderOpen,
  IconCopy,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback } from "react";

export default function LogViewer({ opened, onClose }) {
  const [logContent, setLogContent] = useState("");
  const [logPath, setLogPath] = useState("");
  const [totalLines, setTotalLines] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.readLogFile(1000);
      if (result.success) {
        setLogContent(result.content);
        setLogPath(result.path);
        setTotalLines(result.totalLines);
      } else {
        setError(result.error);
        setLogContent("");
      }
    } catch (err) {
      setError(err.message);
      setLogContent("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (opened) {
      loadLogs();
    }
  }, [opened, loadLogs]);

  const handleOpenLocation = async () => {
    await window.electronAPI.openLogLocation();
  };

  const handleClearLogs = async () => {
    if (window.confirm("Sei sicuro di voler cancellare i log?")) {
      await window.electronAPI.clearLogFile();
      await loadLogs();
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <Text fw={600}>Log Applicazione</Text>
          {totalLines > 0 && (
            <Badge size="sm" variant="light">
              {totalLines} righe
            </Badge>
          )}
        </Group>
      }
      position="bottom"
      size="90%"
      styles={{
        inner: { left: 0, right: 0 },
        content: { maxWidth: "100%" },
      }}
    >
      <Stack gap="xs">
        {/* Toolbar */}
        <Group justify="space-between">
          <Text size="xs" c="dimmed" style={{ wordBreak: "break-all" }}>
            {logPath}
          </Text>
          <Group gap="xs">
            <Tooltip label="Aggiorna">
              <ActionIcon
                variant="light"
                onClick={loadLogs}
                loading={loading}
                size="sm"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>

            <CopyButton value={logContent}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Copiato!" : "Copia tutto"}>
                  <ActionIcon
                    variant="light"
                    color={copied ? "teal" : "gray"}
                    onClick={copy}
                    size="sm"
                  >
                    {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>

            <Tooltip label="Apri cartella">
              <ActionIcon
                variant="light"
                onClick={handleOpenLocation}
                size="sm"
              >
                <IconFolderOpen size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label="Cancella log">
              <ActionIcon
                variant="light"
                color="red"
                onClick={handleClearLogs}
                size="sm"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Log content */}
        {error ? (
          <Text c="red" size="sm">
            Errore: {error}
          </Text>
        ) : (
          <ScrollArea h="calc(95vh - 120px)" type="auto" offsetScrollbars>
            <Code
              block
              style={{
                fontSize: "11px",
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {logContent || "Nessun log disponibile"}
            </Code>
          </ScrollArea>
        )}
      </Stack>
    </Drawer>
  );
}
