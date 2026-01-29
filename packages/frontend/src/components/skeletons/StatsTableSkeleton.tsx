import { Skeleton, SimpleGrid, Group, Stack, Card, Title } from '@mantine/core';

interface StatsTableSkeletonProps {
  rows?: number;
}

export function StatsTableSkeleton({ rows = 10 }: StatsTableSkeletonProps) {
  return (
    <Card withBorder>
      <Title order={3} mb="md">
        <Skeleton height={20} width={200} radius="sm" />
      </Title>
      <SimpleGrid cols={2} spacing="xl" verticalSpacing="sm">
        {Array.from({ length: rows }).map((_, i) => (
          <Group key={i} wrap="nowrap">
            <Group gap={4} wrap="nowrap">
              <Skeleton height={16} width={16} radius="sm" />
              <Skeleton height={14} width={20} radius="sm" />
            </Group>
            <Stack gap={0} style={{ overflow: 'hidden', flex: 1 }}>
              <Skeleton height={14} width="80%" radius="sm" />
              <Skeleton height={12} width="60%" radius="sm" mt={4} />
            </Stack>
          </Group>
        ))}
      </SimpleGrid>
    </Card>
  );
}
