import { createFileRoute } from '@tanstack/react-router';
import {
  Title,
  Text,
  Card,
  SimpleGrid,
  Stack,
  TextInput,
  Select,
  Group,
  Badge,
  Loader,
  Center,
  ScrollArea,
  Container,
  Box,
} from '@mantine/core';
import { IconSearch, IconStarFilled, IconMapPin, IconCalendar } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useLeagues } from '../hooks/useLeagues';
import { useRegions } from '../hooks/useRegions';
import { useFavoriteTeams } from '../hooks/useFavorites';

// Color mapping for regions - each region gets a distinct Mantine color
const regionColors: Record<string, string> = {
  'London': 'blue',
  'Manchester': 'red',
  'Leeds': 'yellow',
  'Newcastle': 'grape',
  'Edinburgh': 'indigo',
  'Glasgow': 'teal',
  'Bristol': 'orange',
  'Birmingham': 'violet',
  'Cardiff': 'green',
  'Liverpool': 'pink',
  'Sheffield': 'cyan',
  'Nottingham': 'lime',
  'Brighton': 'blue.4',
  'Southampton': 'red.4',
  'Oxford': 'yellow.7',
  'Cambridge': 'teal.7',
  'Other': 'gray',
};

function getRegionColor(regionName: string): string {
  return regionColors[regionName] || 'gray';
}

function LeaguesPage() {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const { data: leagues, isLoading: leaguesLoading } = useLeagues();
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { hasTeamInLeague } = useFavoriteTeams();

  // Create region lookup map
  const regionMap = useMemo(() => {
    if (!regions) return new Map<number, string>();
    return new Map(regions.map((r) => [r.id, r.name]));
  }, [regions]);

  const filteredLeagues = useMemo(() => {
    if (!leagues) return [];

    return leagues.filter((league) => {
      const matchesSearch = league.name.toLowerCase().includes(search.toLowerCase());
      const matchesRegion = !regionFilter || league.regionId === parseInt(regionFilter, 10);
      return matchesSearch && matchesRegion;
    });
  }, [leagues, search, regionFilter]);

  const regionOptions = useMemo(() => {
    if (!regions) return [];
    return regions.map((r) => ({ value: String(r.id), label: r.name }));
  }, [regions]);

  if (leaguesLoading || regionsLoading) {
    return (
      <Center h="100%">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack h="100%" gap="0" style={{ overflow: 'hidden' }}>
      <Container size="xl" w="100%" p="md" flex={0}>
        <Stack gap="md">
          <div>
            <Title order={1} mb="xs">Leagues</Title>
            <Text c="dimmed">Browse all Try Tag Rugby leagues across the UK</Text>
          </div>

          <Group>
            <TextInput
              placeholder="Search leagues..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, maxWidth: 350 }}
            />
            <Select
              placeholder="Filter by region"
              data={regionOptions}
              value={regionFilter}
              onChange={setRegionFilter}
              clearable
              style={{ width: 150 }}
            />
          </Group>
        </Stack>
      </Container>

      <ScrollArea flex={1} type="auto">
        <Container size="xl" p="md">
          {filteredLeagues.length === 0 ? (
            <Card withBorder>
              <Text c="dimmed" ta="center" py="xl">
                No leagues found. Try adjusting your filters.
              </Text>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {filteredLeagues.map((league) => {
                const hasFavorite = hasTeamInLeague(league.id);
                const regionName = regionMap.get(league.regionId);

                return (
                  <Link
                    key={league.id}
                    to="/leagues/$leagueId"
                    params={{ leagueId: String(league.id) }}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <Card
                      withBorder
                      h="100%"
                      padding="lg"
                      style={{
                        minHeight: 140,
                        cursor: 'pointer',
                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--mantine-shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <Stack gap="sm" justify="space-between" h="100%">
                        {/* Header with name and favourite star */}
                        <div>
                          <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
                            <Text fw={600} size="lg" style={{ flex: 1, lineHeight: 1.3 }}>
                              {league.name}
                            </Text>
                            {hasFavorite && (
                              <IconStarFilled
                                size={20}
                                style={{ color: 'var(--mantine-color-warning-5)', flexShrink: 0 }}
                              />
                            )}
                          </Group>

                          {/* Region badge */}
                          {regionName && (
                            <Badge
                              variant="filled"
                              color={getRegionColor(regionName)}
                              size="sm"
                              leftSection={<IconMapPin size={12} />}
                            >
                              {regionName}
                            </Badge>
                          )}
                        </div>

                        {/* Middle section - day and format */}
                        <Group gap="xs">
                          {league.dayOfWeek && (
                            <Badge
                              variant="light"
                              color="gray"
                              size="sm"
                              leftSection={<IconCalendar size={12} />}
                            >
                              {league.dayOfWeek}
                            </Badge>
                          )}
                          {league.format && (
                            <Badge variant="outline" color="gray" size="sm">
                              {league.format}
                            </Badge>
                          )}
                        </Group>

                        {/* Footer - venue */}
                        {league.venueName ? (
                          <Box>
                            <Text size="sm" c="dimmed" lineClamp={1}>
                              {league.venueName}
                            </Text>
                          </Box>
                        ) : (
                          <Box style={{ minHeight: 20 }} />
                        )}
                      </Stack>
                    </Card>
                  </Link>
                );
              })}
            </SimpleGrid>
          )}
        </Container>
      </ScrollArea>

      <Container size="xl" w="100%" p="md" flex={0}>
        <Text c="dimmed" size="sm">
          Showing {filteredLeagues.length} of {leagues?.length || 0} leagues
        </Text>
      </Container>
    </Stack>
  );
}

export const Route = createFileRoute('/leagues')({
  component: LeaguesPage,
});
