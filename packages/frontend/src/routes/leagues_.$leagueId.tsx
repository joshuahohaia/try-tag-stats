import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  Table,
  Loader,
  Center,
  Tabs,
  Badge,
  Group,
  Button,
  Select,
  ScrollArea,
  Box,
  Container,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconStar, IconStarFilled, IconAward } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { useLeague, useLeagueDivisions, useLeagueSeasons } from '../hooks/useLeagues';
import { useDivisionStandings, useDivisionFixtures, useDivisionStatistics } from '../hooks/useDivisions';
import { useFavoriteTeams } from '../hooks/useFavorites';
import type { FixtureWithTeams } from '@trytag/shared';

// Helper to get last 5 form results for a team
function getTeamForm(teamId: number, fixtures: FixtureWithTeams[] | undefined) {
  if (!fixtures) return [];

  // Get completed fixtures for this team, sorted by date desc
  const teamFixtures = fixtures
    .filter(f =>
      f.status === 'completed' &&
      f.homeScore !== null &&
      f.awayScore !== null &&
      (f.homeTeam.id === teamId || f.awayTeam.id === teamId)
    )
    .sort((a, b) => new Date(b.fixtureDate).getTime() - new Date(a.fixtureDate).getTime())
    .slice(0, 5)
    .reverse(); // Oldest on left, newest on right

  return teamFixtures.map((fixture, idx) => {
    const isHome = fixture.homeTeam.id === teamId;
    const teamScore = isHome ? fixture.homeScore! : fixture.awayScore!;
    const oppScore = isHome ? fixture.awayScore! : fixture.homeScore!;
    const opponent = isHome ? fixture.awayTeam.name : fixture.homeTeam.name;

    let result: 'W' | 'L' | 'D' = 'D';
    let color = 'gray';

    if (teamScore > oppScore) {
      result = 'W';
      color = 'green';
    } else if (teamScore < oppScore) {
      result = 'L';
      color = 'red';
    }

    const isMostRecent = idx === teamFixtures.length - 1;

    return { result, color, teamScore, oppScore, opponent, isMostRecent, fixtureId: fixture.id };
  });
}

function LeagueDetailPage() {
  const { leagueId } = Route.useParams();
  const parsedLeagueId = parseInt(leagueId, 10);

  return (
    <LeagueContent leagueId={parsedLeagueId} />
  );
}

