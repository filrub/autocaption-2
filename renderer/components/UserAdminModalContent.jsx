import {
  TextInput,
  Table,
  Group,
  Text,
  Badge,
  ActionIcon,
  Avatar,
  Stack,
  Select,
  Loader,
  Center,
  ScrollArea,
  Divider,
  Paper,
  CloseButton,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconSearch,
  IconTrash,
  IconPlus,
  IconX,
  IconUsers,
} from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { notifications } from "@mantine/notifications";

export default function UserAdminModalContent({
  supabase,
  onClose,
  onUsersChanged,
}) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGroup, setFilterGroup] = useState(null);
  const [newGroupInputs, setNewGroupInputs] = useState({});

  // Load users and groups on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users with groups
      const { data: usersData, error: usersError } = await supabase.rpc(
        "get_users_with_groups"
      );
      if (usersError) throw usersError;

      // Add embedding count to each user
      const usersWithCount = usersData.map((user) => ({
        ...user,
        embeddingCount: user.descriptor
          ? Array.isArray(user.descriptor)
            ? user.descriptor.length
            : 0
          : 0,
      }));

      setUsers(usersWithCount);

      // Load all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("name")
        .order("name");
      if (groupsError) throw groupsError;

      setGroups(groupsData.map((g) => g.name));
    } catch (error) {
      console.error("Error loading data:", error);
      notifications.show({
        title: "Errore",
        message: "Impossibile caricare i dati",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search and group
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGroup =
        !filterGroup || (user.groups && user.groups.includes(filterGroup));
      return matchesSearch && matchesGroup;
    });
  }, [users, searchQuery, filterGroup]);

  // Add user to group
  const handleAddGroup = async (userId, groupName) => {
    if (!groupName || !groupName.trim()) return;

    try {
      const { error } = await supabase.rpc("add_user_to_group", {
        p_user_id: userId,
        p_group_name: groupName.trim(),
      });
      if (error) throw error;

      // Clear input
      setNewGroupInputs((prev) => ({ ...prev, [userId]: "" }));

      // Reload data
      await loadData();
      onUsersChanged?.();

      notifications.show({
        title: "Successo",
        message: `Gruppo "${groupName.toUpperCase()}" aggiunto`,
        color: "green",
      });
    } catch (error) {
      console.error("Error adding group:", error);
      notifications.show({
        title: "Errore",
        message: error.message,
        color: "red",
      });
    }
  };

  // Remove user from group
  const handleRemoveGroup = async (userId, groupName) => {
    try {
      const { error } = await supabase.rpc("remove_user_from_group", {
        p_user_id: userId,
        p_group_name: groupName,
      });
      if (error) throw error;

      await loadData();
      onUsersChanged?.();

      notifications.show({
        title: "Successo",
        message: `Gruppo "${groupName}" rimosso`,
        color: "green",
      });
    } catch (error) {
      console.error("Error removing group:", error);
      notifications.show({
        title: "Errore",
        message: error.message,
        color: "red",
      });
    }
  };

  // Delete user completely
  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Sei sicuro di voler eliminare "${userName}"?`)) return;

    try {
      const { error } = await supabase
        .from("recognized_faces")
        .delete()
        .eq("id", userId);
      if (error) throw error;

      await loadData();
      onUsersChanged?.();

      notifications.show({
        title: "Successo",
        message: `"${userName}" eliminato`,
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      notifications.show({
        title: "Errore",
        message: error.message,
        color: "red",
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <Paper
        shadow="xl"
        radius="md"
        p="lg"
        style={{
          width: "90%",
          maxWidth: "900px",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconUsers size={24} />
            <Title order={3}>Gestione Utenti</Title>
          </Group>
          <CloseButton onClick={onClose} size="lg" />
        </Group>

        <Stack gap="md" style={{ flex: 1, overflow: "hidden" }}>
          {/* Search and Filter */}
          <Group grow>
            <TextInput
              placeholder="Cerca per nome..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              placeholder="Filtra per gruppo"
              data={groups}
              value={filterGroup}
              onChange={setFilterGroup}
              clearable
              searchable
            />
          </Group>

          <Divider />

          {/* Users Table */}
          {loading ? (
            <Center h={300}>
              <Loader size="lg" />
            </Center>
          ) : filteredUsers.length === 0 ? (
            <Center h={300}>
              <Text c="dimmed">Nessun utente trovato</Text>
            </Center>
          ) : (
            <ScrollArea style={{ flex: 1 }} h={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Foto</Table.Th>
                    <Table.Th>Nome</Table.Th>
                    <Table.Th>Gruppi</Table.Th>
                    <Table.Th>Volti</Table.Th>
                    <Table.Th>Data</Table.Th>
                    <Table.Th>Azioni</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredUsers.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>
                        <Avatar
                          src={user.thumbnail_url}
                          alt={user.name}
                          size="md"
                          radius="sm"
                        >
                          {user.name?.charAt(0)}
                        </Avatar>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{user.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="wrap">
                          {user.groups?.map((group) => (
                            <Badge
                              key={group}
                              variant="light"
                              rightSection={
                                <ActionIcon
                                  size="xs"
                                  variant="transparent"
                                  onClick={() =>
                                    handleRemoveGroup(user.id, group)
                                  }
                                >
                                  <IconX size={12} />
                                </ActionIcon>
                              }
                            >
                              {group}
                            </Badge>
                          ))}
                          <Group gap={4}>
                            <TextInput
                              placeholder="+ gruppo"
                              size="xs"
                              w={90}
                              value={newGroupInputs[user.id] || ""}
                              onChange={(e) =>
                                setNewGroupInputs((prev) => ({
                                  ...prev,
                                  [user.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  newGroupInputs[user.id]?.trim()
                                ) {
                                  handleAddGroup(
                                    user.id,
                                    newGroupInputs[user.id]
                                  );
                                }
                              }}
                            />
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="blue"
                              disabled={!newGroupInputs[user.id]?.trim()}
                              onClick={() =>
                                handleAddGroup(user.id, newGroupInputs[user.id])
                              }
                            >
                              <IconPlus size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="outline" color="blue">
                          {user.embeddingCount}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {formatDate(user.created_at)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="Elimina utente">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}

          {/* Stats */}
          <Divider />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              {filteredUsers.length} utenti{" "}
              {filterGroup && `nel gruppo "${filterGroup}"`}
            </Text>
            <Text size="sm" c="dimmed">
              {groups.length} gruppi totali
            </Text>
          </Group>
        </Stack>
      </Paper>
    </div>,
    document.body
  );
}
