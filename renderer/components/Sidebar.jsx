import {
  Stack,
  Group,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Text,
  Slider,
  Progress,
  Box,
  Divider,
  Button,
  Badge,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconRefresh,
  IconDeviceFloppy,
  IconFolderOpen,
  IconUsers,
  IconCloudUpload,
  IconCloud,
} from "@tabler/icons-react";
import RecognitionMonitor from "./RecognitionMonitor";

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Mai";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s fa`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m fa`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h fa`;
  return `${Math.floor(seconds / 86400)}g fa`;
}

export default function Sidebar({
  users,
  groups,
  targetFolder,
  onSelectFolder,
  onStartRecognition,
  onRefreshNames,
  onSaveCaptions,
  onOpenUserAdmin,
  onSync,
  pendingChanges = 0,
  lastSyncTime = null,
  syncingUsers = false,
  insightFaceServer,
  onServerChange,
  servers,
  similarityThreshold,
  onSimilarityChange,
  faceSizeThreshold,
  onFaceSizeChange,
  borderMargin,
  onBorderMarginChange,
  maxNumberOfFaces,
  onMaxFacesChange,
  filterGroup,
  onFilterGroupChange,
  stats,
  disabled = false,
  isLoadingImages = false,
}) {
  const isReady = !disabled && users.length > 0 && targetFolder;
  const canStart = !disabled && users.length > 0 && !isLoadingImages;

  return (
    <Stack gap="md">
      <Group gap="xs" grow>
        <Tooltip
          label={
            !users.length
              ? "Caricamento utenti..."
              : isLoadingImages
                ? "Caricamento in corso..."
                : !targetFolder
                  ? "Seleziona cartella e avvia"
                  : "Ricarica foto e avvia riconoscimento"
          }
          multiline
          w={220}
        >
          <ActionIcon
            size="xl"
            variant="filled"
            color="blue"
            disabled={!canStart}
            onClick={onStartRecognition}
            aria-label="Seleziona cartella, carica foto e avvia riconoscimento"
            loading={isLoadingImages}
          >
            <IconPlayerPlay size={24} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Aggiorna nomi">
          <ActionIcon
            size="xl"
            variant="filled"
            color="yellow"
            disabled={!isReady}
            onClick={onRefreshNames}
            aria-label="Aggiorna nomi delle persone"
          >
            <IconRefresh size={24} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Salva didascalie">
          <ActionIcon
            size="xl"
            variant="filled"
            color="green"
            disabled={!isReady}
            onClick={onSaveCaptions}
            aria-label="Salva didascalie nelle foto"
          >
            <IconDeviceFloppy size={24} />
          </ActionIcon>
        </Tooltip>

        <Tooltip label="Gestione utenti">
          <ActionIcon
            size="xl"
            variant="filled"
            color="violet"
            onClick={onOpenUserAdmin}
            aria-label="Gestione utenti"
          >
            <IconUsers size={24} />
          </ActionIcon>
        </Tooltip>

        <Tooltip
          label={
            syncingUsers
              ? "Sincronizzazione in corso..."
              : pendingChanges > 0
                ? `Sincronizza ${pendingChanges} modifiche`
                : `Sincronizza con cloud`
          }
        >
          <ActionIcon
            size="xl"
            variant={pendingChanges > 0 ? "filled" : "light"}
            color={pendingChanges > 0 ? "orange" : "blue"}
            onClick={onSync}
            loading={syncingUsers}
            disabled={syncingUsers}
            aria-label="Sincronizza con cloud"
          >
            {pendingChanges > 0 ? (
              <IconCloudUpload size={24} />
            ) : (
              <IconCloud size={24} />
            )}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Sync status */}
      <Group justify="space-between" px="xs">
        <Text size="xs" c="dimmed">
          {pendingChanges > 0 ? (
            <Badge color="orange" variant="light" size="sm">
              {pendingChanges} modifiche locali
            </Badge>
          ) : (
            `Ultimo sync: ${formatTimeAgo(lastSyncTime)}`
          )}
        </Text>
        <Text size="xs" c="dimmed">
          {users.length} utenti
        </Text>
      </Group>

      <Divider />

      <Box>
        <Group gap="xs" mb="xs">
          <Text size="sm" fw={500}>
            Stato servizio
          </Text>
          <RecognitionMonitor />
        </Group>

        <TextInput
          label="Cartella di lavoro"
          value={targetFolder || "Nessuna cartella selezionata"}
          readOnly
          onClick={onSelectFolder}
          rightSection={
            <ActionIcon variant="subtle" onClick={onSelectFolder}>
              <IconFolderOpen size={18} />
            </ActionIcon>
          }
          styles={{ input: { cursor: "pointer" } }}
        />
      </Box>

      <Select
        label="Server di riconoscimento"
        data={servers}
        value={insightFaceServer}
        onChange={onServerChange}
      />

      <Select
        label="Filtra per gruppo"
        placeholder="Tutti i gruppi"
        data={[
          { value: "__no_group__", label: "🚫 Senza gruppo" },
          ...groups.map((g) => ({ value: g, label: g })),
        ]}
        value={filterGroup}
        onChange={onFilterGroupChange}
        clearable
        searchable
      />

      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            Soglia similarità
          </Text>
          <Text size="sm" c="dimmed">
            {similarityThreshold}%
          </Text>
        </Group>
        <Slider
          value={similarityThreshold}
          onChange={onSimilarityChange}
          min={10}
          max={100}
          step={5}
          marks={[
            { value: 25, label: "25%" },
            { value: 50, label: "50%" },
            { value: 75, label: "75%" },
          ]}
        />
      </Box>

      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            Dimensione minima volto
          </Text>
          <Text size="sm" c="dimmed">
            {faceSizeThreshold}%
          </Text>
        </Group>
        <Slider
          value={faceSizeThreshold}
          onChange={onFaceSizeChange}
          min={1}
          max={90}
          step={10}
          marks={[
            { value: 20, label: "20%" },
            { value: 50, label: "50%" },
            { value: 80, label: "80%" },
          ]}
        />
      </Box>

      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            Margine bordo foto
          </Text>
          <Text size="sm" c="dimmed">
            {borderMargin}%
          </Text>
        </Group>
        <Slider
          value={borderMargin}
          onChange={onBorderMarginChange}
          min={0}
          max={20}
          step={1}
          marks={[
            { value: 0, label: "0%" },
            { value: 10, label: "10%" },
            { value: 20, label: "20%" },
          ]}
        />
      </Box>

      <Box>
        <Group justify="space-between" mb="xs">
          <Text size="sm" fw={500}>
            Max numero volti
          </Text>
          <Text size="sm" c="dimmed">
            {maxNumberOfFaces}
          </Text>
        </Group>
        <Slider
          value={maxNumberOfFaces}
          onChange={onMaxFacesChange}
          min={1}
          max={30}
          step={1}
          marks={[
            { value: 5, label: "5" },
            { value: 15, label: "15" },
            { value: 25, label: "25" },
          ]}
        />
      </Box>

      <Divider />

      <Box>
        <Text size="sm" fw={500} mb="xs">
          Progresso indicizzazione
        </Text>
        <Progress.Root size="xl">
          <Progress.Section value={stats.indexedPercent} color="blue">
            <Progress.Label>
              {stats.indexed}/{stats.total}
            </Progress.Label>
          </Progress.Section>
        </Progress.Root>

        <Text size="sm" fw={500} mb="xs" mt="md">
          Progresso riconoscimento
        </Text>
        <Progress.Root size="xl">
          <Progress.Section value={stats.recognizedPercent} color="green">
            <Progress.Label>
              {stats.recognized}/{stats.total}
            </Progress.Label>
          </Progress.Section>
        </Progress.Root>
      </Box>
    </Stack>
  );
}
