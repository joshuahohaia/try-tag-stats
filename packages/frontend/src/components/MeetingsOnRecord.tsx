import { Card, Title, Text, Group, Badge, Table, Skeleton, Stack } from '@mantine/core';
import { useHeadToHead, type HeadToHeadMeeting } from '../hooks/useHeadToHead';
import { formatDate } from '../utils/format';

const RESULT_COLOR = { W: 'green', D: 'gray', L: 'red' } as const;

function MeetingRows({ meetings, showLabels }: { meetings: HeadToHeadMeeting[]; showLabels?: boolean }) {
  return (
    <Table>
      <Table.Tbody>
        {meetings.map((m, idx) => (
          <Table.Tr key={`${m.date}-${m.time}-${idx}`}>
            <Table.Td w={110}>
              <Text size="sm">{formatDate(m.date)}</Text>
            </Table.Td>
            <Table.Td w={120}>
              <Group gap={6} wrap="nowrap">
                <Badge circle size="sm" color={RESULT_COLOR[m.result]} variant="filled">
                  {m.result}
                </Badge>
                <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap' }}>
                  {m.teamScore} - {m.opponentScore}
                </Text>
              </Group>
            </Table.Td>
            <Table.Td>
              <Text size="xs" c="dimmed">
                {m.seasonName} - {m.divisionName}
                {showLabels && m.labels.length > 0 ? ` (${m.labels.join(', ')})` : ''}
              </Text>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/**
 * Pilot: past meetings read from Spawtz team pages, matched by Spawtz team id.
 * Scores are shown from the first team's point of view.
 */
export function MeetingsOnRecord({
  teamId,
  teamName,
  opponentId,
  opponentName,
}: {
  teamId: number;
  teamName: string;
  opponentId: number;
  opponentName: string;
}) {
  const { data, isLoading, isError } = useHeadToHead(teamId, opponentId);

  if (isLoading) {
    return (
      <Card withBorder>
        <Title order={4} mb="md">Meetings on record</Title>
        <Skeleton height={60} />
      </Card>
    );
  }
  if (isError || !data || !data.supported) return null;

  const { record, counted, uncounted, seasonsCovered, complete } = data;

  return (
    <Card withBorder>
      <Title order={4}>Meetings on record</Title>
      <Text size="xs" c="dimmed" mb="md">
        Battersea Park Astro seasons only (pilot). Matched by Spawtz team id, not by name.
      </Text>

      {record.played === 0 ? (
        <Text c="dimmed" ta="center" py="md">
          No counted meetings between {teamName} and {opponentName} in the seasons checked
        </Text>
      ) : (
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {teamName}: {record.won}W {record.drawn}D {record.lost}L
            </Text>
            <Text size="sm" c="dimmed">
              Points {record.pointsFor} - {record.pointsAgainst}
            </Text>
          </Group>
          <MeetingRows meetings={counted} />
        </Stack>
      )}

      {uncounted.length > 0 && (
        <Stack gap="xs" mt="md">
          <Text size="sm" c="dimmed">
            Not counted: Spawtz printed a label (friendly, playoff) next to these games and does not say
            which game it belongs to.
          </Text>
          <MeetingRows meetings={uncounted} showLabels />
        </Stack>
      )}

      <Text size="xs" c="dimmed" mt="md">
        Seasons checked: {seasonsCovered.length > 0 ? seasonsCovered.join('; ') : 'none'}.
        {!complete && ' Some seasons could not be loaded, so this may be incomplete.'}
      </Text>
    </Card>
  );
}
