import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { FixtureWithTeams } from '@trytag/shared';

export function useUpcomingFixtures(teamId?: number, limit = 20) {
  return useQuery({
    queryKey: ['fixtures', 'upcoming', teamId, limit],
    queryFn: async () => {
      const endpoint = teamId
        ? `/teams/${teamId}/fixtures/upcoming`
        : '/fixtures';
      const response = await apiClient.get<{ success: boolean; data: FixtureWithTeams[] }>(
        endpoint,
        { params: { limit } }
      );
      return extractData(response);
    },
  });
}

export function useRecentFixtures(teamId?: number, limit = 20) {
  return useQuery({
    queryKey: ['fixtures', 'recent', teamId, limit],
    queryFn: async () => {
      const endpoint = teamId
        ? `/teams/${teamId}/fixtures/results`
        : '/fixtures';
      const response = await apiClient.get<{ success: boolean; data: FixtureWithTeams[] }>(
        endpoint,
        { params: { limit } }
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
  });
}
