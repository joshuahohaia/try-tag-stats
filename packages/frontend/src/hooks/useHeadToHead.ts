import { useQuery } from '@tanstack/react-query';
import { apiClient, extractData } from '../api/client';

export interface HeadToHeadMeeting {
  date: string;
  time: string | null;
  seasonName: string;
  divisionName: string;
  teamScore: number;
  opponentScore: number;
  result: 'W' | 'D' | 'L';
  labels: string[];
}

export type HeadToHeadResponse =
  | { supported: false }
  | {
      supported: true;
      record: {
        played: number;
        won: number;
        drawn: number;
        lost: number;
        pointsFor: number;
        pointsAgainst: number;
      };
      meetings: HeadToHeadMeeting[];
      labelledCount: number;
      seasonsCovered: string[];
      complete: boolean;
      busy: boolean;
      failedSeasons: string[];
    };

// Results from finished seasons do not change; keep for 6 hours.
const STALE_TIME = 1000 * 60 * 60 * 6;

export function useHeadToHead(teamId: number | undefined, opponentId: number | undefined) {
  return useQuery({
    queryKey: ['head-to-head', teamId, opponentId],
    queryFn: async () => {
      const response = await apiClient.get(`/teams/${teamId}/head-to-head/${opponentId}`);
      return extractData<HeadToHeadResponse>(response);
    },
    enabled: !!teamId && !!opponentId,
    staleTime: STALE_TIME,
    retry: false,
  });
}
