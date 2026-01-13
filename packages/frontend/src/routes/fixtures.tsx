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
  Button,
  ScrollArea,
  Container,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useUpcomingFixtures, useRecentFixtures } from '../hooks/useFixtures';
import { useFavoriteTeams } from '../hooks/useFavorites';

function FixturesPage() {
  const [view, setView] = useState('upcoming');
  const { favorites } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');
  
  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);
  const hasFavorites = favorites.length > 0;

  // Only fetch if we have favorites
  const { data: upcomingFixtures, isLoading: upcomingLoading } = useUpcomingFixtures(
    hasFavorites ? favoriteIds : [], 
    50
  );
  
  const { data: recentFixtures, isLoading: recentLoading } = useRecentFixtures(
    hasFavorites ? favoriteIds : [], 
    50
  );

  // If no favorites, we don't even use the data
  const fixtures = view === 'upcoming' ? upcomingFixtures : recentFixtures;
  const isLoading = view === 'upcoming' ? upcomingLoading : recentLoading;

  return (
    <Stack h="100%" gap="0" style={{ overflow: 'hidden' }}>
      <Container size="xl" w="100%" p="md" flex={0}>
        <Stack gap="lg">
          <div>
            <Title order={1} mb="xs">Fixtures</Title>
            <Text c="dimmed">View upcoming matches and recent results for your favorite teams</Text>
          </div>

          <SegmentedControl
            value={view}
            onChange={setView}
            data={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'recent', label: 'Recent Results' },
            ]}
          />
        </Stack>
      </Container>

      <ScrollArea flex={1} type="auto">
        <Container size="xl" p="md" pb={isMobile ? 80 : "md"}>
          {!hasFavorites ? (
            <Card withBorder>
                <Stack align="center" py="xl">
                  <Text c="dimmed">You haven't added any favorite teams yet.</Text>
                  <Button component={Link} to="/leagues" variant="light">Browse Leagues</Button>
                </Stack>
            </Card>
          ) : isLoading ? (
            <Center h={200}>
              <Loader size="lg" />
            </Center>
          ) : fixtures && fixtures.length > 0 ? (
            <Stack gap="sm">
              {fixtures.map((fixture) => (
                <Card key={fixture.id} withBorder padding="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={4}>
                      <Link
                        to="/teams/$teamId"
                        params={{ teamId: String(fixture.homeTeam.id) }}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Text fw={600} size="lg" c="blue">
                          {fixture.homeTeam.name}
                        </Text>
                      </Link>
                      <Text c="dimmed" size="sm">vs</Text>
                      <Link
                        to="/teams/$teamId"
                        params={{ teamId: String(fixture.awayTeam.id) }}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Text fw={600} size="lg" c="blue">
                          {fixture.awayTeam.name}
                        </Text>
                      </Link>
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
                No {view} fixtures found for your favorite teams
              </Text>
            </Card>
          )}
        </Container>
      </ScrollArea>

      <Container size="xl" w="100%" p="md" flex={0}>
        <Text c="dimmed" size="sm">
          Showing {fixtures?.length || 0} {view} fixtures
        </Text>
      </Container>
    </Stack>
  );
}

export const Route = createFileRoute('/fixtures')({
  component: FixturesPage,
});
