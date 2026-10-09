// BREAD — a thing carried on the road that goes stale, and the small lift
// eating one gives (パン屋 MVP, 2026-10-09).
//
// HOW MANY loaves a player has is the inventory's, as for every other
// thing: a loaf is an ordinary ItemStack and nothing here keeps a second
// count. What a loaf has that a herb has not is AGE, and age belongs to
// each loaf, so it is kept beside the bag — one small row,
// `breadFreshness`: for each kind of bread, how many nights each loaf in
// the bag has left. Its length always matches the count in the bag
// (`reconcileFreshness` makes it so), so the bag stays the one truth about
// how many.
//
// NEVER REAL TIME. A loaf goes stale with the nights the party RESTS, not
// with the days a player is away from the game: leaving the phone for a
// week costs nothing.
//
// ONE LIFT AT A TIME (`breadBuff`): eating a loaf replaces whatever the
// last one gave, and a night's rest ends it. Small — a twentieth — and it
// never stacks.
//
// Pure: no world, no save, no screen. The world writes what these return.

import type { Inventory } from './items';

/** What a loaf lifts. SPEED is kept and shown; the fight has no speed yet. */
export type BreadBuffType = 'DEFENSE' | 'SPEED' | 'MAGIC' | 'MAX_HP';

export const BREAD_BUFF_TYPES: readonly BreadBuffType[] = ['DEFENSE', 'SPEED', 'MAGIC', 'MAX_HP'];

/**
 * What makes a loaf a loaf, on its item definition (`ItemDef.bread`).
 * `recipeId` names what it is baked from; the fields after it are room for
 * the recipes to come and are read by nothing yet.
 */
export interface BreadSpec {
  buffType: BreadBuffType;
  /** A share: 0.05 is +5%. */
  buffValue: number;
  /** How many nights' rest a loaf keeps when it is bought. */
  freshness: number;
  recipeId: string;
  ingredients?: readonly string[];
  quality?: string;
  baker?: string;
  recipeLevel?: number;
}

/** The lift in effect, from the last loaf eaten. */
export interface BreadBuff {
  itemId: string;
  buffType: BreadBuffType;
  buffValue: number;
}

/** For each kind of bread, the nights each loaf in the bag has left (0 = stale). */
export type BreadFreshness = Readonly<Record<string, readonly number[]>>;

export const NO_BREAD: BreadFreshness = {};

const isNights = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 99;

/** The freshness row out of a save, repaired. A save from before has none: no bread. */
export function readBreadFreshness(raw: unknown): { value: BreadFreshness; health: 'ok' | 'repaired' } {
  if (raw === undefined || raw === null) return { value: NO_BREAD, health: 'ok' };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { value: NO_BREAD, health: 'repaired' };
  const out: Record<string, number[]> = {};
  let repaired = false;
  for (const [itemId, nights] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(nights)) {
      repaired = true;
      continue;
    }
    const kept = nights.filter(isNights);
    if (kept.length !== nights.length) repaired = true;
    if (kept.length > 0) out[itemId] = kept;
  }
  return { value: out, health: repaired ? 'repaired' : 'ok' };
}

/** The lift row out of a save, repaired. None, or anything unreadable, is no lift. */
export function readBreadBuff(raw: unknown): { value: BreadBuff | null; health: 'ok' | 'repaired' } {
  if (raw === undefined || raw === null) return { value: null, health: 'ok' };
  const b = raw as Partial<BreadBuff>;
  if (
    typeof b === 'object' &&
    typeof b.itemId === 'string' &&
    BREAD_BUFF_TYPES.includes(b.buffType as BreadBuffType) &&
    typeof b.buffValue === 'number' &&
    b.buffValue > 0 &&
    b.buffValue < 1
  ) {
    return { value: { itemId: b.itemId, buffType: b.buffType as BreadBuffType, buffValue: b.buffValue }, health: 'ok' };
  }
  return { value: null, health: 'repaired' };
}

