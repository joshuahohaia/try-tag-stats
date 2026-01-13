import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';
import type { Region } from '@trytag/shared';

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Region[] }>('/regions');
      return extractData(response);
    },
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
  });
}
