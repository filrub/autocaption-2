import { Paper, Text, Group, RingProgress, Stack, Badge } from '@mantine/core'
import { IconPhoto, IconUser, IconCheck } from '@tabler/icons-react'

export default function Stats({ stats }) {
  const { total = 0, indexed = 0, captioned = 0 } = stats

  const indexedPercent = total > 0 ? Math.round((indexed / total) * 100) : 0
  const captionedPercent = total > 0 ? Math.round((captioned / total) * 100) : 0

  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Stack gap="md">
        <Text size="sm" fw={600} c="dimmed">
          Statistiche Progetto
        </Text>

        <Group justify="space-between">
          <Group gap="xs">
            <IconPhoto size={20} />
            <div>
              <Text size="xs" c="dimmed">Totale Foto</Text>
              <Text size="lg" fw={600}>{total}</Text>
            </div>
          </Group>

          <Group gap="xs">
            <IconUser size={20} color="var(--mantine-color-blue-6)" />
            <div>
              <Text size="xs" c="dimmed">Riconosciute</Text>
              <Text size="lg" fw={600} c="blue">{indexed}</Text>
            </div>
          </Group>

          <Group gap="xs">
            <IconCheck size={20} color="var(--mantine-color-green-6)" />
            <div>
              <Text size="xs" c="dimmed">Con Caption</Text>
              <Text size="lg" fw={600} c="green">{captioned}</Text>
            </div>
          </Group>
        </Group>

        <Group justify="center" gap="xl">
          <RingProgress
            size={80}
            thickness={8}
            sections={[
              { value: indexedPercent, color: 'blue' }
            ]}
            label={
              <Text size="xs" ta="center" fw={700}>
                {indexedPercent}%
              </Text>
            }
          />
          
          <RingProgress
            size={80}
            thickness={8}
            sections={[
              { value: captionedPercent, color: 'green' }
            ]}
            label={
              <Text size="xs" ta="center" fw={700}>
                {captionedPercent}%
              </Text>
            }
          />
        </Group>

        <Group gap="xs" justify="center">
          <Badge size="sm" variant="light" color="blue">
            Riconoscimento
          </Badge>
          <Badge size="sm" variant="light" color="green">
            Caption
          </Badge>
        </Group>
      </Stack>
    </Paper>
  )
}
