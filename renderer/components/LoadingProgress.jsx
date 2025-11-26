import { Box, Progress, Text, Paper } from '@mantine/core'

export default function LoadingProgress({ processed, total, message = 'Loading images' }) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <Paper shadow="sm" p="md" radius="md" withBorder>
      <Box>
        <Text size="sm" fw={500} mb="xs">
          {message}
        </Text>
        <Progress 
          value={percentage} 
          size="lg" 
          radius="xl"
          striped
          animated
        />
        <Text size="xs" c="dimmed" mt="xs">
          {processed} / {total} images processed ({percentage}%)
        </Text>
      </Box>
    </Paper>
  )
}
