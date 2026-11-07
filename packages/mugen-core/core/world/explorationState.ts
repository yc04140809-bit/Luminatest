// WHAT IS SAVED ABOUT WALKING PLACES, AND NOTHING MORE.
//
// TWO ROWS, because they answer two questions: whether a place's
// once-in-a-world find has been taken (`explorationRareFinds`), and how
// many real visits a place has had (`explorationVisits` — what makes the
// find a little likelier each time, so that it is never a matter of
// walking for ever).
//
// NO SCHEMA CHANGE. The rule in `saveSchema.ts`: "A missing field is not
// a migration." A save from before exploration kept anything has
// neither row, which reads as nothing taken and no visits — exactly what
// a world that has never been there should say. SAVE_VERSION does not
// move and no migration step was written.
//
// NOT WORLD MEMORY. What is found here is the player's, not the world's
// history: nobody in the world knows a sword was picked up in the ruins,
// and nothing here is written as an event. A find that one day DOES
// belong to somebody's life will say so in its own definition and be
// written as an event then; these rows stay what they are.

/** Places whose once-in-a-world find has been taken. Only `true` is ever stored. */
export type RareFindTable = Record<string, true>;

/** Real visits per place. Whole numbers, never negative. */
export type VisitTable = Record<string, number>;

/** A visit count no save could honestly reach; anything past it is damage. */
const VISITS_CAP = 100_000;

/** The places whose find is taken, out of a save, repaired. Never fails. */
export function readRareFinds(raw: unknown): { value: RareFindTable; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: {}, health: 'ok' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: {}, health: 'repaired' };
  const out: RareFindTable = {};
  let changed = false;
  for (const [place, taken] of Object.entries(raw as Record<string, unknown>)) {
    // Only a plain `true` means taken. `false` is how a hand-edited save
    // might say "not yet" — dropped, which reads the same.
    if (place && taken === true) out[place] = true;
    else changed = true;
  }
  return { value: out, health: changed ? 'repaired' : 'ok' };
}

/** Visits per place, out of a save, repaired. Never fails. */
export function readVisits(raw: unknown): { value: VisitTable; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: {}, health: 'ok' };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { value: {}, health: 'repaired' };
  const out: VisitTable = {};
  let changed = false;
  for (const [place, n] of Object.entries(raw as Record<string, unknown>)) {
    if (!place || typeof n !== 'number' || !Number.isFinite(n)) {
      changed = true;
      continue;
    }
    const kept = Math.min(VISITS_CAP, Math.max(0, Math.floor(n)));
    if (kept !== n) changed = true;
    if (kept > 0) out[place] = kept;
    else if (n !== 0) changed = true;
  }
  return { value: out, health: changed ? 'repaired' : 'ok' };
}

/**
 * THE PICKUPS TAKEN (2026-10-07): the ids of a place's fixed things to
 * pick up (content/exploration `pickups`) that have been taken in this
 * world. A third row, the same rules: absent is nothing taken, repaired
 * when read, never WORLD MEMORY. One taken is gone for good — a later
 * round that lets something grow back reads this list, it does not
 * change its shape.
 */
export type PickupsTaken = readonly string[];

/** A list no save could honestly reach; anything past it is damage. */
const PICKUPS_CAP = 10_000;

/** The pickups taken, out of a save, repaired. Never fails. */
export function readPickupsTaken(raw: unknown): { value: string[]; health: 'ok' | 'repaired' } {
  if (raw === undefined) return { value: [], health: 'ok' };
  if (!Array.isArray(raw)) return { value: [], health: 'repaired' };
  const out: string[] = [];
  let changed = false;
  for (const id of raw) {
    if (typeof id !== 'string' || id === '' || out.includes(id)) {
      changed = true;
      continue;
    }
    out.push(id);
  }
  if (out.length > PICKUPS_CAP) {
    out.length = PICKUPS_CAP;
    changed = true;
  }
  return { value: out, health: changed ? 'repaired' : 'ok' };
}
