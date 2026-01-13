import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  Loader,
  Center,
  SimpleGrid,
  Badge,
  Group,
  Button,
  Table,
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { useTeam } from '../hooks/useTeams';
import { useFavoriteTeams } from '../hooks/useFavorites';

function TeamDetailPage() {
  const { teamId } = Route.useParams();
  const { data: teamProfile, isLoading } = useTeam(parseInt(teamId, 10));
  const { isFavorite, toggleFavorite } = useFavoriteTeams();

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!teamProfile) {
    return (
      <Card withBorder>
        <Text c="dimmed" ta="center" py="xl">Team not found</Text>
      </Card>
    );
  }

  const isFav = isFavorite(teamProfile.id);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1} mb="xs">{teamProfile.name}</Title>
          <Text c="dimmed">Team Profile</Text>
        </div>
        <Button
          variant={isFav ? 'filled' : 'outline'}
          color={isFav ? 'yellow' : 'gray'}
          leftSection={isFav ? <IconStarFilled size={18} /> : <IconStar size={18} />}
          onClick={() => toggleFavorite(teamProfile)}
        >
          {isFav ? 'Favorited' : 'Add to Favorites'}
        </Button>
      </Group>

      {teamProfile.standings && teamProfile.standings.length > 0 && (
        <Card withBorder>
          <Title order={3} mb="md">Current Standings</Title>
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <div>
              <Text size="sm" c="dimmed">Position</Text>
              <Text size="xl" fw={700}>{teamProfile.standings[0].position}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Played</Text>
              <Text size="xl" fw={700}>{teamProfile.standings[0].played}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Won</Text>
              <Text size="xl" fw={700} c="green">{teamProfile.standings[0].wins}</Text>
            </div>
            <div>
              <Text size="sm" c="dimmed">Points</Text>
              <Text size="xl" fw={700}>{teamProfile.standings[0].totalPoints}</Text>
            </div>
          </SimpleGrid>
        </Card>
      )}

      {teamProfile.upcomingFixtures && teamProfile.upcomingFixtures.length > 0 && (
        <Card withBorder>
          <Title order={3} mb="md">Upcoming Fixtures</Title>
          <Stack gap="sm">
            {teamProfile.upcomingFixtures.map((fixture) => (
              <Card key={fixture.id} withBorder padding="sm">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>
                      {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {fixture.fixtureDate} {fixture.fixtureTime && `at ${fixture.fixtureTime}`}
                    </Text>
                  </div>
                  <Badge variant="light">{fixture.status}</Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        </Card>
      )}

      {teamProfile.recentFixtures && teamProfile.recentFixtures.length > 0 && (
        <Card withBorder>
          <Title order={3} mb="md">Recent Results</Title>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Opponent</Table.Th>
                <Table.Th>Result</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {teamProfile.recentFixtures.map((fixture) => {
                const isHome = fixture.homeTeam.id === teamProfile.id;
                const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;
                const teamScore = isHome ? fixture.homeScore : fixture.awayScore;
                const oppScore = isHome ? fixture.awayScore : fixture.homeScore;
                const result = teamScore !== null && oppScore !== null
                  ? teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D'
                  : '-';

                return (
                  <Table.Tr key={fixture.id}>
                    <Table.Td>{fixture.fixtureDate}</Table.Td>
                    <Table.Td>{opponent.name}</Table.Td>
                    <Table.Td>
                      <Badge
                        color={result === 'W' ? 'green' : result === 'L' ? 'red' : 'gray'}
                        variant="light"
                      >
                        {result} {teamScore !== null && `${teamScore}-${oppScore}`}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}

export const Route = createFileRoute('/teams_/$teamId')({
  component: TeamDetailPage,
});
