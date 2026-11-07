import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { MemoryEvent } from '../memory/types';
import type { LifeChoiceId } from '../flow/types';
import { findDueLifeEvents, type BloomPossible } from '../events/eventEngine';
import { bloomCheckAt, bloomPossible, readWorldLife, WORLD_LIFE_RULES } from '../life/worldReading';
import { seedsOf } from '../life/engine';
import { GALD_BAKERY_ROUTE_DEFS, LIFE_TICK_DEFS, OFF_SCREEN_EVENT_INFO } from '../../content/events/offScreenLife';
import { GALD_SPARE_ROUTE_DEFS } from '../../content/events/spareRouteLife';
import { GALD_FUTURE_VISION_YEARS } from '../../content/events/galdLifeChoice';
import { openSaveThatLivedTheRetiredSpareChain } from './retiredSpareChain.testkit';

/**
 * THE SECOND PROVING ROUTE: 見逃す (ROUTE D, TIGS2027, 作者 2026-10-20).
 *
 * What it has to prove, beside the bakery route: one life engine, given a
 * different first fact, keeps a different WORLD MEMORY, has different NPCs
 * do different things, leaves different things in people, and puts Gald
 * somewhere else three years on — not a second script, and not the same
 * state under different words.
 *
 * The brief's pass line, pinned below:
 *   選択 SPARE ／ 治療と異なる WORLD MEMORY ／ 異なる NPC イベント2件以上 ／
 *   3年後 ガルドは村の外 ／ パン屋ルートに入らない ／ 内部状態も異なる ／
 *   パン屋ルートを壊さない
 */

let dbCounter = 0;
const freshDbName = () => `spare-chain-${++dbCounter}`;
const openWorld = (dbName = freshDbName()) => World.open(new IdbMemoryStore(dbName));

const SPARE_CHAIN = ['GALD_LEAVES_BANDITS', 'GALD_SAVES_MERCHANTS', 'MERCHANTS_LEARN_OF_ELNA'];
const BAKERY_CHAIN = GALD_BAKERY_ROUTE_DEFS.map((d) => d.type as string);
const SPARE_NPC_EVENTS = GALD_SPARE_ROUTE_DEFS.map((d) => d.type as string);

async function lived(choice: LifeChoiceId, nights = 10): Promise<World> {
  const world = await openWorld();
  await world.recordGaldLifeChoice(choice);
  await world.advanceDays(nights);
  return world;
}

const types = (world: World) => world.getEvents().map((e) => e.type as string);
const seedTypes = (world: World, npcId: string) =>
  seedsOf(readWorldLife(world.getEvents(), world.getClock()), WORLD_LIFE_RULES, npcId).map((s) => s.type);

describe('the choice: SPARE, saved like any other answer', () => {
  it('written once into WORLD MEMORY, as its own fact — not the treatment', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    expect(world.getGaldLifeChoice()).toBe('SPARE');
    expect(types(world)).toEqual(['PLAYER_SPARED_GALD']);
    await expect(world.recordGaldLifeChoice('HELP')).rejects.toThrow();
  });
});

