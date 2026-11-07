// NARRATIVE SEED v0.1 — pure derivation.
//
// A seed's state is not stored anywhere. It is read off what the player
// has already met, exactly like the LIFE ARCHIVE is read off WORLD
// MEMORY: one source of truth, nothing to keep in step, nothing to
// migrate, and RESET WORLD clears it for free.

import type { NarrativeSeedDef, NarrativeSeedStatus, SeedState } from './types';

export function seedState(def: NarrativeSeedDef, hasSeen: (eventId: string) => boolean): SeedState {
  if (def.resolvedByEventId && hasSeen(def.resolvedByEventId)) return 'RESOLVED';
  if (hasSeen(def.sourceEventId)) return 'HINTED';
  return 'SEED';
}

export function seedStatuses(
  defs: readonly NarrativeSeedDef[],
  hasSeen: (eventId: string) => boolean,
): NarrativeSeedStatus[] {
  return defs.map((def) => {
    const state = seedState(def, hasSeen);
    return { def, state, playerKnown: state !== 'SEED' };
  });
}

/** Questions the player has been shown and the world has not answered. */
export function unresolvedSeedCount(
  defs: readonly NarrativeSeedDef[],
  hasSeen: (eventId: string) => boolean,
): number {
  return seedStatuses(defs, hasSeen).filter(
    (s) => s.playerKnown && s.state !== 'RESOLVED',
  ).length;
}
