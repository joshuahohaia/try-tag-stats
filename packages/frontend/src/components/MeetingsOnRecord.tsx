import { Card, Title, Text, Group, Badge, Table, Skeleton, Stack } from '@mantine/core';
import { useHeadToHead, type HeadToHeadMeeting } from '../hooks/useHeadToHead';
import { formatDate } from '../utils/format';

const RESULT_COLOR = { W: 'green', D: 'gray', L: 'red' } as const;

function MeetingRows({ meetings }: { meetings: HeadToHeadMeeting[] }) {
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
                {m.labels.length > 0 ? ` (label on Spawtz: ${m.labels.join(', ')})` : ''}
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

  const { record, meetings, labelledCount, seasonsCovered, complete, busy } = data;

  return (
    <Card withBorder>
      <Title order={4}>Meetings on record</Title>
      <Text size="xs" c="dimmed" mb="md">
        Pilot: Battersea Park Astro and Clapham Junction (Sunday) seasons only. Matched by Spawtz team id, not by name.
      </Text>

      {record.played === 0 ? (
        <Text c="dimmed" ta="center" py="md">
          No recorded meetings between {teamName} and {opponentName} in the seasons checked
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
          <MeetingRows meetings={meetings} />
        </Stack>
      )}

      {labelledCount > 0 && (
        <Text size="sm" c="dimmed" mt="md">
          {labelledCount} of these {labelledCount === 1 ? 'game has' : 'games have'} a label printed next to
          {labelledCount === 1 ? ' it' : ' them'} on Spawtz (such as friendly or playoff). Spawtz does not say which
          game a label belongs to and it can differ between the two teams' pages, so all games are included in the
          record and the label is shown as a note, not as a classification.
        </Text>
      )}

      <Text size="xs" c="dimmed" mt="md">
        Seasons checked: {seasonsCovered.length > 0 ? [...new Set(seasonsCovered)].join('; ') : 'none'}.
        {!complete &&
          (busy
            ? ' Some seasons were not loaded because the site is rate-limiting reads of Spawtz; try again in a minute.'
            : ' Some seasons could not be loaded or were over the per-request limit, so this may be incomplete.')}
      </Text>
    </Card>
  );
}
