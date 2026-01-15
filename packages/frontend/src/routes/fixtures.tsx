import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Center,
  Loader,
  Container,
  SegmentedControl,
  ScrollArea,
  Button,
} from '@mantine/core';
import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useUpcomingFixtures, useRecentFixtures } from '../hooks/useFixtures';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { formatDate, formatTime } from '../utils/format';

function FixturesPage() {
  const [view, setView] = useState('upcoming');
  const { favorites } = useFavoriteTeams();

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
        <Stack gap="md">
          <div>
            <Title order={1} mb="xs">Fixtures</Title>
            <Text c="dimmed">View upcoming matches and recent results for Your Favourite Teams</Text>
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
        <Container size="xl" p="md">
          {!hasFavorites ? (
            <Card withBorder>
              <Stack align="center" py="xl">
                <Text c="dimmed">You haven't added any favourite teams yet.</Text>
                <Button component={Link} to="/leagues" variant="light">Browse Leagues</Button>
              </Stack>
            </Card>
          ) : isLoading ? (
            <Center h={200}>
              <Loader size="lg" />
            </Center>
          ) : fixtures && fixtures.length > 0 ? (
            <Stack gap="sm">
              {fixtures.map((fixture) => {
                // Determine result color based on favourite team's perspective
                let resultColor = 'gray';
                if (fixture.status === 'completed' && fixture.homeScore !== null && fixture.awayScore !== null) {
                  const homeFavorite = favoriteIds.includes(fixture.homeTeam.id);
                  const awayFavorite = favoriteIds.includes(fixture.awayTeam.id);

                  if (homeFavorite && !awayFavorite) {
                    // Home team is favorite
                    resultColor = fixture.homeScore > fixture.awayScore ? 'green' : fixture.homeScore < fixture.awayScore ? 'red' : 'gray';
                  } else if (awayFavorite && !homeFavorite) {
                    // Away team is favorite
                    resultColor = fixture.awayScore > fixture.homeScore ? 'green' : fixture.awayScore < fixture.homeScore ? 'red' : 'gray';
                  } else {
                    // Both are favorites or neither - show neutral
                    resultColor = 'blue';
                  }
                }

                return (
                  <Card
                    key={fixture.id}
                    withBorder
                    padding="md"
                    style={{ position: 'relative' }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 'var(--mantine-spacing-md)',
                      right: 'var(--mantine-spacing-md)'
                    }}>
                      {fixture.status === 'completed' && fixture.homeScore !== null ? (
                        <Badge size="lg" variant="filled" color={resultColor}>
                          {fixture.homeScore} - {fixture.awayScore}
                        </Badge>
                      ) : (
                        <Badge size="lg" variant="light">{fixture.status}</Badge>
                      )}
                    </div>

                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4} style={{ flex: 1, paddingRight: '120px' }}>
                        <Link
                          to="/teams/$teamId"
                          params={{ teamId: String(fixture.homeTeam.id) }}
                          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                        >
                          <Text
                            fw={600}
                            size="lg"
                            c="blue"
                            lineClamp={1}
                            style={{ wordBreak: 'break-word' }}
                          >
                            {fixture.homeTeam.name}
                          </Text>
                        </Link>

                        <Text c="dimmed" size="sm">vs</Text>

                        <Link
                          to="/teams/$teamId"
                          params={{ teamId: String(fixture.awayTeam.id) }}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          <Text fw={600}
                            size="lg"
                            c="blue"
                            lineClamp={1}
                            style={{ wordBreak: 'break-word' }}>
                            {fixture.awayTeam.name}
                          </Text>
                        </Link>

                        {/* Date/Time and Pitch moved here to keep them clear of the badge area */}
                        <Stack gap={0} mt="xs">
                          <Text size="sm" c="dimmed">
                            {formatDate(fixture.fixtureDate)}
                            {fixture.fixtureTime && ` at ${formatTime(fixture.fixtureTime)}`}
                          </Text>
                          {fixture.pitch && (
                            <Text size="xs" c="dimmed">{fixture.pitch}</Text>
                          )}
                        </Stack>
                      </Stack>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Card withBorder>
              <Text c="dimmed" ta="center" py="xl">
                No {view} fixtures found for Your Favourite Teams
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
