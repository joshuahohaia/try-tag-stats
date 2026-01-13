import { createFileRoute } from '@tanstack/react-router';
import { Title, Text, Card, Stack, TextInput, Center, ScrollArea, Box } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { Link } from '@tanstack/react-router';

function TeamsPage() {
  const [search, setSearch] = useState('');
  const { favorites } = useFavoriteTeams();

  // Filter favorites based on search
  const filteredFavorites = favorites.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Stack h="100%" gap="md" style={{ overflow: 'hidden' }}>
      <Stack gap="lg" flex={0}>
        <div>
          <Title order={1} mb="xs">Teams</Title>
          <Text c="dimmed">
            Search for teams or view your favorites. Add teams to favorites from league standings.
          </Text>
        </div>

        <TextInput
          placeholder="Search teams..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </Stack>

      <ScrollArea flex={1} type="auto">
        {favorites.length > 0 ? (
          <Stack gap="sm">
            <Title order={3}>Your Favorite Teams</Title>
            {filteredFavorites.length > 0 ? (
              filteredFavorites.map((team) => (
                <Link
                  key={team.id}
                  to="/teams/$teamId"
                  params={{ teamId: String(team.id) }}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Card withBorder>
                    <Text fw={500}>{team.name}</Text>
                  </Card>
                </Link>
              ))
            ) : (
              <Text c="dimmed">No teams match your search</Text>
            )}
          </Stack>
        ) : (
          <Card withBorder>
            <Center py="xl">
              <Stack align="center">
                <Text c="dimmed" ta="center">
                  You haven't added any favorite teams yet.
                </Text>
                <Text c="dimmed" ta="center" size="sm">
                  Browse leagues and click the star icon next to a team to add it to your favorites.
                </Text>
              </Stack>
            </Center>
          </Card>
        )}
      </ScrollArea>

      <Box flex={0}>
        <Text c="dimmed" size="sm">
          Showing {filteredFavorites.length} of {favorites.length} favorite teams
        </Text>
      </Box>
    </Stack>
  );
}

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});
