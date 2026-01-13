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

export interface TeamProfile extends Team {
  standings: StandingWithDivision[];
  upcomingFixtures: FixtureWithTeams[];
  recentFixtures: FixtureWithTeams[];
  positionHistory?: TeamPositionHistory[];
  seasonStats?: TeamSeasonStats[];
  previousSeasons?: TeamPreviousSeason[];
  playerAwards?: PlayerAwardWithDetails[];
}

export function useTeam(id: number) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: TeamProfile }>(`/teams/${id}`);
      return extractData(response);
    },
    enabled: !!id,
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
  });
}
