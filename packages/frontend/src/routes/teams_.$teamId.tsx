import { createFileRoute, Link } from '@tanstack/react-router';
import { useMediaQuery } from '@mantine/hooks';
import {
  Title,
  Text,
  Card,
  Stack,
  Loader,
  Center,
  SimpleGrid,
  Badge,
  Group,
  Button,
  Table,
  Accordion,
  ScrollArea,
  Container,
  HoverCard,
} from '@mantine/core';
import { IconStar, IconStarFilled, IconTrophy, IconAward, IconSparkles } from '@tabler/icons-react';
import { useTeam } from '../hooks/useTeams';
import { useDivisionStandings, useDivisionStatistics } from '../hooks/useDivisions';
import { getFixtureInsights } from '../utils/fixtures';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { formatDate, formatTime } from '../utils/format';
import type { TeamSeasonStats, FixtureWithTeams } from '@trytag/shared';

// Form component showing last 5 results as W/L/D badges
function FormBadges({ fixtures, teamId }: { fixtures: FixtureWithTeams[]; teamId: number }) {
  if (!fixtures || fixtures.length === 0) return null;

  // Get last 5 completed fixtures, most recent first, then reverse for display (oldest left, newest right)
  const completedFixtures = fixtures
    .filter(f => f.status === 'completed' && f.homeScore !== null && f.awayScore !== null)
    .slice(0, 5)
    .reverse(); // Reverse so oldest is on left, newest on right

  if (completedFixtures.length === 0) return null;

  return (
    <Group gap={8}>
      {completedFixtures.map((fixture, idx) => {
        const isHome = fixture.homeTeam?.id === teamId;
        const teamScore = isHome ? fixture.homeScore : fixture.awayScore;
        const oppScore = isHome ? fixture.awayScore : fixture.homeScore;
        const opponent = isHome ? fixture.awayTeam?.name : fixture.homeTeam?.name;

        let result: 'W' | 'L' | 'D' = 'D';
        let color = 'gray';

        if (teamScore !== null && oppScore !== null) {
          if (teamScore > oppScore) {
            result = 'W';
            color = 'green';
          } else if (teamScore < oppScore) {
            result = 'L';
            color = 'red';
          }
        }

        const isMostRecent = idx === completedFixtures.length - 1; // Last item is most recent

        return (
          <HoverCard key={fixture.id || idx} width={200} withArrow shadow="md">
            <HoverCard.Target>
              <Badge
                circle
                color={color}
                variant="filled"
                size="lg"
                style={{
                  minWidth: 28,
                  cursor: 'pointer',
                  outline: isMostRecent ? '2px solid var(--mantine-color-brand-3)' : 'none',
                  outlineOffset: '2px',
                }}
              >
                {result}
              </Badge>
            </HoverCard.Target>
            <HoverCard.Dropdown>
              <Text size="xs">{`${isMostRecent ? '(Latest) ' : ''}${result === 'W' ? 'Won' : result === 'L' ? 'Lost' : 'Drew'} ${teamScore}-${oppScore} vs ${opponent}`}</Text>
            </HoverCard.Dropdown>
          </HoverCard>
        );
      })}
    </Group>
  );
}

function PositionChart({ positionHistory }: { positionHistory: { week: number; position: number }[] }) {
  if (!positionHistory || positionHistory.length === 0) return null;

  const maxPosition = Math.max(...positionHistory.map(p => p.position), 5);
  const minPosition = 1;

  // Chart dimensions in pixels
  const width = 500;
  const height = 150;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points for the line
  const points = positionHistory.map((p, i) => {
    const x = padding.left + (i / (positionHistory.length - 1 || 1)) * chartWidth;
    // Invert Y so position 1 is at top
    const y = padding.top + ((p.position - minPosition) / (maxPosition - minPosition || 1)) * chartHeight;
    return { x, y, week: p.week, position: p.position };
  });

  // Create SVG path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Y-axis positions to show
  const yAxisPositions = Array.from(new Set([1, Math.ceil(maxPosition / 2), maxPosition])).sort((a, b) => a - b);

  return (
    <Card withBorder>
      <Title order={3} mb="md">Position History</Title>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: width }}
      >
        {/* Y-axis labels */}
        {yAxisPositions.map((pos) => {
          const y = padding.top + ((pos - minPosition) / (maxPosition - minPosition || 1)) * chartHeight;
          return (
            <text
              key={`label-${pos}`}
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--mantine-color-dimmed)"
            >
              {pos}
            </text>
          );
        })}

        {/* Grid lines */}
        {yAxisPositions.map((pos) => {
          const y = padding.top + ((pos - minPosition) / (maxPosition - minPosition || 1)) * chartHeight;
          return (
            <line
              key={`grid-${pos}`}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--mantine-color-gray-3)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--mantine-color-brand-6)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="5"
              fill={p.position === 1 ? 'var(--mantine-color-yellow-5)' : 'var(--mantine-color-brand-6)'}
              stroke="white"
              strokeWidth="2"
            />
            {/* Week label */}
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              fontSize="11"
              fill="var(--mantine-color-dimmed)"
            >
              W{p.week}
            </text>
          </g>
        ))}
      </svg>
    </Card>
  );
}

