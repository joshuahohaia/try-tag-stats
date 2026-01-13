import { createFileRoute } from '@tanstack/react-router';
import { Title, Text, Card, Stack, Center } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';

function StatisticsPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title order={1} mb="xs">Statistics</Title>
        <Text c="dimmed">View player statistics and awards</Text>
      </div>

      <Card withBorder>
        <Center py="xl">
          <Stack align="center">
            <IconChartBar size={48} color="var(--mantine-color-gray-5)" />
            <Title order={3}>Coming Soon</Title>
            <Text c="dimmed" ta="center">
              Player statistics and awards will be displayed here after syncing data.
            </Text>
          </Stack>
        </Center>
      </Card>
    </Stack>
  );
}

export const Route = createFileRoute('/statistics')({
  component: StatisticsPage,
});
