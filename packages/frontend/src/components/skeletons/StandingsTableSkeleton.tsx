import { Skeleton, Table, Card, rem } from '@mantine/core';

interface StandingsTableSkeletonProps {
  rows?: number;
  compact?: boolean;
}

export function StandingsTableSkeleton({ rows = 8, compact = false }: StandingsTableSkeletonProps) {
  const cellStyle = compact
    ? { fontSize: rem(10), padding: rem(4) }
    : {};

  return (
    <Card withBorder p={0}>
      <Table highlightOnHover withTableBorder={compact}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={cellStyle}>Pos</Table.Th>
            <Table.Th style={cellStyle}>Team</Table.Th>
            <Table.Th style={cellStyle}>Pld</Table.Th>
            <Table.Th style={cellStyle}>W</Table.Th>
            <Table.Th style={cellStyle}>L</Table.Th>
            <Table.Th style={cellStyle}>D</Table.Th>
            <Table.Th style={cellStyle}>F</Table.Th>
            <Table.Th style={cellStyle}>A</Table.Th>
            <Table.Th style={cellStyle}>Dif</Table.Th>
            <Table.Th style={cellStyle}>Pts</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <Table.Tr key={i}>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={16} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={compact ? 60 : 120} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={16} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={16} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={16} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={16} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={20} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={20} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={20} radius="sm" />
              </Table.Td>
              <Table.Td style={cellStyle}>
                <Skeleton height={compact ? 10 : 14} width={20} radius="sm" />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}
