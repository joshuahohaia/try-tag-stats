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
import { QueryError } from '../components/QueryError';
import { Skeleton } from '@mantine/core';
import { PositionHistoryChart } from '../components/charts';
import { FixturesList } from '../components';
import { IconStar, IconStarFilled, IconTrophy, IconAward } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useTeam } from '../hooks/useTeams';
import { useDivisionStandings, useDivisionStatistics, useDivisions } from '../hooks/useDivisions';
import { useFavoriteTeams } from '../hooks/useFavorites';
import type { TeamSeasonStats, FixtureWithTeams, Standing } from '@trytag/shared';

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

// Spawtz gives biggest win/loss as a score string only ("13 - 7"). Find the one recent match
// with exactly that score and result, and only when the held matches reproduce Spawtz's averages.
// Otherwise leave the score as plain text.
function findScoreMatch(
  fixtures: FixtureWithTeams[],
  teamId: number,
  score: string | null | undefined,
  kind: 'win' | 'loss',
  firstPhase: Standing | undefined,
  limit?: number,
): FixtureWithTeams | null {
  const m = score?.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return null;
  const mine = Number(m[1]);
  const theirs = Number(m[2]);
  const done = fixtures
    .filter(f => f.status === 'completed' && f.homeScore !== null && f.awayScore !== null)
    .sort((a, b) => b.fixtureDate.localeCompare(a.fixtureDate));
  const pool = limit ? done.slice(0, limit) : done;
  // Only the Season column can be proven. Spawtz's "This Season" figures cover the first-phase results
  // table, so link only when the matches we hold agree with that phase's standing: same count, same
  // record and same points for and against. This is a consistency check, not proof of the same fixtures. Last 3 is never linked
  // (Spawtz counts phase 2 games there that we hold no results for).
  if (limit || !firstPhase || pool.length === 0 || pool.length !== firstPhase.played) return null;
  let scored = 0;
  let conceded = 0;
  let w = 0;
  let l = 0;
  let d = 0;
  for (const f of pool) {
    const isHome = f.homeTeam?.id === teamId;
    const a = (isHome ? f.homeScore : f.awayScore) ?? 0;
    const b = (isHome ? f.awayScore : f.homeScore) ?? 0;
    scored += a;
    conceded += b;
    if (a > b) w++;
    else if (a < b) l++;
    else d++;
  }
  if (scored !== firstPhase.pointsFor || conceded !== firstPhase.pointsAgainst) return null;
  if (w !== firstPhase.wins || l !== firstPhase.losses || d !== firstPhase.draws) return null;
  const hits = pool.filter(f => {
    const isHome = f.homeTeam?.id === teamId;
    const isAway = f.awayTeam?.id === teamId;
    if (!isHome && !isAway) return false;
    const a = isHome ? f.homeScore : f.awayScore;
    const b = isHome ? f.awayScore : f.homeScore;
    return a === mine && b === theirs && (kind === 'win' ? mine > theirs : mine < theirs);
  });
  return hits.length === 1 ? hits[0] : null;
}

function ScoreCell({
  score,
  match,
  teamId,
  color,
}: {
  score: string | null | undefined;
  match: FixtureWithTeams | null;
  teamId: number;
  color: string;
}) {
  const text = score ?? '-';
  if (!match) return <Table.Td ta="center" c={color}>{text}</Table.Td>;
  const opponent = match.homeTeam?.id === teamId ? match.awayTeam : match.homeTeam;
  if (!opponent || opponent.id === opponent.externalTeamId) return <Table.Td ta="center" c={color}>{text}</Table.Td>;
  return (
    <Table.Td ta="center" c={color}>
      <Link
        to="/matches/$teamId/$opponentId/$date"
        params={{ teamId: String(teamId), opponentId: String(opponent.id), date: match.fixtureDate }}
        search={match.fixtureTime ? { time: match.fixtureTime } : {}}
        style={{ color: 'inherit', textDecoration: 'underline' }}
        title={`Open the match vs ${opponent.name}`}
      >
        {text}
      </Link>
    </Table.Td>
  );
}

