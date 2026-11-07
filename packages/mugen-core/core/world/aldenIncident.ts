// ALDEN INCIDENT — the signs before trouble comes to Alden (予兆フェーズ, 2026-10-10).
//
// One hidden number, `aldenIncidentPoint`, moved by what the player DOES in
// the world — not by days passing — and the phase it reads as:
//
//   PHASE 0   0–2   平常 — nothing is said
//   PHASE 1   3–5   小さな違和感
//   PHASE 2   6–9   明確な異変
//   PHASE 3   10+   襲撃直前 — "something is close", and it stops there
//
// NOTHING COUNTS UNTIL セキリュウガ'S PART IS OVER (the route SETTLED: the
// aftermath seen to its end). The signs belong to the everyday that comes
// after that peak, not on top of it (作者判断 2026-10-10).
//
// WHAT MOVES IT, +1 each, and what keeps it from being farmed:
//
//   WIN       a fight won              once a day
//   EXPLORE   a walk out finished      once a day
//   PLACE     a place walked           once ever, per place (the first time
//                                      it is walked once counting has begun)
//   REST      a night's rest           only if something else counted since
//                                      the last rest it counted (resting over
//                                      and over in the village moves nothing)
//
// READING A RUMOUR NEVER MOVES IT. The world does not move because the
// player read about it; the player does things, the world moves, and the
// rumours change to show it (作者判断 2026-10-10). (A save from before kept
// `RUMOR:<id>` keys in `counted`; they are left as they are and mean nothing.)
//
// Days only pass by resting, so a day of play moves it by a few at most.
//
// NOTHING HAPPENS AT PHASE 3. This is the ground the raid will stand on, not
// the raid: no event starts, nothing is broken, nobody leaves.
//
// Pure: no world, no save. The world writes what these return.

import type { SekiryugaStage } from './storyArc';

export type IncidentKind = 'WIN' | 'EXPLORE' | 'PLACE' | 'REST';

/** Whether anything counts yet: only once セキリュウガ's part is over. */
export const incidentCounting = (stage: SekiryugaStage): boolean => stage === 'SETTLED';

export type IncidentPhase = 0 | 1 | 2 | 3;

/** Where each phase begins. */
export const INCIDENT_PHASE_AT: Readonly<Record<IncidentPhase, number>> = { 0: 0, 1: 3, 2: 6, 3: 10 };

export function incidentPhaseFor(point: number): IncidentPhase {
  if (point >= INCIDENT_PHASE_AT[3]) return 3;
  if (point >= INCIDENT_PHASE_AT[2]) return 2;
  if (point >= INCIDENT_PHASE_AT[1]) return 1;
  return 0;
}

export interface IncidentRow {
  aldenIncidentPoint: number;
  aldenIncidentPhase: IncidentPhase;
  /** What has already counted: `PLACE:<id>` for good, `WIN@<day>` / `EXPLORE@<day>` for that day. */
  counted: readonly string[];
  /** Whether anything but a rest has counted since the last rest counted. */
  sinceRest: boolean;
}

export const NO_INCIDENT: IncidentRow = { aldenIncidentPoint: 0, aldenIncidentPhase: 0, counted: [], sinceRest: false };

/** The row out of a save, repaired. A save from before has none: point 0, phase 0. */
export function readIncident(raw: unknown): { value: IncidentRow; health: 'ok' | 'repaired' } {
  if (raw === undefined || raw === null) return { value: NO_INCIDENT, health: 'ok' };
  const r = raw as Partial<IncidentRow>;
  const point = r?.aldenIncidentPoint;
  if (typeof r !== 'object' || typeof point !== 'number' || !Number.isInteger(point) || point < 0) {
    return { value: NO_INCIDENT, health: 'repaired' };
  }
  const counted = Array.isArray(r.counted) ? [...new Set(r.counted.filter((k): k is string => typeof k === 'string'))] : [];
  const phase = incidentPhaseFor(point);
  const value: IncidentRow = { aldenIncidentPoint: point, aldenIncidentPhase: phase, counted, sinceRest: r.sinceRest === true };
  const same =
    r.aldenIncidentPhase === phase && Array.isArray(r.counted) && counted.length === r.counted.length && typeof r.sinceRest === 'boolean';
  return { value, health: same ? 'ok' : 'repaired' };
}

/**
 * One thing done. Returns the row after it — or null when it does not count
 * (already counted today, or ever, or a rest with nothing done before it, or
 * not a step at all).
 */
export function countIncident(row: IncidentRow, kind: IncidentKind, day: number, id?: string): IncidentRow | null {
  let counted = row.counted;
  if (kind === 'REST') {
    if (!row.sinceRest) return null;
    return { ...bump(row, counted), sinceRest: false };
  }
  if (kind === 'PLACE') {
    if (!id) return null;
    const key = `${kind}:${id}`;
    if (counted.includes(key)) return null;
    counted = [...counted, key];
  } else if (kind === 'WIN' || kind === 'EXPLORE') {
    const key = `${kind}@${day}`;
    if (counted.includes(key)) return null;
    // Only today's is kept for the daily kinds: the list never grows with the days.
    counted = [...counted.filter((k) => !k.startsWith(`${kind}@`)), key];
  } else {
    // Nothing else is a step (a rumour read is not one).
    return null;
  }
  return { ...bump(row, counted), sinceRest: true };
}

function bump(row: IncidentRow, counted: readonly string[]): IncidentRow {
  const point = row.aldenIncidentPoint + 1;
  return { ...row, aldenIncidentPoint: point, aldenIncidentPhase: incidentPhaseFor(point), counted };
}
