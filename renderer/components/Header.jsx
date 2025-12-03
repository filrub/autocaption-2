import {
  Text,
  Group,
  Loader,
  Tooltip,
  ActionIcon,
  Badge,
  Menu,
  Avatar,
  UnstyledButton,
} from "@mantine/core";
import {
  IconBolt,
  IconCloudUpload,
  IconCloud,
  IconCloudOff,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Mai";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s fa`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
  return `${Math.floor(seconds / 86400)}g fa`;
}

function getInitials(email) {
  if (!email) return "?";
  const parts = email.split("@")[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export default function Header({
  syncingUsers = false,
  pendingChanges = 0,
  lastSyncTime = null,
  onSync = () => {},
  user = null,
  onLogout = () => {},
}) {
  return (
    <Group gap="md" p="0.2rem" px="1rem" justify="space-between" h="100%">
      {/* Left: Sync status and button */}
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

      {/* Center: Logo */}
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

      {/* Right: User menu */}
      <Menu shadow="md" width={200} position="bottom-end">
        <Menu.Target>
          <UnstyledButton>
            <Group gap="xs">
              <Avatar size="sm" radius="xl" color="blue">
                {getInitials(user?.email)}
              </Avatar>
              <Text size="sm" c="dimmed" visibleFrom="sm">
                {user?.email?.split("@")[0]}
              </Text>
            </Group>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Label>Account</Menu.Label>
          <Menu.Item leftSection={<IconUser size={14} />} disabled>
            {user?.email}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            leftSection={<IconLogout size={14} />}
            color="red"
            onClick={onLogout}
          >
            Esci
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
