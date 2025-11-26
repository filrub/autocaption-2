import { Box, Image, HoverCard, Switch, Textarea, Text, Stack } from '@mantine/core'
import { memo, useMemo } from 'react'
import PersonLabel from './PersonLabel'
import { createCaption } from '../createCaption'

const FaceOverlay = memo(function FaceOverlay({
  face,
  faceIndex,
  photoIndex,
  photoWidth,
  photoHeight,
  photoRatio,
  maxFaces,
  similarityThreshold,
  faceSizeThreshold,
  maxFaceHeight,
  users,
  onUpdate,
  supabase
}) {
  const isValidFace = face.distance > similarityThreshold &&
    face.height > maxFaceHeight / (100 / faceSizeThreshold) &&
    faceIndex < maxFaces

  const style = {
    position: 'absolute',
    left: face.x * photoWidth,
    top: face.y * photoHeight,
    width: face.width * photoWidth,
    height: face.height * photoHeight,
    backgroundColor: isValidFace ? 'rgba(34, 139, 34, 0.3)' : 'rgba(220, 38, 38, 0.3)',
    border: `2px solid ${isValidFace ? '#22c55e' : '#ef4444'}`,
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box'
  }

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
          similarityThreshold={similarityThreshold}
          faceSizeThreshold={faceSizeThreshold}
          maxNumberOfFaces={maxFaces}
          maxFaceHeight={maxFaceHeight}
          users={users}
          onUpdate={onUpdate}
          supabase={supabase}
        />
      </HoverCard.Dropdown>
    </HoverCard>
  )
})

export default memo(function PhotoViewer({
  photo,
  photoIndex,
  displayWidth = 800,
  similarityThreshold,
  faceSizeThreshold,
  maxNumberOfFaces,
  users,
  onPhotoUpdate,
  supabase
}) {
  const photoRatio = photo.ratio || 1
  const isLandscape = photoRatio > 1
  
  const dimensions = useMemo(() => ({
    width: isLandscape ? displayWidth : displayWidth * photoRatio * 0.66,
    height: isLandscape ? displayWidth / photoRatio : displayWidth * 0.66
  }), [isLandscape, displayWidth, photoRatio])

  const maxFaceHeight = useMemo(() => 
    Math.max(...(photo.faces?.map(f => f.height) || [0])), 
    [photo.faces]
  )

  const caption = useMemo(() => 
    createCaption({
      persons: photo.faces,
      similarityThreshold,
      isFootballTeam: photo.isFootballTeam,
      maxNumberOfFaces,
      faceSizeThreshold
    }),
    [photo.faces, similarityThreshold, photo.isFootballTeam, maxNumberOfFaces, faceSizeThreshold]
  )

  const handleFootballTeamChange = (checked) => {
    onPhotoUpdate(photoIndex, { isFootballTeam: checked })
  }

  return (
    <Stack gap="md" align="center">
      <Box pos="relative" style={{ display: 'inline-block' }}>
        <Image
          src={photo.data}
          alt={photo.filename}
          width={dimensions.width}
          height={dimensions.height}
          fit="contain"
          radius="md"
        />
        
        {photo.faces?.map((face, index) => (
          <FaceOverlay
            key={`face-${index}`}
            face={face}
            faceIndex={index}
            photoIndex={photoIndex}
            photoWidth={dimensions.width}
            photoHeight={dimensions.height}
            photoRatio={photoRatio}
            maxFaces={maxNumberOfFaces}
            similarityThreshold={similarityThreshold}
            faceSizeThreshold={faceSizeThreshold}
            maxFaceHeight={maxFaceHeight}
            users={users}
            onUpdate={(updates) => {
              const newFaces = [...photo.faces]
              newFaces[index] = { ...newFaces[index], ...updates }
              onPhotoUpdate(photoIndex, { faces: newFaces })
            }}
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
          styles={{ input: { backgroundColor: 'var(--mantine-color-gray-0)' } }}
        />
        
        <Text size="xs" c="dimmed" mt="xs">
          {photo.faces?.length || 0} volti rilevati • {photo.filename}
        </Text>
      </Box>
    </Stack>
  )
})
