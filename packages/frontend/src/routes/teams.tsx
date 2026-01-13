import { createFileRoute } from '@tanstack/react-router';
import { Title, Text, Card, Stack, TextInput, Center, Loader } from '@mantine/core';
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
    <Stack gap="lg">
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

      {favorites.length > 0 ? (
        <Stack gap="sm">
          <Title order={3}>Your Favorite Teams</Title>
          {filteredFavorites.length > 0 ? (
            filteredFavorites.map((team) => (
              <Card
                key={team.id}
                withBorder
                component={Link}
                to="/teams/$teamId"
                params={{ teamId: String(team.id) }}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Text fw={500}>{team.name}</Text>
              </Card>
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
    </Stack>
  );
}

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});
