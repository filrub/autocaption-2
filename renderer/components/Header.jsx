import { Text, Group } from '@mantine/core'
import { IconBolt } from '@tabler/icons-react'

export default function Header() {
  return (
    <Group gap={0} p="0.2rem" mr="1rem" justify="flex-end">
      <IconBolt />
      <Text
        fw={900}
        component="h1"
        mt="0.2rem"
        size="1.3rem"
        style={{
          fontStyle: 'italic',
          letterSpacing: '0.05em',
          transform: 'skewX(-8deg)'
        }}
      >
        AutoCAPTION
      </Text>
    </Group>
  )
}
