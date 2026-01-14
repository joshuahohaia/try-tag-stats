import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  SimpleGrid,
  Stack,
  Button,
  Group,
  Badge,
  Table,
  ActionIcon,
  Center,
  Loader,
  rem,
  ScrollArea,
  Container,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconTrophy, IconCalendar, IconStar, IconChevronLeft, IconChevronRight, IconAward } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useUpcomingFixtures } from '../hooks/useFixtures';
import { useDivisionStandings, useDivisionStatistics } from '../hooks/useDivisions';
import type { Team, StandingWithDivision } from '@trytag/shared';

interface TeamProfile extends Team {
  standings: StandingWithDivision[];
}

interface ActiveDivision {
  id: number;
  name: string;
  leagueName: string;
  seasonName: string;
  leagueId: number;
}

function ActiveLeaguesWidget({ divisions, favoriteIds }: { divisions: ActiveDivision[]; favoriteIds: number[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentDivision = divisions[currentIndex];

  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(
    currentDivision ? currentDivision.id : 0
  );

  if (divisions.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % divisions.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + divisions.length) % divisions.length);
  };

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>Active League Standings</Title>
        {divisions.length > 1 && (
          <Group gap="xs">
            <ActionIcon variant="light" onClick={handlePrev}><IconChevronLeft size={18} /></ActionIcon>
            <Text size="sm" fw={500}>
              {currentIndex + 1} / {divisions.length}
            </Text>
            <ActionIcon variant="light" onClick={handleNext}><IconChevronRight size={18} /></ActionIcon>
          </Group>
        )}
      </Group>

      {currentDivision && (
        <Stack gap="xs">
          <div>
            <Link to="/leagues/$leagueId" params={{ leagueId: String(currentDivision.leagueId || 0) }} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Text size="lg" fw={700} c="blue">{currentDivision.leagueName}</Text>
            </Link>
            <Text c="dimmed" size="sm">{currentDivision.name} • {currentDivision.seasonName}</Text>
          </div>

          {standingsLoading ? (
            <Center h={150}><Loader size="sm" /></Center>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Pos</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Team</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Pld</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>W</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>L</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>D</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>FF</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>FA</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>F</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>A</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Dif</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>B</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Pts</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {standings?.map((row) => {
                  const isFavorite = favoriteIds.includes(row.teamId);
                  return (
                    <Table.Tr key={row.id} bg={isFavorite ? 'var(--mantine-color-brand-0)' : undefined}>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }} fw={isFavorite ? 700 : 400}>{row.position}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>
                        <Link
                          to="/teams/$teamId"
                          params={{ teamId: String(row.teamId) }}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          <Text fw={isFavorite ? 700 : 500} c={isFavorite ? 'brand.9' : 'inherit'} size="xs">
                            {row.team.name} {isFavorite && '⭐'}
                          </Text>
                        </Link>
                      </Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.played}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.wins}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.losses}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.draws}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.forfeitsFor}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.forfeitsAgainst}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.pointsFor}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.pointsAgainst}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.pointDifference}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.bonusPoints}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }} fw={700}>{row.totalPoints}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      )}
    </Card>
  );
}

function PlayerStatsWidget({ divisions }: { divisions: ActiveDivision[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentDivision = divisions[currentIndex];

  const { data: stats, isLoading } = useDivisionStatistics(
    currentDivision ? currentDivision.id : 0
  );

  if (divisions.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % divisions.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + divisions.length) % divisions.length);
  };

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>Top Players</Title>
        {divisions.length > 1 && (
          <Group gap="xs">
            <ActionIcon variant="light" onClick={handlePrev}><IconChevronLeft size={18} /></ActionIcon>
            <Text size="sm" fw={500}>
              {currentIndex + 1} / {divisions.length}
            </Text>
            <ActionIcon variant="light" onClick={handleNext}><IconChevronRight size={18} /></ActionIcon>
          </Group>
        )}
      </Group>

      {currentDivision && (
        <Stack gap="xs">
          <div>
            <Text fw={600}>{currentDivision.leagueName}</Text>
            <Text c="dimmed" size="xs">{currentDivision.name}</Text>
          </div>

          {isLoading ? (
            <Center h={150}><Loader size="sm" /></Center>
          ) : stats && stats.length > 0 ? (
            <Stack gap="sm">
              {stats.slice(0, 5).map((stat) => (
                <Group key={stat.id} justify="space-between" wrap="nowrap">
                  <Stack gap={0} style={{ overflow: 'hidden' }}>
                    <Text fw={500} truncate>{stat.player.name}</Text>
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: String(stat.team.id) }}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <Text size="xs" c="blue" truncate>{stat.team.name}</Text>
                    </Link>
                  </Stack>
                  <Group gap={4} wrap="nowrap">
                    <IconAward size={16} color="gold" />
                    <Text fw={700}>{stat.awardCount}</Text>
                  </Group>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed" size="sm">No stats available</Text>
          )}
        </Stack>
      )}
    </Card>
  );
}

