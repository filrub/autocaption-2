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
  Button,
  TagsInput,
} from "@mantine/core";
import { IconSearch, IconTrash, IconUsers } from "@tabler/icons-react";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { notifications } from "@mantine/notifications";
import {
  getAllUsers,
  getAllGroups,
  addUserToGroup,
  removeUserFromGroup,
  deleteUser,
} from "../utils/localDatabase";

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

  // Modal states
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });

  // Load users and groups on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users from local database
      const usersData = await getAllUsers();

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

      // Load all groups from local database
      const groupsData = await getAllGroups();
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
      await addUserToGroup(userId, groupName.trim());

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
      await removeUserFromGroup(userId, groupName);

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
    setDeleteModal({ open: true, user: { id: userId, name: userName } });
  };

  const confirmDeleteUser = async () => {
    if (!deleteModal.user) return;

    try {
      await deleteUser(deleteModal.user.id);

      await loadData();
      onUsersChanged?.();

      notifications.show({
        title: "Successo",
        message: `"${deleteModal.user.name}" eliminato`,
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      notifications.show({
        title: "Errore",
        message: error.message,
        color: "red",
      });
    } finally {
      setDeleteModal({ open: false, user: null });
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
      {/* Delete Confirmation Dialog */}
      {deleteModal.open && (
        <Paper
          shadow="xl"
          radius="md"
          p="lg"
          style={{
            position: "absolute",
            zIndex: 100001,
            minWidth: 300,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Stack>
            <Title order={4}>Conferma Eliminazione</Title>
            <Text>
              Sei sicuro di voler eliminare "{deleteModal.user?.name}"?
            </Text>
            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => setDeleteModal({ open: false, user: null })}
              >
                Annulla
              </Button>
              <Button color="red" onClick={confirmDeleteUser}>
                Elimina
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

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
            <Title order={3}>Gestione Personaggi</Title>
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
              comboboxProps={{ zIndex: 999999, withinPortal: true }}
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
              <Text c="dimmed">Nessun personaggio trovato</Text>
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
                        <TagsInput
                          size="xs"
                          placeholder="+ gruppo"
                          value={user.groups || []}
                          data={groups}
                          onChange={async (newGroups) => {
                            const currentGroups = user.groups || [];
                            const added = newGroups.filter(
                              (g) => !currentGroups.includes(g)
                            );
                            const removed = currentGroups.filter(
                              (g) => !newGroups.includes(g)
                            );

                            // Update local state immediately
                            setUsers((prev) =>
                              prev.map((u) =>
                                u.id === user.id
                                  ? { ...u, groups: newGroups }
                                  : u
                              )
                            );

                            // Sync to database
                            for (const g of added) {
                              await addUserToGroup(user.id, g);
                            }
                            for (const g of removed) {
                              await removeUserFromGroup(user.id, g);
                            }

                            // Update groups list if new group was created
                            if (added.some((g) => !groups.includes(g))) {
                              const groupsData = await getAllGroups();
                              setGroups(groupsData.map((g) => g.name));
                            }

                            onUsersChanged?.();
                          }}
                          comboboxProps={{ zIndex: 999999, withinPortal: true }}
                          style={{ minWidth: 200 }}
                        />
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
                        <Tooltip label="Elimina personaggio">
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
              {filteredUsers.length} personaggi{" "}
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
