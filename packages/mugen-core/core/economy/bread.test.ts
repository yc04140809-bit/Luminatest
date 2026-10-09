import { describe, expect, it } from 'vitest';
import {
  addLoaves,
  afterRest,
  breadBuffLabel,
  breadInBattle,
  eatOne,
  loavesOf,
  readBreadBuff,
  readBreadFreshness,
  reconcileFreshness,
  type BreadSpec,
} from './bread';

/** パン屋 MVP (2026-10-09): loaves that go stale with nights' rest, and one small lift at a time. */

const SPEC: BreadSpec = { buffType: 'DEFENSE', buffValue: 0.05, freshness: 2, recipeId: 'BASIC' };
const specOf = (id: string) => (id.endsWith('BREAD') ? SPEC : undefined);

describe('freshness', () => {
  it('a bought loaf keeps its nights; each rest takes one; at nought it is stale and stays so', () => {
    let f = addLoaves({}, 'YAKITATE_BREAD', 1, 2);
    expect(loavesOf(f, 'YAKITATE_BREAD')).toEqual({ fresh: 1, stale: 0, soonest: 2 });
    f = afterRest(f);
    expect(loavesOf(f, 'YAKITATE_BREAD')).toEqual({ fresh: 1, stale: 0, soonest: 1 });
    f = afterRest(f);
    expect(loavesOf(f, 'YAKITATE_BREAD')).toEqual({ fresh: 0, stale: 1, soonest: null });
    f = afterRest(f);
    expect(f.YAKITATE_BREAD).toEqual([0]);
  });

  it('eating takes the good loaf nearest to going stale; a stale one cannot be eaten', () => {
    let f = addLoaves({}, 'YAKITATE_BREAD', 1, 2);
    f = afterRest(f); // [1]
    f = addLoaves(f, 'YAKITATE_BREAD', 1, 2); // [1, 2]
    expect(eatOne(f, 'YAKITATE_BREAD')!.YAKITATE_BREAD).toEqual([2]);
    expect(eatOne({ YAKITATE_BREAD: [0, 0] }, 'YAKITATE_BREAD')).toBeNull();
    expect(eatOne({}, 'YAKITATE_BREAD')).toBeNull();
  });

  it('is matched to the bag: unknown loaves are fresh, loaves no longer carried are forgotten stalest first', () => {
    const bag = [
      { itemId: 'YAKITATE_BREAD', quantity: 3 },
      { itemId: 'FOREST_HERB', quantity: 2 },
    ];
    expect(reconcileFreshness({ YAKITATE_BREAD: [1] }, bag, specOf)).toEqual({ YAKITATE_BREAD: [1, 2, 2] });
    expect(reconcileFreshness({ YAKITATE_BREAD: [0, 2, 1, 2] }, bag, specOf)).toEqual({ YAKITATE_BREAD: [2, 2, 1] });
    expect(reconcileFreshness({ YAKITATE_BREAD: [2] }, [], specOf)).toEqual({});
  });

  it('a save from before has none; a broken row is repaired, never thrown', () => {
    expect(readBreadFreshness(undefined)).toEqual({ value: {}, health: 'ok' });
    expect(readBreadFreshness('x').health).toBe('repaired');
    expect(readBreadFreshness({ A: [2, -1, 'x', 1] })).toEqual({ value: { A: [2, 1] }, health: 'repaired' });
  });
});

describe('the lift', () => {
  it('reads back only a sane lift; none is none', () => {
    expect(readBreadBuff(undefined)).toEqual({ value: null, health: 'ok' });
    const ok = { itemId: 'YAKITATE_BREAD', buffType: 'DEFENSE', buffValue: 0.05 };
    expect(readBreadBuff(ok)).toEqual({ value: ok, health: 'ok' });
    expect(readBreadBuff({ ...ok, buffType: 'ATTACK' }).value).toBeNull();
    expect(readBreadBuff({ ...ok, buffValue: 5 }).value).toBeNull();
  });

  it('is named the way the player reads it', () => {
    expect(breadBuffLabel('DEFENSE', 0.05)).toBe('防御 +5%');
    expect(breadBuffLabel('SPEED', 0.05)).toBe('素早さ +5%');
    expect(breadBuffLabel('MAGIC', 0.05)).toBe('魔力 +5%');
    expect(breadBuffLabel('MAX_HP', 0.05)).toBe('最大HP +5%');
  });

  it('in a fight: a twentieth less taken, a twentieth more health or magic — small, and nothing without one', () => {
    const stats = { maxHp: 100, maxMp: 48, attackMin: 8, attackMax: 12 };
    expect(breadInBattle(null, stats)).toEqual({ stats, damageTaken: 1 });
    const buff = (buffType: 'DEFENSE' | 'SPEED' | 'MAGIC' | 'MAX_HP') => ({ itemId: 'X', buffType, buffValue: 0.05 });
    expect(breadInBattle(buff('DEFENSE'), stats)).toEqual({ stats, damageTaken: 0.95 });
    expect(breadInBattle(buff('MAX_HP'), stats).stats.maxHp).toBe(105);
    expect(breadInBattle(buff('MAGIC'), stats).stats.maxMp).toBe(50);
    expect(breadInBattle(buff('SPEED'), stats)).toEqual({ stats, damageTaken: 1 });
    // The attack is never touched.
    for (const t of ['DEFENSE', 'SPEED', 'MAGIC', 'MAX_HP'] as const) {
      expect(breadInBattle(buff(t), stats).stats.attackMax).toBe(12);
    }
  });
});
