import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { League } from '@trytag/shared';

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
