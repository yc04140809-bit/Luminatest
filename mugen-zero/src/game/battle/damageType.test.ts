import { describe, it, expect } from 'vitest';
import {
  ELEMENTS,
  ELEMENT_LABEL,
  MAX_TAKEN,
  MIN_TAKEN,
  STAR_SHARE,
  elementClass,
  affinityMultiplier,
  readAffinity,
  starAffinity,
  starAffinityOf,
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

describe('what a creature thinks of her light, in three words', () => {
  it('is half again for something soft to it', () => {
    expect(affinityMultiplier(starAffinity('WEAK'), 'MAGIC', 'STAR')).toBeCloseTo(1.5, 5);
  });

  it('is exactly what it always was for something with no opinion', () => {
    // The number that must not move: every fight in the game today is
    // fought against this, so NORMAL is not "roughly one".
    expect(affinityMultiplier(starAffinity('NORMAL'), 'MAGIC', 'STAR')).toBe(1);
    expect(starAffinity('NORMAL')).toEqual({});
  });

  it('is half for something that shrugs it off', () => {
    expect(affinityMultiplier(starAffinity('RESIST'), 'MAGIC', 'STAR')).toBeCloseTo(0.5, 5);
  });

  it('says nothing about a sword, whichever of the three it is', () => {
    // The requirement in one test: the star's business is the star's.
    // A creature soft to her light is not softer to his blade.
    for (const kind of ['WEAK', 'NORMAL', 'RESIST'] as const) {
      expect(affinityMultiplier(starAffinity(kind), 'PHYSICAL'), kind).toBe(1);
    }
  });

  it('says nothing about magic that is not hers, either', () => {
    // No element passed is a spell with no element. The fold only
    // happens for the element it was written about.
    for (const kind of ['WEAK', 'NORMAL', 'RESIST'] as const) {
      expect(affinityMultiplier(starAffinity(kind), 'MAGIC'), kind).toBe(1);
    }
  });

  it('reads back as the word it was written with', () => {
    for (const kind of ['WEAK', 'NORMAL', 'RESIST'] as const) {
      expect(starAffinityOf(starAffinity(kind))).toBe(kind);
    }
    // And a creature nobody wrote an opinion for is NORMAL, which is
    // the whole of the default.
    expect(starAffinityOf(undefined)).toBe('NORMAL');
    expect(starAffinityOf(null)).toBe('NORMAL');
    expect(starAffinityOf({})).toBe('NORMAL');
  });

  it('reads a creature written the long way round honestly', () => {
    const softToMagic: EnemyAffinity = { magicWeakness: 0.6 };
    expect(starAffinityOf(softToMagic)).toBe('WEAK');
  });

  it('is a share of the blow, said once', () => {
    expect(STAR_SHARE).toBe(0.5);
    expect(starAffinity('WEAK').elementWeakness?.STAR).toBe(STAR_SHARE);
    expect(starAffinity('RESIST').elementResistance?.STAR).toBe(STAR_SHARE);
  });

  it('tells the player their choice mattered', () => {
    expect(readAffinity(affinityMultiplier(starAffinity('WEAK'), 'MAGIC', 'STAR'))).toBe('WEAK');
    expect(readAffinity(affinityMultiplier(starAffinity('NORMAL'), 'MAGIC', 'STAR'))).toBe('PLAIN');
    expect(readAffinity(affinityMultiplier(starAffinity('RESIST'), 'MAGIC', 'STAR'))).toBe(
      'RESISTED',
    );
  });

  it('stays inside what the battle allows, however it is combined', () => {
    const both: EnemyAffinity = { ...starAffinity('WEAK'), magicWeakness: 9 };
    expect(affinityMultiplier(both, 'MAGIC', 'STAR')).toBeLessThanOrEqual(MAX_TAKEN);
    const neither: EnemyAffinity = { ...starAffinity('RESIST'), magicResistance: 9 };
    expect(affinityMultiplier(neither, 'MAGIC', 'STAR')).toBeGreaterThanOrEqual(MIN_TAKEN);
  });
});

describe('what a blow is made of, now that it can be four things', () => {
  it('names all four where a player can read them', () => {
    expect(ELEMENTS).toEqual(['STAR', 'FIRE', 'ICE', 'THUNDER']);
    for (const element of ELEMENTS) {
      expect(ELEMENT_LABEL[element], element).toBeTruthy();
    }
  });

  it('gives each one a class of its own, and a blow with no element none', () => {
    const classes = ELEMENTS.map(elementClass);
    expect(new Set(classes).size).toBe(ELEMENTS.length);
    expect(elementClass('FIRE')).toBe('el-fire');
    expect(elementClass(null)).toBe('');
  });

  it('lets a creature be soft to one of the new ones without any new code', () => {
    // The whole claim of the elemental foundation: adding fire cost a
    // name and nothing else. If this ever needs a change in
    // affinityMultiplier, the foundation was not one.
    const ashen = { elementWeakness: { FIRE: 0.5 } } as const;
    expect(affinityMultiplier(ashen, 'MAGIC', 'FIRE')).toBeCloseTo(1.5);
    expect(affinityMultiplier(ashen, 'MAGIC', 'ICE')).toBe(1);
    expect(affinityMultiplier(ashen, 'MAGIC', 'STAR')).toBe(1);
  });

  it('holds every element to the same ceiling and floor', () => {
    for (const element of ELEMENTS) {
      const soft = { elementWeakness: { [element]: 9 } };
      const hard = { elementResistance: { [element]: 0.99 }, magicResistance: 0.9 };
      expect(affinityMultiplier(soft, 'MAGIC', element), element).toBe(MAX_TAKEN);
      expect(affinityMultiplier(hard, 'MAGIC', element), element).toBe(MIN_TAKEN);
    }
  });
});
