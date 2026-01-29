import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { StandingWithTeam, FixtureWithTeams, PlayerAwardWithDetails, Division } from '@trytag/shared';

export function useDivisionStandings(divisionId: number) {
  return useQuery({
    queryKey: ['divisions', divisionId, 'standings'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: StandingWithTeam[] }>(
        `/divisions/${divisionId}/standings`
      );
      return extractData(response);
    },
    enabled: divisionId !== undefined,
  });
}

export function useDivisionFixtures(divisionId: number) {
  return useQuery({
    queryKey: ['divisions', divisionId, 'fixtures'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: FixtureWithTeams[] }>(
        `/divisions/${divisionId}/fixtures`
      );
      return extractData(response);
    },
    enabled: divisionId !== undefined,
  });
}

export function useDivisionStatistics(divisionId: number) {
  return useQuery({
    queryKey: ['divisions', divisionId, 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: PlayerAwardWithDetails[] }>(
        `/divisions/${divisionId}/statistics`
      );
      return extractData(response);
    },
    enabled: divisionId !== undefined,
  });
}

export function useDivisionsStandings(divisionIds: number[]) {
  return useQuery({
    queryKey: ['divisions', 'standings', 'batch', divisionIds],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: StandingWithTeam[] }>(
        `/divisions/standings/batch?ids=${divisionIds.join(',')}`
      );
      return extractData(response);
    },
    enabled: divisionIds.length > 0,
  });
}

export function useDivisionsStatistics(divisionIds: number[]) {
  return useQuery({
    queryKey: ['divisions', 'statistics', 'batch', divisionIds],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: PlayerAwardWithDetails[] }>(
        `/divisions/statistics/batch?ids=${divisionIds.join(',')}`
      );
      return extractData(response);
    },
    enabled: divisionIds.length > 0,
  });
}

export function useDivisions(divisionIds: number[]) {
  return useQuery({
    queryKey: ['divisions', 'batch', divisionIds],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Division[] }>(
        `/divisions/batch?ids=${divisionIds.join(',')}`
      );
      return extractData(response);
    },
    enabled: divisionIds.length > 0,
  });
}