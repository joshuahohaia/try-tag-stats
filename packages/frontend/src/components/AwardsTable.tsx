import {
  Card,
  Title,
  Table,
  Text,
  Group,
} from '@mantine/core';
import { IconAward } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { PlayerAwardWithDetails } from '@trytag/shared';
import { calculateAwardPositions } from '../utils/statistics';
import { StatsTableSkeleton } from './skeletons';

interface AwardsTableProps {
  statistics: PlayerAwardWithDetails[];
  isLoading: boolean;
}

export function AwardsTable({ statistics, isLoading }: AwardsTableProps) {
  const { awardPositions, sortedStatistics } = useMemo(() => {
    if (!statistics || statistics.length === 0) {
      return { awardPositions: new Map(), sortedStatistics: [] };
    }
    const awardPositions = calculateAwardPositions(statistics);
    const sortedStatistics = [...statistics].sort((a, b) => {
      const posA = awardPositions.get(a.player.id) || 0;
      const posB = awardPositions.get(b.player.id) || 0;
      if (posA === posB) {
        return b.awardCount - a.awardCount;
      }
      return posA - posB;
    });
    return { awardPositions, sortedStatistics };
  }, [statistics]);

  if (isLoading) {
    return <StatsTableSkeleton rows={5} />;
  }

  if (!statistics || statistics.length === 0) {
    return <Text c="dimmed">No statistics available for this division.</Text>;
  }

  return (
    <Card withBorder>
      <Title order={3} mb="md">
        Player of the Match Awards
      </Title>
      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Pos</Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Team</Table.Th>
            <Table.Th>Awards</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedStatistics.map((stat) => (
            <Table.Tr key={stat.id}>
              <Table.Td>{awardPositions.get(stat.player.id)}</Table.Td>
              <Table.Td fw={500}>{stat.player.name}</Table.Td>
              <Table.Td>
                <Link
                  to="/teams/$teamId"
                  params={{ teamId: String(stat.team.id) }}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  <Text span c="blue">
                    {stat.team.name}
                  </Text>
                </Link>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <IconAward size={18} style={{ color: 'gold' }} />
                  <Text fw={700}>{stat.awardCount}</Text>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}