function StatsTable({ seasonStats }: { seasonStats: TeamSeasonStats[] }) {
  if (!seasonStats || seasonStats.length === 0) return null;

  const getLast3 = () => seasonStats.find(s => s.period === 'last3');
  const getSeason = () => seasonStats.find(s => s.period === 'season');
  const getAllTime = () => seasonStats.find(s => s.period === 'allTime');

  const last3 = getLast3();
  const season = getSeason();
  const allTime = getAllTime();

  if (!last3 && !season && !allTime) return null;

  return (
    <Card withBorder>
      <Title order={3} mb="md">Statistics</Title>
      <Table withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th></Table.Th>
            <Table.Th ta="center">Last 3</Table.Th>
            <Table.Th ta="center">Season</Table.Th>
            <Table.Th ta="center">All Time</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td fw={500}>Avg Scored</Table.Td>
            <Table.Td ta="center">{last3?.avgScored?.toFixed(2) ?? '-'}</Table.Td>
            <Table.Td ta="center">{season?.avgScored?.toFixed(2) ?? '-'}</Table.Td>
            <Table.Td ta="center">{allTime?.avgScored?.toFixed(2) ?? '-'}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={500}>Avg Conceded</Table.Td>
            <Table.Td ta="center">{last3?.avgConceded?.toFixed(2) ?? '-'}</Table.Td>
            <Table.Td ta="center">{season?.avgConceded?.toFixed(2) ?? '-'}</Table.Td>
            <Table.Td ta="center">{allTime?.avgConceded?.toFixed(2) ?? '-'}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={500}>Avg Points</Table.Td>
            <Table.Td ta="center">{last3?.avgPoints?.toFixed(2) ?? '-'}</Table.Td>
            <Table.Td ta="center">{season?.avgPoints?.toFixed(2) ?? '-'}</Table.Td>
            <Table.Td ta="center">{allTime?.avgPoints?.toFixed(2) ?? '-'}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={500} c="green">Biggest Win</Table.Td>
            <Table.Td ta="center" c="green">{last3?.biggestWin ?? '-'}</Table.Td>
            <Table.Td ta="center" c="green">{season?.biggestWin ?? '-'}</Table.Td>
            <Table.Td ta="center" c="green">{allTime?.biggestWin ?? '-'}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={500} c="red">Biggest Loss</Table.Td>
            <Table.Td ta="center" c="red">{last3?.biggestLoss ?? '-'}</Table.Td>
            <Table.Td ta="center" c="red">{season?.biggestLoss ?? '-'}</Table.Td>
            <Table.Td ta="center" c="red">{allTime?.biggestLoss ?? '-'}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { data: teamProfile, isLoading } = useTeam(parseInt(teamId, 10));
  const { isFavorite, toggleFavorite } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const currentDivisionId = teamProfile?.standings?.[0]?.divisionId;
  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(currentDivisionId ?? 0);
  const { data: statistics, isLoading: statsLoading } = useDivisionStatistics(currentDivisionId ?? 0);

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!teamProfile) {
    return (
      <Card withBorder>
        <Text c="dimmed" ta="center" py="xl">Team not found</Text>
      </Card>
    );
  }

  const isFav = isFavorite(teamProfile.id);

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="xl" p="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1} mb="xs">{teamProfile.name}</Title>
              <Text c="dimmed">Team Profile</Text>
            </div>
            <Button
              variant={isFav ? 'filled' : 'outline'}
              color={isFav ? 'yellow' : 'gray'}
              leftSection={isFav ? <IconStarFilled size={18} /> : <IconStar size={18} />}
              onClick={() => toggleFavorite(teamProfile, teamProfile.standings?.[0]?.leagueId)}
            >
              {isFav ? 'Favourited' : 'Add to Favourites'}
            </Button>
          </Group>

          {teamProfile.standings && teamProfile.standings.length > 0 && (
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="md">
                  <Title order={3}>Current Standing</Title>
                  {teamProfile.recentFixtures && teamProfile.recentFixtures.length > 0 && (
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">Form:</Text>
                      <FormBadges fixtures={teamProfile.recentFixtures} teamId={teamProfile.id} />
                    </Group>
                  )}
                </Group>
                <Link
                  to="/leagues/$leagueId"
                  params={{ leagueId: String(teamProfile.standings[0].leagueId) }}
                  style={{ textDecoration: 'none' }}
                >
                  <Badge variant="light" size="lg" style={{ cursor: 'pointer' }}>
                    {teamProfile.standings[0].leagueName} - {teamProfile.standings[0].divisionName}
                  </Badge>
                </Link>
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 4, md: 6 }}>
                <div>
                  <Text size="sm" c="dimmed">Position</Text>
                  <Text size="xl" fw={700}>{teamProfile.standings[0].position}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Played</Text>
                  <Text size="xl" fw={700}>{teamProfile.standings[0].played}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Won</Text>
                  <Text size="xl" fw={700} c="green">{teamProfile.standings[0].wins}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Lost</Text>
                  <Text size="xl" fw={700} c="red">{teamProfile.standings[0].losses}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Drawn</Text>
                  <Text size="xl" fw={700}>{teamProfile.standings[0].draws}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Points</Text>
                  <Text size="xl" fw={700}>{teamProfile.standings[0].totalPoints}</Text>
                </div>
              </SimpleGrid>
            </Card>
          )}

          {teamProfile.positionHistory && teamProfile.positionHistory.length > 0 && (
            <PositionChart positionHistory={teamProfile.positionHistory} />
          )}

          {teamProfile.seasonStats && teamProfile.seasonStats.length > 0 && (
            <StatsTable seasonStats={teamProfile.seasonStats} />
          )}

          {teamProfile.playerAwards && teamProfile.playerAwards.length > 0 && (
            <Card withBorder>
              <Title order={3} mb="md">
                <IconAward size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Player of the Match Awards
              </Title>
              <Stack gap="sm">
                {teamProfile.playerAwards.map((award, idx) => (
                  <Group key={idx} justify="space-between">
                    <Text fw={500}>{award.player?.name || 'Unknown Player'}</Text>
                    <Group gap={4}>
                      <IconTrophy size={16} color="gold" />
                      <Text fw={700}>{award.awardCount}</Text>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Card>
          )}

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>Recent Results</Title>
                <Button component={Link} to="/fixtures" variant="light" size="xs">
                  View all
                </Button>
              </Group>
              {standingsLoading || statsLoading ? <Center><Loader /></Center> :
                teamProfile.recentFixtures && teamProfile.recentFixtures.length > 0 ? (
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Opponent</Table.Th>
                        <Table.Th>Result</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {teamProfile.recentFixtures
                        .filter(f => f.status === 'completed')
                        .slice(0, 10)
                        .map((fixture, idx) => {
                          const isHome = fixture.homeTeam?.id === teamProfile.id;
                          const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;
                          const teamScore = isHome ? fixture.homeScore : fixture.awayScore;
                          const oppScore = isHome ? fixture.awayScore : fixture.homeScore;
                          const result = teamScore !== null && oppScore !== null
                            ? teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D'
                            : '-';

                          return (
                            <Table.Tr key={fixture.id || idx}>
                              <Table.Td>
                                <Text size="sm">{formatDate(fixture.fixtureDate)}</Text>
                                <Text size="xs" c="dimmed">{formatTime(fixture.fixtureTime)}</Text>
                              </Table.Td>
                              <Table.Td>
                                {opponent?.id && opponent.id > 0 ? (
                                  <Link
                                    to="/teams/$teamId"
                                    params={{ teamId: String(opponent.id) }}
                                    style={{ color: 'inherit', textDecoration: 'none' }}
                                  >
                                    <Text size="sm" c="blue">{opponent?.name || 'Unknown'}</Text>
                                  </Link>
                                ) : (
                                  <Text size="sm">{opponent?.name || 'Unknown'}</Text>
                                )}
                              </Table.Td>
                              <Table.Td>
                                <Group>
                                  <Badge
                                    fullWidth
                                    color={result === 'W' ? 'green' : result === 'L' ? 'red' : 'gray'}
                                    variant="filled"
                                  >
                                    {result} {teamScore !== null && `${teamScore}-${oppScore}`}
                                  </Badge>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                    </Table.Tbody>
                  </Table>
                ) : (
                  <Text c="dimmed" ta="center" py="md">No recent results available</Text>
                )}
            </Card>

            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3}>Upcoming Fixtures</Title>
                <Button component={Link} to="/fixtures" variant="light" size="xs">
                  View all
                </Button>
              </Group>
              {standingsLoading || statsLoading ? <Center><Loader /></Center> :
                teamProfile.upcomingFixtures && teamProfile.upcomingFixtures.length > 0 ? (
                  <Stack gap="sm">
                    {teamProfile.upcomingFixtures.map((fixture, idx) => {
                      const insights = getFixtureInsights(fixture, standings, statistics);
                      const insightIcons = insights.map((insight) => (
                        <HoverCard key={insight.type} width={200} withArrow shadow="md">
                          <HoverCard.Target>
                            {insight.type === 'top-clash' ? (
                              <IconTrophy size={16} color="orange" />
                            ) : (
                              <IconSparkles size={16} color="purple" />
                            )}
                          </HoverCard.Target>
                          <HoverCard.Dropdown>
                            <Text size="xs">{insight.text}</Text>
                          </HoverCard.Dropdown>
                        </HoverCard>
                      ));
                      const fixtureBadge = <Badge variant="light">{fixture.status}</Badge>;

                      return (
                        <Card key={fixture.id || idx} withBorder padding="sm">
                          <Group justify="space-between">
                            <div>
                              <Group>
                                {fixture.homeTeam ? (
                                  <Link to="/teams/$teamId" params={{ teamId: String(fixture.homeTeam.id) }} style={{ textDecoration: 'none' }}>
                                    <Text fw={500} c="blue">{fixture.homeTeam.name}</Text>
                                  </Link>
                                ) : (
                                  <Text fw={500}>TBD</Text>
                                )}
                                <Text fw={500}>vs</Text>
                                {fixture.awayTeam ? (
                                  <Link to="/teams/$teamId" params={{ teamId: String(fixture.awayTeam.id) }} style={{ textDecoration: 'none' }}>
                                    <Text fw={500} c="blue">{fixture.awayTeam.name}</Text>
                                  </Link>
                                ) : (
                                  <Text fw={500}>TBD</Text>
                                )}
                              </Group>
                              <Stack gap={0}>
                                <Text size="sm" c="dimmed">
                                  {formatDate(fixture.fixtureDate)}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {formatTime(fixture.fixtureTime)}
                                </Text>
                              </Stack>
                            </div>
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
                  <Text c="dimmed" ta="center" py="md">No upcoming fixtures</Text>
                )}
            </Card>
          </SimpleGrid>

          {teamProfile.previousSeasons && teamProfile.previousSeasons.length > 0 && (
            <Card withBorder>
              <Accordion variant="contained">
                <Accordion.Item value="previous-seasons">
                  <Accordion.Control>
                    <Title order={4}>Previous Seasons ({teamProfile.previousSeasons.length})</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="xs">
                      {teamProfile.previousSeasons.map((season, idx) => {
                        const spawtzUrl = season.leagueId && season.seasonId && season.divisionId
                          ? `https://trytagrugby.spawtz.com/Leagues/Standings?LeagueId=${season.leagueId}&SeasonId=${season.seasonId}&DivisionId=${season.divisionId}`
                          : null;

                        return (
                          <Group key={idx} gap="xs">
                            {spawtzUrl ? (
                              <a
                                href={spawtzUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none' }}
                              >
                                <Text size="sm" c="blue" fw={500}>{season.leagueName}</Text>
                              </a>
                            ) : (
                              <Text size="sm" fw={500}>{season.leagueName}</Text>
                            )}
                            <Text size="sm" c="dimmed">-</Text>
                            <Badge variant="light" size="sm">{season.seasonName}</Badge>
                            {season.divisionName && (
                              <Badge variant="outline" size="sm">{season.divisionName}</Badge>
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Card>
          )}
        </Stack>
      </Container>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/teams_/$teamId')({
  component: TeamDetailPage,
});
