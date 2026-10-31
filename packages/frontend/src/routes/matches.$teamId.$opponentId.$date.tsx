import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { Title, Text, Card, Stack, Group, Badge, Container, ScrollArea, Button, Skeleton } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { useTeam } from '../hooks/useTeams';
import { QueryError } from '../components/QueryError';
import { formatDate, formatTime } from '../utils/format';
import { isResolvedTeam, lookupMatch, matchPath } from '../utils/matchLookup';
import type { FixtureWithTeams } from '@trytag/shared';

function spawtzTeamPage(externalTeamId: number | null | undefined) {
  return externalTeamId ? `https://trytagrugby.spawtz.com/Leagues/TeamProfile?TeamId=${externalTeamId}` : null;
}

function MatchSummary({ fixture }: { fixture: FixtureWithTeams }) {
  const played = fixture.status === 'completed' && fixture.homeScore !== null;
  const own = fixture.homeScore ?? 0;
  const opp = fixture.awayScore ?? 0;
  const color = !played ? 'gray' : own > opp ? 'green' : own < opp ? 'red' : 'gray';
  const link = spawtzTeamPage(fixture.homeTeam.externalTeamId);
  return (
    <Card withBorder>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2}>
            <Link to="/teams/$teamId" params={{ teamId: String(fixture.homeTeam.id) }} style={{ textDecoration: 'none' }}>
              <Title order={3} c="blue">{fixture.homeTeam.name}</Title>
            </Link>
            <Text c="dimmed" size="sm">vs</Text>
            {isResolvedTeam(fixture.awayTeam) ? (
              <Link to="/teams/$teamId" params={{ teamId: String(fixture.awayTeam.id) }} style={{ textDecoration: 'none' }}>
                <Title order={3} c="blue">{fixture.awayTeam.name}</Title>
              </Link>
            ) : (
              <Title order={3}>{fixture.awayTeam.name}</Title>
            )}
          </Stack>
          {played ? (
            <Badge size="xl" variant="filled" color={color}>{fixture.homeScore} - {fixture.awayScore}</Badge>
          ) : (
            <Badge size="lg" variant="light">{fixture.status}</Badge>
          )}
        </Group>
        <Stack gap={2}>
          <Text size="sm">
            {formatDate(fixture.fixtureDate)}
            {fixture.fixtureTime ? ` at ${formatTime(fixture.fixtureTime)}` : ''}
          </Text>
          {fixture.pitch && <Text size="sm" c="dimmed">{fixture.pitch}</Text>}
        </Stack>
        {played && (
          <Text size="xs" c="dimmed">
            Score is shown from {fixture.homeTeam.name}'s point of view, as listed on their Try Tag Rugby team page.
          </Text>
        )}
        {link && (
          <Button
            component="a"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            variant="light"
            rightSection={<IconExternalLink size={14} />}
            w="fit-content"
          >
            View on Try Tag Rugby
          </Button>
        )}
        <Text size="xs" c="dimmed">
          Opens the Try Tag Rugby team page for {fixture.homeTeam.name}.
        </Text>
      </Stack>
    </Card>
  );
}

function MatchPage() {
  const { teamId, opponentId, date } = Route.useParams();
  const { time } = Route.useSearch();
  const { data: team, isLoading, error, refetch } = useTeam(parseInt(teamId, 10));

  if (isLoading) {
    return (
      <Container size="md" p="md">
        <Card withBorder><Skeleton height={120} /></Card>
      </Container>
    );
  }
  if (error) {
    return (
      <Container size="md" p="md">
        <QueryError onRetry={() => refetch()} />
      </Container>
    );
  }

  const all = [...(team?.recentFixtures ?? []), ...(team?.upcomingFixtures ?? [])];
  const result = lookupMatch(all, parseInt(teamId, 10), parseInt(opponentId, 10), date, time);

  // A stored fixture has its own detail page, so use it when the identity is exact.
  if (result.kind === 'one' && result.fixture.id > 0) {
    return <Navigate to="/fixtures/$fixtureId" params={{ fixtureId: String(result.fixture.id) }} replace />;
  }

  return (
    <ScrollArea h="100%" type="auto">
      <Container size="md" p="md">
        <Stack gap="md">
          <Title order={2}>Match details</Title>
          {result.kind === 'one' && <MatchSummary fixture={result.fixture} />}
          {result.kind === 'many' && (
            <Card withBorder>
              <Stack gap="sm">
                <Text fw={600}>More than one match matches this link</Text>
                <Text size="sm" c="dimmed">
                  These teams are listed together more than once on {formatDate(date)}. Pick the one you meant.
                </Text>
                {result.fixtures.map((f, i) => (
                  <Link key={i} {...matchPath(f)} style={{ textDecoration: 'none' }}>
                    <Text c="blue" size="sm">
                      {f.fixtureTime ? formatTime(f.fixtureTime) : 'Time not listed'}
                      {f.status === 'completed' && f.homeScore !== null ? ` - ${f.homeScore}-${f.awayScore}` : ` - ${f.status}`}
                    </Text>
                  </Link>
                ))}
              </Stack>
            </Card>
          )}
          {result.kind === 'none' && (
            <Card withBorder>
              <Text c="dimmed" ta="center" py="xl">
                No matching fixture found on this team page.
              </Text>
            </Card>
          )}
          <Text size="xs" c="dimmed">
            Player of the match is not available in this fixture data.
          </Text>
        </Stack>
      </Container>
    </ScrollArea>
  );
}

export const Route = createFileRoute('/matches/$teamId/$opponentId/$date')({
  validateSearch: (search: Record<string, unknown>): { time?: string } => ({
    time: typeof search.time === 'string' && /^\d{1,2}:\d{2}$/.test(search.time) ? search.time : undefined,
  }),
  component: MatchPage,
});
