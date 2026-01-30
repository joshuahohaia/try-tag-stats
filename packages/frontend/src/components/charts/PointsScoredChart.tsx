import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, Title, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';

interface TeamPointsData {
  name: string;
  pointsFor: number;
  pointsAgainst: number;
}

interface PointsScoredChartProps {
  teams: TeamPointsData[];
}

export function PointsScoredChart({ teams }: PointsScoredChartProps) {
  if (!teams || teams.length === 0) return null;

  // Transform data for stacked/grouped bar chart
  const data = teams.map((team) => ({
    name: team.name.length > 12 ? team.name.substring(0, 12) + '...' : team.name,
    fullName: team.name,
    'Points For': team.pointsFor,
    'Points Against': team.pointsAgainst,
    difference: team.pointsFor - team.pointsAgainst,
  }));

  return (
    <Card withBorder h="100%">
      <Title fz={15} order={3} mb="md">
        <IconChartBar size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Points Comparison
      </Title>
      {teams.length === 0 ? (
        <Text c="dimmed" size="sm">No data available</Text>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: 'var(--mantine-color-dimmed)' }}
              axisLine={{ stroke: 'var(--mantine-color-gray-4)' }}
              tickLine={{ stroke: 'var(--mantine-color-gray-4)' }}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--mantine-color-dimmed)' }}
              axisLine={{ stroke: 'var(--mantine-color-gray-4)' }}
              tickLine={{ stroke: 'var(--mantine-color-gray-4)' }}
              width={35}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--mantine-color-body)',
                border: '1px solid var(--mantine-color-gray-4)',
                borderRadius: 4,
                fontSize: 12,
              }}
              formatter={(value, name) => [value, name]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
            />
            <Bar dataKey="Points For" fill="var(--mantine-color-green-6)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Points Against" fill="var(--mantine-color-red-6)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
