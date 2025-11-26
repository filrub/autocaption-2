import { Stack, Group, TextInput, ActionIcon, Text, Badge, Tooltip } from '@mantine/core'
import { useState } from 'react'
import { IconDeviceFloppy, IconTrash, IconCheck, IconX, IconUser } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'

export default function PersonLabel({
  person,
  photoIndex,
  faceIndex,
  similarityThreshold,
  faceSizeThreshold,
  maxNumberOfFaces,
  maxFaceHeight,
  users,
  onUpdate,
  supabase
}) {
  const [name, setName] = useState(
    person.distance > similarityThreshold ? person.name : ''
  )
  const [saving, setSaving] = useState(false)

  const isSimilarityValid = person.distance >= similarityThreshold
  const faceHeightPercent = Math.round((person.height / maxFaceHeight) * 100)
  const isSizeValid = faceHeightPercent >= faceSizeThreshold
  const isInRange = faceIndex < maxNumberOfFaces

  const canSave = name.trim().length > 0 && person.distance < 98

  const handleEnroll = async () => {
    if (!navigator.onLine) {
      notifications.show({
        title: 'Errore',
        message: 'Nessuna connessione internet',
        color: 'red'
      })
      return
    }

    setSaving(true)
    try {
      const embedding = Array.from(person.descriptor)
      const { error } = await supabase.rpc('add_face_descriptor', {
        p_name: name.trim().toUpperCase(),
        p_descriptor: embedding
      })

      if (error) throw error

      notifications.show({
        title: 'Successo',
        message: `${name} aggiunto al database`,
        color: 'green',
        icon: <IconCheck size={18} />
      })

      onUpdate?.({ name: name.trim().toUpperCase() })
    } catch (error) {
      notifications.show({
        title: 'Errore',
        message: error.message,
        color: 'red',
        icon: <IconX size={18} />
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const newDescriptor = [...person.match.descriptor]
      newDescriptor.splice(person.descriptorIndex, 1)

      const { error } = await supabase
        .from('recognized_faces')
        .update({ descriptor: newDescriptor })
        .eq('name', name)

      if (error) throw error

      notifications.show({
        title: 'Successo',
        message: 'Volto rimosso dal database',
        color: 'green'
      })

      onUpdate?.({ descriptor: newDescriptor })
    } catch (error) {
      notifications.show({
        title: 'Errore',
        message: error.message,
        color: 'red'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Badge 
          leftSection={<IconUser size={14} />}
          variant="light"
          color={isSimilarityValid ? 'green' : 'red'}
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
          {isSimilarityValid ? <IconCheck size={16} color="green" /> : <IconX size={16} color="red" />}
          <Text size="xs" c={isSimilarityValid ? 'green' : 'red'}>
            Similarità: {person.distance}% (min {similarityThreshold}%)
          </Text>
        </Group>

        <Group gap="xs">
          {isSizeValid ? <IconCheck size={16} color="green" /> : <IconX size={16} color="red" />}
          <Text size="xs" c={isSizeValid ? 'green' : 'red'}>
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
            textTransform: 'uppercase'
          }
        }}
      />
    </Stack>
  )
}
