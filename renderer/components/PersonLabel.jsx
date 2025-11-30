import {
  Stack,
  Group,
  TextInput,
  ActionIcon,
  Text,
  Badge,
  Tooltip,
} from "@mantine/core";
import { useState } from "react";
import {
  IconDeviceFloppy,
  IconTrash,
  IconCheck,
  IconX,
  IconUser,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

export default function PersonLabel({
  person,
  photoIndex,
  faceIndex,
  similarityThreshold,
  faceSizeThreshold,
  borderMargin = 0,
  photoRatio = 1,
  maxNumberOfFaces,
  maxFaceHeight,
  users,
  onUpdate,
  onUserEnrolled,
  supabase,
}) {
  const [name, setName] = useState(
    person.distance > similarityThreshold ? person.name : ""
  );
  const [saving, setSaving] = useState(false);

  const isSimilarityValid = person.distance >= similarityThreshold;
  const faceHeightPercent = Math.round((person.height / maxFaceHeight) * 100);
  const isSizeValid = faceHeightPercent >= faceSizeThreshold;
  const isInRange = faceIndex < maxNumberOfFaces;

  // Calculate margin fractions based on smaller dimension for equal pixel distance
  const isLandscape = photoRatio > 1;
  const marginFractionX = isLandscape
    ? borderMargin / 100 / photoRatio
    : borderMargin / 100;
  const marginFractionY = isLandscape
    ? borderMargin / 100
    : (borderMargin / 100) * photoRatio;

  const faceLeft = person.x;
  const faceRight = person.x + person.width;
  const faceTop = person.y;
  const faceBottom = person.y + person.height;
  const isWithinBorder =
    borderMargin === 0 ||
    (faceLeft >= marginFractionX &&
      faceRight <= 1 - marginFractionX &&
      faceTop >= marginFractionY &&
      faceBottom <= 1 - marginFractionY);

  const canSave = name.trim().length > 0 && person.distance < 98;
  const handleEnroll = async () => {
    if (!navigator.onLine) {
      notifications.show({
        title: "Errore",
        message: "Nessuna connessione internet",
        color: "red",
      });
      return;
    }

    setSaving(true);
    try {
      console.log("=== ENROLL DEBUG ===");
      console.log("person.descriptor:", person.descriptor);
      console.log("person.descriptor type:", typeof person.descriptor);
      console.log("person.descriptor[0]:", person.descriptor[0]);
      console.log(
        "Is person.descriptor[0] an array?",
        Array.isArray(person.descriptor[0])
      );

      const embedding = Array.isArray(person.descriptor[0])
        ? [Array.from(person.descriptor[0])]
        : [Array.from(person.descriptor)];

      console.log("Final embedding:", embedding);
      console.log(
        "Embedding structure:",
        embedding.length,
        "arrays, first array length:",
        embedding[0]?.length
      );

      const { error } = await supabase.rpc("add_face_descriptor", {
        p_name: name.trim().toUpperCase(),
        p_descriptor: embedding,
      });

      if (error) throw error;

      // Create new user object for recognition update
      const enrolledName = name.trim().toUpperCase();
      const existingUser = users.find((u) => u.name === enrolledName);

      const newUser = {
        name: enrolledName,
        descriptor: existingUser
          ? [...existingUser.descriptor, embedding[0]] // Append to existing
          : embedding, // New user
      };

      notifications.show({
        title: "Successo",
        message: `${name} aggiunto al database`,
        color: "green",
        icon: <IconCheck size={18} />,
      });

      // Trigger re-recognition on all photos (including current one)
      // Don't call onUpdate here - handleUserEnrolled handles everything
      onUserEnrolled?.(newUser);
    } catch (error) {
      console.error("Enroll error:", error);
      notifications.show({
        title: "Errore",
        message: error.message,
        color: "red",
        icon: <IconX size={18} />,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const newDescriptor = [...person.match.descriptor];
      newDescriptor.splice(person.descriptorIndex, 1);

      const { error } = await supabase
        .from("recognized_faces")
        .update({ descriptor: newDescriptor })
        .eq("name", name);

      if (error) throw error;

      notifications.show({
        title: "Successo",
        message: "Volto rimosso dal database",
        color: "green",
      });

      onUpdate?.({ descriptor: newDescriptor });
    } catch (error) {
      notifications.show({
        title: "Errore",
        message: error.message,
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Badge
          leftSection={<IconUser size={14} />}
          variant="light"
          color={isSimilarityValid ? "green" : "red"}
        >
          {person.embeddings} volti nel DB
        </Badge>

        <Tooltip label="Rimuovi questo volto">
          <ActionIcon
            color="red"
            variant="light"
            size="sm"
            onClick={handleDelete}
            loading={saving}
            aria-label="Elimina volto"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Stack gap="xs">
        <Group gap="xs">
          {isSimilarityValid ? (
            <IconCheck size={16} color="green" />
          ) : (
            <IconX size={16} color="red" />
          )}
          <Text size="xs" c={isSimilarityValid ? "green" : "red"}>
            Similarità: {person.distance}% (min {similarityThreshold}%)
          </Text>
        </Group>

        <Group gap="xs">
          {isSizeValid ? (
            <IconCheck size={16} color="green" />
          ) : (
            <IconX size={16} color="red" />
          )}
          <Text size="xs" c={isSizeValid ? "green" : "red"}>
            Dimensione: {faceHeightPercent}% del volto più grande
          </Text>
        </Group>

        {!isInRange && (
          <Group gap="xs">
            <IconX size={16} color="orange" />
            <Text size="xs" c="orange">
              Oltre il limite (max {maxNumberOfFaces} volti)
            </Text>
          </Group>
        )}

        {!isWithinBorder && (
          <Group gap="xs">
            <IconX size={16} color="orange" />
            <Text size="xs" c="orange">
              Fuori dal margine bordo ({borderMargin}%)
            </Text>
          </Group>
        )}
      </Stack>

      <TextInput
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase())}
        placeholder="NOME COGNOME"
        rightSection={
          <ActionIcon
            variant="filled"
            color="green"
            disabled={!canSave}
            loading={saving}
            onClick={handleEnroll}
            aria-label="Salva nel database"
          >
            <IconDeviceFloppy size={18} />
          </ActionIcon>
        }
        styles={{
          input: {
            fontWeight: 500,
            textTransform: "uppercase",
          },
        }}
      />
    </Stack>
  );
}