function HomePage() {
  const { favorites } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);
  const hasFavorites = favorites.length > 0;

  // Fetch profiles for all favorites to find their active divisions
  const teamQueries = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: ['teams', id],
      queryFn: async () => {
        const response = await apiClient.get<{ success: boolean; data: TeamProfile }>(`/teams/${id}`);
        return extractData(response);
      },
    })),
  });

  // Extract unique active divisions from loaded profiles
  const activeDivisions = useMemo(() => {
    const divisions = new Map<number, ActiveDivision>();

    teamQueries.forEach((query) => {
      if (query.data && query.data.standings.length > 0) {
        // Assume first standing is current/active
        const standing = query.data.standings[0];
        if (!divisions.has(standing.divisionId)) {
          divisions.set(standing.divisionId, {
            id: standing.divisionId,
            name: standing.divisionName,
            leagueName: standing.leagueName,
            seasonName: standing.seasonName,
            leagueId: standing.leagueId,
          });
        }
      }
    });
    return Array.from(divisions.values());
  }, [teamQueries]);

  const isLoadingTeams = teamQueries.some(q => q.isLoading);

  // If user has favorites, only fetch for those. Otherwise fetch global (top 5).
  const { data: upcomingFixtures, isLoading: fixturesLoading } = useUpcomingFixtures(
    hasFavorites ? favoriteIds : undefined,
    5
  );

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="xl" p="md" pb={isMobile ? 80 : "md"}>
        <Stack gap="xl" pb="md">
          {!hasFavorites && (
            <Card withBorder bg="green.0">
              <Stack align="center">
                <IconStar size={48} color="var(--mantine-color-green-6)" />
                <Title order={3}>Get Started</Title>
                <Text c="dimmed" ta="center">
                  Browse leagues and add your favorite teams to track their fixtures and standings.
                </Text>
                <Button component={Link} to="/leagues">
                  Browse Leagues
                </Button>
              </Stack>
            </Card>
          )}
          {hasFavorites && (
            <>
              {activeDivisions.length > 0 ? (
                <ActiveLeaguesWidget divisions={activeDivisions} favoriteIds={favoriteIds} />
              ) : isLoadingTeams ? (
                <Card withBorder><Center h={100}><Loader /></Center></Card>
              ) : null}
            </>
          )}

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>
                  <IconCalendar size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Upcoming Fixtures
                </Title>
                <Button variant="subtle" component={Link} to="/fixtures" size="sm">
                  View All
                </Button>
              </Group>
              {fixturesLoading ? (
                <Text c="dimmed">Loading fixtures...</Text>
              ) : upcomingFixtures && upcomingFixtures.length > 0 ? (
                <Stack gap="xs">
                  {upcomingFixtures.map((fixture) => (
                    <Card key={fixture.id} withBorder padding="xs">
                      <Group justify="space-between">
                        <div>
                          <Group gap={4}>
                            <Link
                              to="/teams/$teamId"
                              params={{ teamId: String(fixture.homeTeam.id) }}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Text size="sm" fw={500} c="blue">{fixture.homeTeam.name}</Text>
                            </Link>
                            <Text size="sm" fw={500}>vs</Text>
                            <Link
                              to="/teams/$teamId"
                              params={{ teamId: String(fixture.awayTeam.id) }}
                              style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                              <Text size="sm" fw={500} c="blue">{fixture.awayTeam.name}</Text>
                            </Link>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {fixture.fixtureDate} {fixture.fixtureTime && `at ${fixture.fixtureTime}`}
                          </Text>
                        </div>
                        <Badge variant="light">{fixture.status}</Badge>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed">
                  {hasFavorites
                    ? "No upcoming fixtures for your favorite teams."
                    : "No upcoming fixtures found."}
                </Text>
              )}
            </Card>

            {hasFavorites && activeDivisions.length > 0 ? (
              <PlayerStatsWidget divisions={activeDivisions} />
            ) : (
              <Card withBorder>
                <Title order={3} mb="md">
                  <IconTrophy size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Quick Links
                </Title>
                <Stack gap="sm">
                  <Button
                    variant="light"
                    fullWidth
                    leftSection={<IconTrophy size={18} />}
                    component={Link}
                    to="/leagues"
                  >
                    Browse All Leagues
                  </Button>
                  <Button
                    variant="light"
                    fullWidth
                    leftSection={<IconCalendar size={18} />}
                    component={Link}
                    to="/fixtures"
                  >
                    View All Fixtures
                  </Button>
                  <Button
                    variant="light"
                    fullWidth
                    leftSection={<IconStar size={18} />}
                    component={Link}
                    to="/favorites"
                  >
                    Manage Favorites
                  </Button>
                </Stack>
              </Card>
            )}
          </SimpleGrid>

          {hasFavorites && (
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>
                  <IconStar size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Your Favorite Teams
                </Title>
                <Button variant="subtle" component={Link} to="/favorites" size="sm">
                  Manage
                </Button>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
                {favorites.map((team) => (
                  <Card key={team.id} withBorder padding="sm">
                    <Text fw={500}>{team.name}</Text>
                    <Link
                      to="/teams/$teamId"
                      params={{ teamId: String(team.id) }}
                      style={{ textDecoration: 'none' }}
                    >
                      <Button
                        variant="light"
                        size="xs"
                        mt="xs"
                        component="div"
                      >
                        View Team
                      </Button>
                    </Link>
                  </Card>
                ))}
              </SimpleGrid>
            </Card>
          )}
        </Stack>
      </Container>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});