import { describe, it, expect } from 'vitest';
import { planIntervention } from './interventionPlan';
import { CHAOS_INTERVENTION_CONFIG } from './chaosIntervention';
import { CHAOS_INTERVENTIONS } from '../../content/chaos/chaosInterventions';
import { SUMMON_CONFIG } from '../summon/summon';

/** A die that hands back the numbers you give it, in order. */
function dice(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

const DEFS = CHAOS_INTERVENTIONS;
const HALF = [{ arcanaId: 'moss_rabbit', progress: 50 }];

/** Under the chance she intervenes; over it she does not. */
const ACTS = CHAOS_INTERVENTION_CONFIG.chance - 0.01;
const STAYS_OUT = CHAOS_INTERVENTION_CONFIG.chance + 0.01;
/** Under the share it is an ARCANA; over it it is a blessing. */
const REACHES = SUMMON_CONFIG.arcanaShare - 0.01;
const DOES_NOT_REACH = SUMMON_CONFIG.arcanaShare + 0.01;

describe('what Kaos does at the start of a fight', () => {
  it('mostly does nothing, exactly as before', () => {
    const plan = planIntervention({ defs: DEFS, candidates: HALF, rng: dice(STAYS_OUT) });
    expect(plan.kind).toBe('NONE');
  });

  it('is a blessing when there is no unfinished memory to reach for', () => {
    const plan = planIntervention({ defs: DEFS, candidates: [], rng: dice(ACTS, 0) });
    expect(plan.kind).toBe('MODIFIER');
  });

  it('is a blessing when the second roll says so, even with a memory going spare', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: HALF,
      rng: dice(ACTS, 0, DOES_NOT_REACH),
    });
    expect(plan.kind).toBe('MODIFIER');
  });

  it('reaches for the ARCANA when the second roll says so', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: HALF,
      // acts, picks a def, reaches for arcana, picks the arcana, holds
      rng: dice(ACTS, 0, REACHES, 0, 0),
    });
    expect(plan.kind).toBe('SUMMON');
    if (plan.kind !== 'SUMMON') return;
    expect(plan.arcanaId).toBe('moss_rabbit');
    expect(plan.progress).toBe(50);
    expect(plan.outcome).toBe('SUCCESS');
  });

  it('can reach and still not hold', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: HALF,
      rng: dice(ACTS, 0, REACHES, 0, 0.999),
    });
    expect(plan.kind).toBe('SUMMON');
    if (plan.kind !== 'SUMMON') return;
    expect(plan.outcome).toBe('FAILURE');
  });
});

/**
 * The rule that keeps the opening moment readable: a fight never begins
 * with two gifts at once.
 */
describe('a blessing and a summon are never both', () => {
  it('produces exactly one kind, whatever the dice do', () => {
    for (let a = 0; a <= 1; a += 0.05) {
      for (let b = 0; b <= 1; b += 0.25) {
        const plan = planIntervention({
          defs: DEFS,
          candidates: HALF,
          rng: dice(a, b, a, b, a),
        });
        expect(['NONE', 'MODIFIER', 'SUMMON']).toContain(plan.kind);
        // A SUMMON plan carries no modifier, and a MODIFIER plan carries
        // no arcana — the shape itself makes both-at-once unspellable.
        if (plan.kind === 'SUMMON') expect('def' in plan).toBe(false);
        if (plan.kind === 'MODIFIER') expect('arcanaId' in plan).toBe(false);
      }
    }
  });
});

describe('what can and cannot be reached for', () => {
  it('never reaches for a memory nobody has started', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: [{ arcanaId: 'moss_rabbit', progress: 0 }],
      rng: dice(ACTS, 0, REACHES, 0, 0),
    });
    expect(plan.kind).toBe('MODIFIER');
  });

  it('never reaches for a finished one: that is the player’s to spend', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: [{ arcanaId: 'moss_rabbit', progress: 100 }],
      rng: dice(ACTS, 0, REACHES, 0, 0),
    });
    expect(plan.kind).toBe('MODIFIER');
  });
});

describe('the development switches', () => {
  it('settles a summon and how it goes', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: HALF,
      forcedSummon: 'FAILURE',
      rng: dice(0),
    });
    expect(plan.kind).toBe('SUMMON');
    if (plan.kind !== 'SUMMON') return;
    expect(plan.outcome).toBe('FAILURE');
  });

  it('will not invent a memory the player has not made', () => {
    // Forcing settles the OUTCOME, never the existence. A tester with
    // an empty book gets an ordinary fight.
    const plan = planIntervention({
      defs: DEFS,
      candidates: [],
      forcedSummon: 'SUCCESS',
      rng: dice(STAYS_OUT),
    });
    expect(plan.kind).toBe('NONE');
  });

  it('respects a blessing that was asked for by name', () => {
    // Pinning 《ケイオスの加護》 must not be quietly overruled by a
    // summon — the tests of the older system depend on that.
    const plan = planIntervention({
      defs: DEFS,
      candidates: HALF,
      forcedChaos: 'CHAOS_BLESSING',
      rng: dice(0, 0, 0, 0),
    });
    expect(plan.kind).toBe('MODIFIER');
    if (plan.kind !== 'MODIFIER') return;
    expect(plan.def.id).toBe('CHAOS_BLESSING');
  });

  it('respects NONE being asked for by name', () => {
    const plan = planIntervention({
      defs: DEFS,
      candidates: HALF,
      forcedChaos: 'NONE',
      rng: dice(0, 0, 0, 0),
    });
    expect(plan.kind).toBe('NONE');
  });
});
