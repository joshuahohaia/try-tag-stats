import { Skeleton, Card, Stack, Group, SimpleGrid } from '@mantine/core';

export function DivisionSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Card withBorder>
      <Stack align="center" py="xl" gap="md">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} height={16} width="100%" radius="sm" />
        ))}
      </Stack>
    </Card>
  );
}

export function PageHeaderSkeleton() {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap="xs">
          <Skeleton height={32} width={250} radius="sm" />
          <Group gap="xs">
            <Skeleton height={22} width={80} radius="xl" />
            <Skeleton height={22} width={60} radius="xl" />
          </Group>
        </Stack>
        <Group>
          <Skeleton height={36} width={150} radius="sm" />
          <Skeleton height={36} width={150} radius="sm" />
        </Group>
      </Group>
      <Skeleton height={40} width={200} radius="sm" />
    </Stack>
  );
}

export function TeamCardSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Stack gap="sm">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} withBorder>
          <Group justify="space-between">
            <Skeleton height={16} width="60%" radius="sm" />
            <Skeleton height={20} width={20} radius="sm" />
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

export function LeagueCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} withBorder padding="lg" style={{ minHeight: 140 }}>
          <Stack gap="sm" justify="space-between" h="100%">
            <Stack gap="xs">
              <Skeleton height={20} width="80%" radius="sm" />
              <Skeleton height={20} width={80} radius="xl" />
            </Stack>
            <Group gap="xs">
              <Skeleton height={20} width={70} radius="xl" />
              <Skeleton height={20} width={50} radius="xl" />
            </Group>
            <Skeleton height={14} width="60%" radius="sm" />
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
}
