/**
 * Spawtz SeasonIds increase over time, so the newest season on the live
 * league list is the current one. Returns null when the list has no seasons.
 */
export function pickCurrentSeasonId(seasonIds: Iterable<number>): number | null {
  let max: number | null = null;
  for (const id of seasonIds) {
    if (Number.isFinite(id) && (max === null || id > max)) max = id;
  }
  return max;
}

/**
 * A sync may only hide divisions it did not see when it clearly saw the whole
 * list. The listing page has no total count we can check against, so be
 * conservative: no errors, a list that has not shrunk by more than 20% versus
 * the divisions active now, and a newest season that is not older than one we
 * already know (a stale or cached page). When unsure, hide nothing; the next
 * clean sync can still hide them.
 */
export function shouldMarkUnseenInactive(args: {
  hadErrors: boolean;
  seenDivisions: number;
  previouslyActive: number;
  newestSeasonOnList: number | null;
  newestSeasonKnown: number | null;
}): boolean {
  if (args.hadErrors || args.seenDivisions <= 0) return false;
  if (args.newestSeasonOnList === null) return false;
  if (args.newestSeasonKnown !== null && args.newestSeasonOnList < args.newestSeasonKnown) return false;
  if (args.previouslyActive === 0) return true;
  return args.seenDivisions >= args.previouslyActive * 0.8;
}
