import { createFileRoute } from '@tanstack/react-router';
import { useMediaQuery } from '@mantine/hooks';
import {
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Container,
  SegmentedControl,
  ScrollArea,
  Button,
  HoverCard,
} from '@mantine/core';
import { FixtureCardSkeleton } from '../components/skeletons';
import { IconTrophy, IconSparkles } from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useUpcomingFixtures, useRecentFixtures } from '../hooks/useFixtures';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { formatDate, formatTime } from '../utils/format';
import { useDivisionsStandings, useDivisionsStatistics } from '../hooks/useDivisions';
import { getFixtureInsights } from '../utils/fixtures';

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

  const fixtures = view === 'upcoming' ? upcomingFixtures : recentFixtures;
  const isLoading = view === 'upcoming' ? upcomingLoading : recentLoading;

  const divisionIds = useMemo(() => {
    if (!fixtures) return [];
    return [...new Set(fixtures.map(f => f.divisionId))];
  }, [fixtures]);

  const { data: standings, isLoading: standingsLoading } = useDivisionsStandings(divisionIds);
  const { data: statistics, isLoading: statsLoading } = useDivisionsStatistics(divisionIds);

  return (
    <Stack h="100%" gap="0" style={{ overflow: 'hidden' }}>
      <Container size="xl" w="100%" p="md" flex={0}>
        <Stack gap="md">
          <div>
            <Title order={1} mb="xs">Fixtures</Title>
            {!isMobile && (
              <Text c="dimmed">View upcoming matches and recent results for Your Favourite Teams</Text>
            )}
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
          ) : isLoading || standingsLoading || statsLoading ? (
            <FixtureCardSkeleton count={5} />
          ) : fixtures && fixtures.length > 0 ? (
            <Stack gap="sm">
              {fixtures.map((fixture) => {
                const fixtureStandings = standings?.filter(s => s.divisionId === fixture.divisionId);
                const fixtureStats = statistics?.filter(s => s.divisionId === fixture.divisionId);
                const insights = getFixtureInsights(fixture, fixtureStandings, fixtureStats);

                // Determine result color based on favourite team's perspective
                let resultColor = 'gray';
                if (fixture.status === 'completed' && fixture.homeScore !== null && fixture.awayScore !== null) {
                  const homeFavorite = favoriteIds.includes(fixture.homeTeam.id);
                  const awayFavorite = favoriteIds.includes(fixture.awayTeam.id);

                  if (homeFavorite && !awayFavorite) {
                    resultColor = fixture.homeScore > fixture.awayScore ? 'green' : fixture.homeScore < fixture.awayScore ? 'red' : 'gray';
                  } else if (awayFavorite && !homeFavorite) {
                    resultColor = fixture.awayScore > fixture.homeScore ? 'green' : fixture.awayScore < fixture.homeScore ? 'red' : 'gray';
                  } else {
                    resultColor = 'blue';
                  }
                }

                const insightIcons = insights.map((insight) => (
                  <HoverCard key={insight.type} width={200} withArrow shadow="md">
                    <HoverCard.Target>
                      {insight.type === 'top-clash' ? (
                        <IconTrophy size={20} color="orange" />
                      ) : (
                        <IconSparkles size={20} color="purple" />
                      )}
                    </HoverCard.Target>
                    <HoverCard.Dropdown>
                      <Text size="xs">{insight.text}</Text>
                    </HoverCard.Dropdown>
                  </HoverCard>
                ));

                const isPastScheduled = fixture.status === 'scheduled' &&
                  new Date(fixture.fixtureDate) < new Date(new Date().toDateString());

                const fixtureBadge = fixture.status === 'completed' && fixture.homeScore !== null ? (
                  <Badge size="lg" variant="filled" color={resultColor}>
                    {fixture.homeScore} - {fixture.awayScore}
                  </Badge>
                ) : isPastScheduled ? (
                  <Badge size="lg" variant="light" color="orange">Awaiting Results</Badge>
                ) : (
                  <Badge size="lg" variant="light">{fixture.status}</Badge>
                );

                return (
                  <Card
                    key={fixture.id}
                    withBorder
                    padding="sm"
                  >
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={4} style={{ flex: 1 }}>
                        {fixture.homeTeam ? (
                          <Link
                            to="/teams/$teamId"
                            params={{ teamId: String(fixture.homeTeam.id) }}
                            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                          >
                            <Text
                              fw={500}
                              size="lg"
                              lineClamp={1}
                              style={{ wordBreak: 'break-word' }}
                            >
                              {fixture.homeTeam.name}
                            </Text>
                          </Link>
                        ) : (
                          <Text
                            fw={500}
                            size="lg"
                            lineClamp={1}
                            style={{ wordBreak: 'break-word' }}
                          >
                            TBD
                          </Text>
                        )}

                        <Text c="dimmed" size="sm">vs</Text>

                        {fixture.awayTeam ? (
                          <Link
                            to="/teams/$teamId"
                            params={{ teamId: String(fixture.awayTeam.id) }}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <Text fw={500}
                              size="lg"
                              lineClamp={1}
                              style={{ wordBreak: 'break-word' }}>
                              {fixture.awayTeam.name}
                            </Text>
                          </Link>
                        ) : (
                          <Text
                            fw={500}
                            size="lg"
                            lineClamp={1}
                            style={{ wordBreak: 'break-word' }}
                          >
                            TBD
                          </Text>
                        )}

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
                      {isMobile ? (
                        <Stack align="flex-end" gap="xs">
                          {fixtureBadge}
                          <Group gap="xs">{insightIcons}</Group>
                        </Stack>
                      ) : (
                        <Group>
                          {insightIcons}
                          {fixtureBadge}
                        </Group>
                      )}
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
