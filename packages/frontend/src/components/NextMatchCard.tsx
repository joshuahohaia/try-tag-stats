import {
  ActionIcon,
  Badge,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconCalendarPlus,
  IconChevronRight,
  IconMapPin,
} from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import type { Division, FixtureWithTeams, League } from '@trytag/shared';
import { apiClient, extractData } from '../api/client';
import { fixtureCalendarDate, formatFixtureDate, formatTime } from '../utils/format';
import { buildShareText, whatsappShareUrl } from '../utils/shareMatch';
import { googleCalendarUrl } from '../utils/calendarLink';
import { trackEvent } from '../utils/analytics';
import { TeamJersey } from './TeamJersey';

interface NextMatchCardProps {
  /** Upcoming fixtures involving the favourite teams. */
  fixtures: FixtureWithTeams[];
  favoriteIds: number[];
  /** Divisions for those fixtures, used to find each fixture's league venue. */
  divisions?: Division[];
}

/** Weekday-first label ("Sunday 9 Nov"); falls back to the standard fixture date. */
function weekdayLabel(fixtureDate: string): string {
  const cal = fixtureCalendarDate(fixtureDate);
  if (!cal) return formatFixtureDate(fixtureDate);
  try {
    return format(parseISO(cal), 'EEEE d MMM');
  } catch {
    return formatFixtureDate(fixtureDate);
  }
}

export function NextMatchCard({ fixtures, favoriteIds, divisions }: NextMatchCardProps) {
  const navigate = useNavigate();
  // The soonest upcoming fixture for each favourite team, deduped (two favourites
  // can meet each other), soonest first, capped so the card stays compact.
  const nextFixtures = useMemo(() => {
    const scheduled = fixtures
      .filter((f) => f.status === 'scheduled')
      .sort((a, b) => new Date(a.fixtureDate).getTime() - new Date(b.fixtureDate).getTime());
    const perTeam = new Map<number, FixtureWithTeams>();
    for (const favId of favoriteIds) {
      const next = scheduled.find((f) => f.homeTeamId === favId || f.awayTeamId === favId);
      if (next) perTeam.set(favId, next);
    }
    const seen = new Set<string>();
    return [...perTeam.values()]
      .filter((f) => {
        const key = `${f.fixtureDate}-${f.homeTeamId}-${f.awayTeamId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.fixtureDate).getTime() - new Date(b.fixtureDate).getTime())
      .slice(0, 3);
  }, [fixtures, favoriteIds]);

  // Venue names live on the league, reached through the fixture's division. Spawtz
  // league names are usually the venue itself ("Battersea Park Astro"), so the
  // league name stands in when no separate venue name is stored.
  const leagueIds = useMemo(() => {
    const ids = new Set<number>();
    for (const f of nextFixtures) {
      const leagueId = divisions?.find((d) => d.id === f.divisionId)?.leagueId;
      if (leagueId) ids.add(leagueId);
    }
    return [...ids];
  }, [nextFixtures, divisions]);

  const leagueQueries = useQueries({
    queries: leagueIds.map((id) => ({
      queryKey: ['leagues', id],
      queryFn: async () => {
        const response = await apiClient.get<{ success: boolean; data: League }>(`/leagues/${id}`);
        return extractData(response);
      },
      staleTime: 1000 * 60 * 60 * 24, // League venue names are static
    })),
  });

  const venueByLeagueId = useMemo(() => {
    const map = new Map<number, string>();
    leagueIds.forEach((id, i) => {
      const league = leagueQueries[i]?.data;
      const venue = league?.venueName ?? league?.name;
      if (venue) map.set(id, venue);
    });
    return map;
  }, [leagueIds, leagueQueries]);

  if (nextFixtures.length === 0) return null;

  return (
    <Card withBorder>
      <Title fz={15} order={3} mb="xs">
        <IconCalendarEvent size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Next Match
      </Title>
      <Stack gap="sm">
        {nextFixtures.map((fixture, idx) => {
          const favoriteId = favoriteIds.find(
            (id) => id === fixture.homeTeamId || id === fixture.awayTeamId
          );
          const leagueId = divisions?.find((d) => d.id === fixture.divisionId)?.leagueId;
          const venueName = leagueId ? venueByLeagueId.get(leagueId) : undefined;
          const calendarUrl = googleCalendarUrl(fixture, venueName);
          const relative = formatFixtureDate(fixture.fixtureDate);
          const time = formatTime(fixture.fixtureTime);
          const hasMatchPage = fixture.id > 0;

          const teamLine = (teamId: number, name: string) => (
            <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
              <TeamJersey name={name} teamId={teamId} size={20} decorative />
              <Text size="sm" fw={teamId === favoriteId ? 700 : 500} truncate>
                {name}
              </Text>
            </Group>
          );

          return (
            <Stack key={`${fixture.id}-${fixture.fixtureDate}`} gap={4}>
              {idx > 0 && <Divider />}
              <Stack gap={2} style={{ minWidth: 0 }}>
                {/* Date row carries the actions so team names and venue get the
                    full card width on phones instead of being squeezed. */}
                <Group justify="space-between" wrap="nowrap" align="center">
                  <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                    <Text size="sm" fw={700}>
                      {weekdayLabel(fixture.fixtureDate)}
                      {time ? ` at ${time}` : ''}
                    </Text>
                    {(relative === 'Today' || relative === 'Tomorrow') && (
                      <Badge size="sm" variant="light" color="green">
                        {relative}
                      </Badge>
                    )}
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    {hasMatchPage && (
                      <Tooltip label="Share to WhatsApp">
                        <ActionIcon
                          component="a"
                          href={whatsappShareUrl(
                            buildShareText(fixture, `${window.location.origin}/fixtures/${fixture.id}`)
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="subtle"
                          aria-label="Share to WhatsApp"
                          onClick={() => trackEvent('share-whatsapp')}
                        >
                          <IconBrandWhatsapp size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {calendarUrl && (
                      <Tooltip label="Add to Google Calendar (end time is a 1-hour estimate)">
                        <ActionIcon
                          component="a"
                          href={calendarUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="subtle"
                          aria-label="Add to Google Calendar"
                        >
                          <IconCalendarPlus size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {hasMatchPage && (
                      <Tooltip label="Match details">
                        <ActionIcon
                          variant="subtle"
                          aria-label="Match details"
                          onClick={() =>
                            navigate({
                              to: '/fixtures/$fixtureId',
                              params: { fixtureId: String(fixture.id) },
                            })
                          }
                        >
                          <IconChevronRight size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
                <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                  {teamLine(fixture.homeTeamId, fixture.homeTeam.name)}
                  <Text size="xs" c="dimmed">
                    v
                  </Text>
                  {teamLine(fixture.awayTeamId, fixture.awayTeam.name)}
                </Group>
                {(venueName || fixture.pitch) && (
                  <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                    <IconMapPin size={14} style={{ flexShrink: 0 }} />
                    <Text size="xs" c="dimmed" truncate>
                      {venueName ? (
                        <Text
                          component="a"
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venueName)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="xs"
                          c="dimmed"
                          td="underline"
                        >
                          {venueName}
                        </Text>
                      ) : null}
                      {venueName && fixture.pitch ? ' · ' : ''}
                      {fixture.pitch}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}
