import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  SimpleGrid,
  Badge,
  Group,
  Container,
  ScrollArea,
  Table,
  Skeleton,
  Progress,
  Divider,
} from '@mantine/core';
import { IconTrophy, IconCalendar, IconClock, IconMapPin } from '@tabler/icons-react';
import { useFixtureDetail } from '../hooks/useFixtures';
import { formatDate, formatTime } from '../utils/format';
import type { TeamComparisonData, FixtureWithTeams } from '@trytag/shared';

function FormBadges({ form }: { form: string }) {
  if (!form) return <Text c="dimmed" size="xs">No form data</Text>;

  return (
    <Group gap={4}>
      {form.split('').map((result, idx) => {
        let color = 'gray';
        if (result === 'W') color = 'green';
        else if (result === 'L') color = 'red';

        return (
          <Badge
            key={idx}
            circle
            color={color}
            variant="filled"
            size="lg"
            style={{ minWidth: 28 }}
          >
            {result}
          </Badge>
        );
      })}
    </Group>
  );
}

function TeamCard({
  teamId,
  teamName,
  profile,
  side,
}: {
  teamId: number;
  teamName: string;
  profile: TeamComparisonData;
  side: 'home' | 'away';
}) {
  const standing = profile.standing;
  const seasonStats = profile.seasonStats?.find(s => s.period === 'season');

  return (
    <Card withBorder h="100%">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <div>
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(teamId) }}
              style={{ textDecoration: 'none' }}
            >
              <Title order={3} c="blue">
                {teamName}
              </Title>
            </Link>
            {standing && (
              <Badge variant="light" size="lg" mt="xs">
                {standing.position === 1 ? (
                  <Group gap={4}>
                    <IconTrophy size={14} />
                    <span>1st Place</span>
                  </Group>
                ) : (
                  `${standing.position}${getOrdinalSuffix(standing.position)} Place`
                )}
              </Badge>
            )}
          </div>
          <Badge variant="outline" color={side === 'home' ? 'blue' : 'red'}>
            {side === 'home' ? 'Home' : 'Away'}
          </Badge>
        </Group>

        {profile.recentForm && (
          <div>
            <Text size="sm" c="dimmed" mb={4}>Recent Form</Text>
            <FormBadges form={profile.recentForm} />
          </div>
        )}

        {standing && (
          <SimpleGrid cols={3}>
            <div>
              <Text size="xs" c="dimmed">Played</Text>
              <Text fw={600} size="lg">{standing.played}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">W-L-D</Text>
              <Text fw={600} size="lg">
                <Text span c="green">{standing.wins}</Text>
                {'-'}
                <Text span c="red">{standing.losses}</Text>
                {'-'}
                <Text span>{standing.draws}</Text>
              </Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">Points</Text>
              <Text fw={600} size="lg">{standing.totalPoints}</Text>
            </div>
          </SimpleGrid>
        )}

        {seasonStats && (
          <div>
            <Divider my="xs" />
            <SimpleGrid cols={2}>
              <div>
                <Text size="xs" c="dimmed">Avg Scored</Text>
                <Text fw={600} c="green">{seasonStats.avgScored.toFixed(1)}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">Avg Conceded</Text>
                <Text fw={600} c="red">{seasonStats.avgConceded.toFixed(1)}</Text>
              </div>
            </SimpleGrid>
          </div>
        )}

        {profile.playerAwards && profile.playerAwards.length > 0 && (
          <div>
            <Divider my="xs" />
            <Text size="sm" c="dimmed" mb={4}>Player of the Match Awards</Text>
            <Stack gap={4}>
              {profile.playerAwards.slice(0, 3).map((award, idx) => (
                <Group key={idx} justify="space-between">
                  <Text size="sm">{award.player?.name || 'Unknown'}</Text>
                  <Group gap={4}>
                    <IconTrophy size={14} color="gold" />
                    <Text size="sm" fw={600}>{award.awardCount}</Text>
                  </Group>
                </Group>
              ))}
            </Stack>
          </div>
        )}
      </Stack>
    </Card>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function HeadToHeadSection({
  homeWins,
  awayWins,
  draws,
  recentMeetings,
  homeTeamId,
  homeTeamName,
  awayTeamName,
}: {
  homeWins: number;
  awayWins: number;
  draws: number;
  recentMeetings: FixtureWithTeams[];
  homeTeamId: number;
  homeTeamName: string;
  awayTeamName: string;
}) {
  const totalGames = homeWins + awayWins + draws;

  if (totalGames === 0) {
    return (
      <Card withBorder>
        <Title order={4} mb="md">Head to Head</Title>
        <Text c="dimmed" ta="center" py="md">
          No previous meetings between these teams
        </Text>
      </Card>
    );
  }

  const homePercent = (homeWins / totalGames) * 100;
  const drawPercent = (draws / totalGames) * 100;

  return (
    <Card withBorder>
      <Title order={4} mb="md">Head to Head</Title>

      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={600} c="blue">{homeTeamName}: {homeWins} wins</Text>
        <Text size="sm" fw={600}>Draws: {draws}</Text>
        <Text size="sm" fw={600} c="red">{awayTeamName}: {awayWins} wins</Text>
      </Group>

      <Progress.Root size="xl" radius="xl">
        <Progress.Section value={homePercent} color="blue">
          <Progress.Label>{homeWins}</Progress.Label>
        </Progress.Section>
        <Progress.Section value={drawPercent} color="gray">
          <Progress.Label>{draws}</Progress.Label>
        </Progress.Section>
        <Progress.Section value={100 - homePercent - drawPercent} color="red">
          <Progress.Label>{awayWins}</Progress.Label>
        </Progress.Section>
      </Progress.Root>

      {recentMeetings.length > 0 && (
        <>
          <Text size="sm" c="dimmed" mt="md" mb="xs">Recent Meetings</Text>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Result</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentMeetings.map((meeting, idx) => {
                const homeIsOriginalHome = meeting.homeTeamId === homeTeamId;
                const displayHomeTeam = homeIsOriginalHome ? meeting.homeTeam : meeting.awayTeam;
                const displayAwayTeam = homeIsOriginalHome ? meeting.awayTeam : meeting.homeTeam;
                const displayHomeScore = homeIsOriginalHome ? meeting.homeScore : meeting.awayScore;
                const displayAwayScore = homeIsOriginalHome ? meeting.awayScore : meeting.homeScore;

                return (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Text size="sm">{formatDate(meeting.fixtureDate)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {displayHomeTeam?.name} {displayHomeScore} - {displayAwayScore} {displayAwayTeam?.name}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </>
      )}
    </Card>
  );
}

function FixtureDetailPage() {
  const { fixtureId } = Route.useParams();
  const parsedId = parseInt(fixtureId, 10);
  const { data: fixture, isLoading, error } = useFixtureDetail(parsedId);

  if (isLoading) {
    return (
      <ScrollArea h="100%" type="auto">
        <Container size="xl" p="md">
          <Stack gap="md">
            <Card withBorder>
              <Stack gap="md" align="center">
                <Skeleton height={24} width={200} />
                <Skeleton height={40} width={300} />
                <Skeleton height={20} width={150} />
              </Stack>
            </Card>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              <Card withBorder>
                <Stack gap="md">
                  <Skeleton height={28} width={150} />
                  <Skeleton height={24} width={100} />
                  <Skeleton height={60} />
                </Stack>
              </Card>
              <Card withBorder>
                <Stack gap="md">
                  <Skeleton height={28} width={150} />
                  <Skeleton height={24} width={100} />
                  <Skeleton height={60} />
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Container>
      </ScrollArea>
    );
  }

  if (error || !fixture) {
    return (
      <Container size="xl" p="md">
        <Card withBorder>
          <Text c="dimmed" ta="center" py="xl">
            Fixture not found
          </Text>
        </Card>
      </Container>
    );
  }

  const isPastScheduled =
    fixture.status === 'scheduled' &&
    new Date(fixture.fixtureDate) < new Date(new Date().toDateString());

  const statusBadge = fixture.status === 'completed' ? (
    <Badge variant="filled" color="green" size="xl">
      {fixture.homeScore} - {fixture.awayScore}
    </Badge>
  ) : isPastScheduled ? (
    <Badge variant="light" color="orange" size="lg">
      Awaiting Results
    </Badge>
  ) : (
    <Badge variant="light" size="lg">
      {fixture.status}
    </Badge>
  );

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="xl" p="md">
        <Stack gap="md">
          <Card withBorder>
            <Stack gap="md" align="center">
              <Group gap="md">
                <Group gap={4}>
                  <IconCalendar size={16} />
                  <Text size="sm">{formatDate(fixture.fixtureDate)}</Text>
                </Group>
                {fixture.fixtureTime && (
                  <Group gap={4}>
                    <IconClock size={16} />
                    <Text size="sm">{formatTime(fixture.fixtureTime)}</Text>
                  </Group>
                )}
                {fixture.pitch && (
                  <Group gap={4}>
                    <IconMapPin size={16} />
                    <Text size="sm">{fixture.pitch}</Text>
                  </Group>
                )}
              </Group>

              <Group justify="center" align="center" gap="xl">
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(fixture.homeTeam.id) }}
                  style={{ textDecoration: 'none' }}
                >
                  <Title order={2} c="blue" ta="right">
                    {fixture.homeTeam.name}
                  </Title>
                </Link>
                {statusBadge}
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(fixture.awayTeam.id) }}
                  style={{ textDecoration: 'none' }}
                >
                  <Title order={2} c="blue" ta="left">
                    {fixture.awayTeam.name}
                  </Title>
                </Link>
              </Group>
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <TeamCard
              teamId={fixture.homeTeam.id}
              teamName={fixture.homeTeam.name}
              profile={fixture.homeTeamProfile}
              side="home"
            />
            <TeamCard
              teamId={fixture.awayTeam.id}
              teamName={fixture.awayTeam.name}
              profile={fixture.awayTeamProfile}
              side="away"
            />
          </SimpleGrid>

          <HeadToHeadSection
            homeWins={fixture.headToHead.homeWins}
            awayWins={fixture.headToHead.awayWins}
            draws={fixture.headToHead.draws}
            recentMeetings={fixture.headToHead.recentMeetings}
            homeTeamId={fixture.homeTeam.id}
            homeTeamName={fixture.homeTeam.name}
            awayTeamName={fixture.awayTeam.name}
          />
        </Stack>
      </Container>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/fixtures_/$fixtureId')({
  component: FixtureDetailPage,
});
