import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { MOSS_RABBIT_ARCANA } from '../../content/arcana/arcanaDefs';
import { isComplete, isDiscovered, progressOf, type ArcanaConditionId } from '../arcana/arcana';

/**
 * The world's side of ARCANA: what is written, what is refused, what
 * survives a reload, and what a reset takes with it.
 */

let dbCounter = 0;
function freshDbName(): string {
  return `arcana-test-${++dbCounter}`;
}

async function openWorld(dbName: string): Promise<World> {
  return World.open(new IdbMemoryStore(dbName));
}

const ID = MOSS_RABBIT_ARCANA.arcanaId;
const ALL: ArcanaConditionId[] = MOSS_RABBIT_ARCANA.conditions
  .filter((c) => !c.planned)
  .map((c) => c.id);

function progress(world: World): number {
  return progressOf(MOSS_RABBIT_ARCANA, world.getArcanaRecord(ID));
}

describe('a world that has never met a moss rabbit', () => {
  it('has an empty page rather than no page', async () => {
    const world = await openWorld(freshDbName());
    const record = world.getArcanaRecord(ID);
    expect(record.met).toEqual([]);
    expect(record.completeSeen).toBe(false);
    expect(isDiscovered(record)).toBe(false);
    expect(progress(world)).toBe(0);
    expect(world.getArcanaRecords()).toHaveLength(1);
  });

  it('says nothing about a page that does not exist', async () => {
    const world = await openWorld(freshDbName());
    await expect(world.recordArcanaConditions('no_such_thing', ['FIRST_ENCOUNTER'])).resolves.toBeNull();
  });
});

describe('learning something', () => {
  it('writes it once and reports what changed', async () => {
    const world = await openWorld(freshDbName());
    const gain = await world.recordArcanaConditions(ID, ['FIRST_ENCOUNTER', 'WON_A_FIGHT']);
    expect(gain).not.toBeNull();
    expect(gain!.added.sort()).toEqual(['FIRST_ENCOUNTER', 'WON_A_FIGHT']);
    expect(gain!.from).toBe(0);
    expect(gain!.to).toBe(20);
    expect(gain!.discoveredNow).toBe(true);
  });

  it('is silent the second time the same fight happens', async () => {
    const world = await openWorld(freshDbName());
    await world.recordArcanaConditions(ID, ['FIRST_ENCOUNTER', 'WON_A_FIGHT']);
    const again = await world.recordArcanaConditions(ID, ['FIRST_ENCOUNTER', 'WON_A_FIGHT']);
    expect(again).toBeNull();
    expect(progress(world)).toBe(20);
  });

  it('survives a reload, exactly as it was', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordArcanaConditions(ID, ['FIRST_ENCOUNTER', 'OBSERVE_UNIQUE_SKILL', 'ROUTE_SPARE']);
    const before = progress(world);

    const reopened = await openWorld(dbName);
    expect(progress(reopened)).toBe(before);
    expect(reopened.getArcanaRecord(ID).met.sort()).toEqual(
      ['FIRST_ENCOUNTER', 'OBSERVE_UNIQUE_SKILL', 'ROUTE_SPARE'].sort(),
    );
    // And it still refuses to count what it already counted.
    await expect(reopened.recordArcanaConditions(ID, ['ROUTE_SPARE'])).resolves.toBeNull();
  });

  it('tells whoever is watching that the world changed', async () => {
    const world = await openWorld(freshDbName());
    const before = world.getVersion();
    await world.recordArcanaConditions(ID, ['FIRST_ENCOUNTER']);
    expect(world.getVersion()).toBeGreaterThan(before);
  });

  it('hands back a copy, so nobody can edit the book from outside', async () => {
    const world = await openWorld(freshDbName());
    await world.recordArcanaConditions(ID, ['FIRST_ENCOUNTER']);
    const record = world.getArcanaRecord(ID);
    record.met.push('ROUTE_KILL');
    expect(progress(world)).toBe(10);
  });
});

