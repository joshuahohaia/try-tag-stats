import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { Region } from '@trytag/shared';

// Regions are static data - cache for 24 hours
const STATIC_STALE_TIME = 1000 * 60 * 60 * 24; // 24 hours

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Region[] }>('/regions');
      return extractData(response);
    },
    staleTime: STATIC_STALE_TIME,
  });
}

export function useRegion(slug: string) {
  return useQuery({
    queryKey: ['regions', slug],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Region }>(`/regions/${slug}`);
      return extractData(response);
    },
    enabled: !!slug,
    staleTime: STATIC_STALE_TIME,
  });
}
