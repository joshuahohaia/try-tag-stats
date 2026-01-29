import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, Title } from '@mantine/core';
import type { TeamPositionHistory } from '@trytag/shared';

interface PositionHistoryChartProps {
  positionHistory: TeamPositionHistory[];
}

export function PositionHistoryChart({ positionHistory }: PositionHistoryChartProps) {
  if (!positionHistory || positionHistory.length === 0) return null;

  const maxPosition = Math.max(...positionHistory.map((p) => p.position), 5);

  return (
    <Card withBorder>
      <Title order={3} mb="md">
        Position History
      </Title>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={positionHistory} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <XAxis
            dataKey="week"
            tickFormatter={(w) => `W${w}`}
            tick={{ fontSize: 12, fill: 'var(--mantine-color-dimmed)' }}
            axisLine={{ stroke: 'var(--mantine-color-gray-4)' }}
            tickLine={{ stroke: 'var(--mantine-color-gray-4)' }}
          />
          <YAxis
            reversed
            domain={[1, maxPosition]}
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'var(--mantine-color-dimmed)' }}
            axisLine={{ stroke: 'var(--mantine-color-gray-4)' }}
            tickLine={{ stroke: 'var(--mantine-color-gray-4)' }}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--mantine-color-body)',
              border: '1px solid var(--mantine-color-gray-4)',
              borderRadius: 4,
              fontSize: 12,
            }}
            formatter={(value) => [`Position ${value}`, '']}
            labelFormatter={(label) => `Week ${label}`}
          />
          <ReferenceLine y={1} stroke="var(--mantine-color-yellow-6)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="position"
            stroke="var(--mantine-color-brand-6)"
            strokeWidth={2.5}
            dot={{
              fill: 'var(--mantine-color-brand-6)',
              strokeWidth: 2,
              stroke: 'white',
              r: 5,
            }}
            activeDot={{
              fill: 'var(--mantine-color-brand-6)',
              strokeWidth: 2,
              stroke: 'white',
              r: 7,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
