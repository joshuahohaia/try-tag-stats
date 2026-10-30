import { Group, Loader, Text } from '@mantine/core';

/**
 * Shown while a request takes unusually long - the hosted server can take up
 * to a minute to wake from sleep on the first request.
 */
export function SlowLoadingHint({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <Group gap="xs" wrap="nowrap">
      <Loader size="xs" type="dots" />
      <Text size="xs" c="dimmed">
        Still loading - the server can take up to a minute to wake up on the first visit.
      </Text>
    </Group>
  );
}
