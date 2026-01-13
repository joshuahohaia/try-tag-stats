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
  Box,
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useLeagues } from '../hooks/useLeagues';
import { useRegions } from '../hooks/useRegions';

function LeaguesPage() {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState<string | null>(null);

  const { data: leagues, isLoading: leaguesLoading } = useLeagues();
  const { data: regions, isLoading: regionsLoading } = useRegions();

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
    <Stack h="100%" gap="md" style={{ overflow: 'hidden' }}>
      <Stack gap="lg" flex={0}>
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
            style={{ flex: 1, maxWidth: 300 }}
          />
          <Select
            placeholder="Filter by region"
            data={regionOptions}
            value={regionFilter}
            onChange={setRegionFilter}
            clearable
            style={{ width: 200 }}
          />
        </Group>
      </Stack>

      <ScrollArea flex={1} type="auto">
        {filteredLeagues.length === 0 ? (
          <Card withBorder>
            <Text c="dimmed" ta="center" py="xl">
              No leagues found. Try adjusting your filters.
            </Text>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {filteredLeagues.map((league) => (
              <Link
                key={league.id}
                to="/leagues/$leagueId"
                params={{ leagueId: String(league.id) }}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <Card
                  withBorder
                >
                  <Stack gap="xs">
                    <Text fw={600}>{league.name}</Text>
                    <Group gap="xs">
                      {league.dayOfWeek && (
                        <Badge variant="light" size="sm">{league.dayOfWeek}</Badge>
                      )}
                      {league.format && (
                        <Badge variant="outline" size="sm">{league.format}</Badge>
                      )}
                    </Group>
                    {league.venueName && (
                      <Text size="sm" c="dimmed">{league.venueName}</Text>
                    )}
                  </Stack>
                </Card>
              </Link>
            ))}
          </SimpleGrid>
        )}
      </ScrollArea>

      <Box flex={0}>
        <Text c="dimmed" size="sm">
          Showing {filteredLeagues.length} of {leagues?.length || 0} leagues
        </Text>
      </Box>
    </Stack>
  );
}

export const Route = createFileRoute('/leagues')({
  component: LeaguesPage,
});
