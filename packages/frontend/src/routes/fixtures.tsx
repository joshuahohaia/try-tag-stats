import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  Loader,
  Center,
  Badge,
  Group,
  SegmentedControl,
} from '@mantine/core';
import { useState } from 'react';
import { useUpcomingFixtures, useRecentFixtures } from '../hooks/useFixtures';

function FixturesPage() {
  const [view, setView] = useState('upcoming');
  const { data: upcomingFixtures, isLoading: upcomingLoading } = useUpcomingFixtures();
  const { data: recentFixtures, isLoading: recentLoading } = useRecentFixtures();

  const fixtures = view === 'upcoming' ? upcomingFixtures : recentFixtures;
  const isLoading = view === 'upcoming' ? upcomingLoading : recentLoading;

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} mb="xs">Fixtures</Title>
        <Text c="dimmed">View upcoming matches and recent results</Text>
      </div>

      <SegmentedControl
        value={view}
        onChange={setView}
        data={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'recent', label: 'Recent Results' },
        ]}
      />

      {isLoading ? (
        <Center h={300}>
          <Loader size="lg" />
        </Center>
      ) : fixtures && fixtures.length > 0 ? (
        <Stack gap="sm">
          {fixtures.map((fixture) => (
            <Card key={fixture.id} withBorder padding="md">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={600} size="lg">
                    {fixture.homeTeam.name}
                  </Text>
                  <Text c="dimmed" size="sm">vs</Text>
                  <Text fw={600} size="lg">
                    {fixture.awayTeam.name}
                  </Text>
                </Stack>
                <Stack align="flex-end" gap={4}>
                  {fixture.status === 'completed' && fixture.homeScore !== null ? (
                    <Badge size="xl" variant="filled" color="green">
                      {fixture.homeScore} - {fixture.awayScore}
                    </Badge>
                  ) : (
                    <Badge size="lg" variant="light">{fixture.status}</Badge>
                  )}
                  <Text size="sm" c="dimmed">
                    {fixture.fixtureDate}
                  </Text>
                  {fixture.fixtureTime && (
                    <Text size="sm" c="dimmed">{fixture.fixtureTime}</Text>
                  )}
                  {fixture.pitch && (
                    <Text size="xs" c="dimmed">{fixture.pitch}</Text>
                  )}
                </Stack>
              </Group>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card withBorder>
          <Text c="dimmed" ta="center" py="xl">
            No fixtures available
          </Text>
        </Card>
      )}
    </Stack>
  );
}

export const Route = createFileRoute('/fixtures')({
  component: FixturesPage,
});
