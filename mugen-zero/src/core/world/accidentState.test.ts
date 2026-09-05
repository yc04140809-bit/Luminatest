import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { UNKNOWN_ACCIDENT_001 } from '../../content/summon/accidents';

/**
 * The world's side of a sighting: what is written, what survives a
 * reload, what a reset takes with it — and, most of all, what a
 * sighting is NOT.
 */

let dbCounter = 0;
function freshDbName(): string {
  return `accident-test-${++dbCounter}`;
}

async function openWorld(dbName: string): Promise<World> {
  return World.open(new IdbMemoryStore(dbName));
}

const ID = UNKNOWN_ACCIDENT_001.id;

describe('what the player glimpsed', () => {
  it('starts with nothing seen', async () => {
    const world = await openWorld(freshDbName());
    expect(world.getObservedAccidents()).toEqual([]);
  });

  it('says whether the sighting was the first, and counts the rest', async () => {
    const world = await openWorld(freshDbName());
    expect(await world.recordAccidentObserved(ID)).toBe(true);
    expect(await world.recordAccidentObserved(ID)).toBe(false);
    // One row, however many sightings — but the count is kept, because
    // a repeat policy and a cooldown are made of it.
    expect(world.getObservedAccidents()).toEqual([ID]);
    const record = world.getAccidentRecord(ID);
    expect(record.state).toBe('OBSERVED');
    expect(record.timesObserved).toBe(2);
    expect(record.lastObservedDay).not.toBeNull();
  });

  it('starts everything UNSEEN, without a row existing', async () => {
    const world = await openWorld(freshDbName());
    expect(world.getAccidentRecord(ID)).toEqual({
      accidentId: ID,
      state: 'UNSEEN',
      timesObserved: 0,
      lastObservedDay: null,
    });
  });

  it('remembers where the player got to with it', async () => {
    // The entry point for UNKNOWN → IDENTIFIED → ACQUIRED. Nothing in
    // the game calls it yet; the meeting that would is a later phase.
    const db = freshDbName();
    const world = await openWorld(db);
    await world.recordAccidentObserved(ID);
    await world.setAccidentState(ID, 'ACQUIRED');
    expect((await openWorld(db)).getAccidentRecord(ID).state).toBe('ACQUIRED');
  });

  it('survives a reload', async () => {
    const db = freshDbName();
    const first = await openWorld(db);
    await first.recordAccidentObserved(ID);
    const second = await openWorld(db);
    expect(second.getObservedAccidents()).toEqual([ID]);
    expect(second.getAccidentRecord(ID).timesObserved).toBe(1);
  });

  it('is enough on its own to be offered your world back', async () => {
    const world = await openWorld(freshDbName());
    expect(world.hasProgress()).toBe(false);
    await world.recordAccidentObserved(ID);
    expect(world.hasProgress()).toBe(true);
  });

  it('is not an ARCANA: the book is exactly as empty as it was', async () => {
    // The rule the whole feature stands on. Seeing something is not
    // obtaining it, does not open a page, and does not start one at
    // any percentage at all.
    const world = await openWorld(freshDbName());
    const before = world.getArcanaRecords();
    await world.recordAccidentObserved(ID);
    expect(world.getArcanaRecords()).toEqual(before);
    for (const record of world.getArcanaRecords()) {
      expect(record.met).toEqual([]);
    }
  });

  it('is not a fact of history: WORLD MEMORY does not hear about it', async () => {
    const world = await openWorld(freshDbName());
    await world.recordAccidentObserved(ID);
    expect(world.getEvents()).toEqual([]);
    expect(world.getKnownEvents()).toEqual([]);
  });

  it('is gone when the world is', async () => {
    const db = freshDbName();
    const world = await openWorld(db);
    await world.recordAccidentObserved(ID);
    await world.resetWorld();
    expect(world.getObservedAccidents()).toEqual([]);
    // And still gone after a reload: a reset that only cleared memory
    // would hand the row straight back.
    const reopened = await openWorld(db);
    expect(reopened.getObservedAccidents()).toEqual([]);
  });

  it('can be forgotten on purpose, for testing a once-per-save sight', async () => {
    const world = await openWorld(freshDbName());
    await world.recordAccidentObserved(ID);
    await world.forgetObservedAccidents();
    expect(world.getObservedAccidents()).toEqual([]);
  });
});

