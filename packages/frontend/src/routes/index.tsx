import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  SimpleGrid,
  Stack,
  Button,
  Group,
  Badge,
} from '@mantine/core';
import { IconTrophy, IconCalendar, IconStar } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { useUpcomingFixtures } from '../hooks/useFixtures';

function HomePage() {
  const { favorites } = useFavoriteTeams();
  const { data: upcomingFixtures, isLoading } = useUpcomingFixtures();

  return (
    <Stack gap="xl">
      <div>
        <Title order={1} mb="xs">Welcome to Try Tag Stats</Title>
        <Text c="dimmed" size="lg">
          Track your favorite Try Tag Rugby teams, view fixtures, and follow league standings.
        </Text>
      </div>

      {favorites.length > 0 && (
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>
              <IconStar size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Your Favorite Teams
            </Title>
            <Button variant="subtle" component={Link} to="/favorites" size="sm">
              Manage
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
            {favorites.map((team) => (
              <Card key={team.id} withBorder padding="sm">
                <Text fw={500}>{team.name}</Text>
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(team.id) }}
                  style={{ textDecoration: 'none' }}
                >
                  <Button
                    variant="light"
                    size="xs"
                    mt="xs"
                    component="div"
                  >
                    View Team
                  </Button>
                </Link>
              </Card>
            ))}
          </SimpleGrid>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>
              <IconCalendar size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Upcoming Fixtures
            </Title>
            <Button variant="subtle" component={Link} to="/fixtures" size="sm">
              View All
            </Button>
          </Group>
          {isLoading ? (
            <Text c="dimmed">Loading fixtures...</Text>
          ) : upcomingFixtures && upcomingFixtures.length > 0 ? (
            <Stack gap="xs">
              {upcomingFixtures.slice(0, 5).map((fixture) => (
                <Card key={fixture.id} withBorder padding="xs">
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={500}>
                        {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {fixture.fixtureDate} {fixture.fixtureTime && `at ${fixture.fixtureTime}`}
                      </Text>
                    </div>
                    <Badge variant="light">{fixture.status}</Badge>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">No upcoming fixtures</Text>
          )}
        </Card>

        <Card withBorder>
          <Title order={3} mb="md">
            <IconTrophy size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Quick Links
          </Title>
          <Stack gap="sm">
            <Button
              variant="light"
              fullWidth
              leftSection={<IconTrophy size={18} />}
              component={Link}
              to="/leagues"
            >
              Browse All Leagues
            </Button>
            <Button
              variant="light"
              fullWidth
              leftSection={<IconCalendar size={18} />}
              component={Link}
              to="/fixtures"
            >
              View All Fixtures
            </Button>
            <Button
              variant="light"
              fullWidth
              leftSection={<IconStar size={18} />}
              component={Link}
              to="/favorites"
            >
              Manage Favorites
            </Button>
          </Stack>
        </Card>
      </SimpleGrid>

      {favorites.length === 0 && (
        <Card withBorder bg="green.0">
          <Stack align="center" py="xl">
            <IconStar size={48} color="var(--mantine-color-green-6)" />
            <Title order={3}>Get Started</Title>
            <Text c="dimmed" ta="center">
              Browse leagues and add your favorite teams to track their fixtures and standings.
            </Text>
            <Button component={Link} to="/leagues">
              Browse Leagues
            </Button>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