describe('a different WORLD MEMORY, lived on the same nights', () => {
  it('he leaves (day 4), and outside the village helps the merchants, who learn of his sister (day 6)', async () => {
    const world = await lived('SPARE');
    const byType = Object.fromEntries(world.getEvents().map((e) => [e.type, e]));
    expect(SPARE_CHAIN.map((t) => [t, byType[t]?.worldDay])).toEqual([
      ['GALD_LEAVES_BANDITS', 4],
      ['GALD_SAVES_MERCHANTS', 6],
      ['MERCHANTS_LEARN_OF_ELNA', 6],
    ]);
    expect(byType.GALD_SAVES_MERCHANTS.causedBy).toEqual(['GALD_LEAVES_BANDITS']);
    expect(byType.MERCHANTS_LEARN_OF_ELNA.causedBy).toEqual(['GALD_SAVES_MERCHANTS']);
    expect(byType.GALD_SAVES_MERCHANTS.location).toBe('OUTSIDE_ALDEN');
  });

  it('the two worlds share nothing past the answer: no bakery route here, no merchants there', async () => {
    const spare = await lived('SPARE');
    const help = await lived('HELP');
    for (const t of BAKERY_CHAIN) expect(types(spare), t).not.toContain(t);
    for (const t of SPARE_NPC_EVENTS) expect(types(help), t).not.toContain(t);
    expect(types(spare)).toContain('PLAYER_SPARED_GALD');
    expect(types(spare)).not.toContain('PLAYER_HELPED_GALD');
  });

  it('at least two NPC events of its own, between other people, the player in none of them', () => {
    expect(SPARE_NPC_EVENTS).toHaveLength(2);
    for (const def of GALD_SPARE_ROUTE_DEFS) {
      expect(def.actors).toContain('MERCHANT_CARAVAN');
      expect(def.actors).not.toContain('PLAYER');
      expect(OFF_SCREEN_EVENT_INFO[def.type as keyof typeof OFF_SCREEN_EVENT_INFO].playerObserved).toBe(false);
    }
    // Whose own move each was.
    expect(OFF_SCREEN_EVENT_INFO.GALD_SAVES_MERCHANTS.decidedBy).toBe('GALD');
    expect(OFF_SCREEN_EVENT_INFO.MERCHANTS_LEARN_OF_ELNA.decidedBy).toBe('MERCHANT_CARAVAN');
  });

  it('the player is told none of it', async () => {
    const world = await lived('SPARE');
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_SPARED_GALD']);
  });
});

describe('the same engine, a different input: what each world left in people', () => {
  it('let go, he is left 「誰も見ていない」 — not 「借りを返さねばならない」; treated, the other way round', async () => {
    const spare = await lived('SPARE');
    const help = await lived('HELP');
    expect(seedTypes(spare, 'GALD')).toContain('NOBODY_WATCHING');
    expect(seedTypes(spare, 'GALD')).not.toContain('GALD_REDEMPTION');
    expect(seedTypes(help, 'GALD')).toContain('GALD_REDEMPTION');
    expect(seedTypes(help, 'GALD')).not.toContain('NOBODY_WATCHING');
    // And the merchants carry something only in the world where they were helped.
    expect(seedTypes(spare, 'MERCHANT_CARAVAN')).toEqual(
      expect.arrayContaining(['MERCHANTS_OWE_GALD', 'KNOWS_OF_ELNA']),
    );
    expect(seedTypes(help, 'MERCHANT_CARAVAN')).toEqual([]);
    // リナ and リゼル are untouched by the let-go world.
    expect(seedTypes(spare, 'LINA')).not.toContain('SEEN_DIFFERENTLY');
    expect(seedTypes(spare, 'RIZEL')).not.toContain('SEEN_DIFFERENTLY');
  });

  it('the bakery route\'s first condition, asked of the let-go world, is not met — for a reason about him', async () => {
    const spare = await lived('SPARE', 1);
    const check = bloomCheckAt('GALD_WOULD_STAND_FOR_SOMEONE', spare.getEvents(), spare.getClock())!;
    expect(check.met).toBe(false);
    expect(check.reasons.filter((r) => !r.met).map((r) => r.requirement)).toEqual(['seed GALD_REDEMPTION ≥ GROWING']);
  });

  it('and the let-go world\'s first condition, asked of the treated world, is not met either', async () => {
    const help = await lived('HELP', 3);
    const check = bloomCheckAt('GALD_CHOOSES_WITH_NOBODY_WATCHING', help.getEvents(), help.getClock())!;
    expect(check.met).toBe(false);
    expect(check.reasons.filter((r) => !r.met).map((r) => r.requirement)).toEqual(['seed NOBODY_WATCHING ≥ GROWING']);
  });
});

