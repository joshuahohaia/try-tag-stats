import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Title, Text, Card, Stack, TextInput, Center, ScrollArea, Container,
  ActionIcon, Group,
} from '@mantine/core';
import { TeamCardSkeleton } from '../components/skeletons';
import { QueryError } from '../components/QueryError';
import { SlowLoadingHint } from '../components/SlowLoadingHint';
import { useSlowLoading } from '../hooks/useSlowLoading';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { IconSearch, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useTeams, type TeamProfile } from '../hooks/useTeams';
import { apiClient, extractData } from '../api/client';
import { Team } from '@trytag/shared';
import { TeamJersey } from '../components/TeamJersey';

function TeamsPage() {
  const [search, setSearch] = useState('');
  const { data: teams = [], isLoading, isError, refetch } = useTeams();
  const showSlowHint = useSlowLoading(isLoading);
  const { favorites, toggleFavorite, cleanupFavorites } = useFavoriteTeams();
  const isMobile = useMediaQuery('(max-width: 48em)');

  useEffect(() => {
    if (!isLoading && teams.length > 0) {
      const validTeamIds = teams.map(t => t.id);
      cleanupFavorites(validTeamIds);
    }
  }, [isLoading, teams, cleanupFavorites]);

  const favoriteSet = new Set(favorites.map((f) => f.id));

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const aIsFavorite = favoriteSet.has(a.id);
      const bIsFavorite = favoriteSet.has(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [teams, favoriteSet]);

  const [debouncedSearch] = useDebouncedValue(search, 300);

  const filteredTeams = sortedTeams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase())
  );
  const contextFilteredTeams = useMemo(
    () =>
      sortedTeams.filter((team) =>
        team.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      ),
    [sortedTeams, debouncedSearch]
  );

  // Team names aren't unique, so search results carry their current league and
  // division. Profiles are only fetched for the first few visible results once
  // the search text settles (debounced, so typing does not fan out a request
  // per keystroke), and share the team cache the rest of the app uses.
  const CONTEXT_RESULT_LIMIT = 8;
  const isSearching = debouncedSearch.trim().length > 0;
  const contextTeams = useMemo(
    () => (isSearching ? contextFilteredTeams.slice(0, CONTEXT_RESULT_LIMIT) : []),
    [isSearching, contextFilteredTeams]
  );
  const contextQueries = useQueries({
    queries: contextTeams.map((team) => ({
      queryKey: ['teams', team.id],
      queryFn: async () => {
        const response = await apiClient.get<{ success: boolean; data: TeamProfile }>(
          `/teams/${team.id}`
        );
        return extractData(response);
      },
      staleTime: 1000 * 60 * 5,
    })),
  });
  const contextByTeamId = useMemo(() => {
    const map = new Map<number, { loading: boolean; label: string }>();
    contextTeams.forEach((team, i) => {
      const query = contextQueries[i];
      if (!query || query.isLoading) {
        map.set(team.id, { loading: true, label: '' });
        return;
      }
      // A failed profile lookup shows no subtitle rather than a wrong label.
      if (query.isError) return;
      const current = query.data?.standings?.[0];
      if (!current) {
        map.set(team.id, { loading: false, label: 'No current league' });
        return;
      }
      const label = current.phaseName
        ? `${current.leagueName} · ${current.divisionName} (${current.phaseName})`
        : `${current.leagueName} · ${current.divisionName}`;
      map.set(team.id, { loading: false, label });
    });
    return map;
  }, [contextTeams, contextQueries]);

  const handleFavoriteClick = (team: Team) => {
    toggleFavorite(team);
  };

  return (
    <Stack h="100%" gap="0" style={{ overflow: 'hidden' }}>
      <Container size="xl" w="100%" p="md" flex={0}>
        <Stack gap="lg">
          <div>
            <Title order={1} mb="xs">Teams</Title>
            {!isMobile && (
              <Text c="dimmed">
                Search for teams and manage your favorites.
              </Text>
            )}
          </div>
          <TextInput
            placeholder="Search all teams..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </Stack>
      </Container>

      <ScrollArea flex={1} type="auto">
        <Container size="xl" p="md" pb={isMobile ? 80 : "md"}>
          <Stack gap="xl">


            <Stack gap="sm">
              {isError ? (
                <QueryError onRetry={() => refetch()} />
              ) : isLoading ? (
                <Stack gap="md">
                  <SlowLoadingHint show={showSlowHint} />
                  <TeamCardSkeleton count={10} />
                </Stack>
              ) : teams.length > 0 ? (
                <>
                  {filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => (
                      <Card withBorder key={team.id}>
                        <Group justify="space-between" wrap="nowrap">
                          <Link
                            to="/teams/$teamId"
                            params={{ teamId: String(team.id) }}
                            style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}
                          >
                            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                              <TeamJersey name={team.name} teamId={team.id} size={32} decorative />
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text fw={500} truncate>{team.name}</Text>
                                {isSearching && contextByTeamId.has(team.id) && (
                                  <Text size="xs" c="dimmed" truncate>
                                    {contextByTeamId.get(team.id)!.loading
                                      ? 'Loading league…'
                                      : contextByTeamId.get(team.id)!.label}
                                  </Text>
                                )}
                              </Stack>
                            </Group>
                          </Link>
                          <ActionIcon
                            variant="transparent"
                            onClick={() => handleFavoriteClick(team)}
                            aria-label={favoriteSet.has(team.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            {favoriteSet.has(team.id) ? (
                              <IconStarFilled size={20} color="gold" />
                            ) : (
                              <IconStar size={20} />
                            )}
                          </ActionIcon>
                        </Group>
                      </Card>
                    ))
                  ) : (
                    <Text c="dimmed">No teams match your search</Text>
                  )}
                </>
              ) : (
                <Card withBorder>
                  <Center py="xl">
                    <Text c="dimmed">No teams found.</Text>
                  </Center>
                </Card>
              )}
            </Stack>
          </Stack>
        </Container>
      </ScrollArea>

      <Container size="xl" w="100%" p="md" flex={0}>
        <Text c="dimmed" size="sm">
          Showing {filteredTeams.length} of {teams.length} teams
        </Text>
      </Container>
    </Stack>
  );
}

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});
