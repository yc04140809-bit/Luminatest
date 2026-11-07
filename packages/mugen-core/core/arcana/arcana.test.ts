import { describe, it, expect } from 'vitest';
import {
  ARCANA_MAX,
  applyArcanaConditions,
  emptyArcanaRecord,
  fragmentsOf,
  hintsOf,
  isComplete,
  isDiscovered,
  progressOf,
  readArcanaRecord,
  reachableTotal,
  type ArcanaConditionId,
  type ArcanaDef,
  type ArcanaRecord,
} from './arcana';
import { MOSS_RABBIT_ARCANA } from '../../content/arcana/arcanaDefs';

const DEF = MOSS_RABBIT_ARCANA;

function withMet(...met: ArcanaConditionId[]): ArcanaRecord {
  return { arcanaId: DEF.arcanaId, met, completeSeen: false };
}

/** Walks a whole life through the rules and returns where it ended up. */
function live(...steps: ArcanaConditionId[][]): ArcanaRecord {
  let record = emptyArcanaRecord(DEF.arcanaId);
  for (const step of steps) {
    const applied = applyArcanaConditions(DEF, record, step);
    if (applied) record = applied.record;
  }
  return record;
}

describe('an ARCANA that nobody has met', () => {
  it('is not in the book at all', () => {
    const fresh = emptyArcanaRecord(DEF.arcanaId);
    expect(isDiscovered(fresh)).toBe(false);
    expect(progressOf(DEF, fresh)).toBe(0);
    expect(isComplete(DEF, fresh)).toBe(false);
    expect(fragmentsOf(DEF, fresh)).toEqual([]);
  });

  it('reads back from a save that predates ARCANA as an empty page', () => {
    // The row simply is not there in an older save.
    const record = readArcanaRecord(DEF, undefined);
    expect(record.met).toEqual([]);
    expect(record.completeSeen).toBe(false);
    expect(progressOf(DEF, record)).toBe(0);
  });

  it('keeps a newer build’s conditions rather than deleting them', () => {
    // An id this build has never heard of survives the round trip and is
    // simply not counted — loading an old build must not quietly erase
    // what a newer one recorded.
    const record = readArcanaRecord(DEF, { met: ['FIRST_ENCOUNTER', 'SOMETHING_LATER'], completeSeen: false });
    expect(record.met).toContain('SOMETHING_LATER');
    expect(progressOf(DEF, record)).toBe(10);
  });
});

describe('coming to know something', () => {
  it('puts it in the book the first time and says so', () => {
    const applied = applyArcanaConditions(DEF, emptyArcanaRecord(DEF.arcanaId), ['FIRST_ENCOUNTER']);
    expect(applied).not.toBeNull();
    expect(applied!.gain.discoveredNow).toBe(true);
    expect(applied!.gain.from).toBe(0);
    expect(applied!.gain.to).toBe(10);
    expect(isDiscovered(applied!.record)).toBe(true);
  });

  it('counts the same condition once, however many times it happens', () => {
    const first = applyArcanaConditions(DEF, emptyArcanaRecord(DEF.arcanaId), ['FIRST_ENCOUNTER']);
    const again = applyArcanaConditions(DEF, first!.record, ['FIRST_ENCOUNTER']);
    // Not "adds zero" — nothing happens at all, so nothing is written.
    expect(again).toBeNull();
  });

  it('does not pay for grinding: a hundred identical fights teach one fight', () => {
    let record = emptyArcanaRecord(DEF.arcanaId);
    for (let i = 0; i < 100; i++) {
      const applied = applyArcanaConditions(DEF, record, [
        'FIRST_ENCOUNTER',
        'OBSERVE_NORMAL_ATTACK',
        'WON_A_FIGHT',
      ]);
      if (applied) record = applied.record;
    }
    expect(progressOf(DEF, record)).toBe(10 + 10 + 10);
  });

  it('adds a different experience on top of the ones already had', () => {
    const record = live(['FIRST_ENCOUNTER'], ['OBSERVE_UNIQUE_SKILL']);
    expect(progressOf(DEF, record)).toBe(25);
  });

  it('drops conditions this page does not define', () => {
    const applied = applyArcanaConditions(DEF, emptyArcanaRecord(DEF.arcanaId), [
      'NOT_A_REAL_CONDITION' as ArcanaConditionId,
    ]);
    expect(applied).toBeNull();
  });

  it('never counts a condition whose moment is not built yet', () => {
    // REUNION is defined so the numbers around it are honest, and is
    // reachable nowhere. It must not be countable by asking for it.
    const applied = applyArcanaConditions(DEF, withMet('FIRST_ENCOUNTER'), ['REUNION']);
    expect(applied).toBeNull();
  });

  it('will not let time teach you about something you have never seen', () => {
    expect(applyArcanaConditions(DEF, emptyArcanaRecord(DEF.arcanaId), ['TIME_PASSED'])).toBeNull();
    const known = live(['FIRST_ENCOUNTER'], ['TIME_PASSED']);
    expect(known.met).toContain('TIME_PASSED');
  });
});

