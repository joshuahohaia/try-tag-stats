import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  SimpleGrid,
  Badge,
  Group,
  Button,
  Accordion,
  ScrollArea,
  Container,
  HoverCard,
  Table,
} from '@mantine/core';
import { FixtureCardSkeleton } from '../components/skeletons';
import { PositionHistoryChart } from '../components/charts';
import { FixturesList } from '../components';
import { IconStar, IconStarFilled, IconTrophy, IconAward } from '@tabler/icons-react';
import { useTeam } from '../hooks/useTeams';
import { useDivisionStandings, useDivisionStatistics, useDivisions } from '../hooks/useDivisions';
import { useFavoriteTeams } from '../hooks/useFavorites';
import type { TeamSeasonStats, FixtureWithTeams } from '@trytag/shared';

// Form component showing last 5 results as W/L/D badges
function FormBadges({ fixtures, teamId }: { fixtures: FixtureWithTeams[]; teamId: number }) {
  if (!fixtures || fixtures.length === 0) return null;

  // Get last 5 completed fixtures, most recent first, then reverse for display (oldest left, newest right)
  const completedFixtures = fixtures
    .filter(f => f.status === 'completed' && f.homeScore !== null && f.awayScore !== null)
    .slice(0, 5)
    .reverse(); // Reverse so oldest is on left, newest on right

  if (completedFixtures.length === 0) return <Text c="dimmed" size="xs">No form data</Text>;

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

  const currentDivisionId = teamProfile?.standings?.[0]?.divisionId;
  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(currentDivisionId ?? 0);
  const { data: statistics, isLoading: statsLoading } = useDivisionStatistics(currentDivisionId ?? 0);
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(currentDivisionId ? [currentDivisionId] : []);

  if (isLoading) {
    return (
      <ScrollArea h="100%" type="auto">
        <Container size="xl" p="md">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Stack gap="xs">
                <Text>Loading...</Text>
              </Stack>
            </Group>
          </Stack>
        </Container>
      </ScrollArea>
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

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {teamProfile.seasonStats && teamProfile.seasonStats.length > 0 && (
              <StatsTable seasonStats={teamProfile.seasonStats} />
            )}

            {teamProfile.positionHistory && teamProfile.positionHistory.length > 0 && (
              <PositionHistoryChart positionHistory={teamProfile.positionHistory} />
            )}
          </SimpleGrid>

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

          <Card withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3}>Fixtures</Title>
              <Button component={Link} to="/fixtures" variant="light" size="xs">
                View all
              </Button>
            </Group>
            {statsLoading || standingsLoading || divisionsLoading ? (
              <FixtureCardSkeleton count={5} />
            ) : (
              <FixturesList
                fixtures={[...teamProfile.upcomingFixtures, ...teamProfile.recentFixtures]}
                standings={standings}
                statistics={statistics}
                divisions={divisions}
                favoriteTeamIds={[teamProfile.id]}
                defaultSort="latest"
              />
            )}
          </Card>

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
