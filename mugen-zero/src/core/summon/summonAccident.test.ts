import { describe, it, expect } from 'vitest';
import {
  SUMMON_ACCIDENT_CONFIG,
  eligibleAccidents,
  emptyAccidentRecord,
  observed as observeAccident,
  pickAccident,
  weightFor,
  type AccidentRecord,
  type SummonAccidentDef,
} from './summonAccident';
import { SUMMON_ACCIDENTS, UNKNOWN_ACCIDENT_001 } from '../../content/summon/accidents';
import { UNKNOWN_ARCANA_DEFS } from '../../content/arcana/unknownArcana';

/** A die that hands back the numbers you give it, in order. */
function dice(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

const ALWAYS = SUMMON_ACCIDENT_CONFIG.chance - 0.01;
const NEVER = SUMMON_ACCIDENT_CONFIG.chance + 0.01;
const DEFS = SUMMON_ACCIDENTS;

describe('what can cross an unfinished memory', () => {
  it('crosses when the world is unlucky', () => {
    const picked = pickAccident({ defs: DEFS, progress: 30, rng: dice(ALWAYS, 0) });
    expect(picked?.id).toBe(UNKNOWN_ACCIDENT_001.id);
  });

  it('mostly does not', () => {
    expect(pickAccident({ defs: DEFS, progress: 30, rng: dice(NEVER) })).toBeNull();
  });

  it('never crosses a memory that is finished', () => {
    // Structural, and said twice on purpose: a complete page is not
    // summoned through this path at all, and even if it were, it is
    // outside every candidate's band.
    expect(pickAccident({ defs: DEFS, progress: 100, rng: dice(ALWAYS, 0) })).toBeNull();
  });

  it('never crosses a memory that does not exist', () => {
    expect(pickAccident({ defs: DEFS, progress: 0, rng: dice(ALWAYS, 0) })).toBeNull();
  });

  it('has nothing to give when nothing is defined', () => {
    expect(pickAccident({ defs: [], progress: 30, rng: dice(0, 0) })).toBeNull();
  });
});

/** Seen once, on the day given. */
function seenOn(def: SummonAccidentDef, day: number | null): AccidentRecord {
  return observeAccident(emptyAccidentRecord(def.id), day);
}

describe('whether a thing that has crossed may cross again', () => {
  it('waits out its cooldown', () => {
    const records = [seenOn(UNKNOWN_ACCIDENT_001, 100)];
    const soon = pickAccident({ defs: DEFS, progress: 30, records, day: 110, rng: dice(ALWAYS, 0) });
    expect(soon).toBeNull();
    const later = pickAccident({
      defs: DEFS,
      progress: 30,
      records,
      day: 100 + UNKNOWN_ACCIDENT_001.cooldownDays,
      rng: dice(ALWAYS, 0),
    });
    expect(later?.id).toBe(UNKNOWN_ACCIDENT_001.id);
  });

  it('is rarer the second time than the first', () => {
    // 「またアイツだ」 is worth having. Being able to farm it is not.
    const fresh = weightFor(UNKNOWN_ACCIDENT_001, emptyAccidentRecord(UNKNOWN_ACCIDENT_001.id));
    const again = weightFor(UNKNOWN_ACCIDENT_001, seenOn(UNKNOWN_ACCIDENT_001, 1));
    expect(again).toBeGreaterThan(0);
    expect(again).toBeLessThan(fresh);
  });

  it('never again, when the policy says ONCE', () => {
    const once: SummonAccidentDef = { ...UNKNOWN_ACCIDENT_001, repeatPolicy: 'ONCE' };
    const picked = pickAccident({
      defs: [once],
      progress: 30,
      records: [seenOn(once, 1)],
      day: 9_999,
      rng: dice(ALWAYS, 0),
    });
    expect(picked).toBeNull();
  });

  it('never again, when its repeat weight is nothing', () => {
    const spent: SummonAccidentDef = { ...UNKNOWN_ACCIDENT_001, repeatWeight: 0 };
    const picked = pickAccident({
      defs: [spent],
      progress: 30,
      records: [seenOn(spent, 1)],
      day: 9_999,
      rng: dice(ALWAYS, 0),
    });
    expect(picked).toBeNull();
  });

  it('will not gamble on a world with no clock to read', () => {
    // Without a day, a cooldown cannot be shown to have elapsed, and
    // the safe answer to that is "not yet".
    const picked = pickAccident({
      defs: DEFS,
      progress: 30,
      records: [seenOn(UNKNOWN_ACCIDENT_001, 5)],
      day: null,
      rng: dice(ALWAYS, 0),
    });
    expect(picked).toBeNull();
  });
});

describe('where the player stands with it', () => {
  it('moves UNSEEN to OBSERVED, and counts', () => {
    const first = observeAccident(emptyAccidentRecord('X'), 4);
    expect(first.state).toBe('OBSERVED');
    expect(first.timesObserved).toBe(1);
    expect(first.lastObservedDay).toBe(4);
    const second = observeAccident(first, 40);
    expect(second.timesObserved).toBe(2);
    expect(second.lastObservedDay).toBe(40);
  });

  it('does not un-identify something by glimpsing it again', () => {
    const known: AccidentRecord = {
      accidentId: 'X',
      state: 'IDENTIFIED',
      timesObserved: 1,
      lastObservedDay: 4,
    };
    expect(observeAccident(known, 40).state).toBe('IDENTIFIED');
  });

  it('is out of the pool for good once it is the player’s', () => {
    // The hard rule. A thing you can call on purpose must never turn
    // up again as a thing that crossed you by chance.
    const owned: AccidentRecord = {
      accidentId: UNKNOWN_ACCIDENT_001.id,
      state: 'ACQUIRED',
      timesObserved: 1,
      lastObservedDay: 1,
    };
    const picked = pickAccident({
      defs: DEFS,
      progress: 30,
      records: [owned],
      day: 9_999,
      rng: dice(ALWAYS, 0),
    });
    expect(picked).toBeNull();
  });

  it('is out of the pool the moment its ARCANA is held, however that happened', () => {
    // Checked from the other side too, and written once for everything
    // rather than as an `if` about one creature: the candidate names
    // the page it resolves into, and holding that page excludes it.
    const resolves: SummonAccidentDef = {
      ...UNKNOWN_ACCIDENT_001,
      resolvedArcanaId: 'ancient_dragon',
    };
    expect(
      pickAccident({
        defs: [resolves],
        progress: 30,
        acquiredArcanaIds: ['ancient_dragon'],
        rng: dice(ALWAYS, 0),
      }),
    ).toBeNull();
  });

  it('does not take anything else out with it', () => {
    // One candidate becoming the player's must not disturb the others.
    const mine: SummonAccidentDef = {
      ...UNKNOWN_ACCIDENT_001,
      id: 'MINE',
      resolvedArcanaId: 'ancient_dragon',
    };
    const theirs: SummonAccidentDef = {
      ...UNKNOWN_ACCIDENT_001,
      id: 'SOMEBODY_ELSE',
      resolvedArcanaId: 'something_else',
    };
    const left = eligibleAccidents({
      defs: [mine, theirs],
      progress: 30,
      acquiredArcanaIds: ['ancient_dragon'],
    });
    expect(left.map((d) => d.id)).toEqual(['SOMEBODY_ELSE']);
  });
});

describe('the conditions, such as they are', () => {
  const somewhere: SummonAccidentDef = {
    ...UNKNOWN_ACCIDENT_001,
    id: 'ELSEWHERE',
    location: 'ALDEN_VILLAGE',
    year: 3,
  };

  it('respects a place, when one is asked for', () => {
    expect(eligibleAccidents({ defs: [somewhere], progress: 30, location: 'GREENWOOD_FOREST', year: 3 }))
      .toHaveLength(0);
    expect(eligibleAccidents({ defs: [somewhere], progress: 30, location: 'ALDEN_VILLAGE', year: 3 }))
      .toHaveLength(1);
  });

  it('respects a year, when one is asked for', () => {
    expect(eligibleAccidents({ defs: [somewhere], progress: 30, location: 'ALDEN_VILLAGE', year: 9 }))
      .toHaveLength(0);
  });

  it('ignores a place the candidate does not care about', () => {
    expect(eligibleAccidents({ defs: DEFS, progress: 30, location: 'ANYWHERE_AT_ALL' })).toHaveLength(1);
  });

  it('can be switched off without being deleted', () => {
    const off: SummonAccidentDef = { ...UNKNOWN_ACCIDENT_001, enabled: false };
    expect(eligibleAccidents({ defs: [off], progress: 30 })).toHaveLength(0);
  });

  it('is not a curve on construction', () => {
    // The band is a condition, not a formula. Two different amounts of
    // an unfinished memory inside it are equally able to be crossed —
    // "the less you have collected, the more you see" would make the
    // rarest sight in the game a reward for collecting badly.
    const low = pickAccident({ defs: DEFS, progress: 5, rng: dice(ALWAYS, 0) });
    const high = pickAccident({ defs: DEFS, progress: 55, rng: dice(ALWAYS, 0) });
    expect(low?.id).toBe(high?.id);
  });
});

describe('development forcing', () => {
  it('skips the dice', () => {
    expect(pickAccident({ defs: DEFS, progress: 30, forced: true, rng: dice(0.999) })?.id).toBe(
      UNKNOWN_ACCIDENT_001.id,
    );
  });

  it('does not skip the conditions', () => {
    // Out of band, already seen, or nothing defined: forcing invents
    // nothing. A tester gets the same world a player would.
    expect(pickAccident({ defs: DEFS, progress: 90, forced: true, rng: dice(0) })).toBeNull();
    expect(
      pickAccident({
        defs: DEFS,
        progress: 30,
        records: [seenOn(UNKNOWN_ACCIDENT_001, 1)],
        day: 2,
        forced: true,
        rng: dice(0),
      }),
    ).toBeNull();
  });
});

describe('the first one, as written', () => {
  it('is a sighting and not a character', () => {
    // Everything that would make it a monster is absent, and that is
    // the design rather than an omission: nothing here has hit points,
    // a drop, a route, a rarity or a way of being obtained.
    const keys = Object.keys(UNKNOWN_ACCIDENT_001);
    for (const forbidden of ['hp', 'attack', 'drop', 'rarity', 'reward', 'species']) {
      expect(keys).not.toContain(forbidden);
    }
    // Not obtained, and not on its way to being obtained.
    expect(UNKNOWN_ACCIDENT_001.resolvedArcanaId).toBeNull();
  });

  it('carries its one move, and the number that move hits for', () => {
    // In content, once, rather than a 999 written into a screen.
    const { ability } = UNKNOWN_ACCIDENT_001;
    expect(ability.effect.kind).toBe('STRIKE_ALL');
    expect(ability.effect.amount).toBeGreaterThan(0);
    // The artwork already says its name; nothing may print it again.
    expect(ability.titleInArt).toBe(true);
  });

  it('points at a page that has nothing to complete', () => {
    const page = UNKNOWN_ARCANA_DEFS.find(
      (d) => d.arcanaId === UNKNOWN_ACCIDENT_001.unknownArcanaId,
    );
    expect(page).toBeDefined();
    // The join to a real ARCANA exists and is empty: the meeting that
    // would fill it in is a later phase.
    expect(page!.identifiesAs).toBeNull();
  });

  it('keeps its one rate in one place', () => {
    expect(SUMMON_ACCIDENT_CONFIG.chance).toBeGreaterThan(0);
    expect(SUMMON_ACCIDENT_CONFIG.chance).toBeLessThan(0.2);
  });
});