describe('each step waits for a person, not for the step before', () => {
  const at = (worldDay: number) => ({ worldYear: 1, worldDay });
  const e = (type: MemoryEvent['type'], worldDay: number, actors: string[]): MemoryEvent => ({
    id: `evt_${type.toLowerCase()}`,
    type,
    worldYear: 1,
    worldDay,
    location: 'OUTSIDE_ALDEN',
    actors,
    importance: 'MAJOR',
    createdAt: 'x',
  });
  const spared = e('PLAYER_SPARED_GALD', 1, ['PLAYER', 'GALD']);
  const left = e('GALD_LEAVES_BANDITS', 4, ['GALD']);
  const saved = e('GALD_SAVES_MERCHANTS', 6, ['GALD', 'MERCHANT_CARAVAN']);
  const due = (events: MemoryEvent[], day: number, possible: BloomPossible = bloomPossible) =>
    findDueLifeEvents(LIFE_TICK_DEFS, events, at(day), possible).map((d) => d.def.type);

  it('with what being let go left in him, he helps; without it, he does not', () => {
    expect(due([spared, left], 6)).toContain('GALD_SAVES_MERCHANTS');
    const notInHim: BloomPossible = (id, ev, clock) => id !== 'GALD_CHOOSES_WITH_NOBODY_WATCHING' && bloomPossible(id, ev, clock);
    expect(due([spared, left], 6, notInHim)).not.toContain('GALD_SAVES_MERCHANTS');
  });

  it('merchants who were not the ones helped have nothing to ask him', () => {
    expect(due([spared, left, saved], 6)).toContain('MERCHANTS_LEARN_OF_ELNA');
    const someoneElse = { ...saved, actors: ['GALD', 'SOMEONE'] };
    expect(due([spared, left, someoneElse], 6)).not.toContain('MERCHANTS_LEARN_OF_ELNA');
  });
});

describe('three years on: outside the village, not at the bakery', () => {
  it('the look ahead puts him outside the village, his trade undecided; the treated world, at the bakery', async () => {
    const spare = await openWorld();
    await spare.recordGaldLifeChoice('SPARE');
    const help = await openWorld();
    await help.recordGaldLifeChoice('HELP');
    const spareGald = spare.previewCharacterStates(GALD_FUTURE_VISION_YEARS).GALD;
    const helpGald = help.previewCharacterStates(GALD_FUTURE_VISION_YEARS).GALD;
    expect(spareGald).toMatchObject({ location: 'OUTSIDE_ALDEN', occupation: 'NONE', alive: true });
    expect(helpGald).toMatchObject({ location: 'ALDEN_VILLAGE', occupation: 'BAKERY_HAND' });
    // What it shows is what the nights do.
    expect(spare.previewLifeEvents(GALD_FUTURE_VISION_YEARS).map((ev) => ev.type)).toEqual(SPARE_CHAIN);
  });

  it('lived through, he is where the look ahead said', async () => {
    const world = await lived('SPARE', 365 * 3);
    expect(world.getCharacter('GALD')).toMatchObject({ location: 'OUTSIDE_ALDEN', occupation: 'NONE' });
    expect(world.isBakeryOpen()).toBe(false);
    expect(types(world)).not.toContain('GALD_TAKES_BAKERY_WORK');
    expect(types(world)).not.toContain('GALD_BECOMES_BAKER');
  });
});

describe('saves', () => {
  it('a world closed halfway and reopened goes on exactly as one played straight through', async () => {
    const dbName = freshDbName();
    const first = await openWorld(dbName);
    await first.recordGaldLifeChoice('SPARE');
    await first.advanceDays(4);
    const reopened = await openWorld(dbName);
    await reopened.advanceDays(6);
    const straight = await lived('SPARE');
    const strip = (w: World) => w.getEvents().map(({ type, worldDay, causedBy }) => [type, worldDay, causedBy]);
    expect(strip(reopened)).toEqual(strip(straight));
  });

  it('a save that already lived the retired chain gets none of the new steps laid over it', async () => {
    const old = await openSaveThatLivedTheRetiredSpareChain(freshDbName());
    await old.advanceDays(30);
    for (const t of SPARE_NPC_EVENTS) expect(types(old), t).not.toContain(t);
  });
});
