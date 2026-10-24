import { describe, it, expect } from 'vitest';
import {
  SUMMON_ACCIDENT_CONFIG,
  eligibleAccidents,
  emptyAccidentRecord,
  observed as observeAccident,
  pickAccident,
  previewableAccidents,
  type SummonAccidentDef,
} from './summonAccident';
import { SUMMON_ACCIDENTS, UNKNOWN_ACCIDENT_001 } from '../../content/summon/accidents';
import { UNKNOWN_ARCANA_DEFS } from '../../content/arcana/unknownArcana';

/**
 * The accident pool, and the one rule that takes something out of it.
 *
 * Seeing a thing is not owning it. That sentence is the whole design:
 * a player who watched something enormous go past and still cannot
 * name it has exactly as much reason to see it again as anybody else,
 * and only actually holding its ARCANA — at which point they can call
 * it whenever they like — ends its life as an accident.
 */

/** A die that hands back the numbers you give it, in order. */
function dice(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

const ALWAYS = SUMMON_ACCIDENT_CONFIG.chance - 0.01;
const NEVER = SUMMON_ACCIDENT_CONFIG.chance + 0.01;
const DEFS = SUMMON_ACCIDENTS;
const DRAGON = UNKNOWN_ACCIDENT_001;

describe('who is in the pool', () => {
  it('TEST 1 — a thing nobody owns and nobody has seen', () => {
    const pool = eligibleAccidents({ defs: DEFS, progress: 30 });
    expect(pool.map((d) => d.id)).toEqual([DRAGON.id]);
  });

  it('TEST 2 — and it stays in, however many times it has been seen', () => {
    // The rule this round exists to fix. A sighting is not an
    // acquisition, so it cannot be a reason to stop the sightings.
    let record = emptyAccidentRecord(DRAGON.id);
    for (let i = 0; i < 5; i++) record = observeAccident(record, i * 100);
    expect(record.timesObserved).toBe(5);
    // The pool does not even take the record: there is nothing about
    // having seen something that could change the answer.
    expect(eligibleAccidents({ defs: DEFS, progress: 30 })).toHaveLength(1);
    expect(pickAccident({ defs: DEFS, progress: 30, rng: dice(ALWAYS, 0) })?.id).toBe(DRAGON.id);
  });

  it('TEST 3 — until the player owns its ARCANA, and then never again', () => {
    const pool = eligibleAccidents({
      defs: DEFS,
      progress: 30,
      acquiredArcanaIds: [DRAGON.arcanaId],
    });
    expect(pool).toHaveLength(0);
    expect(
      pickAccident({
        defs: DEFS,
        progress: 30,
        acquiredArcanaIds: [DRAGON.arcanaId],
        rng: dice(ALWAYS, 0),
      }),
    ).toBeNull();
  });

  it('owning one thing does not take anything else out with it', () => {
    const second: SummonAccidentDef = {
      ...DRAGON,
      id: 'UNKNOWN_SOMEBODY_ELSE_002',
      arcanaId: 'somebody_else',
      unknownLabel: 'UNKNOWN #002',
    };
    const pool = eligibleAccidents({
      defs: [DRAGON, second],
      progress: 30,
      acquiredArcanaIds: [DRAGON.arcanaId],
    });
    expect(pool.map((d) => d.id)).toEqual([second.id]);
  });

  it('a candidate that is switched off is not in the pool at all', () => {
    const off: SummonAccidentDef = { ...DRAGON, enabled: false };
    expect(eligibleAccidents({ defs: [off], progress: 30 })).toHaveLength(0);
  });

  it('still respects the band, which is about whether one happens', () => {
    // Unchanged this round on purpose: the band is part of WHETHER an
    // accident occurs, and that rate is not what is being changed.
    expect(eligibleAccidents({ defs: DEFS, progress: 0 })).toHaveLength(0);
    expect(eligibleAccidents({ defs: DEFS, progress: 95 })).toHaveLength(0);
    expect(eligibleAccidents({ defs: DEFS, progress: 100 })).toHaveLength(0);
  });
});

describe('TEST 4 — what the admin may look at', () => {
  it('is everything that exists, owned or not', () => {
    // A creature the player has acquired never crosses them by chance
    // again — and its cut-in can still break, so somebody has to be
    // able to look at it. The preview pool ignores ownership entirely.
    expect(previewableAccidents(SUMMON_ACCIDENTS).map((d) => d.id)).toEqual([DRAGON.id]);
    // It takes no acquisition argument at all: there is no way to pass
    // it a save, so there is no way for a save to hide anything.
    expect(previewableAccidents.length).toBe(1);
  });
});

describe('TEST 5 — nothing eligible', () => {
  it('is simply no accident, and no dice thrown for one', () => {
    // The fallback the caller relies on: null here means the ordinary
    // summon roll happens next, with its own die, untouched.
    const rng = dice(0, 0, 0);
    let calls = 0;
    const counting = () => {
      calls++;
      return rng();
    };
    expect(
      pickAccident({
        defs: DEFS,
        progress: 30,
        acquiredArcanaIds: [DRAGON.arcanaId],
        rng: counting,
      }),
    ).toBeNull();
    // Not one number taken out of the sequence, so nothing downstream
    // sees a different die because an accident was considered.
    expect(calls).toBe(0);
  });

  it('is the same when the pool is empty, or out of band', () => {
    expect(pickAccident({ defs: [], progress: 30, rng: dice(0) })).toBeNull();
    expect(pickAccident({ defs: DEFS, progress: 99, rng: dice(0) })).toBeNull();
  });
});

describe('TEST 6 — how often one happens is unchanged', () => {
  it('is still one number, checked once, after eligibility', () => {
    expect(SUMMON_ACCIDENT_CONFIG.chance).toBe(0.06);
    expect(pickAccident({ defs: DEFS, progress: 30, rng: dice(ALWAYS, 0) })?.id).toBe(DRAGON.id);
    expect(pickAccident({ defs: DEFS, progress: 30, rng: dice(NEVER) })).toBeNull();
  });

  it('is not consulted at all when nothing could cross', () => {
    // Eligibility first, chance second — so an empty pool costs the
    // accident rate nothing and changes nobody's odds of anything.
    expect(
      pickAccident({ defs: [], progress: 30, chance: 1, rng: dice(0) }),
    ).toBeNull();
  });
});

describe('development forcing', () => {
  it('skips the dice', () => {
    expect(pickAccident({ defs: DEFS, progress: 30, forced: true, rng: dice(0.999) })?.id).toBe(
      DRAGON.id,
    );
  });

  it('does not skip the conditions', () => {
    // Out of band or already owned: forcing invents nothing. A tester
    // gets the same world a player would.
    expect(pickAccident({ defs: DEFS, progress: 90, forced: true, rng: dice(0) })).toBeNull();
    expect(
      pickAccident({
        defs: DEFS,
        progress: 30,
        acquiredArcanaIds: [DRAGON.arcanaId],
        forced: true,
        rng: dice(0),
      }),
    ).toBeNull();
  });

  it('can name one candidate', () => {
    expect(pickAccident({ defs: DEFS, progress: 30, forced: DRAGON.id, rng: dice(0) })?.id).toBe(
      DRAGON.id,
    );
    expect(pickAccident({ defs: DEFS, progress: 30, forced: 'NOBODY', rng: dice(0) })).toBeNull();
  });
});

describe('the first one, as written', () => {
  it('joins a sighting to a page that does not exist yet', () => {
    // The link the exclusion rule reads. It is a reserved id, so
    // nothing can own it, so the candidate always stands — which is
    // the correct answer while there is no way to obtain it.
    expect(DRAGON.arcanaId).toBe('ancient_dragon');
    expect(DRAGON.unknownLabel).toBe('UNKNOWN #001');
    expect(DRAGON.previewId).toBeTruthy();
  });

  it('is a sighting and not a character', () => {
    const keys = Object.keys(DRAGON);
    for (const forbidden of ['hp', 'attack', 'drop', 'rarity', 'reward', 'species']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('carries its one move, and the number that move hits for', () => {
    expect(DRAGON.ability.effect.kind).toBe('STRIKE_ALL');
    expect(DRAGON.ability.effect.amount).toBe(999);
    // The artwork already says its name; nothing may print it again.
    expect(DRAGON.ability.titleInArt).toBe(true);
  });

  it('points at a book row with nothing to complete', () => {
    const page = UNKNOWN_ARCANA_DEFS.find((d) => d.arcanaId === DRAGON.unknownArcanaId);
    expect(page).toBeDefined();
    expect(page!.identifiesAs).toBeNull();
  });
});

describe('the record of what was seen', () => {
  it('still counts sightings, for the book rather than for the pool', () => {
    const first = observeAccident(emptyAccidentRecord('X'), 4);
    expect(first.state).toBe('OBSERVED');
    expect(first.timesObserved).toBe(1);
    const second = observeAccident(first, 40);
    expect(second.timesObserved).toBe(2);
  });

  it('does not un-identify something by glimpsing it again', () => {
    const known = {
      accidentId: 'X',
      state: 'IDENTIFIED' as const,
      timesObserved: 1,
      lastObservedDay: 4,
    };
    expect(observeAccident(known, 40).state).toBe('IDENTIFIED');
  });
});
