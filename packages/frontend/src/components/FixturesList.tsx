import {
  Card,
  Text,
  Stack,
  Group,
  Badge,
  HoverCard,
} from '@mantine/core';
import { IconTrophy, IconSparkles } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { FixtureWithTeams, StandingWithTeam, PlayerAwardWithDetails } from '@trytag/shared';
import { getFixtureInsights } from '../utils/fixtures';
import { formatDate, formatTime } from '../utils/format';
import { FixtureCardSkeleton } from './skeletons';

interface FixturesListProps {
  fixtures: FixtureWithTeams[];
  standings: StandingWithTeam[];
  statistics: PlayerAwardWithDetails[];
  isLoading: boolean;
  isMobile: boolean;
}

export function FixturesList({
  fixtures,
  standings,
  statistics,
  isLoading,
  isMobile,
}: FixturesListProps) {
  if (isLoading) {
    return <FixtureCardSkeleton count={5} />;
  }

  if (!fixtures || fixtures.length === 0) {
    return <Text c="dimmed">No fixtures data available</Text>;
  }

  return (
    <Stack gap="sm">
      {fixtures.map((fixture) => {
        const insights = getFixtureInsights(fixture, standings, statistics);

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

        const isPastScheduled =
          fixture.status === 'scheduled' &&
          new Date(fixture.fixtureDate) < new Date(new Date().toDateString());

        const fixtureBadge =
          fixture.status === 'completed' && fixture.homeScore !== null ? (
            <Badge size="lg" variant="filled">
              {fixture.homeScore} - {fixture.awayScore}
            </Badge>
          ) : isPastScheduled ? (
            <Badge variant="light" color="orange">
              Awaiting Results
            </Badge>
          ) : (
            <Badge variant="light">{fixture.status}</Badge>
          );

        return (
          <Card key={fixture.id} withBorder padding="sm">
            <Group justify="space-between">
              <Stack gap={2}>
                <Group gap="xs">
                  <Link
                    to="/teams/$teamId"
                    params={{ teamId: String(fixture.homeTeam.id) }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Text fw={500} c="blue">
                      {fixture.homeTeam.name}
                    </Text>
                  </Link>
                  <Text fw={500}>vs</Text>
                  <Link
                    to="/teams/$teamId"
                    params={{ teamId: String(fixture.awayTeam.id) }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Text fw={500} c="blue">
                      {fixture.awayTeam.name}
                    </Text>
                  </Link>
                </Group>
                <Stack gap={0}>
                  <Text size="sm" c="dimmed">
                    {formatDate(fixture.fixtureDate)}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {formatTime(fixture.fixtureTime)}
                    {fixture.pitch && ` - ${fixture.pitch}`}
                  </Text>
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
  );
}