describe('a save written before any of this existed', () => {
  it('reads as nothing glimpsed, and keeps everything it did have', async () => {
    const db = freshDbName();
    const old = await openWorld(db);
    await old.recordArcanaConditions('moss_rabbit', ['FIRST_ENCOUNTER']);
    // Nothing ever wrote the accidents row: exactly the shape of a
    // save from the previous build.
    const now = await openWorld(db);
    expect(now.getObservedAccidents()).toEqual([]);
    expect(now.getArcanaRecord('moss_rabbit').met).toContain('FIRST_ENCOUNTER');
  });
});


describe('a save written before any of this had a shape', () => {
  it('reads the flat list an earlier build wrote as one sighting each', async () => {
    // The first version of this feature stored a plain array of ids.
    // A save must never be made worthless by its own bookkeeping
    // changing shape underneath it.
    const db = freshDbName();
    const store = new IdbMemoryStore(db);
    await store.init();
    await store.commit({ putState: [{ key: 'summon_accidents', value: [ID] }] });
    const world = await openWorld(db);
    const record = world.getAccidentRecord(ID);
    expect(record.state).toBe('OBSERVED');
    expect(record.timesObserved).toBe(1);
    expect(world.getObservedAccidents()).toEqual([ID]);
  });

  it('shrugs off a row that is nonsense', async () => {
    const db = freshDbName();
    const store = new IdbMemoryStore(db);
    await store.init();
    await store.commit({
      putState: [{ key: 'summon_accidents', value: { [ID]: { state: 'WHAT', timesObserved: 'x' } } }],
    });
    const world = await openWorld(db);
    const record = world.getAccidentRecord(ID);
    expect(record.state).toBe('UNSEEN');
    expect(record.timesObserved).toBe(0);
  });
});

describe('TEST 8 — a save from before any of this', () => {
  it('loads with no migration and an empty pool history', async () => {
    // The pool keeps no ownership of its own, so there is nothing for
    // an old save to be missing: absent reads as "seen nothing", and
    // whether anything is owned comes from the ARCANA book, which
    // every save has always had.
    const db = freshDbName();
    const old = await openWorld(db);
    await old.recordArcanaConditions('moss_rabbit', ['FIRST_ENCOUNTER']);
    const now = await openWorld(db);
    expect(now.getObservedAccidents()).toEqual([]);
    expect(now.getAccidentRecord(ID).timesObserved).toBe(0);
    expect(now.getArcanaRecord('moss_rabbit').met).toContain('FIRST_ENCOUNTER');
    expect(now.getAcquiredArcanaIds()).toEqual([]);
  });
});

describe('what the accident pool is allowed to see', () => {
  it('offers up the ARCANA the player has actually finished', async () => {
    const world = await openWorld(freshDbName());
    expect(world.getAcquiredArcanaIds()).toEqual([]);
    await world.recordArcanaConditions('moss_rabbit', [
      'FIRST_ENCOUNTER',
      'OBSERVE_NORMAL_ATTACK',
      'OBSERVE_UNIQUE_SKILL',
      'WON_A_FIGHT',
      'LOST_A_FIGHT',
      'MET_SOMEBODY',
      'KAOS_INTERVENED',
      'ROUTE_SPARE',
    ]);
    expect(world.getAcquiredArcanaIds()).toEqual(['moss_rabbit']);
  });

  it('does not gain an owned flag of its own when something is seen', () => {
    // The rule against managing the same fact twice. Watching a thing
    // cross must never make the game think the player owns it.
    return (async () => {
      const world = await openWorld(freshDbName());
      await world.recordAccidentObserved(ID);
      expect(world.getAcquiredArcanaIds()).toEqual([]);
    })();
  });
});
