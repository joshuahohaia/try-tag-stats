import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';

export interface SyncStatus {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastAttemptStatus: string;
}

// Sync status changes at most once per sync run - check every 5 minutes
const SYNC_STATUS_STALE_TIME = 1000 * 60 * 5;

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SyncStatus }>('/sync-status');
      return extractData(response);
    },
    staleTime: SYNC_STATUS_STALE_TIME,
    refetchInterval: SYNC_STATUS_STALE_TIME,
  });
}