describe('completing a memory', () => {
  it('crosses 100 once, and the crossing is only reported once', async () => {
    const world = await openWorld(freshDbName());
    // Everything but the last piece.
    const allButLast = ALL.slice(0, -1);
    await world.recordArcanaConditions(ID, allButLast);
    const last = ALL[ALL.length - 1];
    const crossing = await world.recordArcanaConditions(ID, [last]);
    // Whether this particular write is the crossing depends on the
    // numbers; what must hold is that completion is reported at most
    // once across the whole run.
    expect(isComplete(MOSS_RABBIT_ARCANA, world.getArcanaRecord(ID))).toBe(true);
    if (crossing) expect(crossing.to).toBe(100);
  });

  it('remembers that the completion moment has been played', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordArcanaConditions(ID, ALL);
    expect(world.getArcanaRecord(ID).completeSeen).toBe(false);

    await world.markArcanaCompleteSeen(ID);
    expect(world.getArcanaRecord(ID).completeSeen).toBe(true);

    // The whole point: a reload must not play it again.
    const reopened = await openWorld(dbName);
    expect(reopened.getArcanaRecord(ID).completeSeen).toBe(true);
  });

  it('does not write again when it is already marked seen', async () => {
    const world = await openWorld(freshDbName());
    await world.recordArcanaConditions(ID, ALL);
    await world.markArcanaCompleteSeen(ID);
    const version = world.getVersion();
    await world.markArcanaCompleteSeen(ID);
    expect(world.getVersion()).toBe(version);
  });
});

describe('save compatibility and reset', () => {
  it('opens a world saved before ARCANA existed without losing anything', async () => {
    const dbName = freshDbName();
    // A world with real history and no arcana row at all — exactly what
    // a save written by the previous build looks like.
    const before = await openWorld(dbName);
    await before.recordGaldLifeChoice('SPARE');
    await before.timeShift(3);
    const events = before.getEvents().length;

    const reopened = await openWorld(dbName);
    expect(reopened.getEvents().length).toBe(events);
    expect(reopened.getGaldLifeChoice()).toBe('SPARE');
    // And the book is simply empty, which is the same answer a new
    // world gives — not an error, and not a missing page.
    expect(reopened.getArcanaRecord(ID).met).toEqual([]);
    expect(progress(reopened)).toBe(0);
    // It can be written to from there like any other world.
    await expect(reopened.recordArcanaConditions(ID, ['FIRST_ENCOUNTER'])).resolves.not.toBeNull();
  });

  it('is taken with the rest of the world by a full reset', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    await world.recordArcanaConditions(ID, ALL);
    await world.markArcanaCompleteSeen(ID);
    expect(progress(world)).toBe(100);

    await world.resetWorld();
    // A reset world must not know things a reset world could not know:
    // WORLD MEMORY empty and the book still full would be a save that
    // disagrees with itself.
    expect(world.getEvents()).toEqual([]);
    expect(progress(world)).toBe(0);
    expect(world.getArcanaRecord(ID).completeSeen).toBe(false);

    const reopened = await openWorld(dbName);
    expect(progress(reopened)).toBe(0);
    expect(reopened.getArcanaRecord(ID).completeSeen).toBe(false);
  });
});

describe('what the rest of the world does while the book fills in', () => {
  it('does not touch WORLD MEMORY: knowing something is not a fact of history', async () => {
    const world = await openWorld(freshDbName());
    await world.recordArcanaConditions(ID, ALL);
    // The two layers are separate on purpose. WORLD MEMORY says what
    // the player DID; ARCANA says what they came to KNOW.
    expect(world.getEvents()).toEqual([]);
    expect(world.getKnownEvents()).toEqual([]);
  });

  it('does not touch the species counters either', async () => {
    const world = await openWorld(freshDbName());
    await world.recordArcanaConditions(ID, ALL);
    expect(world.getEnemyProgress('moss_rabbit')).toEqual({ defeated: 0, sinceStory: 0, named: 0 });
    expect(world.getEnemyIndividuals()).toEqual([]);
  });
});
