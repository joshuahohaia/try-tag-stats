import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { FixtureWithTeams } from '@trytag/shared';

// Fixtures update daily - use default 1 hour staleTime from main.tsx
// Today's fixtures may change during viewing - shorter staleTime
const TODAY_STALE_TIME = 1000 * 60 * 5; // 5 minutes

interface FixtureParams {
  limit: number;
  type: 'upcoming' | 'recent';
  teamIds?: string;
}

export function useUpcomingFixtures(teamIds?: number | number[], limit = 20) {
  return useQuery({
    queryKey: ['fixtures', 'upcoming', teamIds, limit],
    queryFn: async () => {
      const params: FixtureParams = { limit, type: 'upcoming' };
      
      if (typeof teamIds === 'number') {
        params.teamIds = String(teamIds);
      } else if (Array.isArray(teamIds) && teamIds.length > 0) {
        params.teamIds = teamIds.join(',');
      }

      const response = await apiClient.get<{ success: boolean; data: FixtureWithTeams[] }>(
        '/fixtures',
        { params }
      );
      return extractData(response);
    },
  });
}

export function useRecentFixtures(teamIds?: number | number[], limit = 20) {
  return useQuery({
    queryKey: ['fixtures', 'recent', teamIds, limit],
    queryFn: async () => {
      const params: FixtureParams = { limit, type: 'recent' };
      
      if (typeof teamIds === 'number') {
        params.teamIds = String(teamIds);
      } else if (Array.isArray(teamIds) && teamIds.length > 0) {
        params.teamIds = teamIds.join(',');
      }

      const response = await apiClient.get<{ success: boolean; data: FixtureWithTeams[] }>(
        '/fixtures',
        { params }
      );
      return extractData(response);
    },
  });
}

export function useTodayFixtures() {
  return useQuery({
    queryKey: ['fixtures', 'today'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: FixtureWithTeams[] }>(
        '/fixtures/today'
      );
      return extractData(response);
    },
    staleTime: TODAY_STALE_TIME, // Shorter cache for live/today data
  });
}
