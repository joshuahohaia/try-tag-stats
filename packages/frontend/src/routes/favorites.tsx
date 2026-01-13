import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  Button,
  Group,
  Center,
  ActionIcon,
} from '@mantine/core';
import { IconStar, IconTrash } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useFavoriteTeams } from '../hooks/useFavorites';

function FavoriteTeamCard({ team }: { team: { id: number, name: string } }) {
  const { removeTeam } = useFavoriteTeams();
  
  return (
    <Card withBorder padding="md">
      <Group justify="space-between">
        <Group>
          <IconStar size={20} color="gold" fill="gold" />
          <Text fw={500}>{team.name}</Text>
        </Group>
        <Group>
          <Link
            to="/teams/$teamId"
            params={{ teamId: String(team.id) }}
            style={{ textDecoration: 'none' }}
          >
            <Button
              variant="light"
              size="sm"
              component="div"
            >
              View Team
            </Button>
          </Link>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => removeTeam(team.id)}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  );
}

function FavoritesPage() {
  const { favorites } = useFavoriteTeams();

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} mb="xs">Favorites</Title>
        <Text c="dimmed">Manage your favorite teams</Text>
      </div>

      {favorites.length > 0 ? (
        <Stack gap="sm">
          {favorites.map((team) => (
            <FavoriteTeamCard key={team.id} team={team} />
          ))}
        </Stack>
      ) : (
        <Card withBorder>
          <Center py="xl">
            <Stack align="center">
              <IconStar size={48} color="var(--mantine-color-gray-5)" />
              <Title order={3}>No Favorites Yet</Title>
              <Text c="dimmed" ta="center">
                Browse leagues and click the star icon next to a team to add it to your favorites.
              </Text>
              <Button component={Link} to="/leagues">
                Browse Leagues
              </Button>
            </Stack>
          </Center>
        </Card>
      )}
    </Stack>
  );
}

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
});
