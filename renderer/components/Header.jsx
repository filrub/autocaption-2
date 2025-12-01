import { Text, Group, Loader, Tooltip, ActionIcon, Badge } from "@mantine/core";
import {
  IconBolt,
  IconCloudUpload,
  IconCloud,
  IconCloudOff,
} from "@tabler/icons-react";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Mai";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s fa`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
  return `${Math.floor(seconds / 86400)}g fa`;
}

export default function Header({
  syncingUsers = false,
  pendingChanges = 0,
  lastSyncTime = null,
  onSync = () => {},
}) {
  return (
    <Group gap="md" p="0.2rem" px="1rem" justify="space-between" h="100%">
      {/* Sync status and button */}
      <Group gap="xs">
        <Tooltip
          label={
            syncingUsers
              ? "Sincronizzazione in corso..."
              : pendingChanges > 0
                ? `${pendingChanges} modifiche da sincronizzare`
                : `Ultimo sync: ${formatTimeAgo(lastSyncTime)}`
          }
        >
          <ActionIcon
            variant={pendingChanges > 0 ? "filled" : "light"}
            color={pendingChanges > 0 ? "orange" : "blue"}
            size="lg"
            onClick={onSync}
            loading={syncingUsers}
            disabled={syncingUsers}
          >
            {pendingChanges > 0 ? (
              <IconCloudUpload size={20} />
            ) : (
              <IconCloud size={20} />
            )}
          </ActionIcon>
        </Tooltip>

        {pendingChanges > 0 && !syncingUsers && (
          <Badge color="orange" variant="light" size="sm">
            {pendingChanges} modifiche
          </Badge>
        )}

        {!syncingUsers && lastSyncTime && pendingChanges === 0 && (
          <Text size="xs" c="dimmed">
            Sync: {formatTimeAgo(lastSyncTime)}
          </Text>
        )}
      </Group>

      {/* Logo */}
      <Group gap={0}>
        <IconBolt />
        <Text
          fw={900}
          component="h1"
          mt="0.2rem"
          size="1.3rem"
          style={{
            fontStyle: "italic",
            letterSpacing: "0.05em",
            transform: "skewX(-8deg)",
          }}
        >
          AutoCAPTION
        </Text>
      </Group>
    </Group>
  );
}
