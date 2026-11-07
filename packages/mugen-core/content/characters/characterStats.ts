// WHAT THE STATUS SCREEN SHOWS AS NUMBERS — 6 項目 (作者指示 2026-10-11).
//
// HP, MP and 攻撃力 are the battle's own, read from where the fight reads
// them (World.getPartyCondition / getPartyStats); nothing here re-derives
// them. 防御力, 魔力 and 素早さ are NEW and, for now, SHOWN ONLY: the battle
// does not read them (no defence step, spell damage is the spell's own
// power, turns simply alternate). They exist so the screen can say who
// these two are, and so the day the battle wants them there is one place
// to read them from. Wiring 素早さ to turn order changes every fight, and
// is the author's to decide first.
//
// WHO THEY ARE, IN NUMBERS (作者判断 2026-10-11; HP and MP stay as they
// are for now):
//   主人公   攻撃力 高め · 防御力 中〜高 · 魔力 中 · 素早さ 中
//   ケイオス 攻撃力 低め · 防御力 低め · 魔力 高い · 素早さ 高め
// Her 攻撃力 is shown from her own line below (she does not swing in a
// fight — the party's swing is his); his is the battle's.
//
// For later, not shown: 命中・回避・会心・属性耐性 have a place in
// `FutureStats` and nothing fills it.

import type { PartyStats } from '../../core/progression/levelStats';

export interface FutureStats {
  hit?: number;
  evade?: number;
  crit?: number;
  resist?: Partial<Record<string, number>>;
}

export interface StatSheet {
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  attack: { min: number; max: number };
  defense: number;
  magic: number;
  speed: number;
  /** Not shown yet. */
  future: FutureStats;
}

/** Base at level 1, and what each level above it adds. */
interface Growth {
  base: number;
  perLevel: number;
}

interface ShownOnly {
  defense: Growth;
  magic: Growth;
  speed: Growth;
  /** Her own swing, shown only (absent: the battle's swing is theirs). */
  attack?: { min: number; max: number; perLevel: number };
}

export const SHOWN_ONLY_STATS: Readonly<Record<string, ShownOnly>> = {
  hero: {
    defense: { base: 12, perLevel: 2 },
    magic: { base: 8, perLevel: 1 },
    speed: { base: 10, perLevel: 1 },
  },
  kaos: {
    defense: { base: 7, perLevel: 1 },
    magic: { base: 20, perLevel: 3 },
    speed: { base: 14, perLevel: 2 },
    attack: { min: 4, max: 6, perLevel: 0.5 },
  },
};

const above = (level: number) => (Number.isFinite(level) ? Math.max(0, Math.floor(level) - 1) : 0);
const grow = (g: Growth, level: number) => g.base + Math.floor(g.perLevel * above(level));

/**
 * Somebody's six numbers. `condition` and `party` are the world's own
 * (getPartyCondition()[id], getPartyStats()), passed in so this stays pure.
 * Somebody with no line of their own here shows the battle's swing and the
 * hero's shape — never a blank.
 */
export function statSheetOf(
  characterId: string,
  level: number,
  condition: { currentHp: number; maxHp: number; currentMp: number; maxMp: number },
  party: PartyStats,
): StatSheet {
  const own = SHOWN_ONLY_STATS[characterId] ?? SHOWN_ONLY_STATS.hero;
  const lift = own.attack ? Math.floor(own.attack.perLevel * above(level)) : 0;
  return {
    hp: { current: condition.currentHp, max: condition.maxHp },
    mp: { current: condition.currentMp, max: condition.maxMp },
    attack: own.attack ? { min: own.attack.min + lift, max: own.attack.max + lift } : { min: party.attackMin, max: party.attackMax },
    defense: grow(own.defense, level),
    magic: grow(own.magic, level),
    speed: grow(own.speed, level),
    future: {},
  };
}
