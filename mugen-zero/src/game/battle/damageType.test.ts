import { describe, it, expect } from 'vitest';
import {
  MAX_TAKEN,
  MIN_TAKEN,
  affinityMultiplier,
  readAffinity,
  type EnemyAffinity,
} from './damageType';

describe('what a creature thinks of a blow', () => {
  it('has no opinion at all when nobody gave it one', () => {
    expect(affinityMultiplier(null, 'PHYSICAL')).toBe(1);
    expect(affinityMultiplier(undefined, 'MAGIC')).toBe(1);
    expect(affinityMultiplier({}, 'PHYSICAL')).toBe(1);
  });

  it('takes less from what it resists', () => {
    const armoured: EnemyAffinity = { physicalResistance: 0.4 };
    expect(affinityMultiplier(armoured, 'PHYSICAL')).toBeCloseTo(0.6, 5);
    // …and is unaffected in the other direction.
    expect(affinityMultiplier(armoured, 'MAGIC')).toBe(1);
  });

  it('takes more from what it is soft against', () => {
    const construct: EnemyAffinity = { physicalResistance: 0.5, magicWeakness: 0.6 };
    expect(affinityMultiplier(construct, 'PHYSICAL')).toBeCloseTo(0.5, 5);
    expect(affinityMultiplier(construct, 'MAGIC')).toBeCloseTo(1.6, 5);
  });

  it('folds an element on top of the kind', () => {
    const nightThing: EnemyAffinity = { magicWeakness: 0.2, elementWeakness: { STAR: 0.5 } };
    expect(affinityMultiplier(nightThing, 'MAGIC', 'STAR')).toBeCloseTo(1.2 * 1.5, 5);
    // The element only counts when the blow carries one.
    expect(affinityMultiplier(nightThing, 'MAGIC', null)).toBeCloseTo(1.2, 5);
  });

  it('lets a creature be tough and soft at once without breaking', () => {
    const armouredAndCursed: EnemyAffinity = { physicalResistance: 0.5, physicalWeakness: 0.5 };
    expect(affinityMultiplier(armouredAndCursed, 'PHYSICAL')).toBeCloseTo(0.75, 5);
  });

  it('refuses to make anything immune, however content is written', () => {
    const cheat: EnemyAffinity = { physicalResistance: 5, elementResistance: { STAR: 9 } };
    expect(affinityMultiplier(cheat, 'PHYSICAL')).toBe(MIN_TAKEN);
    expect(affinityMultiplier(cheat, 'MAGIC', 'STAR')).toBe(MIN_TAKEN);
  });

  it('refuses to make anything a one-hit kill either', () => {
    const cheat: EnemyAffinity = { magicWeakness: 9, elementWeakness: { STAR: 9 } };
    expect(affinityMultiplier(cheat, 'MAGIC', 'STAR')).toBe(MAX_TAKEN);
  });

  it('ignores nonsense numbers rather than producing one', () => {
    const broken = {
      physicalResistance: Number.NaN,
      magicWeakness: Number.POSITIVE_INFINITY,
    } as EnemyAffinity;
    expect(affinityMultiplier(broken, 'PHYSICAL')).toBe(1);
    expect(Number.isFinite(affinityMultiplier(broken, 'MAGIC'))).toBe(true);
  });
});

describe('telling the player their choice mattered', () => {
  it('names the three cases and nothing in between', () => {
    expect(readAffinity(1.6)).toBe('WEAK');
    expect(readAffinity(0.5)).toBe('RESISTED');
    expect(readAffinity(1)).toBe('PLAIN');
    // A rounding wobble is not news.
    expect(readAffinity(1.02)).toBe('PLAIN');
    expect(readAffinity(0.98)).toBe('PLAIN');
  });
});
