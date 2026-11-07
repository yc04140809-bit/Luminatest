// READING A SAVE THAT MIGHT BE WRONG.
//
// Every row in `world_state` used to be read the same way:
//
//     (await store.getStateValue(KEY)) as Shape | undefined ?? DEFAULT
//
// which is a cast, and a cast is a promise the compiler cannot keep. It
// is right about a save this build wrote and says nothing at all about
// a save that got truncated, or came from a newer build, or was edited
// by somebody with the devtools open. A `world_clock` holding NaN
// propagates into every date in the game; a `character_GALD` holding a
// string crashes the first screen that reads his name.
//
// So every row gets read rather than cast, and reading answers two
// questions instead of one: what the value is, and HOW BADLY the row
// was wrong. The second is what the recovery is built on —
//
//   ok          nothing to say. Absent counts as ok: an absent row is
//               what a new world has, and a legacy save missing rows
//               this build added is not damaged, it is old.
//   repaired    the row was the right kind of thing with something
//               wrong inside it. Fixed downward and carried on.
//   unreadable  the row was not that kind of thing at all. The default
//               is used and somebody upstream gets to decide whether
//               this save should be trusted.
//
// REPAIRS ONLY EVER GO DOWNWARD. A save that has been damaged must
// never be read as MORE than it was: no quantity grows, no purse
// fills, no level rises. The worst a corrupt save may cost is what was
// in the broken row, and it may never be a way to cheat.

import { INITIAL_CLOCK, type WorldClock } from '../time/calendar';
import { readInventory } from '../economy/inventory';
import type { Inventory } from '../economy/items';
import { readLumi } from '../economy/lumi';
import { readProgressTable } from '../progression/levelCurve';
import type { LevelProgress } from '../progression/levelCurve';
import type { CharacterState } from '../characters/types';
import type { EnemyIndividual, EnemyProgress, ExperienceLog } from './world';

export type RowHealth = 'ok' | 'repaired' | 'unreadable';

export interface ReadRow<T> {
  value: T;
  health: RowHealth;
}

const ok = <T>(value: T): ReadRow<T> => ({ value, health: 'ok' });
const repaired = <T>(value: T): ReadRow<T> => ({ value, health: 'repaired' });
const unreadable = <T>(value: T): ReadRow<T> => ({ value, health: 'unreadable' });

/** Absent is not damage: it is what a new world, and an old save, look like. */
const absent = (raw: unknown): boolean => raw === undefined || raw === null;

const isObject = (raw: unknown): raw is Record<string, unknown> =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw);

/** A whole number at or above `min`, or null if this is not one. */
function whole(raw: unknown, min: number): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
  const n = Math.floor(raw);
  return n >= min ? n : null;
}

/**
 * WHEN IT IS.
 *
 * Repaired field by field rather than all or nothing, because the two
 * halves are independent and losing the year over a bad day would cost
 * a player their whole playthrough's worth of time.
 */
export function readClock(raw: unknown): ReadRow<WorldClock> {
  if (absent(raw)) return ok(INITIAL_CLOCK);
  if (!isObject(raw)) return unreadable(INITIAL_CLOCK);
  const worldYear = whole(raw.worldYear, 1);
  const worldDay = whole(raw.worldDay, 1);
  if (worldYear === null && worldDay === null) return unreadable(INITIAL_CLOCK);
  if (worldYear === null || worldDay === null) {
    return repaired({
      worldYear: worldYear ?? INITIAL_CLOCK.worldYear,
      worldDay: worldDay ?? INITIAL_CLOCK.worldDay,
    });
  }
  const exact = raw.worldYear === worldYear && raw.worldDay === worldDay;
  const value = { worldYear, worldDay };
  return exact ? ok(value) : repaired(value);
}

/**
 * SOMEBODY, AS THEY ARE NOW.
 *
 * Every field is checked against the type of the same field in the
 * state the world starts them in, which means adding a field to a
 * character needs no change here at all.
 *
 * UNKNOWN FIELDS ARE KEPT. A save written by a later build may carry
 * something this one has never heard of, and dropping it would mean
 * opening the game on an older version silently deleted part of the
 * player's world. It is copied through untouched.
 */
export function readCharacterState(
  raw: unknown,
  initial: CharacterState,
): ReadRow<CharacterState> {
  if (absent(raw)) return ok(initial);
  if (!isObject(raw)) return unreadable(initial);

  let hurt = false;
  // Start from what is stored, so fields this build does not know about
  // survive the round trip, then correct the ones it does know.
  const out = { ...raw } as Record<string, unknown>;
  for (const [key, reference] of Object.entries(initial) as [keyof CharacterState, unknown][]) {
    const held = out[key];
    if (Array.isArray(reference)) {
      if (!Array.isArray(held)) {
        out[key] = [...(reference as unknown[])];
        hurt = true;
        continue;
      }
      const clean = held.filter((entry) => typeof entry === 'string');
      if (clean.length !== held.length) hurt = true;
      out[key] = clean;
      continue;
    }
    if (reference === null) {
      // A field the world deliberately left unset: null or the kind of
      // thing it would be. Anything else is not information.
      if (held !== null && held !== undefined && typeof held === 'object') {
        out[key] = null;
        hurt = true;
      }
      if (held === undefined) {
        out[key] = null;
        hurt = true;
      }
      continue;
    }
    if (typeof held !== typeof reference) {
      out[key] = reference;
      hurt = true;
      continue;
    }
    if (typeof held === 'number' && !Number.isFinite(held)) {
      out[key] = reference;
      hurt = true;
    }
  }
  const value = out as unknown as CharacterState;
  return hurt ? repaired(value) : ok(value);
}

