import { createFileRoute } from '@tanstack/react-router';
import { useMediaQuery } from '@mantine/hooks';
import {
  Title,
  Text,
  Stack,
  Container,
  SegmentedControl,
  ScrollArea,
  Button,
  Card,
  Group,
  Select,
} from '@mantine/core';
import { FixtureCardSkeleton } from '../components/skeletons';
import { QueryError } from '../components/QueryError';
import { SlowLoadingHint } from '../components/SlowLoadingHint';
import { useSlowLoading } from '../hooks/useSlowLoading';
import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useDivisions, useDivisionsStandings, useDivisionsStatistics } from '../hooks/useDivisions';
import { useLeaguesSummary } from '../hooks/useLeagues';
import { useUpcomingFixtures } from '../hooks/useFixtures';
import { FixturesList } from '../components';
import { apiClient, extractData } from '../api/client';
import type { FixtureWithTeams, StandingWithDivision } from '@trytag/shared';

interface TeamProfile {
  id: number;
  name: string;
  recentFixtures?: FixtureWithTeams[];
  upcomingFixtures?: FixtureWithTeams[];
  standings: StandingWithDivision[];
}

function FixturesPage() {
  const { view: searchView } = Route.useSearch();
  const [view, setView] = useState<string>(searchView ?? 'upcoming');

  // Follow the URL when it changes under a mounted page (e.g. dashboard "View All" links).
  useEffect(() => {
    setView(searchView ?? 'upcoming');
  }, [searchView]);
  const { favorites } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const navigate = useNavigate();
  const { data: leaguesSummary } = useLeaguesSummary();

  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);
  const hasFavorites = favorites.length > 0;

  // Visitors without favourites get the global upcoming list instead of an empty page.
  // Global recent results are not possible: the database only stores scheduled
  // fixtures, and scores are scraped per favourite team, so the Recent view stays
  // favourites-only until that data exists.
  const globalUpcoming = useUpcomingFixtures(undefined, 20);

  // Fetch team profiles to get recent fixtures (the /fixtures endpoint doesn't return scraped data properly)
  const teamQueries = useQueries({
    queries: favoriteIds.map((id) => ({
      queryKey: ['teams', id],
      queryFn: async () => {
        const response = await apiClient.get<{ success: boolean; data: TeamProfile }>(`/teams/${id}`);
        return extractData(response);
      },
      enabled: hasFavorites,
    })),
  });

  const isLoadingTeams = teamQueries.some(q => q.isLoading);
  const isErrorTeams = teamQueries.some(q => q.isError);
  const showSlowHint = useSlowLoading(isLoadingTeams);

  // Derive both upcoming and recent fixtures from team profiles
  const { upcomingFixtures, recentFixtures } = useMemo(() => {
    if (!hasFavorites) return { upcomingFixtures: [], recentFixtures: [] };

    const allUpcoming: FixtureWithTeams[] = [];
    const allRecent: FixtureWithTeams[] = [];

    teamQueries.forEach((query) => {
      if (query.data?.upcomingFixtures) {
        allUpcoming.push(...query.data.upcomingFixtures);
      }
      if (query.data?.recentFixtures) {
        allRecent.push(...query.data.recentFixtures);
      }
    });

    // Dedupe helper
    const dedupe = (fixtures: FixtureWithTeams[]) => {
      const seen = new Set<string>();
      return fixtures.filter((f) => {
        const key = `${f.fixtureDate}-${f.homeTeamId}-${f.awayTeamId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };

    return {
      upcomingFixtures: dedupe(allUpcoming).sort(
        (a, b) => new Date(a.fixtureDate).getTime() - new Date(b.fixtureDate).getTime()
      ),
      recentFixtures: dedupe(allRecent).sort(
        (a, b) => new Date(b.fixtureDate).getTime() - new Date(a.fixtureDate).getTime()
      ),
    };
  }, [teamQueries, hasFavorites]);

  const fixtures = hasFavorites
    ? view === 'upcoming'
      ? upcomingFixtures
      : recentFixtures
    : (globalUpcoming.data ?? []);
  const isLoading = hasFavorites ? isLoadingTeams : globalUpcoming.isLoading;

  const divisionIds = useMemo(() => {
    if (!fixtures) return [];
    return [...new Set(fixtures.map(f => f.divisionId))];
  }, [fixtures]);

  const { data: standings, isLoading: standingsLoading } = useDivisionsStandings(divisionIds);
  const { data: statistics, isLoading: statsLoading } = useDivisionsStatistics(divisionIds);
  const { data: divisions, isLoading: divisionsLoading } = useDivisions(divisionIds);

  return (
    <Stack h="100%" gap="0" style={{ overflow: 'hidden' }}>
      <Container size="xl" w="100%" p="md" flex={0}>
        <Stack gap="md">
          <div>
            <Title order={1} mb="xs">Fixtures</Title>
            {!isMobile && (
              <Text c="dimmed">
                {hasFavorites
                  ? 'View upcoming matches and recent results for your favourite teams'
                  : 'Upcoming matches across every league'}
              </Text>
            )}
          </div>

          {hasFavorites && (
            <SegmentedControl
              value={view}
              onChange={setView}
              data={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'recent', label: 'Recent Results' },
              ]}
            />
          )}
        </Stack>
      </Container>

      <ScrollArea flex={1} type="auto">
        <Container size="xl" p="md">
          {hasFavorites && isErrorTeams ? (
            <QueryError onRetry={() => teamQueries.forEach((q) => q.refetch())} />
          ) : !hasFavorites && globalUpcoming.isError ? (
            <QueryError onRetry={() => globalUpcoming.refetch()} />
          ) : isLoading || standingsLoading || statsLoading || divisionsLoading ? (
            <Stack gap="md">
              <SlowLoadingHint show={showSlowHint} />
              <FixtureCardSkeleton count={5} />
            </Stack>
          ) : fixtures && fixtures.length > 0 ? (
            <Stack gap="md">
              {!hasFavorites && (
                <Card withBorder bg="green.0" padding="sm">
                  <Group justify="space-between" wrap="wrap">
                    <Text size="sm">
                      Fixtures across every league. Add favourite teams to see their results too.
                    </Text>
                    <Group gap="xs" wrap="nowrap">
                      <Select
                        placeholder="Browse by league"
                        size="xs"
                        data={(leaguesSummary ?? [])
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((l) => ({ value: String(l.id), label: l.name }))}
                        onChange={(value) =>
                          value &&
                          navigate({ to: '/leagues/$leagueId', params: { leagueId: value } })
                        }
                      />
                      <Button component={Link} to="/teams" variant="light" size="xs">
                        Find teams
                      </Button>
                    </Group>
                  </Group>
                </Card>
              )}
              <FixturesList
                key={view}
                fixtures={fixtures}
                standings={standings}
                statistics={statistics}
                divisions={divisions}
                favoriteTeamIds={favoriteIds}
                defaultSort={view === 'upcoming' ? 'upcoming' : 'latest'}
              />
            </Stack>
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              {hasFavorites
                ? `No ${view} fixtures found for your favourite teams`
                : 'No upcoming fixtures found'}
            </Text>
          )}
        </Container>
      </ScrollArea>

      <Container size="xl" w="100%" p="md" flex={0}>
        <Text c="dimmed" size="sm">
          Showing {fixtures?.length || 0} {hasFavorites ? view : 'upcoming'} fixtures
        </Text>
      </Container>
    </Stack>
  );
}

export const Route = createFileRoute('/fixtures')({
  // ?view=recent opens straight onto Recent Results (dashboard "View All" links here).
  validateSearch: (search: Record<string, unknown>): { view?: 'upcoming' | 'recent' } => ({
    view: search.view === 'recent' ? 'recent' : undefined,
  }),
  component: FixturesPage,
});
