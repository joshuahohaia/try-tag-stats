import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type {
  Team,
  StandingWithDivision,
  FixtureWithTeams,
  TeamPositionHistory,
  TeamSeasonStats,
  TeamPreviousSeason,
  PlayerAwardWithDetails,
} from '@trytag/shared';

// Team list is static - cache for 24 hours
const STATIC_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours
// Team profiles contain dynamic data (fixtures, standings) - shorter cache
const PROFILE_STALE_TIME = 1000 * 60 * 5; // 5 minutes

export interface TeamProfile extends Team {
  standings: StandingWithDivision[];
  upcomingFixtures: FixtureWithTeams[];
  recentFixtures: FixtureWithTeams[];
  positionHistory?: TeamPositionHistory[];
  seasonStats?: TeamSeasonStats[];
  previousSeasons?: TeamPreviousSeason[];
  playerAwards?: PlayerAwardWithDetails[];
}

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Team[] }>('/teams');
      return extractData(response);
    },
    staleTime: STATIC_STALE_TIME, // Team list rarely changes
  });
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: TeamProfile }>(`/teams/${id}`);
      return extractData(response);
    },
    enabled: !!id,
    staleTime: PROFILE_STALE_TIME, // Profiles have dynamic fixture/standings data
  });
}

export function useTeamsBatch(ids: number[]) {
  return useQuery({
    queryKey: ['teams', 'batch', ids],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Team[] }>(
        `/teams/batch?ids=${ids.join(',')}`
      );
      return extractData(response);
    },
    enabled: ids.length > 0,
    staleTime: STATIC_STALE_TIME, // Batch is just basic team info
  });
}
