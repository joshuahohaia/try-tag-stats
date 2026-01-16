import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Title, Text, Card, Stack, TextInput, Center, ScrollArea, Container,
  ActionIcon, Group,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconSearch, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useState, useEffect, useMemo } from 'react';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useTeams } from '../hooks/useTeams';
import { Team } from '@trytag/shared';

function TeamsPage() {
  const [search, setSearch] = useState('');
  const { data: teams = [], isLoading } = useTeams();
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

  const filteredTeams = sortedTeams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase())
  );

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
              {isLoading ? (
                <Center>
                  <Text>Loading teams...</Text>
                </Center>
              ) : teams.length > 0 ? (
                <>
                  {filteredTeams.length > 0 ? (
                    filteredTeams.map((team) => (
                      <Card withBorder key={team.id}>
                        <Group justify="space-between">
                          <Link
                            to="/teams/$teamId"
                            params={{ teamId: String(team.id) }}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <Text fw={500}>{team.name}</Text>
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
