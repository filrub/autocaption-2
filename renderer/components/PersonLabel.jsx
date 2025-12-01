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
  photoData,
  similarityThreshold,
  faceSizeThreshold,
  borderMargin = 0,
  photoRatio = 1,
  maxNumberOfFaces,
  maxFaceHeight,
  users,
  allUsers,
  filterGroup,
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

  // Check if face is filtered due to group
  // Always look up fresh user data for groups (allUsers has latest from DB)
  const matchedUser =
    (person.name ? allUsers?.find((u) => u.name === person.name) : null) ||
    person.match;
  const matchedUserGroups = matchedUser?.groups || [];

  // Determine if filtered by group
  let isFilteredByGroup = false;
  if (filterGroup && matchedUser) {
    if (filterGroup === "__no_group__") {
      // For "no group" filter, exclude faces that HAVE groups
      isFilteredByGroup = matchedUserGroups.length > 0;
    } else {
      // For regular group filter, exclude faces not in that group (case-insensitive)
      const filterUpper = filterGroup.toUpperCase();
      isFilteredByGroup = !matchedUserGroups.some(
        (g) => g.toUpperCase() === filterUpper
      );
    }
  }

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

  // Crop face from photo and upload to Supabase storage
  const cropAndUploadThumbnail = async (userName) => {
    if (!photoData) return null;

    try {
      // Create image element to get dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = photoData;
      });

      // Calculate face position in pixels with some padding
      const padding = 0.2; // 20% padding around face
      const faceX = Math.max(
        0,
        (person.x - person.width * padding) * img.width
      );
      const faceY = Math.max(
        0,
        (person.y - person.height * padding) * img.height
      );
      const faceWidth = Math.min(
        img.width - faceX,
        person.width * (1 + padding * 2) * img.width
      );
      const faceHeight = Math.min(
        img.height - faceY,
        person.height * (1 + padding * 2) * img.height
      );

      // Create canvas and crop face
      const canvas = document.createElement("canvas");
      const size = 150; // Thumbnail size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Draw cropped face scaled to thumbnail size
      ctx.drawImage(img, faceX, faceY, faceWidth, faceHeight, 0, 0, size, size);

      // Convert to blob
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );

      // Generate unique filename
      const filename = `${userName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.jpg`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("face-thumbnails")
        .upload(filename, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        console.error("Thumbnail upload error:", error);
        return null;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("face-thumbnails").getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error("Error creating thumbnail:", error);
      return null;
    }
  };

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
      const enrolledName = name.trim().toUpperCase();

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

      // Check if this is a new user (doesn't exist yet)
      const existingUser = users.find((u) => u.name === enrolledName);

      // Upload thumbnail only for new users or users without a thumbnail
      let thumbnailUrl = null;
      if (!existingUser || !existingUser.thumbnail_url) {
        thumbnailUrl = await cropAndUploadThumbnail(enrolledName);
        console.log("Thumbnail uploaded:", thumbnailUrl);
      }

      // Add face descriptor
      const { error } = await supabase.rpc("add_face_descriptor", {
        p_name: enrolledName,
        p_descriptor: embedding,
      });

      if (error) throw error;

      // Update thumbnail if we have one
      if (thumbnailUrl) {
        const { error: updateError } = await supabase
          .from("recognized_faces")
          .update({ thumbnail_url: thumbnailUrl })
          .eq("name", enrolledName);

        if (updateError) {
          console.error("Error updating thumbnail:", updateError);
        }
      }

      // Create new user object for recognition update
      const newUser = {
        name: enrolledName,
        descriptor: existingUser
          ? [...existingUser.descriptor, embedding[0]] // Append to existing
          : embedding, // New user
        thumbnail_url: thumbnailUrl || existingUser?.thumbnail_url,
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
        <Group gap="xs" align="flex-start" wrap="nowrap">
          {isSimilarityValid ? (
            <IconCheck
              size={16}
              color="green"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          ) : (
            <IconX
              size={16}
              color="red"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          )}
          <Text size="xs" c={isSimilarityValid ? "green" : "red"}>
            Similarità: {person.distance}% (min {similarityThreshold}%)
          </Text>
        </Group>

        <Group gap="xs" align="flex-start" wrap="nowrap">
          {isSizeValid ? (
            <IconCheck
              size={16}
              color="green"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          ) : (
            <IconX
              size={16}
              color="red"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
          )}
          <Text size="xs" c={isSizeValid ? "green" : "red"}>
            Dimensione: {faceHeightPercent}% del volto più grande
          </Text>
        </Group>

        {!isInRange && (
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <IconX
              size={16}
              color="orange"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Text size="xs" c="orange">
              Oltre il limite (max {maxNumberOfFaces} volti)
            </Text>
          </Group>
        )}

        {!isWithinBorder && (
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <IconX
              size={16}
              color="orange"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Text size="xs" c="orange">
              Fuori dal margine bordo ({borderMargin}%)
            </Text>
          </Group>
        )}

        {isFilteredByGroup && (
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <IconX
              size={16}
              color="violet"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Text size="xs" c="violet">
              {filterGroup === "__no_group__"
                ? `Filtrato - ha gruppi assegnati (${matchedUserGroups.join(", ")})`
                : `Filtrato - non in gruppo "${filterGroup}"${matchedUserGroups.length > 0 ? ` (è in: ${matchedUserGroups.join(", ")})` : " (nessun gruppo)"}`}
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
