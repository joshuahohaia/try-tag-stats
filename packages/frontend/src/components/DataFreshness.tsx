import { Group, Text, Tooltip } from '@mantine/core';
import { IconRefresh, IconAlertTriangle } from '@tabler/icons-react';
import { formatDistanceToNow } from 'date-fns';
import { useSyncStatus } from '../hooks/useSyncStatus';

/**
 * Shows when the league data was last successfully updated from the source.
 * Warns when the latest update attempt failed.
 */
export function DataFreshness() {
  const { data } = useSyncStatus();

  if (!data) return null;

  if (!data.lastSuccessAt) {
    return (
      <Group gap={4} wrap="nowrap">
        <IconAlertTriangle size={14} color="var(--mantine-color-warning-6)" />
        <Text size="xs" c="dimmed">Data has not been updated yet</Text>
      </Group>
    );
  }

  const lastSuccess = new Date(data.lastSuccessAt);
  const ago = formatDistanceToNow(lastSuccess, { addSuffix: true });
  const failed = data.lastAttemptStatus === 'failed';

  return (
    <Tooltip
      label={`Last successful update: ${lastSuccess.toLocaleString()}`}
      withArrow
      openDelay={200}
    >
      <Group gap={4} wrap="nowrap" style={{ cursor: 'default' }}>
        {failed ? (
          <IconAlertTriangle size={14} color="var(--mantine-color-warning-6)" />
        ) : (
          <IconRefresh size={14} color="var(--mantine-color-dimmed)" />
        )}
        <Text size="xs" c={failed ? 'warning.7' : 'dimmed'}>
          {failed ? `Last update failed - showing data from ${ago}` : `Data updated ${ago}`}
        </Text>
      </Group>
    </Tooltip>
  );
}
