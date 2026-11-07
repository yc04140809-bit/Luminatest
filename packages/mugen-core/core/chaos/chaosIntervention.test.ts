import { describe, it, expect } from 'vitest';
import {
  CHAOS_INTERVENTION_CONFIG,
  modifiersOf,
  rollChaosIntervention,
  type ChaosInterventionId,
} from './chaosIntervention';
import { CHAOS_INTERVENTIONS } from '../../content/chaos/chaosInterventions';

const defs = CHAOS_INTERVENTIONS;

/** An rng that hands out the numbers it was given, then repeats the last. */
function scripted(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('rollChaosIntervention', () => {
  it('mostly does nothing, which is what makes it worth anything', () => {
    let helped = 0;
    let i = 0;
    const rng = () => ((i = (i * 9301 + 49297) % 233280), i / 233280);
    for (let fight = 0; fight < 600; fight++) {
      if (rollChaosIntervention({ defs, rng })) helped++;
    }
    // Around a third, and nowhere near always.
    expect(helped).toBeGreaterThan(100);
    expect(helped).toBeLessThan(300);
  });

  it('does nothing when the first roll is above the chance', () => {
    expect(rollChaosIntervention({ defs, rng: scripted([0.99]) })).toBeNull();
  });

  it('picks one of the four when it does help', () => {
    for (const pick of [0, 0.3, 0.6, 0.99]) {
      const got = rollChaosIntervention({ defs, rng: scripted([0.01, pick]) });
      expect(got).not.toBeNull();
      expect(defs.map((d) => d.id)).toContain(got!.id);
    }
  });

  it('can be settled without the dice, so each one can be tested', () => {
    for (const id of [
      'CHAOS_BLESSING',
      'CHAOS_GUARD',
      'CHAOS_WEAKEN',
      'CHAOS_BREAK',
    ] as ChaosInterventionId[]) {
      expect(rollChaosIntervention({ defs, forced: id, rng: () => 0.99 })!.id).toBe(id);
    }
    expect(rollChaosIntervention({ defs, forced: 'NONE', rng: () => 0 })).toBeNull();
  });

  it('reaches every one of them over many fights', () => {
    const seen = new Set<string>();
    for (let i = 0; i < defs.length; i++) {
      const got = rollChaosIntervention({ defs, rng: scripted([0, (i + 0.5) / defs.length]) });
      seen.add(got!.id);
    }
    expect(seen.size).toBe(defs.length);
  });

  it('ships an opening chance that leaves ordinary fights ordinary', () => {
    expect(CHAOS_INTERVENTION_CONFIG.chance).toBeGreaterThan(0);
    expect(CHAOS_INTERVENTION_CONFIG.chance).toBeLessThan(0.5);
  });

  it('has nothing to offer from an empty list', () => {
    expect(rollChaosIntervention({ defs: [], rng: () => 0 })).toBeNull();
  });
});

describe('modifiersOf', () => {
  it('is all ones when she did nothing', () => {
    expect(modifiersOf(null)).toEqual({
      playerAttack: 1,
      playerDamageTaken: 1,
      enemyAttack: 1,
      enemyDamageTaken: 1,
    });
  });

  it('changes exactly one number per intervention, and in the right direction', () => {
    const expected: Record<string, [keyof ReturnType<typeof modifiersOf>, 'up' | 'down']> = {
      CHAOS_BLESSING: ['playerAttack', 'up'],
      CHAOS_GUARD: ['playerDamageTaken', 'down'],
      CHAOS_WEAKEN: ['enemyAttack', 'down'],
      CHAOS_BREAK: ['enemyDamageTaken', 'up'],
    };
    for (const def of defs) {
      const mods = modifiersOf(def);
      const [field, direction] = expected[def.id];
      const changed = Object.entries(mods).filter(([, v]) => v !== 1);
      expect(changed, `${def.id} touches one number`).toHaveLength(1);
      expect(changed[0][0]).toBe(field);
      if (direction === 'up') expect(mods[field]).toBeGreaterThan(1);
      else expect(mods[field]).toBeLessThan(1);
    }
  });

  it('keeps every number a sane positive multiplier', () => {
    for (const def of [...defs, null]) {
      for (const value of Object.values(modifiersOf(def))) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(3);
      }
    }
  });
});
