import { createFileRoute, Link } from '@tanstack/react-router';
import { useMediaQuery } from '@mantine/hooks';
import {
  Box,
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
  Button,
  ActionIcon,
} from '@mantine/core';
import { IconTrophy, IconCalendar, IconClock, IconMapPin, IconExternalLink, IconBrandWhatsapp } from '@tabler/icons-react';
import { useFixtureDetail } from '../hooks/useFixtures';
import { QueryError } from '../components/QueryError';
import { useHeadToHead } from '../hooks/useHeadToHead';
import { MeetingsOnRecord } from '../components/MeetingsOnRecord';
import { displayPlayerName, formatDate, formatTime } from '../utils/format';
import { buildShareText, whatsappShareUrl } from '../utils/shareMatch';
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
  const isMobile = useMediaQuery('(max-width: 48em)');
  const standing = profile.standing;
  const seasonStats = profile.seasonStats?.find(s => s.period === 'season');

  return (
    <Card withBorder h="100%" p={isMobile ? 'sm' : 'md'}>
      <Stack gap={isMobile ? 'xs' : 'md'}>
        <Group justify="space-between" align="flex-start">
          <div>
            <Link
              to="/teams/$teamId"
              params={{ teamId: String(teamId) }}
              style={{ textDecoration: 'none' }}
            >
              <Title order={3} c="blue" fz={{ base: 'h4', sm: 'h3' }}>
                {teamName}
              </Title>
            </Link>
            {standing && (
              <Badge variant="light" size="md" mt={4}>
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
            <Text size="sm" c="dimmed" mb={4}>Player of the Match Awards (this season)</Text>
            <Stack gap={4}>
              {profile.playerAwards.slice(0, 3).map((award, idx) => (
                <Group key={idx} justify="space-between">
                  <Text size="sm">{displayPlayerName(award.player?.name)}</Text>
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
        <Title order={4} mb="md">Head to Head (this season)</Title>
        <Text c="dimmed" ta="center" py="md">
          No meetings found in this season's data
        </Text>
      </Card>
    );
  }

  const homePercent = (homeWins / totalGames) * 100;
  const drawPercent = (draws / totalGames) * 100;

  return (
    <Card withBorder>
      <Title order={4} mb="md">Head to Head (this season)</Title>

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
  const isMobile = useMediaQuery('(max-width: 48em)');
  const { data: fixture, isLoading, error, refetch } = useFixtureDetail(parsedId);
  // Meetings on record covers past seasons in the pilot leagues; elsewhere this season's head to head is the only record
  const meetings = useHeadToHead(fixture?.homeTeam.id, fixture?.awayTeam.id);
  const showSeasonHeadToHead = !meetings.isLoading && !(meetings.data && meetings.data.supported);

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
        {error ? (
          <QueryError onRetry={() => refetch()} />
        ) : (
          <Card withBorder>
            <Text c="dimmed" ta="center" py="xl">
              Fixture not found
            </Text>
          </Card>
        )}
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
    <Badge variant="light" size="md">
      {fixture.status}
    </Badge>
  );

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="xl" p="md">
        <Stack gap="md">
          <Card withBorder p={isMobile ? 'sm' : 'md'}>
            <Stack gap={isMobile ? 'xs' : 'md'} align="center">
              <Group gap="md" justify="center">
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

              <Group justify="center" align="center" gap={isMobile ? 4 : 'xl'}>
                <Box w={{ base: '100%', sm: 'auto' }}>
                  <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(fixture.homeTeam.id) }}
                  style={{ textDecoration: 'none' }}
                >
                  <Title order={2} c="blue" ta={{ base: 'center', sm: 'right' }} fz={{ base: 'h3', sm: 'h2' }}>
                    {fixture.homeTeam.name}
                  </Title>
                  </Link>
                </Box>
                {statusBadge}
                <Box w={{ base: '100%', sm: 'auto' }}>
                  <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(fixture.awayTeam.id) }}
                  style={{ textDecoration: 'none' }}
                >
                  <Title order={2} c="blue" ta={{ base: 'center', sm: 'left' }} fz={{ base: 'h3', sm: 'h2' }}>
                    {fixture.awayTeam.name}
                  </Title>
                  </Link>
                </Box>
              </Group>

              <Group gap={6} justify="center">
                {[fixture.homeTeam, fixture.awayTeam].map(
                  (t) =>
                    t.externalTeamId && (
                      <Button
                        key={t.id}
                        component="a"
                        href={`https://trytagrugby.spawtz.com/Leagues/TeamProfile?TeamId=${t.externalTeamId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="light"
                        size="xs"
                        maw="100%"
                        h="auto"
                        mih={30}
                        py={6}
                        styles={{ label: { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.25, height: 'auto', overflow: 'visible' } }}
                        rightSection={<IconExternalLink size={12} />}
                      >
                        {t.name} on Try Tag Rugby
                      </Button>
                    )
                )}
              </Group>

              {fixture.status !== 'completed' && (
                <ActionIcon
                  component="a"
                  href={whatsappShareUrl(buildShareText(fixture, `${window.location.origin}/fixtures/${fixture.id}`))}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="subtle"
                  color="gray"
                  size="sm"
                  aria-label="Share to WhatsApp"
                  title="Share to WhatsApp"
                >
                  <IconBrandWhatsapp size={16} />
                </ActionIcon>
              )}
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={isMobile ? 'sm' : 'md'}>
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

          {showSeasonHeadToHead && (
            <HeadToHeadSection
              homeWins={fixture.headToHead.homeWins}
              awayWins={fixture.headToHead.awayWins}
              draws={fixture.headToHead.draws}
              recentMeetings={fixture.headToHead.recentMeetings}
              homeTeamId={fixture.homeTeam.id}
              homeTeamName={fixture.homeTeam.name}
              awayTeamName={fixture.awayTeam.name}
            />
          )}

          <MeetingsOnRecord
            teamId={fixture.homeTeam.id}
            teamName={fixture.homeTeam.name}
            opponentId={fixture.awayTeam.id}
            opponentName={fixture.awayTeam.name}
          />
        </Stack>
      </Container>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/fixtures_/$fixtureId')({
  component: FixtureDetailPage,
});
