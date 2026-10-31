import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';

export interface TeamKit {
  teamId: number;
  primary: string;
  secondary: string;
  updatedAt: string;
  version: number;
}

export function useKits() {
  return useQuery({
    queryKey: ['kits'],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: TeamKit[] }>('/kits');
      return extractData(response);
    },
    staleTime: 60 * 1000,
    select: (kits) => new Map(kits.map((k) => [k.teamId, k])),
  });
}

/** The saved kit for a team, or undefined (generated colours apply). */
export function useTeamKit(teamId: number | undefined): TeamKit | undefined {
  const { data } = useKits();
  return teamId === undefined ? undefined : data?.get(teamId);
}

/** Maps an API failure to words a person can act on. */
export function kitErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  if (status === 409) return 'Someone else changed this kit first. The latest kit is loaded, so check it and try again.';
  if (status === 429) return 'Too many kit changes from this device. Wait a few minutes and try again.';
  if (status === 400) return 'Those colours were not accepted. Pick two valid colours.';
  return 'Could not save the kit. Try again in a moment.';
}

export function useSaveKit(teamId: number) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['kits'] });
  const save = useMutation({
    mutationFn: async (v: { primary: string; secondary: string; expectedVersion: number | null }) => {
      await apiClient.put(`/kits/${teamId}`, v);
    },
    onSettled: refresh,
  });
  const reset = useMutation({
    mutationFn: async (expectedVersion: number) => {
      await apiClient.delete(`/kits/${teamId}`, { data: { expectedVersion } });
    },
    onSettled: refresh,
  });
  return { save, reset };
}
