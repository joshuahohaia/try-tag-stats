import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  Stack,
  Table,
  Loader,
  Center,
  Tabs,
  Badge,
  Group,
  Button,
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useLeague } from '../hooks/useLeagues';
import { useDivisionStandings, useDivisionFixtures } from '../hooks/useDivisions';
import { useFavoriteTeams } from '../hooks/useFavorites';

function LeagueDetailPage() {
  const { leagueId } = Route.useParams();
  const { data: league, isLoading: leagueLoading } = useLeague(parseInt(leagueId, 10));
  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(parseInt(leagueId, 10));
  const { data: fixtures, isLoading: fixturesLoading } = useDivisionFixtures(parseInt(leagueId, 10));
  const { isFavorite, toggleFavorite } = useFavoriteTeams();

  if (leagueLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!league) {
    return (
      <Card withBorder>
        <Text c="dimmed" ta="center" py="xl">League not found</Text>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={1} mb="xs">{league.name}</Title>
        <Group gap="xs">
          {league.dayOfWeek && <Badge variant="light">{league.dayOfWeek}</Badge>}
          {league.format && <Badge variant="outline">{league.format}</Badge>}
        </Group>
      </div>

      <Tabs defaultValue="standings">
        <Tabs.List>
          <Tabs.Tab value="standings">Standings</Tabs.Tab>
          <Tabs.Tab value="fixtures">Fixtures</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="standings" pt="md">
          {standingsLoading ? (
            <Center h={200}><Loader /></Center>
          ) : standings && standings.length > 0 ? (
            <Card withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Pos</Table.Th>
                    <Table.Th>Team</Table.Th>
                    <Table.Th>P</Table.Th>
                    <Table.Th>W</Table.Th>
                    <Table.Th>L</Table.Th>
                    <Table.Th>D</Table.Th>
                    <Table.Th>Pts</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {standings.map((standing) => (
                    <Table.Tr key={standing.id}>
                      <Table.Td fw={600}>{standing.position}</Table.Td>
                      <Table.Td>
                        <Link
                          to="/teams/$teamId"
                          params={{ teamId: String(standing.team.id) }}
                          style={{ color: 'inherit' }}
                        >
                          {standing.team.name}
                        </Link>
                      </Table.Td>
                      <Table.Td>{standing.played}</Table.Td>
                      <Table.Td>{standing.wins}</Table.Td>
                      <Table.Td>{standing.losses}</Table.Td>
                      <Table.Td>{standing.draws}</Table.Td>
                      <Table.Td fw={600}>{standing.totalPoints}</Table.Td>
                      <Table.Td>
                        <Button
                          variant="subtle"
                          size="xs"
                          p={4}
                          onClick={() => toggleFavorite(standing.team)}
                        >
                          {isFavorite(standing.team.id) ? (
                            <IconStarFilled size={16} color="gold" />
                          ) : (
                            <IconStar size={16} />
                          )}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          ) : (
            <Text c="dimmed">No standings data available</Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="fixtures" pt="md">
          {fixturesLoading ? (
            <Center h={200}><Loader /></Center>
          ) : fixtures && fixtures.length > 0 ? (
            <Stack gap="sm">
              {fixtures.map((fixture) => (
                <Card key={fixture.id} withBorder padding="sm">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Text fw={500}>
                        {fixture.homeTeam.name} vs {fixture.awayTeam.name}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {fixture.fixtureDate} {fixture.fixtureTime && `at ${fixture.fixtureTime}`}
                        {fixture.pitch && ` - ${fixture.pitch}`}
                      </Text>
                    </Stack>
                    <div>
                      {fixture.status === 'completed' && fixture.homeScore !== null ? (
                        <Badge size="lg" variant="filled">
                          {fixture.homeScore} - {fixture.awayScore}
                        </Badge>
                      ) : (
                        <Badge variant="light">{fixture.status}</Badge>
                      )}
                    </div>
                  </Group>
                </Card>
              ))}
            </Stack>
          ) : (
            <Text c="dimmed">No fixtures data available</Text>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

export const Route = createFileRoute('/leagues/$leagueId')({
  component: LeagueDetailPage,
});
