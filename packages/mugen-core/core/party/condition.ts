// HOW EACH OF THEM IS DOING WHEN THEY ARE NOT FIGHTING.
//
// PER CHARACTER, and that is the whole of this round's change. The
// first version of this was one shared object — one health bar, one
// pool of magic — because that is what the battle has, and building
// four of something the fight does not have looked like inventing a
// system. It was the wrong call: a party's health is a fact about
// PEOPLE, and a store shaped around what today's battle happens to
// draw is a store that has to be rebuilt the day a third person walks
// in. So the store is shaped like the party, and the battle reads the
// part of it that the battle can represent.
//
// WHAT CONNECTS THE TWO. The fight has one health bar and one pool of
// magic. The bar is the front rank taking the blows — HERO — and the
// magic is hers, because she is the one casting: it is the same split
// the level curve already makes, where health and the swing follow his
// level and the pool follows hers. So a fight reads HERO's health and
// KAOS's magic, and hands both back when it ends. The two halves it
// cannot represent — his magic, her health — are stored, are full, and
// wait for a battle that can show them.
//
// MAXIMA ARE NEVER STORED. They come from the levels, every time they
// are asked for, because a stored maximum is a second copy of a truth
// the level already holds and the two would disagree the first time
// the curve is retuned. Only what is LEFT is saved.

import { statsForLevels, type PartyStats } from '../progression/levelStats';

/** What one person has left, and what they can hold. */
export interface CharacterCondition {
  currentHp: number;
  maxHp: number;
  currentMp: number;
  maxMp: number;
}

/** The party, by id. Two today; the shape does not care how many. */
export type PartyCondition = Record<string, CharacterCondition>;

/** What is actually saved: what is LEFT, and nothing else. */
export interface StoredCondition {
  hp: number;
  mp: number;
}

export type StoredParty = Record<string, StoredCondition>;

/**
 * WHOSE NUMBERS THE FIGHT USES.
 *
 * One place, so the mapping between a two-person store and a
 * one-bar battle is a fact that can be read rather than a habit
 * spread across three files.
 */
export const BATTLE_HP_HOLDER = 'hero';
export const BATTLE_MP_HOLDER = 'kaos';

const whole = (raw: unknown): number | null => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? n : null;
};

/**
 * One person's ceilings.
 *
 * Health and the swing follow his level, the pool follows hers — the
 * same split the level curve makes — so a character's own maximum is
 * read from the stat block their own level produces.
 */
export function ceilingFor(characterId: string, heroLevel: number, kaosLevel: number): PartyStats {
  return characterId === BATTLE_MP_HOLDER
    ? statsForLevels(kaosLevel, kaosLevel)
    : statsForLevels(heroLevel, heroLevel);
}

/**
 * The stored rows read against the party they are now.
 *
 * CLAMPED ON READ RATHER THAN ON WRITE, because the ceiling moves: a
 * level gained raises it and a curve retuned lowers it, and only the
 * absolute number survives either. A row that is missing, or is not a
 * number, reads as WHOLE — a save from before this existed is not a
 * party who have been hurt.
 *
 * Health floors at one. Nobody walks around the world at zero: a fight
 * lost puts them back on their feet before this is read anywhere.
 */
export function readParty(
  raw: unknown,
  members: readonly string[],
  heroLevel: number,
  kaosLevel: number,
): PartyCondition {
  const stored = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: PartyCondition = {};
  for (const id of members) {
    const ceiling = ceilingFor(id, heroLevel, kaosLevel);
    const row = stored[id];
    const held = row && typeof row === 'object' ? (row as { hp?: unknown; mp?: unknown }) : null;
    const hp = held ? whole(held.hp) : null;
    const mp = held ? whole(held.mp) : null;
    out[id] = {
      currentHp: hp === null ? ceiling.maxHp : Math.max(1, Math.min(ceiling.maxHp, hp)),
      maxHp: ceiling.maxHp,
      currentMp: mp === null ? ceiling.maxMp : Math.max(0, Math.min(ceiling.maxMp, mp)),
      maxMp: ceiling.maxMp,
    };
  }
  return out;
}

/** What goes to disk: what is left, for everybody who is hurt or spent. */
export function toStored(party: PartyCondition): StoredParty {
  const out: StoredParty = {};
  for (const [id, row] of Object.entries(party)) {
    out[id] = { hp: row.currentHp, mp: row.currentMp };
  }
  return out;
}

/** Whether anybody has anything to put back. */
export function partyIsWhole(party: PartyCondition): boolean {
  return Object.values(party).every(
    (row) => row.currentHp >= row.maxHp && row.currentMp >= row.maxMp,
  );
}

/**
 * LAST ROUND'S SHAPE, READ INTO THIS ONE.
 *
 * The first version of this stored one `{ hp, mp }` for the whole
 * party. Anybody who played that build has one on disk, and it means
 * exactly what the fight meant by it: the health was the front rank's
 * and the magic was hers. So it is not discarded and it is not
 * guessed at — it is put where those two numbers already belonged.
 */
export function readLegacyShared(raw: unknown): StoredParty | null {
  if (!raw || typeof raw !== 'object') return null;
  const held = raw as { hp?: unknown; mp?: unknown };
  const hp = whole(held.hp);
  const mp = whole(held.mp);
  if (hp === null || mp === null) return null;
  return {
    [BATTLE_HP_HOLDER]: { hp, mp: Number.POSITIVE_INFINITY },
    [BATTLE_MP_HOLDER]: { hp: Number.POSITIVE_INFINITY, mp },
  };
}

/**
 * WHAT A LEVEL ADDS TO SOMEBODY WHO IS ALREADY HURT.
 *
 * Levelling up must not heal and must not wound. Somebody at 70 of
 * 100 who gains eight maximum health is at 78 of 108: the same gap,
 * carried up. The alternatives are both wrong in a way a player
 * notices — leaving 70 of 108 makes levelling look like being hurt,
 * and jumping to 108 of 108 makes it a free full heal that a player
 * will quickly learn to farm.
 */
export function carryUp(
  stored: StoredCondition,
  before: PartyStats,
  after: PartyStats,
): StoredCondition {
  return {
    hp: Math.max(1, Math.min(after.maxHp, stored.hp + (after.maxHp - before.maxHp))),
    mp: Math.max(0, Math.min(after.maxMp, stored.mp + (after.maxMp - before.maxMp))),
  };
}
