import { createFileRoute } from '@tanstack/react-router';
import {
  Stack,
  Container,
  Card,
  Text,
  Box,
  Group,
  Badge,
  Select,
  Tabs,
  ScrollArea,
  Title,
} from '@mantine/core';
import {
  DivisionSkeleton,
  PageHeaderSkeleton,
  AwardsTable,
  StandingsTable,
  FixturesList,
} from '../components';
import { QueryError } from '../components/QueryError';
import { useState, useEffect, useMemo } from 'react';
import { useLeague, useLeagueDivisions, useLeagueSeasons } from '../hooks/useLeagues';
import {
  useDivisionStandings,
  useDivisionFixtures,
  useDivisionStatistics,
} from '../hooks/useDivisions';

function LeagueDetailPage() {
  const { leagueId } = Route.useParams();
  const parsedLeagueId = parseInt(leagueId, 10);

  return <LeagueContent leagueId={parsedLeagueId} />;
}

function LeagueContent({ leagueId }: { leagueId: number }) {
  const { data: league, isLoading: leagueLoading, isError: leagueError, refetch: refetchLeague } = useLeague(leagueId);
  const { data: seasons, isLoading: seasonsLoading, isError: seasonsError, refetch: refetchSeasons } = useLeagueSeasons(leagueId);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('standings');

  // Track if we've tried other seasons when current has no divisions
  const [triedSeasons, setTriedSeasons] = useState<Set<string>>(new Set());

  // Set default season (current one or last one)
  useEffect(() => {
    if (seasons && seasons.length > 0 && !selectedSeasonId) {
      const current = seasons.find((s) => s.isCurrent);
      if (current) {
        setSelectedSeasonId(String(current.id));
      } else {
        // Fallback to the last season (assuming higher ID is newer)
        const sorted = [...seasons].sort((a, b) => b.id - a.id);
        setSelectedSeasonId(String(sorted[0].id));
      }
    }
  }, [seasons, selectedSeasonId]);

  const { data: divisions, isLoading: divisionsLoading } = useLeagueDivisions(
    leagueId,
    selectedSeasonId ? parseInt(selectedSeasonId, 10) : 0
  );

  // If current season has no divisions, try other seasons
  useEffect(() => {
    if (
      seasons &&
      seasons.length > 0 &&
      divisions !== undefined &&
      divisions.length === 0 &&
      selectedSeasonId &&
      !divisionsLoading
    ) {
      // Mark this season as tried
      if (!triedSeasons.has(selectedSeasonId)) {
        setTriedSeasons((prev) => new Set([...prev, selectedSeasonId]));

        // Find another season we haven't tried
        const otherSeason = seasons.find(
          (s) => !triedSeasons.has(String(s.id)) && String(s.id) !== selectedSeasonId
        );
        if (otherSeason) {
          setSelectedSeasonId(String(otherSeason.id));
        }
      }
    }
  }, [seasons, divisions, selectedSeasonId, divisionsLoading, triedSeasons]);

  // Latest phase (highest Spawtz PhaseId; the first phase has none). Its first division becomes the
  // default only once it has played games, so a phase that is announced but not started is not shown first.
  const latestPhaseDivision = useMemo(() => {
    const phased = divisions?.filter((d) => d.phaseId != null) ?? [];
    if (phased.length === 0) return undefined;
    const latest = Math.max(...phased.map((d) => d.phaseId as number));
    return phased.find((d) => d.phaseId === latest);
  }, [divisions]);
  const { data: latestPhaseStandings, isLoading: latestPhaseLoading } = useDivisionStandings(
    latestPhaseDivision?.id ?? 0
  );

  // Set default division
  useEffect(() => {
    if (divisions && divisions.length > 0) {
      // Keep the current selection when it is still valid, otherwise pick a default.
      const exists = divisions.some((d) => String(d.id) === selectedDivisionId);
      if (!selectedDivisionId || !exists) {
        if (latestPhaseDivision && latestPhaseLoading) return; // wait for the phase check
        const started = latestPhaseStandings?.some((s) => s.played > 0) ?? false;
        const pick = latestPhaseDivision && started ? latestPhaseDivision : divisions[0];
        setSelectedDivisionId(String(pick.id));
      }
    } else if (divisions && divisions.length === 0) {
      setSelectedDivisionId(null);
    }
  }, [divisions, selectedDivisionId, latestPhaseDivision, latestPhaseLoading, latestPhaseStandings]);

  const { data: standings, isLoading: standingsLoading } = useDivisionStandings(
    selectedDivisionId ? parseInt(selectedDivisionId, 10) : 0
  );
  const { data: fixtures } = useDivisionFixtures(
    selectedDivisionId ? parseInt(selectedDivisionId, 10) : 0
  );
  const { data: statistics, isLoading: statsLoading } = useDivisionStatistics(
    selectedDivisionId ? parseInt(selectedDivisionId, 10) : 0
  );

  const divisionOptions = useMemo(() => {
    // When a league has later phases (e.g. Cup and Plate), prefix every option with its
    // phase so the first-phase divisions stay reachable and clearly labelled.
    const hasPhases = divisions?.some((d) => d.phaseName) ?? false;
    return (
      divisions?.map((d) => ({
        value: String(d.id),
        label: hasPhases ? `${d.phaseName ?? 'First phase'}: ${d.name}` : d.name,
      })) || []
    );
  }, [divisions]);

  const seasonOptions = useMemo(() => {
    return seasons?.map((s) => ({ value: String(s.id), label: s.name })) || [];
  }, [seasons]);

  if (leagueLoading || seasonsLoading) {
    return (

      <Container size="xl" p="md" >
        <Stack gap="md">
          <PageHeaderSkeleton />
          <DivisionSkeleton />
          <DivisionSkeleton />
        </Stack>
      </Container>
    );
  }

  if (!league) {
    return (
      <Container size="xl" p="md">
        {leagueError || seasonsError ? (
          <QueryError
            onRetry={() => {
              refetchLeague();
              refetchSeasons();
            }}
          />
        ) : (
          <Card withBorder>
            <Text c="dimmed" ta="center" py="xl">
              League not found
            </Text>
          </Card>
        )}
      </Container>
    );
  }

  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Sticky Header */}
      <Box style={{ flexShrink: 0 }}>
        <Container size="xl" p="md">
          <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
            <div>
              <Title lineClamp={2} order={1} mb="xs">
                {league.name}
              </Title>
              <Group gap="xs">
                {league.dayOfWeek && <Badge variant="light">{league.dayOfWeek}</Badge>}
                {league.format && <Badge variant="outline">{league.format}</Badge>}
              </Group>
            </div>
            <Group>
              <Select
                data={seasonOptions}
                value={selectedSeasonId}
                onChange={setSelectedSeasonId}
                placeholder="Select Season"
                w={150}
              />
              <Select
                data={divisionOptions}
                value={selectedDivisionId}
                onChange={setSelectedDivisionId}
                placeholder="Select Division"
                disabled={!divisions || divisions.length === 0}
                w={{ base: 190, sm: 260 }}
              />
            </Group>
          </Group>

          {selectedDivisionId && (
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="standings">Standings</Tabs.Tab>
                <Tabs.Tab value="fixtures">Fixtures</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          )}
        </Container>
      </Box>

      {/* Scrollable Content */}
      {!selectedDivisionId ? (
        <Container size="xl" p="md" w="100%" flex={1}>
          {!divisionsLoading ? (
            <Stack gap="md">
              <DivisionSkeleton />
              <DivisionSkeleton />
            </Stack>
          ) : (
            <Card withBorder>
              <Text c="dimmed" ta="center" py="xl">
                No divisions found for this season.
              </Text>
            </Card>
          )}
        </Container>
      ) : (
        <ScrollArea flex={1} type="auto">
          <Container size="xl" p="md">
            <Box>
              {activeTab === 'standings' && (
                <Stack gap="md">
                  <StandingsTable
                    standings={standings || []}
                    leagueId={leagueId}
                    isLoading={standingsLoading}
                  />

                  <AwardsTable statistics={statistics || []} isLoading={statsLoading} />
                </Stack>
              )}

              {activeTab === 'fixtures' && (
                <FixturesList
                  fixtures={fixtures || []}
                  standings={standings || []}
                  statistics={statistics || []}
                  divisions={divisions || []}
                />
              )}
            </Box>
          </Container>
        </ScrollArea>
      )}
    </Stack>
  );
}
export const Route = createFileRoute('/leagues_/$leagueId')({
  component: LeagueDetailPage,
});
