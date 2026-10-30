import { Alert, Button, Text, Stack } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';

interface QueryErrorProps {
  onRetry?: () => void;
  message?: string;
}

/**
 * Shown when a data request fails, instead of falling through to an empty
 * state that would read as "no data" when the server could not be reached.
 */
export function QueryError({ onRetry, message }: QueryErrorProps) {
  return (
    <Alert
      color="red"
      variant="light"
      icon={<IconAlertCircle size={18} />}
      title="Couldn't load data"
    >
      <Stack gap="sm">
        <Text size="sm">
          {message ??
            'Something went wrong while loading data from the server. It may be waking up - the first request after a quiet period can take up to a minute. Please try again.'}
        </Text>
        {onRetry && (
          <Button
            size="xs"
            variant="light"
            color="red"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
            style={{ alignSelf: 'flex-start' }}
          >
            Retry
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
