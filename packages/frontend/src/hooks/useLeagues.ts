import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { League, Season, Division } from '@trytag/shared';

export function useLeagues(regionId?: number) {
  return useQuery({
    queryKey: ['leagues', regionId],
    queryFn: async () => {
      const params = regionId ? { region: regionId } : {};
      const response = await apiClient.get<{ success: boolean; data: League[] }>('/leagues', { params });
      return extractData(response);
    },
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
  });
}

export function useLeagueSeasons(leagueId: number) {
  return useQuery({
    queryKey: ['leagues', leagueId, 'seasons'],
    queryFn: async () => {
      // Note: The backend endpoint is /leagues/:id/seasons
      // It currently returns ALL seasons, not specific to the league, 
      // but based on the backend code: `router.get('/:id/seasons', ...)` returns `seasonRepository.findAll()`
      // So this is correct for now, although the backend implementation is a bit generic.
      const response = await apiClient.get<{ success: boolean; data: Season[] }>(`/leagues/${leagueId}/seasons`);
      return extractData(response);
    },
    enabled: !!leagueId,
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
  });
}