/** A list of ids — experiences seen, and anything else shaped like it. */
export function readIdList(raw: unknown): ReadRow<string[]> {
  if (absent(raw)) return ok([]);
  if (!Array.isArray(raw)) return unreadable([]);
  const value = raw.filter((entry): entry is string => typeof entry === 'string' && entry !== '');
  return value.length === raw.length ? ok(value) : repaired(value);
}

/** What has been shown, and when — so a beat does not repeat itself. */
export function readExperienceLog(raw: unknown): ReadRow<ExperienceLog> {
  const empty: ExperienceLog = { lastSeenDay: {}, order: [] };
  if (absent(raw)) return ok(empty);
  if (!isObject(raw)) return unreadable(empty);

  let hurt = false;
  const lastSeenDay: Record<string, number> = {};
  if (isObject(raw.lastSeenDay)) {
    for (const [id, day] of Object.entries(raw.lastSeenDay)) {
      const n = whole(day, 0);
      if (n === null) {
        hurt = true;
        continue;
      }
      lastSeenDay[id] = n;
    }
  } else if (raw.lastSeenDay !== undefined) {
    hurt = true;
  }

  const order = Array.isArray(raw.order)
    ? raw.order.filter((id): id is string => typeof id === 'string' && id !== '')
    : [];
  if (Array.isArray(raw.order) ? order.length !== raw.order.length : raw.order !== undefined) {
    hurt = true;
  }
  const value: ExperienceLog = { lastSeenDay, order };
  return hurt ? repaired(value) : ok(value);
}

/** How the player is getting on with each species. */
export function readEnemyProgressTable(raw: unknown): ReadRow<Record<string, EnemyProgress>> {
  if (absent(raw)) return ok({});
  if (!isObject(raw)) return unreadable({});
  let hurt = false;
  const value: Record<string, EnemyProgress> = {};
  for (const [speciesId, entry] of Object.entries(raw)) {
    if (!isObject(entry)) {
      hurt = true;
      continue;
    }
    const defeated = whole(entry.defeated, 0);
    const sinceStory = whole(entry.sinceStory, 0);
    const named = whole(entry.named, 0);
    if (defeated === null || sinceStory === null || named === null) hurt = true;
    value[speciesId] = {
      defeated: defeated ?? 0,
      sinceStory: sinceStory ?? 0,
      named: named ?? 0,
    };
  }
  return hurt ? repaired(value) : ok(value);
}

const STATUSES = new Set(['alive', 'dead']);
const RELATIONSHIPS = new Set(['unknown', 'spared', 'helped', 'captured', 'ended']);

/**
 * The creatures that stopped being a species and became somebody.
 *
 * A row here is a person as far as the game is concerned, so a damaged
 * one is DROPPED rather than guessed at: inventing a relationship the
 * player never chose would be writing their history for them.
 */
export function readEnemyIndividuals(raw: unknown): ReadRow<EnemyIndividual[]> {
  if (absent(raw)) return ok([]);
  if (!Array.isArray(raw)) return unreadable([]);
  const value: EnemyIndividual[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const { individualId, speciesId, status, relationship } = entry;
    if (typeof individualId !== 'string' || individualId === '') continue;
    if (typeof speciesId !== 'string' || speciesId === '') continue;
    if (typeof status !== 'string' || !STATUSES.has(status)) continue;
    if (typeof relationship !== 'string' || !RELATIONSHIPS.has(relationship)) continue;
    const firstMetYear = whole(entry.firstMetYear, 1);
    const lastMetYear = whole(entry.lastMetYear, 1);
    if (firstMetYear === null || lastMetYear === null) continue;
    value.push({
      individualId,
      speciesId,
      status: status as EnemyIndividual['status'],
      relationship: relationship as EnemyIndividual['relationship'],
      firstMetYear,
      lastMetYear,
      reunionAvailable: entry.reunionAvailable === true,
    });
  }
  return value.length === raw.length ? ok(value) : repaired(value);
}

/**
 * The bag, the purse and the growth.
 *
 * The repair itself already lives with each of them — this only judges
 * how wrong the stored row was, so that the same three answers come
 * back for every row in the save.
 */
export function readBag(raw: unknown): ReadRow<Inventory> {
  const value = readInventory(raw);
  if (absent(raw)) return ok(value);
  if (!Array.isArray(raw)) return unreadable(value);
  return value.length === raw.length ? ok(value) : repaired(value);
}

export function readPurse(raw: unknown): ReadRow<number> {
  const value = readLumi(raw);
  if (absent(raw)) return ok(value);
  if (typeof raw !== 'number') return unreadable(value);
  return value === raw ? ok(value) : repaired(value);
}

export function readGrowth(raw: unknown): ReadRow<Record<string, LevelProgress>> {
  const value = readProgressTable(raw);
  if (absent(raw)) return ok(value);
  if (!isObject(raw)) return unreadable(value);
  const same = Object.entries(value).every(([id, progress]) => {
    const stored = (raw as Record<string, unknown>)[id];
    return (
      isObject(stored) &&
      stored.level === progress.level &&
      stored.totalExp === progress.totalExp
    );
  });
  const sameCount = Object.keys(value).length === Object.keys(raw).length;
  return same && sameCount ? ok(value) : repaired(value);
}

/** Reward ids already paid out. A damaged entry is dropped, never invented. */
export function readClaimedRewards(raw: unknown): ReadRow<string[]> {
  return readIdList(raw);
}

/**
 * The worst thing found while reading a whole save.
 *
 * `unreadable` beats `repaired` beats `ok`, which is the order the
 * recovery cares about: one row of the wrong kind entirely is the
 * signal that this save may not be this save any more.
 */
export function worstOf(healths: readonly RowHealth[]): RowHealth {
  if (healths.includes('unreadable')) return 'unreadable';
  if (healths.includes('repaired')) return 'repaired';
  return 'ok';
}
