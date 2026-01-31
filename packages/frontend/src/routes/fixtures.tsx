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
} from '@mantine/core';
import { FixtureCardSkeleton } from '../components/skeletons';
import { useState, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useDivisions, useDivisionsStandings, useDivisionsStatistics } from '../hooks/useDivisions';
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
  const [view, setView] = useState('upcoming');
  const { favorites } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');

  const favoriteIds = useMemo(() => favorites.map(f => f.id), [favorites]);
  const hasFavorites = favorites.length > 0;

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

  const fixtures = view === 'upcoming' ? upcomingFixtures : recentFixtures;
  const isLoading = isLoadingTeams;

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
              <Text c="dimmed">View upcoming matches and recent results for Your Favourite Teams</Text>
            )}
          </div>

          <SegmentedControl
            value={view}
            onChange={setView}
            data={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'recent', label: 'Recent Results' },
            ]}
          />
        </Stack>
      </Container>

      <ScrollArea flex={1} type="auto">
        <Container size="xl" p="md">
          {!hasFavorites ? (
            <Stack align="center" py="xl">
              <Text c="dimmed">You haven't added any favourite teams yet.</Text>
              <Button component={Link} to="/leagues" variant="light">Browse Leagues</Button>
            </Stack>
          ) : isLoading || standingsLoading || statsLoading || divisionsLoading ? (
            <FixtureCardSkeleton count={5} />
          ) : fixtures && fixtures.length > 0 ? (
            <FixturesList
              key={view}
              fixtures={fixtures}
              standings={standings}
              statistics={statistics}
              divisions={divisions}
              favoriteTeamIds={favoriteIds}
              defaultSort={view === 'upcoming' ? 'upcoming' : 'latest'}
            />
          ) : (
            <Text c="dimmed" ta="center" py="xl">
              No {view} fixtures found for Your Favourite Teams
            </Text>
          )}
        </Container>
      </ScrollArea>

      <Container size="xl" w="100%" p="md" flex={0}>
        <Text c="dimmed" size="sm">
          Showing {fixtures?.length || 0} {view} fixtures
        </Text>
      </Container>
    </Stack>
  );
}

export const Route = createFileRoute('/fixtures')({
  component: FixturesPage,
});
