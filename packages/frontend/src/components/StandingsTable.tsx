import {
  ActionIcon,
  Card,
  Group,
  ScrollArea,
  Table,
  Text,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconStar, IconStarFilled } from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { Link } from '@tanstack/react-router';
import { Fragment, useState } from 'react';
import type { StandingWithTeam } from '@trytag/shared';
import { useFavoriteTeams } from '../hooks/useFavorites';
import { StandingsTableSkeleton } from './skeletons';
import { TeamJersey } from './TeamJersey';

interface StandingsTableProps {
  standings: StandingWithTeam[];
  leagueId: number;
  isLoading: boolean;
}

function FavoriteButton({ standing, leagueId }: { standing: StandingWithTeam; leagueId: number }) {
  const { isFavorite, toggleFavorite } = useFavoriteTeams();
  return (
    <ActionIcon
      variant="subtle"
      size="sm"
      onClick={() => toggleFavorite(standing.team, leagueId)}
      aria-label={isFavorite(standing.team.id) ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorite(standing.team.id) ? (
        <IconStarFilled size={16} style={{ color: 'var(--mantine-warning-6)' }} />
      ) : (
        <IconStar size={16} style={{ color: 'var(--mantine-color-gray-5)' }} />
      )}
    </ActionIcon>
  );
}

export function StandingsTable({ standings, leagueId, isLoading }: StandingsTableProps) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  if (isLoading) {
    return <StandingsTableSkeleton rows={8} />;
  }

  if (!standings || standings.length === 0) {
    return <Text c="dimmed">No standings data available</Text>;
  }

  const toggleExpanded = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // On phones the full table clipped sideways and pushed Pts off-screen, so show
  // Pos / Team / Pts only and put the rest one tap away behind the chevron.
  if (isMobile) {
    return (
      <Card withBorder p={0}>
        <Table highlightOnHover horizontalSpacing={4} fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pos</Table.Th>
              <Table.Th></Table.Th>
              <Table.Th>Team</Table.Th>
              <Table.Th>Pts</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {standings.map((standing) => {
              const isOpen = expanded.has(standing.id);
              return (
                <Fragment key={standing.id}>
                  <Table.Tr>
                    <Table.Td fw={600}>{standing.position}</Table.Td>
                    <Table.Td>
                      <FavoriteButton standing={standing} leagueId={leagueId} />
                    </Table.Td>
                    <Table.Td style={{ maxWidth: 0, width: '100%' }}>
                      <Link
                        to="/teams/$teamId"
                        params={{ teamId: String(standing.team.id) }}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        <Group gap={6} wrap="nowrap" component="span">
                          <TeamJersey
                            name={standing.team.name}
                            teamId={standing.team.id}
                            size={24}
                            decorative
                          />
                          <Text span fw={500} c="blue" truncate>
                            {standing.team.name}
                          </Text>
                        </Group>
                      </Link>
                    </Table.Td>
                    <Table.Td fw={600}>{standing.totalPoints}</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => toggleExpanded(standing.id)}
                        aria-label={isOpen ? 'Hide full standings' : 'Show full standings'}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                  {isOpen && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text size="xs" c="dimmed">
                          Pld {standing.played} · W {standing.wins} · L {standing.losses} · D{' '}
                          {standing.draws} · F {standing.pointsFor} · A {standing.pointsAgainst} ·
                          Dif {standing.pointDifference}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Fragment>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>
    );
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
                  <FavoriteButton standing={standing} leagueId={leagueId} />
                </Table.Td>
                <Table.Td>
                  <Link
                    to="/teams/$teamId"
                    params={{ teamId: String(standing.team.id) }}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    <Group gap={6} wrap="nowrap" component="span" style={{ minWidth: 170 }}>
                      <TeamJersey name={standing.team.name} teamId={standing.team.id} size={24} decorative />
                      <Text span fw={500} c="blue">
                        {standing.team.name}
                      </Text>
                    </Group>
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