describe('the ceiling', () => {
  it('stops at 100 however much is piled on', () => {
    const everything = DEF.conditions.filter((c) => !c.planned).map((c) => c.id);
    const record = withMet(...everything);
    expect(reachableTotal(DEF)).toBeGreaterThan(ARCANA_MAX);
    expect(progressOf(DEF, record)).toBe(100);
    expect(isComplete(DEF, record)).toBe(true);
  });

  it('reports completion exactly once, on the write that crosses it', () => {
    const nearly = withMet(
      'FIRST_ENCOUNTER',
      'OBSERVE_NORMAL_ATTACK',
      'OBSERVE_UNIQUE_SKILL',
      'WON_A_FIGHT',
      'MET_SOMEBODY',
      'ROUTE_SPARE',
    );
    expect(progressOf(DEF, nearly)).toBe(85);
    const crossing = applyArcanaConditions(DEF, nearly, ['TIME_PASSED'])!;
    expect(crossing.gain.completedNow).toBe(true);
    expect(crossing.gain.to).toBe(100);

    // Anything after it is an ordinary write, or no write at all.
    const after = applyArcanaConditions(DEF, crossing.record, ['LOST_A_FIGHT'])!;
    expect(after.gain.completedNow).toBe(false);
    expect(after.gain.from).toBe(100);
    expect(after.gain.to).toBe(100);
  });
});

/**
 * The promise this whole system is built on: the book never asks a
 * player to spend a life they did not want to spend.
 */
describe('more than one road to a complete memory', () => {
  const BASE: ArcanaConditionId[] = [
    'FIRST_ENCOUNTER',
    'OBSERVE_NORMAL_ATTACK',
    'OBSERVE_UNIQUE_SKILL',
    'WON_A_FIGHT',
    'MET_SOMEBODY',
  ];

  it.each(['ROUTE_KILL', 'ROUTE_SPARE', 'ROUTE_HELP', 'ROUTE_CAPTURE'] as const)(
    'reaches 100%% with %s and nothing else from the four',
    (route) => {
      const record = withMet(...BASE, route, 'TIME_PASSED');
      expect(progressOf(DEF, record)).toBe(100);
    },
  );

  it('never requires killing: 100% is reachable with KILL forbidden', () => {
    expect(reachableTotal(DEF, ['ROUTE_KILL'])).toBeGreaterThanOrEqual(ARCANA_MAX);
  });

  it('never requires any single condition', () => {
    // Take each condition away in turn; what is left must still be able
    // to reach 100. That is the structural version of "no road is
    // mandatory", and it fails loudly if a rebalance breaks it.
    for (const condition of DEF.conditions) {
      if (condition.planned) continue;
      expect(
        reachableTotal(DEF, [condition.id]),
        `${condition.id} has become mandatory`,
      ).toBeGreaterThanOrEqual(ARCANA_MAX);
    }
  });

  it('gets there without Kaos ever helping, and without ever losing', () => {
    const record = withMet(...BASE, 'ROUTE_HELP', 'TIME_PASSED');
    expect(record.met).not.toContain('KAOS_INTERVENED');
    expect(record.met).not.toContain('LOST_A_FIGHT');
    expect(progressOf(DEF, record)).toBe(100);
  });

  it('gets there without ever letting time pass, by living more instead', () => {
    const record = withMet(...BASE, 'ROUTE_SPARE', 'KAOS_INTERVENED', 'LOST_A_FIGHT');
    expect(record.met).not.toContain('TIME_PASSED');
    expect(progressOf(DEF, record)).toBe(100);
  });

  it('gets there on two different answers to two different creatures', () => {
    const record = withMet(...BASE, 'ROUTE_SPARE', 'ROUTE_HELP');
    expect(progressOf(DEF, record)).toBe(100);
  });
});

