import {
  Card,
  Text,
  Stack,
  Group,
  Flex,
  Badge,
  HoverCard,
} from '@mantine/core';
import { IconTrophy, IconSparkles } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { FixtureWithTeams, StandingWithTeam, PlayerAwardWithDetails, Division } from '@trytag/shared';
import { TeamJersey } from './TeamJersey';
import { getFixtureInsights } from '../utils/fixtures';
import { matchPath } from '../utils/matchLookup';
import { formatFixtureDate, fixtureCalendarDate, formatTime, venueCalendarDate } from '../utils/format';

interface FixturesListProps {
  fixtures: FixtureWithTeams[];
  standings?: StandingWithTeam[] | null;
  statistics?: PlayerAwardWithDetails[] | null;
  divisions?: Division[];
  favoriteTeamIds?: number[];
  compact?: boolean;
  hideDivision?: boolean;
  defaultSort?: 'latest' | 'upcoming';
}

export function FixturesList({
  fixtures,
  standings,
  statistics,
  divisions,
  favoriteTeamIds = [],
  compact = false,
  hideDivision = false,
  defaultSort = 'upcoming',
}: FixturesListProps) {
  const navigate = useNavigate();

  const sortedFixtures = useMemo(() => {
    if (!fixtures) return [];
    const sorted = [...fixtures].sort((a, b) => {
      const dateA = new Date(a.fixtureDate).getTime();
      const dateB = new Date(b.fixtureDate).getTime();
      if (defaultSort === 'latest') {
        return dateB - dateA;
      }
      return dateA - dateB;
    });
    return sorted;
  }, [fixtures, defaultSort]);

  if (!sortedFixtures || sortedFixtures.length === 0) {
    return <Text c="dimmed">No fixtures data available</Text>;
  }

  return (
    <Stack gap={compact ? 'xs' : 'sm'}>
      {sortedFixtures.map((fixture) => {
        const insights = getFixtureInsights(fixture, standings ?? undefined, statistics ?? undefined);

        // Determine result color based on favourite team's perspective
        let resultColor = 'gray';
        if (fixture.status === 'completed' && fixture.homeScore !== null && fixture.awayScore !== null) {
          const homeFavorite = favoriteTeamIds.includes(fixture.homeTeam.id);
          const awayFavorite = favoriteTeamIds.includes(fixture.awayTeam.id);

          if (homeFavorite && !awayFavorite) {
            resultColor = fixture.homeScore > fixture.awayScore ? 'green' : fixture.homeScore < fixture.awayScore ? 'red' : 'gray';
          } else if (awayFavorite && !homeFavorite) {
            resultColor = fixture.awayScore > fixture.homeScore ? 'green' : fixture.awayScore < fixture.homeScore ? 'red' : 'gray';
          } else {
            // Default to gray if both or neither are favorites, but you could use another color like 'blue' for clashes
            resultColor = 'gray';
          }
        }

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

        const fixtureCalDate = fixtureCalendarDate(fixture.fixtureDate);
        const isPastScheduled =
          fixture.status === 'scheduled' &&
          fixtureCalDate !== '' &&
          fixtureCalDate < venueCalendarDate();

        const hasScore = fixture.status === 'completed' && fixture.homeScore !== null;
        // A result without a score (later-phase games Spawtz lists only as win/draw points).
        const resultOnly = fixture.status === 'completed' && fixture.homeScore === null && !!fixture.outcome;
        const resultOnlyLabel = !resultOnly
          ? null
          : fixture.outcome === 'D'
            ? 'Draw'
            : favoriteTeamIds.includes(fixture.awayTeam.id) && !favoriteTeamIds.includes(fixture.homeTeam.id)
              ? fixture.outcome === 'A' ? 'Won' : 'Lost'
              : favoriteTeamIds.includes(fixture.homeTeam.id) && !favoriteTeamIds.includes(fixture.awayTeam.id)
                ? fixture.outcome === 'H' ? 'Won' : 'Lost'
                : fixture.outcome === 'H' ? `${fixture.homeTeam.name} won` : `${fixture.awayTeam.name} won`;
        const resultOnlyColor = resultOnlyLabel === 'Won' ? 'green' : resultOnlyLabel === 'Lost' ? 'red' : 'gray';

        const fixtureBadge =
          fixture.status === 'completed' && fixture.homeScore !== null ? (
            <Badge size="lg" variant="filled" color={resultColor}>
              {fixture.homeScore} - {fixture.awayScore}
            </Badge>
          ) : resultOnly ? (
            <Badge size="lg" variant="filled" color={resultOnlyColor} title="Spawtz does not publish the score for this game">
              {resultOnlyLabel}
            </Badge>
          ) : isPastScheduled ? (
            <Badge variant="light" color="orange">
              Awaiting Results
            </Badge>
          ) : (
            <Badge variant="light">{fixture.status}</Badge>
          );

        // Link to fixture detail for DB fixtures, or external link for scraped data
        const canLinkToFixture = fixture.id > 0;
        const isScrapedFixture = fixture.id <= 0 && !resultOnly;

        const handleCardClick = () => {
          if (canLinkToFixture) {
            navigate({ to: '/fixtures/$fixtureId', params: { fixtureId: String(fixture.id) } });
          } else if (isScrapedFixture) {
            navigate(matchPath(fixture));
          }
        };

        const handleTeamClick = (e: React.MouseEvent, teamId: number) => {
          e.stopPropagation();
          navigate({ to: '/teams/$teamId', params: { teamId: String(teamId) } });
        };

        const divisionName = divisions?.find(d => d.id === fixture.divisionId)?.name;

        const isClickable = canLinkToFixture || isScrapedFixture;

        return (
          <Card
            key={fixture.id}
            withBorder
            padding={compact ? 'xs' : 'sm'}
            style={isClickable ? { cursor: 'pointer' } : {}}
          >
            <Stack gap={compact ? 'xs' : 'sm'}>
              {/* Scores always sit top right. Status badges (with insight icons) sit under the names on
                  phones and top right from the xs breakpoint, so the layout never depends on name or
                  badge width. */}
              <Flex
                gap="xs"
                wrap="nowrap"
                justify="space-between"
                align="flex-start"
                direction={hasScore || resultOnly ? 'row' : { base: 'column', xs: 'row' }}
              >
                <Stack gap={2} flex={hasScore || resultOnly ? '1 1 0' : { base: '0 0 auto', xs: '1 1 0' }} style={{ minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <TeamJersey name={fixture.homeTeam.name} teamId={fixture.homeTeam.id} size={20} decorative />
                    <Text
                      fw={500}
                      size="sm"
                      style={{ cursor: 'pointer' }}
                      c="blue"
                      onClick={(e) => handleTeamClick(e, fixture.homeTeam.id)}
                    >
                      {fixture.homeTeam.name}
                    </Text>
                  </Group>
                  <Text c="dimmed" size="xs">vs</Text>
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <TeamJersey name={fixture.awayTeam.name} teamId={fixture.awayTeam.id} size={20} decorative />
                    <Text
                      fw={500}
                      size="sm"
                      style={{ cursor: 'pointer' }}
                      c="blue"
                      onClick={(e) => handleTeamClick(e, fixture.awayTeam.id)}
                    >
                      {fixture.awayTeam.name}
                    </Text>
                  </Group>
                </Stack>
                <div onClick={handleCardClick} style={{ cursor: isClickable ? 'pointer' : undefined, flexShrink: 0 }}>
                  <Group gap="xs" wrap="nowrap" align="center">
                    {fixtureBadge}
                    {insightIcons.length > 0 && (
                      <Group gap={6} wrap="nowrap" align="center">
                        {insightIcons}
                      </Group>
                    )}
                  </Group>
                </div>
              </Flex>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack
                  gap={0}
                  onClick={handleCardClick}
                  style={{ cursor: isClickable ? 'pointer' : undefined, flex: 1 }}
                >
                  <Text size="sm" c="dimmed">
                    {formatFixtureDate(fixture.fixtureDate)}
                    {fixture.fixtureTime && ` at ${formatTime(fixture.fixtureTime)}`}
                  </Text>
                  {resultOnly && (
                    <Text size="xs" c="dimmed">Score not published by Spawtz</Text>
                  )}
                  {!hideDivision && divisionName && (
                    <Text size="xs" c="dimmed" truncate>
                      {divisionName}
                    </Text>
                  )}
                  {!compact && fixture.pitch && (
                    <Text size="xs" c="dimmed">{fixture.pitch}</Text>
                  )}
                  {!resultOnly && (
                    <Text size="xs" c="blue" mt={2}>
                      View match details →
                    </Text>
                  )}
                </Stack>
              </Group>
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
