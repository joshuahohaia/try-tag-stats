import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, Text, Group, Badge } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import type { TeamPositionHistory } from '@trytag/shared';

interface MiniPositionChartProps {
  positionHistory: TeamPositionHistory[];
  teamName: string;
  teamId: number;
  currentPosition?: number;
}

export function MiniPositionChart({
  positionHistory,
  teamName,
  teamId,
  currentPosition,
}: MiniPositionChartProps) {
  if (!positionHistory || positionHistory.length === 0) return null;

  const maxPosition = Math.max(...positionHistory.map((p) => p.position), 5);

  // Determine trend (comparing last two positions)
  const trend =
    positionHistory.length >= 2
      ? positionHistory[positionHistory.length - 1].position -
        positionHistory[positionHistory.length - 2].position
      : 0;

  const trendColor = trend < 0 ? 'green' : trend > 0 ? 'red' : 'gray';
  const trendText = trend < 0 ? `+${Math.abs(trend)}` : trend > 0 ? `-${trend}` : '-';

  return (
    <Card withBorder p="xs">
      <Group justify="space-between" mb={4} wrap="nowrap">
        <Link
          to="/teams/$teamId"
          params={{ teamId: String(teamId) }}
          style={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}
        >
          <Text size="sm" fw={500} truncate c="blue">
            {teamName}
          </Text>
        </Link>
        <Group gap={4} wrap="nowrap">
          {currentPosition && (
            <Badge size="sm" variant="light">
              #{currentPosition}
            </Badge>
          )}
          <Badge size="sm" variant="light" color={trendColor}>
            {trendText}
          </Badge>
        </Group>
      </Group>
      <ResponsiveContainer width="100%" height={50}>
        <LineChart data={positionHistory} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <YAxis domain={[1, maxPosition]} reversed hide />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--mantine-color-body)',
              border: '1px solid var(--mantine-color-gray-4)',
              borderRadius: 4,
              fontSize: 11,
              padding: '4px 8px',
            }}
            formatter={(value) => [`#${value}`, '']}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Line
            type="monotone"
            dataKey="position"
            stroke="var(--mantine-color-brand-6)"
            strokeWidth={2}
            dot={false}
            activeDot={{
              fill: 'var(--mantine-color-brand-6)',
              strokeWidth: 1,
              stroke: 'white',
              r: 4,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
