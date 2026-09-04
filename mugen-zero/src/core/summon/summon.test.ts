import { describe, it, expect } from 'vitest';
import {
  SUMMON_CONFIG,
  canSummon,
  rollSummon,
  summonEffectFor,
  summonKindFor,
  summonSuccessChance,
  type SummonAbilityDef,
} from './summon';
import { MOSS_RABBIT_ARCANA } from '../../content/arcana/arcanaDefs';

const ABILITY: SummonAbilityDef = MOSS_RABBIT_ARCANA.summon!.ability;

/** A die that hands back the numbers you give it, in order. */
function dice(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('what can be called at all', () => {
  it('cannot call a memory that does not exist', () => {
    expect(canSummon(0)).toBe(false);
    expect(summonKindFor(0)).toBeNull();
    expect(summonSuccessChance(0)).toBe(0);
    expect(rollSummon({ progress: 0, rng: dice(0) })).toBeNull();
  });

  it('calls anything between one per cent and ninety-nine incompletely', () => {
    for (const progress of [1, 20, 50, 80, 99]) {
      expect(summonKindFor(progress)).toBe('INCOMPLETE');
    }
  });

  it('calls a finished memory completely', () => {
    expect(summonKindFor(100)).toBe('COMPLETE');
  });
});

describe('how likely an unfinished memory is to hold', () => {
  it('reads straight off construction, and always rises with it', () => {
    let previous = -1;
    for (const progress of [1, 20, 40, 50, 60, 80, 99]) {
      const chance = summonSuccessChance(progress);
      expect(chance).toBeGreaterThan(previous);
      previous = chance;
    }
  });

  it('is a bad bet at 20% and a good one at 80%', () => {
    expect(summonSuccessChance(20)).toBeLessThan(0.5);
    expect(summonSuccessChance(80)).toBeGreaterThan(0.7);
  });

  it('never leaves the range a probability lives in', () => {
    for (let progress = 0; progress <= 100; progress++) {
      const chance = summonSuccessChance(progress);
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
  });

  it('is certain for a memory that is finished', () => {
    expect(summonSuccessChance(100)).toBe(1);
  });
});

describe('rolling for it', () => {
  it('holds when the die is under the chance, and does not when it is over', () => {
    const chance = summonSuccessChance(50);
    expect(rollSummon({ progress: 50, rng: dice(chance - 0.01) })).toBe('SUCCESS');
    expect(rollSummon({ progress: 50, rng: dice(chance + 0.01) })).toBe('FAILURE');
  });

  it('never fails a finished memory, whatever the die says', () => {
    // The reward for completing a page is certainty. A player who did
    // that work must never watch it come apart.
    expect(rollSummon({ progress: 100, rng: dice(0.999999) })).toBe('SUCCESS');
    expect(rollSummon({ progress: 100, rng: dice(1) })).toBe('SUCCESS');
  });

  it('can be settled without the dice, for testing', () => {
    expect(rollSummon({ progress: 30, forced: 'SUCCESS', rng: dice(1) })).toBe('SUCCESS');
    expect(rollSummon({ progress: 30, forced: 'FAILURE', rng: dice(0) })).toBe('FAILURE');
  });

  it('will not force a summon of nothing', () => {
    expect(rollSummon({ progress: 0, forced: 'SUCCESS' })).toBeNull();
  });

  it('only ever says one of the two things this build knows about', () => {
    // ACCIDENT is a door, and it is shut: nothing may produce one until
    // the meaning behind it exists.
    const seen = new Set<string>();
    for (let i = 0; i <= 100; i++) {
      const outcome = rollSummon({ progress: 50, rng: dice(i / 100) });
      if (outcome) seen.add(outcome);
    }
    expect([...seen].sort()).toEqual(['FAILURE', 'SUCCESS']);
  });
});

describe('what the called thing does', () => {
  it('is the memory’s own ability, not the creature’s attack', () => {
    // The animal in the forest tackles and hides. What is rebuilt from
    // what you know about it does neither.
    expect(ABILITY.name).not.toBe('リーフタックル');
    expect(ABILITY.name).not.toBe('苔かくれ');
    expect(ABILITY.effect.kind).toBe('HEAL_PLAYER');
  });

  it('is worth less when the memory is not all there', () => {
    const whole = summonEffectFor(ABILITY, 'COMPLETE');
    const partial = summonEffectFor(ABILITY, 'INCOMPLETE');
    expect(whole.amount).toBe(ABILITY.effect.amount);
    expect(partial.amount).toBeLessThan(whole.amount);
  });

  it('is never worth nothing at all', () => {
    const tiny: SummonAbilityDef = { ...ABILITY, effect: { kind: 'HEAL_PLAYER', amount: 1 } };
    expect(summonEffectFor(tiny, 'INCOMPLETE').amount).toBeGreaterThanOrEqual(1);
  });

  it('does not edit the definition it was given', () => {
    const before = ABILITY.effect.amount;
    summonEffectFor(ABILITY, 'INCOMPLETE');
    expect(ABILITY.effect.amount).toBe(before);
  });
});

describe('the numbers', () => {
  it('keeps every one of them in one place', () => {
    expect(SUMMON_CONFIG.usesPerBattle).toBe(1);
    expect(SUMMON_CONFIG.incompletePower).toBeGreaterThan(0);
    expect(SUMMON_CONFIG.incompletePower).toBeLessThan(1);
    expect(SUMMON_CONFIG.arcanaShare).toBeGreaterThan(0);
    expect(SUMMON_CONFIG.arcanaShare).toBeLessThan(1);
  });
});