describe('what the page shows', () => {
  it('opens its first piece the moment it is known at all', () => {
    const record = withMet('FIRST_ENCOUNTER');
    const known = fragmentsOf(DEF, record);
    expect(known.length).toBeGreaterThan(0);
    expect(known[0].id).toBe('form');
  });

  it('opens more as the memory fills in, and everything at 100', () => {
    const low = fragmentsOf(DEF, withMet('FIRST_ENCOUNTER'));
    const mid = fragmentsOf(DEF, withMet('FIRST_ENCOUNTER', 'MET_SOMEBODY', 'ROUTE_HELP'));
    const full = fragmentsOf(
      DEF,
      withMet(...DEF.conditions.filter((c) => !c.planned).map((c) => c.id)),
    );
    expect(mid.length).toBeGreaterThan(low.length);
    expect(full.length).toBe(DEF.fragments.length);
  });

  it('tells the player what is missing without telling them what to do', () => {
    const hints = hintsOf(DEF, withMet('FIRST_ENCOUNTER'));
    expect(hints.length).toBeGreaterThan(0);
    for (const hint of hints) {
      // No numbers, and none of the four answers named. A book that
      // says "kill one for +25%" is the thing this design refuses.
      expect(hint).not.toMatch(/\d/);
      expect(hint).not.toMatch(/%/);
      expect(hint).not.toMatch(/KILL|SPARE|HELP|CAPTURE/);
    }
  });

  it('says the four answers with one voice, not four', () => {
    const routes = DEF.conditions.filter((c) => c.id.startsWith('ROUTE_'));
    expect(new Set(routes.map((c) => c.hint)).size).toBe(1);
    // And so the book shows that one line once.
    const hints = hintsOf(DEF, withMet('FIRST_ENCOUNTER'), 99);
    expect(hints.filter((h) => h === routes[0].hint)).toHaveLength(1);
  });

  it('never hints at something that cannot be reached yet', () => {
    const planned = DEF.conditions.filter((c) => c.planned);
    expect(planned.length).toBeGreaterThan(0);
    const hints = hintsOf(DEF, emptyArcanaRecord(DEF.arcanaId), 99);
    for (const condition of planned) expect(hints).not.toContain(condition.hint);
  });

  it('has nothing left to hint at once the memory is complete', () => {
    // Not the "met everything" record — a real one. Every road to 100%
    // leaves conditions unmet, and the finished page must not list them
    // underneath the line that says the memory is complete.
    const oneRoute = withMet(
      'FIRST_ENCOUNTER',
      'OBSERVE_NORMAL_ATTACK',
      'OBSERVE_UNIQUE_SKILL',
      'WON_A_FIGHT',
      'MET_SOMEBODY',
      'ROUTE_SPARE',
      'TIME_PASSED',
    );
    expect(progressOf(DEF, oneRoute)).toBe(100);
    expect(oneRoute.met.length).toBeLessThan(DEF.conditions.filter((c) => !c.planned).length);
    expect(hintsOf(DEF, oneRoute)).toEqual([]);

    // And the same for the exhaustive one.
    const everything = withMet(...DEF.conditions.filter((c) => !c.planned).map((c) => c.id));
    expect(hintsOf(DEF, everything)).toEqual([]);
  });
});

describe('the definition itself', () => {
  it('gives the four answers exactly the same weight', () => {
    const routes = DEF.conditions.filter((c) => c.id.startsWith('ROUTE_'));
    expect(routes).toHaveLength(4);
    expect(new Set(routes.map((c) => c.points)).size).toBe(1);
  });

  it('has no two conditions with the same id', () => {
    const ids = DEF.conditions.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('opens its first fragment at 1%, so a discovered page is never blank', () => {
    expect(Math.min(...DEF.fragments.map((f) => f.at))).toBe(1);
  });

  it('keeps every fragment reachable', () => {
    for (const fragment of DEF.fragments) {
      expect(fragment.at).toBeLessThanOrEqual(ARCANA_MAX);
    }
  });
});

/** A def with nothing in it must not throw or claim to be complete. */
describe('an empty definition', () => {
  const EMPTY: ArcanaDef = {
    ...DEF,
    arcanaId: 'nothing',
    conditions: [],
    fragments: [],
  };
  it('is 0% and not complete', () => {
    const record = emptyArcanaRecord('nothing');
    expect(progressOf(EMPTY, record)).toBe(0);
    expect(isComplete(EMPTY, record)).toBe(false);
    expect(hintsOf(EMPTY, record)).toEqual([]);
    expect(fragmentsOf(EMPTY, record)).toEqual([]);
  });
});
