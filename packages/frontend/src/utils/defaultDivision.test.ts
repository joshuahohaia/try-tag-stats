import { describe, it, expect } from 'vitest';
import type { Division } from '@trytag/shared';
import { pickDefaultDivision, summarisePhases, type DivisionPlayed } from './defaultDivision';

const d = (id: number, name: string, phaseId: number | null): Division => ({
  id,
  externalDivisionId: id,
  leagueId: 1,
  seasonId: 1,
  name,
  tier: null,
  phaseId,
  phaseName: phaseId == null ? null : `Phase ${phaseId}`,
});
const divisions = [d(1, 'Division 1', null), d(2, 'Division 2', null), d(3, 'Cup', 87), d(4, 'Plate', 87)];

describe('pickDefaultDivision', () => {
  it('keeps the first division when there are no later phases', () => {
    expect(pickDefaultDivision(divisions.slice(0, 2), [])?.id).toBe(1);
  });
  it('opens the started phase (started anywhere in the phase, not only its first division)', () => {
    expect(pickDefaultDivision(divisions, [{ phaseId: 87, started: true }])?.id).toBe(3);
  });
  it('keeps the first division when the later phase has not started', () => {
    expect(pickDefaultDivision(divisions, [{ phaseId: 87, started: false }])?.id).toBe(1);
  });
  it('waits while phase standings are loading', () => {
    expect(pickDefaultDivision(divisions, [{ phaseId: 87, started: undefined }])).toBeUndefined();
  });
  it('does not rely on id order: non-monotonic ids, only the started phase is chosen', () => {
    const ds = [d(1, 'A', null), d(2, 'Finals', 97), d(3, 'Second', 89)];
    const phases = [
      { phaseId: 97, started: false },
      { phaseId: 89, started: true },
    ];
    expect(pickDefaultDivision(ds, phases)?.id).toBe(3);
  });
  it('stays neutral when more than one later phase has started', () => {
    const ds = [d(1, 'A', null), d(2, 'Second', 89), d(3, 'Finals', 97)];
    const phases = [
      { phaseId: 89, started: true },
      { phaseId: 97, started: true },
    ];
    expect(pickDefaultDivision(ds, phases)?.id).toBe(1);
  });
});

describe('summarisePhases', () => {
  const info = (loading: boolean, played: number[]): DivisionPlayed => ({ loading, played });
  it('counts a phase as started when only a later division (Plate) has played', () => {
    const m = new Map([[3, info(false, [0, 0])], [4, info(false, [1, 0])]]);
    expect(summarisePhases(divisions, m)).toEqual([{ phaseId: 87, started: true }]);
  });
  it('is not started when no division has played', () => {
    const m = new Map([[3, info(false, [0])], [4, info(false, [0])]]);
    expect(summarisePhases(divisions, m)).toEqual([{ phaseId: 87, started: false }]);
  });
  it('waits when any division is still loading or missing', () => {
    expect(summarisePhases(divisions, new Map([[3, info(false, [2])], [4, info(true, [])]]))[0].started).toBeUndefined();
    expect(summarisePhases(divisions, new Map([[3, info(false, [2])]]))[0].started).toBeUndefined();
  });
  it('treats a failed standings request as not played', () => {
    const m = new Map([[3, info(false, [])], [4, info(false, [])]]);
    expect(summarisePhases(divisions, m)[0].started).toBe(false);
  });
});
