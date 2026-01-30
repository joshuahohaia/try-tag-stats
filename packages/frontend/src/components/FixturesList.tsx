import {
  Card,
  Text,
  Stack,
  Group,
  Badge,
  HoverCard,
} from '@mantine/core';
import { IconTrophy, IconSparkles, IconExternalLink } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { FixtureWithTeams, StandingWithTeam, PlayerAwardWithDetails, Division } from '@trytag/shared';
import { getFixtureInsights } from '../utils/fixtures';
import { formatDate, formatTime } from '../utils/format';

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

        const isPastScheduled =
          fixture.status === 'scheduled' &&
          new Date(fixture.fixtureDate) < new Date(new Date().toDateString());

        const fixtureBadge =
          fixture.status === 'completed' && fixture.homeScore !== null ? (
            <Badge size="lg" variant="filled" color={resultColor}>
              {fixture.homeScore} - {fixture.awayScore}
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
        const isScrapedFixture = fixture.id <= 0;

        // For scraped fixtures, determine which team's external profile to link to (prefer favorited team)
        const getExternalTeamId = () => {
          if (favoriteTeamIds.includes(fixture.homeTeam.id)) {
            return fixture.homeTeam.externalTeamId;
          }
          if (favoriteTeamIds.includes(fixture.awayTeam.id)) {
            return fixture.awayTeam.externalTeamId;
          }
          return fixture.homeTeam.externalTeamId;
        };

        const handleCardClick = () => {
          if (canLinkToFixture) {
            navigate({ to: '/fixtures/$fixtureId', params: { fixtureId: String(fixture.id) } });
          } else if (isScrapedFixture) {
            const externalTeamId = getExternalTeamId();
            if (externalTeamId) {
              window.open(`https://trytagrugby.spawtz.com/Leagues/TeamProfile?TeamId=${externalTeamId}`, '_blank');
            }
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
              <Group gap="xs" wrap='nowrap' justify='space-between' align='flex-start'>
                <Stack gap={2}>
                  <Text
                    fw={500}
                    size="sm"
                    style={{ cursor: 'pointer' }}
                    c="blue"
                    onClick={(e) => handleTeamClick(e, fixture.homeTeam.id)}
                  >
                    {fixture.homeTeam.name}
                  </Text>
                  <Text c="dimmed" size="xs">vs</Text>
                  <Text
                    fw={500}
                    size="sm"
                    style={{ cursor: 'pointer' }}
                    c="blue"
                    onClick={(e) => handleTeamClick(e, fixture.awayTeam.id)}
                  >
                    {fixture.awayTeam.name}
                  </Text>
                </Stack>
                <div onClick={handleCardClick} style={{ cursor: isClickable ? 'pointer' : undefined }}>
                  <Stack align="flex-end" gap={4}>
                    {fixtureBadge}
                    {insightIcons.length > 0 && <Group gap="xs">{insightIcons}</Group>}
                  </Stack>
                </div>
              </Group>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Stack
                  gap={0}
                  onClick={handleCardClick}
                  style={{ cursor: isClickable ? 'pointer' : undefined, flex: 1 }}
                >
                  <Text size="sm" c="dimmed">
                    {formatDate(fixture.fixtureDate)}
                    {!compact && fixture.fixtureTime && ` at ${formatTime(fixture.fixtureTime)}`}
                  </Text>
                  {!hideDivision && divisionName && (
                    <Text size="xs" c="dimmed" truncate>
                      {divisionName}
                    </Text>
                  )}
                  {!compact && fixture.pitch && (
                    <Text size="xs" c="dimmed">{fixture.pitch}</Text>
                  )}
                  {canLinkToFixture && (
                    <Text size="xs" c="blue" mt={2}>
                      View match details →
                    </Text>
                  )}
                  {isScrapedFixture && (
                    <Group gap={4} mt={2}>
                      <Text size="xs" c="blue">
                        View on TryTag Rugby
                      </Text>
                      <IconExternalLink size={12} color="var(--mantine-color-blue-6)" />
                    </Group>
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
