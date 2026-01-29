import {
  Card,
  ScrollArea,
  Table,
  Text,
  Button,
} from '@mantine/core';
import { IconStar, IconStarFilled } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { StandingWithTeam } from '@trytag/shared';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { StandingsTableSkeleton } from './skeletons';

interface StandingsTableProps {
  standings: StandingWithTeam[];
  leagueId: number;
  isLoading: boolean;
}

export function StandingsTable({ standings, leagueId, isLoading }: StandingsTableProps) {
  const { isFavorite, toggleFavorite } = useFavoriteTeams();

  if (isLoading) {
    return <StandingsTableSkeleton rows={8} />;
  }

  if (!standings || standings.length === 0) {
    return <Text c="dimmed">No standings data available</Text>;
  }

  return (
    <Card withBorder p={0}>
      <ScrollArea type="auto">
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pos</Table.Th>
              <Table.Th></Table.Th>
              <Table.Th>Team</Table.Th>
              <Table.Th>Pld</Table.Th>
              <Table.Th>W</Table.Th>
              <Table.Th>L</Table.Th>
              <Table.Th>D</Table.Th>
              <Table.Th>F</Table.Th>
              <Table.Th>A</Table.Th>
              <Table.Th>Dif</Table.Th>
              <Table.Th>Pts</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {standings.map((standing) => (
              <Table.Tr key={standing.id}>
                <Table.Td fw={600}>{standing.position}</Table.Td>
                <Table.Td>
                  <Button
                    variant="subtle"
                    size="xs"
                    p={4}
                    onClick={() => toggleFavorite(standing.team, leagueId)}
                  >
                    {isFavorite(standing.team.id) ? (
                      <IconStarFilled
                        size={16}
                        style={{ color: 'var(--mantine-warning-6)' }}
                      />
                    ) : (
                      <IconStar
                        size={16}
                        style={{ color: 'var(--mantine-color-gray-5)' }}
                      />
                    )}
                  </Button>
                </Table.Td>
                <Table.Td>
                  <Link
                    to="/teams/$teamId"
                    params={{ teamId: String(standing.team.id) }}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <Text span fw={500} c="blue">
                      {standing.team.name}
                    </Text>
                  </Link>
                </Table.Td>

                <Table.Td>{standing.played}</Table.Td>
                <Table.Td>{standing.wins}</Table.Td>
                <Table.Td>{standing.losses}</Table.Td>
                <Table.Td>{standing.draws}</Table.Td>
                <Table.Td>{standing.pointsFor}</Table.Td>
                <Table.Td>{standing.pointsAgainst}</Table.Td>
                <Table.Td>{standing.pointDifference}</Table.Td>
                <Table.Td fw={600}>{standing.totalPoints}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
