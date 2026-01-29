import { Skeleton, Stack, Group, Card } from '@mantine/core';

interface FixtureCardSkeletonProps {
  count?: number;
  compact?: boolean;
}

export function FixtureCardSkeleton({ count = 1, compact = false }: FixtureCardSkeletonProps) {
  return (
    <Stack gap="sm">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} withBorder padding={compact ? 'xs' : 'sm'}>
          <Group justify="space-between" align="flex-start">
            <Stack gap={4} style={{ flex: 1 }}>
              {/* Home team name */}
              <Skeleton height={compact ? 14 : 20} width="60%" radius="sm" />
              {/* vs */}
              <Skeleton height={12} width={20} radius="sm" />
              {/* Away team name */}
              <Skeleton height={compact ? 14 : 20} width="55%" radius="sm" />
              {/* Date and time */}
              <Stack gap={0} mt="xs">
                <Skeleton height={12} width={80} radius="sm" />
                <Skeleton height={10} width={50} radius="sm" mt={4} />
              </Stack>
            </Stack>
            {/* Badge */}
            <Skeleton height={24} width={70} radius="xl" />
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
