import {
  Box,
  Image,
  HoverCard,
  Switch,
  Textarea,
  Text,
  Stack,
} from "@mantine/core";
import { memo, useMemo } from "react";
import PersonLabel from "./PersonLabel";
import { createCaption } from "../createCaption";

const FaceOverlay = memo(function FaceOverlay({
  face,
  faceIndex,
  photoIndex,
  photoWidth,
  photoHeight,
  photoRatio,
  photoData,
  maxFaces,
  similarityThreshold,
  faceSizeThreshold,
  borderMargin,
  maxFaceHeight,
  users,
  allUsers,
  filterGroup,
  onUpdate,
  onUserEnrolled,
  supabase,
}) {
  // Calculate margin fractions based on smaller dimension for equal pixel distance
  const smallerDim = Math.min(photoWidth, photoHeight);
  const marginFractionX = (smallerDim * (borderMargin / 100)) / photoWidth;
  const marginFractionY = (smallerDim * (borderMargin / 100)) / photoHeight;

  const faceLeft = face.x;
  const faceRight = face.x + face.width;
  const faceTop = face.y;
  const faceBottom = face.y + face.height;
  const isWithinBorder =
    borderMargin === 0 ||
    (faceLeft >= marginFractionX &&
      faceRight <= 1 - marginFractionX &&
      faceTop >= marginFractionY &&
      faceBottom <= 1 - marginFractionY);

  // Check if face is filtered by group
  let isInFilterGroup = true;
  if (filterGroup && face?.name) {
    // Always look up fresh user data for groups (allUsers has latest from DB)
    const matchedUser =
      allUsers?.find((u) => u.name === face.name) || face.match;
    const userGroups = matchedUser?.groups || [];

    if (filterGroup === "__no_group__") {
      isInFilterGroup = userGroups.length === 0;
    } else {
      // Case-insensitive comparison
      const filterUpper = filterGroup.toUpperCase();
      isInFilterGroup = userGroups.some((g) => g.toUpperCase() === filterUpper);
    }
  }

  const isValidFace =
    face.distance > similarityThreshold &&
    face.height > maxFaceHeight / (100 / faceSizeThreshold) &&
    faceIndex < maxFaces &&
    isWithinBorder &&
    isInFilterGroup;

  const style = {
    position: "absolute",
    left: face.x * photoWidth,
    top: face.y * photoHeight,
    width: face.width * photoWidth,
    height: face.height * photoHeight,
    backgroundColor: isValidFace
      ? "rgba(34, 139, 34, 0.3)"
      : "rgba(220, 38, 38, 0.3)",
    border: `2px solid ${isValidFace ? "#22c55e" : "#ef4444"}`,
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  };

  return (
    <HoverCard width={280} shadow="md" withArrow openDelay={200}>
      <HoverCard.Target>
        <Box style={style} />
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <PersonLabel
          person={face}
          photoIndex={photoIndex}
          faceIndex={faceIndex}
          photoData={photoData}
          similarityThreshold={similarityThreshold}
          faceSizeThreshold={faceSizeThreshold}
          borderMargin={borderMargin}
          photoRatio={photoRatio}
          maxNumberOfFaces={maxFaces}
          maxFaceHeight={maxFaceHeight}
          users={users}
          allUsers={allUsers}
          filterGroup={filterGroup}
          onUpdate={onUpdate}
          onUserEnrolled={onUserEnrolled}
          supabase={supabase}
        />
      </HoverCard.Dropdown>
    </HoverCard>
  );
});

export default memo(function PhotoViewer({
  photo,
  photoIndex,
  displayWidth = 800,
  similarityThreshold,
  faceSizeThreshold,
  borderMargin = 0,
  maxNumberOfFaces,
  users,
  allUsers,
  filterGroup,
  useTitleCase,
  onPhotoUpdate,
  onUserEnrolled,
  supabase,
}) {
  const photoRatio = photo.ratio || 1;
  const isLandscape = photoRatio > 1;

  const dimensions = useMemo(
    () => ({
      width: isLandscape ? displayWidth : displayWidth * photoRatio * 0.66,
      height: isLandscape ? displayWidth / photoRatio : displayWidth * 0.66,
    }),
    [isLandscape, displayWidth, photoRatio]
  );

  const maxFaceHeight = useMemo(
    () => Math.max(...(photo.faces?.map((f) => f.height) || [0])),
    [photo.faces]
  );

  const caption = useMemo(
    () =>
      createCaption({
        persons: photo.faces,
        similarityThreshold,
        isFootballTeam: photo.isFootballTeam,
        maxNumberOfFaces,
        faceSizeThreshold,
        borderMargin,
        photoRatio,
        filterGroup,
        allUsers,
        useTitleCase,
      }),
    [
      photo.faces,
      similarityThreshold,
      photo.isFootballTeam,
      maxNumberOfFaces,
      faceSizeThreshold,
      borderMargin,
      photoRatio,
      filterGroup,
      allUsers,
      useTitleCase,
    ]
  );

  const handleFootballTeamChange = (checked) => {
    onPhotoUpdate(photoIndex, { isFootballTeam: checked });
  };

  return (
    <Stack gap="md" align="center">
      <Box pos="relative" style={{ display: "inline-block" }}>
        <Image
          src={photo.data}
          alt={photo.filename}
          width={dimensions.width}
          height={dimensions.height}
          fit="contain"
          radius="md"
        />

        {/* Blue border margin rectangle */}
        {borderMargin > 0 &&
          (() => {
            // Use smaller dimension to calculate margin so it's equal on all sides
            const marginPixels =
              Math.min(dimensions.width, dimensions.height) *
              (borderMargin / 100);
            return (
              <Box
                style={{
                  position: "absolute",
                  left: marginPixels,
                  top: marginPixels,
                  width: dimensions.width - 2 * marginPixels,
                  height: dimensions.height - 2 * marginPixels,
                  border: "2px dashed #228be6",
                  borderRadius: "4px",
                  pointerEvents: "none",
                  boxSizing: "border-box",
                }}
              />
            );
          })()}

        {photo.faces?.map((face, index) => (
          <FaceOverlay
            key={`face-${index}`}
            face={face}
            faceIndex={index}
            photoIndex={photoIndex}
            photoWidth={dimensions.width}
            photoHeight={dimensions.height}
            photoRatio={photoRatio}
            photoData={photo.data}
            maxFaces={maxNumberOfFaces}
            similarityThreshold={similarityThreshold}
            faceSizeThreshold={faceSizeThreshold}
            borderMargin={borderMargin}
            maxFaceHeight={maxFaceHeight}
            users={users}
            allUsers={allUsers}
            filterGroup={filterGroup}
            onUpdate={(updates) => {
              const newFaces = [...photo.faces];
              newFaces[index] = { ...newFaces[index], ...updates };
              onPhotoUpdate(photoIndex, { faces: newFaces });
            }}
            onUserEnrolled={onUserEnrolled}
            supabase={supabase}
          />
        ))}
      </Box>

      <Box w="100%" maw={dimensions.width}>
        <Switch
          label="Foto squadra calcio"
          checked={photo.isFootballTeam || false}
          onChange={(e) => handleFootballTeamChange(e.currentTarget.checked)}
          mb="sm"
        />

        <Textarea
          label="Didascalia generata"
          value={caption}
          readOnly
          minRows={2}
          maxRows={4}
          styles={{ input: { backgroundColor: "var(--mantine-color-gray-0)" } }}
        />

        <Text size="xs" c="dimmed" mt="xs">
          {photo.faces?.length || 0} volti rilevati • {photo.filename}
        </Text>
      </Box>
    </Stack>
  );
});
