import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { League, LeagueSummary, Season, Division } from '@trytag/shared';

// Leagues, seasons, and divisions are static structure - cache for 24 hours
const STATIC_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export function useLeagues(regionId?: number) {
  return useQuery({
    queryKey: ['leagues', regionId],
    queryFn: async () => {
      const params = regionId ? { region: regionId } : {};
      const response = await apiClient.get<{ success: boolean; data: League[] }>('/leagues', { params });
      return extractData(response);
    },
    staleTime: STATIC_STALE_TIME,
  });
}

// Summary stale time is shorter since it includes dynamic fixture data
const SUMMARY_STALE_TIME = 1000 * 60 * 30; // 30 minutes

export function useLeaguesSummary(regionId?: number) {
  return useQuery({
    queryKey: ['leagues', 'summary', regionId],
    queryFn: async () => {
      const params = regionId ? { region: regionId } : {};
      const response = await apiClient.get<{ success: boolean; data: LeagueSummary[] }>(
        '/leagues/summary',
        { params }
      );
      return extractData(response);
    },
    staleTime: SUMMARY_STALE_TIME,
  });
}

export function useLeague(id: number) {
  return useQuery({
    queryKey: ['leagues', id],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: League }>(`/leagues/${id}`);
      return extractData(response);
    },
    enabled: !!id,
    staleTime: STATIC_STALE_TIME,
  });
}

export function useLeagueSeasons(leagueId: number) {
  return useQuery({
    queryKey: ['leagues', leagueId, 'seasons'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Season[] }>(`/leagues/${leagueId}/seasons`);
      return extractData(response);
    },
    enabled: !!leagueId,
    staleTime: STATIC_STALE_TIME,
  });
}

export function useLeagueDivisions(leagueId: number, seasonId: number) {
  return useQuery({
    queryKey: ['leagues', leagueId, 'seasons', seasonId, 'divisions'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Division[] }>(
        `/leagues/${leagueId}/seasons/${seasonId}/divisions`
      );
      return extractData(response);
    },
    enabled: !!leagueId && !!seasonId,
    staleTime: STATIC_STALE_TIME,
  });
}