function LeagueContent({ leagueId }: { leagueId: number }) {
  const { data: league, isLoading: leagueLoading } = useLeague(leagueId);
  const { data: seasons, isLoading: seasonsLoading } = useLeagueSeasons(leagueId);
  const { isFavorite, toggleFavorite } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('standings');

  // Set default season (current one or last one)
  useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeasonId) {
      const current = seasons.find(s => s.isCurrent);
      if (current) {
        setSelectedSeasonId(String(current.id));
      } else {
        // Fallback to the last season (assuming higher ID is newer)
        const sorted = [...seasons].sort((a, b) => b.id - a.id);
        setSelectedSeasonId(String(sorted[0].id));
      }
    }
  }, [seasons, selectedSeasonId]);

  const { data: divisions, isLoading: divisionsLoading } = useLeagueDivisions(
    leagueId,
    selectedSeasonId ? parseInt(selectedSeasonId, 10) : 0
  );

  // Set default division
  useEffect(() => {
    if (divisions && divisions.length > 0) {
      // Try to keep the same division selection if switching seasons, otherwise default to first
      // For now just default to first if not set or invalid
      const exists = divisions.some(d => String(d.id) === selectedDivisionId);
      if (!selectedDivisionId || !exists) {
        setSelectedDivisionId(String(divisions[0].id));
      }
    } else if (divisions && divisions.length === 0) {
      setSelectedDivisionId(null);
    }
  }, [divisions, selectedDivisionId]);

  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(
    selectedDivisionId ? parseInt(selectedDivisionId, 10) : 0
  );
  const { data: fixtures, isLoading: fixturesLoading } = useDivisionFixtures(
    selectedDivisionId ? parseInt(selectedDivisionId, 10) : 0
  );
  const { data: statistics, isLoading: statsLoading } = useDivisionStatistics(
    selectedDivisionId ? parseInt(selectedDivisionId, 10) : 0
  );

  const divisionOptions = useMemo(() => {
    return divisions?.map(d => ({ value: String(d.id), label: d.name })) || [];
  }, [divisions]);

  const seasonOptions = useMemo(() => {
    return seasons?.map(s => ({ value: String(s.id), label: s.name })) || [];
  }, [seasons]);

  if (leagueLoading || seasonsLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!league) {
    return (
      <Card withBorder>
        <Text c="dimmed" ta="center" py="xl">League not found</Text>
      </Card>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Sticky Header */}
      <Box style={{ flexShrink: 0 }}>
        <Container size="xl" p="md">
          <Group justify="space-between" align="flex-start" mb="md">
            <div>
              <Title order={1} mb="xs">{league.name}</Title>
              <Group gap="xs">
                {league.dayOfWeek && <Badge variant="light">{league.dayOfWeek}</Badge>}
                {league.format && <Badge variant="outline">{league.format}</Badge>}
              </Group>
            </div>
            <Group>
              <Select
                data={seasonOptions}
                value={selectedSeasonId}
                onChange={setSelectedSeasonId}
                placeholder="Select Season"
                w={160}
              />
              <Select
                data={divisionOptions}
                value={selectedDivisionId}
                onChange={setSelectedDivisionId}
                placeholder="Select Division"
                disabled={!divisions || divisions.length === 0}
                w={200}
              />
            </Group>
          </Group>

          {selectedDivisionId && (
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="standings">Standings</Tabs.Tab>
                <Tabs.Tab value="fixtures">Fixtures</Tabs.Tab>
                <Tabs.Tab value="statistics">Statistics</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          )}
        </Container>
      </Box>

      {/* Scrollable Content */}
      {!selectedDivisionId ? (
        <Container size="xl" p="md">
          <Card withBorder>
            <Text c="dimmed" ta="center" py="xl">
              {divisionsLoading ? 'Loading divisions...' : 'No divisions found for this season.'}
            </Text>
          </Card>
        </Container>
      ) : (
        <ScrollArea flex={1} type="auto">
          <Container size="xl" px="md" pt="xs" pb={isMobile ? 80 : "md"}>
            <Box pb="md">
              {activeTab === 'standings' && (
                <>
                  {standingsLoading ? (
                    <Center h={200}><Loader /></Center>
                  ) : standings && standings.length > 0 ? (
                    <Card withBorder p={0}>
                      <ScrollArea type="auto">
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Pos</Table.Th>
                              <Table.Th></Table.Th>
                              <Table.Th>Team</Table.Th>
                              <Table.Th>Pld</Table.Th>
                              <Table.Th>W</Table.Th>
                              <Table.Th>L</Table.Th>
                              <Table.Th>D</Table.Th>
                              <Table.Th>F</Table.Th>
                              <Table.Th>A</Table.Th>
                              <Table.Th>Dif</Table.Th>
                              <Table.Th>Pts</Table.Th>
                              <Table.Th>Form</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {standings.map((standing) => (
                              <Table.Tr key={standing.id}>
                                <Table.Td fw={600}>{standing.position}</Table.Td>
                                <Table.Td>
                                  <Button
                                    variant="subtle"
                                    size="xs"
                                    p={4}
                                    onClick={() => toggleFavorite(standing.team, leagueId)}
                                  >
                                    {isFavorite(standing.team.id) ? (
                                      <IconStarFilled size={16} style={{ color: 'var(--mantine-color-yellow-6)' }} />
                                    ) : (
                                      <IconStar size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
                                    )}
                                  </Button>
                                </Table.Td>
                                <Table.Td>
                                  <Link
                                    to="/teams/$teamId"
                                    params={{ teamId: String(standing.team.id) }}
                                    style={{ color: 'inherit', textDecoration: 'none' }}
                                  >
                                    <Text span fw={500} c="blue">{standing.team.name}</Text>
                                  </Link>
                                </Table.Td>
                                <Table.Td>{standing.played}</Table.Td>
                                <Table.Td>{standing.wins}</Table.Td>
                                <Table.Td>{standing.losses}</Table.Td>
                                <Table.Td>{standing.draws}</Table.Td>
                                <Table.Td>{standing.pointsFor}</Table.Td>
                                <Table.Td>{standing.pointsAgainst}</Table.Td>
                                <Table.Td>{standing.pointDifference}</Table.Td>
                                <Table.Td fw={600}>{standing.totalPoints}</Table.Td>
                                <Table.Td>
                                  <Group gap={3} wrap="nowrap">
                                    {getTeamForm(standing.team.id, fixtures).map((f, idx) => (
                                      <Tooltip
                                        key={f.fixtureId || idx}
                                        label={`${f.isMostRecent ? '(Latest) ' : ''}${f.result === 'W' ? 'Won' : f.result === 'L' ? 'Lost' : 'Drew'} ${f.teamScore}-${f.oppScore} vs ${f.opponent}`}
                                        withArrow
                                      >
                                        <Badge
                                          color={f.color}
                                          variant="filled"
                                          size="sm"
                                          style={{
                                            minWidth: 22,
                                            cursor: 'default',
                                            outline: f.isMostRecent ? '2px solid var(--mantine-color-dark-3)' : 'none',
                                            outlineOffset: '1px',
                                          }}
                                        >
                                          {f.result}
                                        </Badge>
                                      </Tooltip>
                                    ))}
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    </Card>
                  ) : (
                    <Text c="dimmed">No standings data available</Text>
                  )}
                </>
              )}

              {activeTab === 'fixtures' && (
                <>
                  {fixturesLoading ? (
                    <Center h={200}><Loader /></Center>
                  ) : fixtures && fixtures.length > 0 ? (
                    <Stack gap="sm">
                      {fixtures.map((fixture) => (
                        <Card key={fixture.id} withBorder padding="sm">
                          <Group justify="space-between">
                            <Stack gap={2}>
                              <Group gap="xs">
                                <Link
                                  to="/teams/$teamId"
                                  params={{ teamId: String(fixture.homeTeam.id) }}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <Text fw={500} c="blue">{fixture.homeTeam.name}</Text>
                                </Link>
                                <Text fw={500}>vs</Text>
                                <Link
                                  to="/teams/$teamId"
                                  params={{ teamId: String(fixture.awayTeam.id) }}
                                  style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                  <Text fw={500} c="blue">{fixture.awayTeam.name}</Text>
                                </Link>
                              </Group>
                              <Text size="sm" c="dimmed">
                                {fixture.fixtureDate} {fixture.fixtureTime && `at ${fixture.fixtureTime}`}
                                {fixture.pitch && ` - ${fixture.pitch}`}
                              </Text>
                            </Stack>
                            <div>
                              {fixture.status === 'completed' && fixture.homeScore !== null ? (
                                <Badge size="lg" variant="filled">
                                  {fixture.homeScore} - {fixture.awayScore}
                                </Badge>
                              ) : (
                                <Badge variant="light">{fixture.status}</Badge>
                              )}
                            </div>
                          </Group>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Text c="dimmed">No fixtures data available</Text>
                  )}
                </>
              )}

              {activeTab === 'statistics' && (
                <>
                  {statsLoading ? (
                    <Center h={200}><Loader /></Center>
                  ) : statistics && statistics.length > 0 ? (
                    <Card withBorder>
                      <Title order={3} mb="md">Player of the Match Awards</Title>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Player</Table.Th>
                            <Table.Th>Team</Table.Th>
                            <Table.Th>Awards</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {statistics.map((stat) => (
                            <Table.Tr key={stat.id}>
                              <Table.Td fw={500}>{stat.player.name}</Table.Td>
                              <Table.Td>
                                <Link
                                  to="/teams/$teamId"
                                  params={{ teamId: String(stat.team.id) }}
                                  style={{ color: 'inherit', textDecoration: 'none' }}
                                >
                                  <Text span c="blue">{stat.team.name}</Text>
                                </Link>
                              </Table.Td>
                              <Table.Td>
                                <Group gap={4}>
                                  <IconAward size={18} style={{ color: 'gold' }} />
                                  <Text fw={700}>{stat.awardCount}</Text>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Card>
                  ) : (
                    <Text c="dimmed">No statistics available for this division.</Text>
                  )}
                </>
              )}
            </Box>
          </Container>
        </ScrollArea>
      )}
    </Stack>
  );
}

export const Route = createFileRoute('/leagues_/$leagueId')({
  component: LeagueDetailPage,
});
