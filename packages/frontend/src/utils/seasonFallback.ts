import type { Season } from '@trytag/shared';

/**
 * Picks the next season to try when the selected season has no divisions.
 *
 * Seasons are tried newest first. Internal season ids rise over time (the same
 * assumption the league page already makes when no season is marked current),
 * so a current season that is not populated yet (e.g. Winter 2026/27 before
 * fixtures are uploaded) falls back to the season actually being played
 * (e.g. Autumn 2026) instead of the first season in list order, which can be
 * a year old.
 */
export function nextSeasonFallback(
  seasons: Season[],
  triedSeasonIds: ReadonlySet<string>,
  currentSeasonId: string | null
): Season | undefined {
  return [...seasons]
    .sort((a, b) => b.id - a.id)
    .find((s) => !triedSeasonIds.has(String(s.id)) && String(s.id) !== currentSeasonId);
}
