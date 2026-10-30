import type { Division } from '@trytag/shared';

export interface PhaseStarted {
  /** Spawtz PhaseId of a later phase. */
  phaseId: number;
  /** undefined while any standings request for that phase is still loading. */
  started: boolean | undefined;
}

/**
 * Picks the division a league page opens on.
 *
 * Phase ids are opaque and not proven to rise over time, so they are never used for ordering.
 * The default only moves off the first division when exactly one later phase has started
 * (at least one team in any of its divisions has played). If several later phases have started,
 * or none, or it cannot be told, the first division is kept.
 * Returns undefined while the answer still depends on loading data.
 */
export function pickDefaultDivision(
  divisions: Division[],
  phases: PhaseStarted[]
): Division | undefined {
  if (divisions.length === 0) return undefined;
  const first = divisions[0];
  if (phases.some((p) => p.started === undefined)) return undefined;
  const started = phases.filter((p) => p.started);
  if (started.length !== 1) return first;
  return divisions.find((d) => d.phaseId === started[0].phaseId) ?? first;
}

export interface DivisionPlayed {
  loading: boolean;
  /** "played" value of every team in the division's standings (empty if none or failed). */
  played: number[];
}

/** A phase has started when any team in any of its divisions has played. Waits for all divisions. */
export function summarisePhases(
  divisions: Division[],
  byDivisionId: Map<number, DivisionPlayed>
): PhaseStarted[] {
  const ids = [...new Set(divisions.filter((d) => d.phaseId != null).map((d) => d.phaseId as number))];
  return ids.map((phaseId) => {
    const members = divisions.filter((d) => d.phaseId === phaseId);
    const infos = members.map((d) => byDivisionId.get(d.id));
    if (infos.some((i) => !i || i.loading)) return { phaseId, started: undefined };
    return { phaseId, started: infos.some((i) => i!.played.some((p) => p > 0)) };
  });
}
