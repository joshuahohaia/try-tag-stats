import type { TeamResultRow } from './parsers/team-results.parser.js';

export interface SeasonResults {
  seasonId: number;
  divisionId: number;
  seasonName: string;
  divisionName: string;
  rows: TeamResultRow[];
}

export interface HeadToHeadMeeting {
  date: string;
  time: string | null;
  seasonName: string;
  divisionName: string;
  teamScore: number;
  opponentScore: number;
  result: 'W' | 'D' | 'L';
  /** Labels Spawtz printed directly above or below this game, if any. */
  labels: string[];
}

export interface HeadToHeadRecord {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface HeadToHeadResult {
  /** Games with no label next to them. These make up the headline record. */
  record: HeadToHeadRecord;
  counted: HeadToHeadMeeting[];
  /**
   * Games with a label next to them (friendly, playoff, ...). Spawtz does not say
   * which neighbouring game a label belongs to, so these are listed but not counted.
   */
  uncounted: HeadToHeadMeeting[];
  seasonsCovered: string[];
}

function outcome(a: number, b: number): 'W' | 'D' | 'L' {
  return a > b ? 'W' : a < b ? 'L' : 'D';
}

/**
 * Head-to-head for one team against one opponent, matched by Spawtz TeamId only.
 * Seasons are de-duplicated by seasonId + divisionId so the same page fetched twice
 * is not counted twice. Games inside one season are never merged: two games on the
 * same day against the same opponent at different times are two games.
 */
export function buildHeadToHead(opponentTeamId: number, seasons: SeasonResults[]): HeadToHeadResult {
  const seen = new Set<string>();
  const counted: HeadToHeadMeeting[] = [];
  const uncounted: HeadToHeadMeeting[] = [];
  const covered: string[] = [];

  for (const season of seasons) {
    const key = `${season.seasonId}:${season.divisionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    covered.push(`${season.seasonName} - ${season.divisionName}`);

    for (const row of season.rows) {
      if (row.opponentTeamId !== opponentTeamId) continue;
      const labels = [row.labelAbove, row.labelBelow].filter((l): l is string => !!l);
      const meeting: HeadToHeadMeeting = {
        date: row.date,
        time: row.time,
        seasonName: season.seasonName,
        divisionName: season.divisionName,
        teamScore: row.teamScore,
        opponentScore: row.opponentScore,
        result: outcome(row.teamScore, row.opponentScore),
        labels,
      };
      (labels.length === 0 ? counted : uncounted).push(meeting);
    }
  }

  const byDateDesc = (a: HeadToHeadMeeting, b: HeadToHeadMeeting) =>
    `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`);
  counted.sort(byDateDesc);
  uncounted.sort(byDateDesc);

  const record = counted.reduce<HeadToHeadRecord>(
    (acc, m) => ({
      played: acc.played + 1,
      won: acc.won + (m.result === 'W' ? 1 : 0),
      drawn: acc.drawn + (m.result === 'D' ? 1 : 0),
      lost: acc.lost + (m.result === 'L' ? 1 : 0),
      pointsFor: acc.pointsFor + m.teamScore,
      pointsAgainst: acc.pointsAgainst + m.opponentScore,
    }),
    { played: 0, won: 0, drawn: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }
  );

  return { record, counted, uncounted, seasonsCovered: covered };
}
