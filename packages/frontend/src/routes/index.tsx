import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  SimpleGrid,
  Stack,
  Button,
  Group,
  Table,
  ActionIcon,
  rem,
  ScrollArea,
  Container,
  Flex,
  Badge,
  HoverCard,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { FixtureCardSkeleton, StandingsTableSkeleton, StatsTableSkeleton } from '../components/skeletons';
import { FixturesList } from '../components';
import { IconTrophy, IconCalendar, IconStar, IconChevronLeft, IconChevronRight, IconAward, IconHistory, IconFlame } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useUpcomingFixtures } from '../hooks/useFixtures';
import { useDivisions, useDivisionsStandings, useDivisionsStatistics, useDivisionStatistics } from '../hooks/useDivisions';
import type { Team, StandingWithDivision, FixtureWithTeams } from '@trytag/shared';

interface TeamProfile extends Team {
  standings: StandingWithDivision[];
  recentFixtures?: FixtureWithTeams[];
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

  const { data: standings, isLoading: standingsLoading } = useDivisionsStandings(
    currentDivision ? [currentDivision.id] : []
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
        <Title fz={15} order={3}>Active League Standings</Title>
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
              <Text size="sm" fw={700} c="blue">{currentDivision.leagueName}</Text>
            </Link>
            <Text c="dimmed" size="xs">{currentDivision.name} • {currentDivision.seasonName}</Text>
          </div>

          {standingsLoading ? (
            <StandingsTableSkeleton rows={5} compact />
          ) : (
            <Table highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Pos</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Team</Table.Th>

                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Pld</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>W</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>L</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>D</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>F</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>A</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Dif</Table.Th>
                  <Table.Th style={{ fontSize: rem(10), padding: rem(4) }}>Pts</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {standings?.map((row) => {
                  const isFavorite = favoriteIds.includes(row.teamId);
                  return (
                    <Table.Tr key={row.id} bg={isFavorite ? 'var(--mantine-color-warning-0)' : undefined}>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }} fw={isFavorite ? 700 : 400}>{row.position}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>
                        <Link
                          to="/teams/$teamId"
                          params={{ teamId: String(row.teamId) }}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          <Text fw={isFavorite ? 700 : 500} c={isFavorite ? 'brand.9' : 'inherit'} size="xs">
                            {row.team.name}
                          </Text>
                        </Link>
                      </Table.Td>

                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.played}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.wins}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.losses}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.draws}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.pointsFor}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.pointsAgainst}</Table.Td>
                      <Table.Td style={{ fontSize: rem(10), padding: rem(4) }}>{row.pointDifference}</Table.Td>
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

  // Get medal color for top 3
  const getMedalColor = (position: number) => {
    if (position === 1) return 'yellow';
    if (position === 2) return 'gray.5';
    if (position === 3) return 'orange.7';
    return 'gray.3';
  };

  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconAward size={20} color="gold" />
          <Title fz={15} order={3}>Player of Match Leaders</Title>
        </Group>
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
              <Text size="sm" fw={700} c="blue">{currentDivision.leagueName}</Text>
            </Link>
            <Text c="dimmed" size="xs">{currentDivision.name}</Text>
          </div>

          {isLoading ? (
            <StatsTableSkeleton rows={5} />
          ) : stats && stats.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" verticalSpacing="xs">
              {stats.slice(0, 12).map((stat, idx) => {
                const position = idx + 1;
                const isTopThree = position <= 3;
                return (
                  <Group
                    key={stat.id}
                    wrap="nowrap"
                    gap="sm"
                    p="xs"
                    style={{
                      borderRadius: 'var(--mantine-radius-sm)',
                      backgroundColor: isTopThree ? 'var(--mantine-color-yellow-0)' : undefined,
                    }}
                  >
                    <Badge
                      circle
                      size="lg"
                      variant={isTopThree ? 'filled' : 'light'}
                      color={getMedalColor(position)}
                    >
                      {position}
                    </Badge>

                    <Stack gap={0} style={{ overflow: 'hidden', flex: 1 }}>
                      <Text fw={600} size="sm" truncate>{stat.player.name}</Text>
                      <Link
                        to="/teams/$teamId"
                        params={{ teamId: String(stat.team.id) }}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Text size="xs" c="blue" truncate>{stat.team.name}</Text>
                      </Link>
                    </Stack>

                    <Group gap={4} wrap="nowrap">
                      <IconTrophy size={16} color="var(--mantine-color-yellow-6)" />
                      <Text fw={700} size="lg">{stat.awardCount}</Text>
                    </Group>
                  </Group>
                );
              })}
            </SimpleGrid>
          ) : (
            <Text c="dimmed" size="xs">No stats available</Text>
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

  // Derive recent fixtures from team profiles (already fetched) instead of separate API call
  const recentFixtures = useMemo(() => {
    if (!hasFavorites) return [];

    const allRecentFixtures: FixtureWithTeams[] = [];
    teamQueries.forEach((query) => {
      if (query.data?.recentFixtures) {
        allRecentFixtures.push(...query.data.recentFixtures);
      }
    });

    const seen = new Set<string>();
    const deduped = allRecentFixtures.filter((f) => {
      const key = `${f.fixtureDate}-${f.homeTeamId}-${f.awayTeamId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped
      .sort((a, b) => new Date(b.fixtureDate).getTime() - new Date(a.fixtureDate).getTime())
      .slice(0, 5);
  }, [teamQueries, hasFavorites]);

  // Compute team form data (last 5 results per team)
  const teamFormData = useMemo(() => {
    if (!hasFavorites) return [];

    return teamQueries
      .filter(q => q.data?.recentFixtures && q.data.recentFixtures.length > 0)
      .map(q => {
        const team = q.data!;
        const standing = team.standings?.[0];
        const fixtures = team.recentFixtures!
          .filter(f => f.homeScore !== null && f.awayScore !== null)
          .slice(0, 5);

        const form = fixtures.map(f => {
          const isHome = f.homeTeamId === team.id;
          const teamScore = isHome ? f.homeScore! : f.awayScore!;
          const oppScore = isHome ? f.awayScore! : f.homeScore!;
          const opponent = isHome ? f.awayTeam?.name : f.homeTeam?.name;

          let result: 'W' | 'L' | 'D' = 'D';
          if (teamScore > oppScore) result = 'W';
          else if (teamScore < oppScore) result = 'L';

          return { result, score: `${teamScore}-${oppScore}`, opponent };
        });

        return {
          id: team.id,
          name: team.name,
          form: form.reverse(), // Oldest first, newest last
          position: standing?.position,
          wins: standing?.wins ?? 0,
          losses: standing?.losses ?? 0,
          draws: standing?.draws ?? 0,
          totalPoints: standing?.totalPoints ?? 0,
          pointDifference: standing?.pointDifference ?? 0,
        };
      });
  }, [teamQueries, hasFavorites]);

  const divisionIds = useMemo(() => {
    if (!upcomingFixtures) return [];
    return [...new Set(upcomingFixtures.map(f => f.divisionId))];
  }, [upcomingFixtures]);

  const { data: standings, isLoading: standingsLoading } = useDivisionsStandings(divisionIds);
  const { data: statistics, isLoading: statsLoading } = useDivisionsStatistics(divisionIds);
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(divisionIds);

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="xl" p="md">
        <Stack gap="md">
          {!hasFavorites && (
            <Card withBorder bg="green.0">
              <Stack align="center">
                <IconStar size={48} color="var(--mantine-color-success-6)" />
                <Title order={3}>Get Started</Title>
                <Text c="dimmed" ta="center">
                  Browse leagues and add Your favourite Teams to track their fixtures and standings.
                </Text>
                <Flex gap="sm">
                  <Button component={Link} to="/leagues">
                    Browse Leagues
                  </Button>
                  <Button component={Link} to="/teams" variant="light">
                    Browse Teams
                  </Button>
                </Flex>
              </Stack>
            </Card>
          )}
          {hasFavorites && (
            <>
              {/* Team Form Widget */}
              {teamFormData.length > 0 && (
                <Card withBorder>
                  <Title fz={15} order={3} mb="md">
                    <IconFlame size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Team Form
                  </Title>
                  <Stack gap="sm">
                    {teamFormData.map((team) => (
                      <Group key={team.id} justify="space-between" wrap="nowrap" gap="md">
                        {/* Team name and position */}
                        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: isMobile ? 1 : undefined, width: isMobile ? undefined : 180 }}>
                          {team.position && (
                            <Badge size="sm" variant="light" color="gray">
                              {team.position}
                            </Badge>
                          )}
                          <Link
                            to="/teams/$teamId"
                            params={{ teamId: String(team.id) }}
                            style={{ textDecoration: 'none', overflow: 'hidden' }}
                          >
                            <Text size="sm" fw={500} c="blue" truncate>
                              {team.name}
                            </Text>
                          </Link>
                        </Group>

                        {/* Stats - only on desktop */}
                        {!isMobile && (
                          <Group gap="lg" wrap="nowrap" style={{ flex: 1 }}>
                            <Group gap={4}>
                              <Text size="xs" c="green" fw={600}>{team.wins}W</Text>
                              <Text size="xs" c="dimmed">-</Text>
                              <Text size="xs" c="red" fw={600}>{team.losses}L</Text>
                              <Text size="xs" c="dimmed">-</Text>
                              <Text size="xs" c="dimmed" fw={600}>{team.draws}D</Text>
                            </Group>
                            <Text size="xs" fw={600}>{team.totalPoints} pts</Text>
                            <Text size="xs" c={team.pointDifference >= 0 ? 'green' : 'red'} fw={500}>
                              {team.pointDifference >= 0 ? '+' : ''}{team.pointDifference}
                            </Text>
                          </Group>
                        )}

                        {/* Form badges */}
                        <Group gap={4} wrap="nowrap">
                          {team.form.map((f, idx) => {
                            const color = f.result === 'W' ? 'green' : f.result === 'L' ? 'red' : 'gray';
                            const isMostRecent = idx === team.form.length - 1;
                            return (
                              <HoverCard key={idx} width={180} withArrow shadow="md">
                                <HoverCard.Target>
                                  <Badge
                                    circle
                                    size="lg"
                                    variant="filled"
                                    color={color}
                                    style={{
                                      cursor: 'pointer',
                                      outline: isMostRecent ? '2px solid var(--mantine-color-brand-3)' : 'none',
                                      outlineOffset: '2px',
                                    }}
                                  >
                                    {f.result}
                                  </Badge>
                                </HoverCard.Target>
                                <HoverCard.Dropdown>
                                  <Text size="xs">
                                    {isMostRecent ? '(Latest) ' : ''}
                                    {f.result === 'W' ? 'Won' : f.result === 'L' ? 'Lost' : 'Drew'} {f.score} vs {f.opponent}
                                  </Text>
                                </HoverCard.Dropdown>
                              </HoverCard>
                            );
                          })}
                          {team.form.length === 0 && (
                            <Text size="xs" c="dimmed">No results</Text>
                          )}
                        </Group>
                      </Group>
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Active League Standings */}
              {activeDivisions.length > 0 ? (
                <ActiveLeaguesWidget divisions={activeDivisions} favoriteIds={favoriteIds} />
              ) : isLoadingTeams ? (
                <Card withBorder><StandingsTableSkeleton rows={5} compact /></Card>
              ) : null}
            </>
          )}

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title fz={15} order={3} >
                  <IconCalendar size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Upcoming Fixtures
                </Title>
                <Button variant="subtle" component={Link} to="/fixtures" size="xs">
                  View All
                </Button>
              </Group>
              {fixturesLoading || standingsLoading || statsLoading || divisionsLoading ? (
                <FixtureCardSkeleton count={5} compact />
              ) : upcomingFixtures && upcomingFixtures.length > 0 ? (
                <FixturesList
                  fixtures={upcomingFixtures}
                  standings={standings}
                  statistics={statistics}
                  divisions={divisions}
                  favoriteTeamIds={favoriteIds}
                  compact
                  hideDivision
                />
              ) : (
                <Text c="dimmed">
                  {hasFavorites
                    ? "No upcoming fixtures for your favourite teams."
                    : "No upcoming fixtures found."}
                </Text>
              )}
            </Card>

            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title fz={15} order={3}>
                  <IconHistory size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  Recent Results
                </Title>
                <Button variant="subtle" component={Link} to="/fixtures" size="xs">
                  View All
                </Button>
              </Group>
              {isLoadingTeams || standingsLoading || statsLoading || divisionsLoading ? (
                <FixtureCardSkeleton count={5} compact />
              ) : recentFixtures && recentFixtures.length > 0 ? (
                <FixturesList
                  fixtures={recentFixtures}
                  standings={standings}
                  statistics={statistics}
                  divisions={divisions}
                  favoriteTeamIds={favoriteIds}
                  compact
                  hideDivision
                  defaultSort="latest"
                />
              ) : (
                <Text c="dimmed">
                  {hasFavorites
                    ? "No recent results for your favourite teams."
                    : "No recent results found."}
                </Text>
              )}
            </Card>
          </SimpleGrid>

          {hasFavorites && activeDivisions.length > 0 ? (
            <PlayerStatsWidget divisions={activeDivisions} />
          ) : (
            <Card withBorder>
              <Title fz={15} order={3} mb="md">
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
                  leftSection={<IconCalendar size={18} />}
                  component={Link}
                  to="/teams"
                >
                  View All Teams
                </Button>
              </Stack>
            </Card>
          )}

        </Stack>
      </Container>
    </ScrollArea >
  );
} export const Route = createFileRoute('/')({
  component: HomePage,
});