/**
 * THE AGES, MATCHED TO THE BAG. A loaf the row does not know of (handed
 * over some other way) is as fresh as a new one; a loaf the row knows of
 * that is no longer in the bag is forgotten, the stalest first.
 */
export function reconcileFreshness(
  fresh: BreadFreshness,
  bag: Inventory,
  specOf: (itemId: string) => BreadSpec | undefined,
): BreadFreshness {
  const out: Record<string, number[]> = {};
  for (const stack of bag) {
    const spec = specOf(stack.itemId);
    if (!spec || stack.quantity <= 0) continue;
    const have = [...(fresh[stack.itemId] ?? [])].sort((a, b) => b - a).slice(0, stack.quantity);
    while (have.length < stack.quantity) have.push(spec.freshness);
    out[stack.itemId] = have;
  }
  return out;
}

/** New loaves, as fresh as the baker's own word. */
export function addLoaves(fresh: BreadFreshness, itemId: string, count: number, nights: number): BreadFreshness {
  return { ...fresh, [itemId]: [...(fresh[itemId] ?? []), ...Array.from({ length: count }, () => nights)] };
}

/** A night's rest: every loaf a night older; a stale one stays stale. */
export function afterRest(fresh: BreadFreshness): BreadFreshness {
  const out: Record<string, number[]> = {};
  for (const [itemId, nights] of Object.entries(fresh)) out[itemId] = nights.map((n) => Math.max(0, n - 1));
  return out;
}

/** How many of this bread can still be eaten, and how many have gone stale. */
export function loavesOf(fresh: BreadFreshness, itemId: string): { fresh: number; stale: number; soonest: number | null } {
  const nights = fresh[itemId] ?? [];
  const good = nights.filter((n) => n > 0);
  return { fresh: good.length, stale: nights.length - good.length, soonest: good.length ? Math.min(...good) : null };
}

/**
 * One loaf eaten: the good one nearest to going stale. Null when there is
 * none fit to eat.
 */
export function eatOne(fresh: BreadFreshness, itemId: string): BreadFreshness | null {
  const nights = [...(fresh[itemId] ?? [])];
  let at = -1;
  for (let i = 0; i < nights.length; i++) if (nights[i] > 0 && (at < 0 || nights[i] < nights[at])) at = i;
  if (at < 0) return null;
  nights.splice(at, 1);
  return { ...fresh, [itemId]: nights };
}

/** What a lift is called in front of a player. */
export function breadBuffLabel(type: BreadBuffType, value: number): string {
  const pct = `+${Math.round(value * 100)}%`;
  switch (type) {
    case 'DEFENSE':
      return `防御 ${pct}`;
    case 'SPEED':
      return `素早さ ${pct}`;
    case 'MAGIC':
      return `魔力 ${pct}`;
    case 'MAX_HP':
      return `最大HP ${pct}`;
  }
}

/**
 * WHAT A LIFT DOES TO A FIGHT, as the fight already counts things:
 *
 *   DEFENSE  what lands on the party is a twentieth less (playerDamageTaken)
 *   MAX_HP   the party's health bar a twentieth longer
 *   MAGIC    her magic (MP) a twentieth deeper — 魔力 as the game uses it
 *   SPEED    nothing yet: the fight has no speed to lift
 */
export function breadInBattle<S extends { maxHp: number; maxMp: number }>(
  buff: BreadBuff | null,
  stats: S,
): { stats: S; damageTaken: number } {
  if (!buff) return { stats, damageTaken: 1 };
  switch (buff.buffType) {
    case 'DEFENSE':
      return { stats, damageTaken: 1 - buff.buffValue };
    case 'MAX_HP':
      return { stats: { ...stats, maxHp: Math.round(stats.maxHp * (1 + buff.buffValue)) }, damageTaken: 1 };
    case 'MAGIC':
      return { stats: { ...stats, maxMp: Math.round(stats.maxMp * (1 + buff.buffValue)) }, damageTaken: 1 };
    case 'SPEED':
      return { stats, damageTaken: 1 };
  }
}