function StatsTable({
  seasonStats,
  fixtures,
  teamId,
  firstPhase,
}: {
  seasonStats: TeamSeasonStats[];
  fixtures: FixtureWithTeams[];
  teamId: number;
  firstPhase: Standing | undefined;
}) {
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
            <ScoreCell score={last3?.biggestWin} match={findScoreMatch(fixtures, teamId, last3?.biggestWin, 'win', firstPhase, 3)} teamId={teamId} color="green" />
            <ScoreCell score={season?.biggestWin} match={findScoreMatch(fixtures, teamId, season?.biggestWin, 'win', firstPhase)} teamId={teamId} color="green" />
            <Table.Td ta="center" c="green">{allTime?.biggestWin ?? '-'}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Td fw={500} c="red">Biggest Loss</Table.Td>
            <ScoreCell score={last3?.biggestLoss} match={findScoreMatch(fixtures, teamId, last3?.biggestLoss, 'loss', firstPhase, 3)} teamId={teamId} color="red" />
            <ScoreCell score={season?.biggestLoss} match={findScoreMatch(fixtures, teamId, season?.biggestLoss, 'loss', firstPhase)} teamId={teamId} color="red" />
            <Table.Td ta="center" c="red">{allTime?.biggestLoss ?? '-'}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Text size="xs" c="dimmed" mt="xs">
        From the Spawtz team page. Season covers first-phase results only. Last 3 can include later-phase games whose scores are not shown here. A Season score is a link only when the matches held here agree with the first-phase standing (same number played, same record, same points for and against). That is a consistency check, so the link is the matching game by score, not a verified record of the same fixture.
      </Text>
    </Card>
  );
}

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { data: teamProfile, isLoading, isError, refetch } = useTeam(parseInt(teamId, 10));
  const { isFavorite, toggleFavorite } = useFavoriteTeams();

  const currentStanding = teamProfile?.standings?.[0];
  const currentDivisionId = currentStanding?.divisionId;
  // Other standings in the same league and season (the other phases the team played in).
  const otherPhases = (teamProfile?.standings ?? []).filter(
    (st) =>
      currentStanding &&
      st.divisionId !== currentStanding.divisionId &&
      st.leagueId === currentStanding.leagueId &&
      st.seasonId === currentStanding.seasonId
  );
  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(currentDivisionId ?? 0);
  const { data: statistics, isLoading: statsLoading } = useDivisionStatistics(currentDivisionId ?? 0);
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(currentDivisionId ? [currentDivisionId] : []);

  if (isLoading) {
    return (
      <ScrollArea h="100%" type="auto">
        <Container size="xl" p="md">
          <Stack gap="md">
            {/* Header skeleton */}
            <Group justify="space-between" align="flex-start">
              <Stack gap="xs">
                <Skeleton height={36} width={250} radius="sm" />
                <Skeleton height={16} width={100} radius="sm" />
              </Stack>
              <Skeleton height={36} width={150} radius="sm" />
            </Group>

            {/* Standing card skeleton */}
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Skeleton height={24} width={150} radius="sm" />
                <Skeleton height={24} width={200} radius="xl" />
              </Group>
              <SimpleGrid cols={{ base: 2, sm: 4, md: 6 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Stack key={i} gap={4}>
                    <Skeleton height={14} width={60} radius="sm" />
                    <Skeleton height={28} width={40} radius="sm" />
                  </Stack>
                ))}
              </SimpleGrid>
            </Card>

            {/* Stats and chart skeleton */}
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Card withBorder>
                <Skeleton height={24} width={120} radius="sm" mb="md" />
                <Stack gap="sm">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} height={20} width="100%" radius="sm" />
                  ))}
                </Stack>
              </Card>
              <Card withBorder>
                <Skeleton height={24} width={150} radius="sm" mb="md" />
                <Skeleton height={200} width="100%" radius="sm" />
              </Card>
            </SimpleGrid>

            {/* Fixtures skeleton */}
            <Card withBorder>
              <Group justify="space-between" mb="md">
                <Skeleton height={24} width={80} radius="sm" />
                <Skeleton height={28} width={80} radius="sm" />
              </Group>
              <FixtureCardSkeleton count={5} />
            </Card>
          </Stack>
        </Container>
      </ScrollArea>
    );
  }

  if (!teamProfile) {
    return (
      <Container size="xl" p="md">
        {isError ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
          <Card withBorder>
            <Text c="dimmed" ta="center" py="xl">Team not found</Text>
          </Card>
        )}
      </Container>
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
              {teamProfile.profileStale && teamProfile.profileFetchedAt && (
                <Text size="xs" c="orange.8" mt={4}>
                  Could not refresh from Spawtz just now. Form, Position History and Statistics are from a copy last read{' '}
                  {formatDistanceToNow(new Date(teamProfile.profileFetchedAt), { addSuffix: true })} (
                  {new Date(teamProfile.profileFetchedAt).toLocaleString()}).
                </Text>
              )}
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
                  {!teamProfile.standings[0].phaseName &&
                    teamProfile.recentFixtures &&
                    teamProfile.recentFixtures.length > 0 && (
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
                  <Badge
                    variant="light"
                    size="lg"
                    style={{ cursor: 'pointer' }}
                    styles={{ label: { whiteSpace: 'normal' }, root: { height: 'auto', padding: '4px 10px' } }}
                  >
                    {teamProfile.standings[0].leagueName} - {teamProfile.standings[0].divisionName}
                    {teamProfile.standings[0].phaseName ? ` (${teamProfile.standings[0].phaseName})` : ''}
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
              {otherPhases.length > 0 && (
                <Stack gap={2} mt="md">
                  <Text size="sm" c="dimmed">Earlier in {teamProfile.standings[0].seasonName}</Text>
                  {otherPhases.map((st) => (
                    <Text size="sm" key={st.divisionId}>
                      {st.phaseName ?? 'First phase'} - {st.divisionName}: position {st.position}, played {st.played},{' '}
                      {st.wins}W {st.draws}D {st.losses}L, {st.totalPoints} pts
                    </Text>
                  ))}
                </Stack>
              )}
              {teamProfile.standings[0].phaseName && (
                <Stack gap="xs" mt="md">
                  {teamProfile.recentFixtures && teamProfile.recentFixtures.length > 0 && (
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">Form from Spawtz team page:</Text>
                      <FormBadges fixtures={teamProfile.recentFixtures} teamId={teamProfile.id} />
                    </Group>
                  )}
                  <Text size="xs" c="dimmed">
                    Form, Position History and Statistics below come from the Spawtz team page, and Player of the
                    Match awards from Spawtz division statistics, which Spawtz does not give for later phases. Spawtz
                    does not say which phase they cover, so they may not include {teamProfile.standings[0].phaseName}{' '}
                    games.
                  </Text>
                </Stack>
              )}
            </Card>
          )}

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {teamProfile.seasonStats && teamProfile.seasonStats.length > 0 && (
              <StatsTable
                seasonStats={teamProfile.seasonStats}
                fixtures={teamProfile.recentFixtures ?? []}
                teamId={teamProfile.id}
                firstPhase={teamProfile.standings?.find(
                  st => st.seasonId === teamProfile.standings?.[0]?.seasonId && st.leagueId === teamProfile.standings?.[0]?.leagueId && !st.phaseId,
                )}
              />
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
