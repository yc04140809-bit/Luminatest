import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { MemoryEvent, MemoryEventType, OffScreenLifeEventType } from '../memory/types';
import { findDueLifeEvents } from '../events/eventEngine';
import { readWorldLife } from '../life/worldReading';
import { readPlayerKnowledge } from './playerKnowledge';
import {
  GALD_BAKERY_ROUTE_DEFS,
  LIFE_TICK_DEFS,
  OFF_SCREEN_EVENT_INFO,
  OFF_SCREEN_FACTS,
  OFF_SCREEN_LIFE_DEFS,
} from '../../content/events/offScreenLife';
import { LIFE_EVENT_DEFS } from '../../content/events/lifeEvents';
import { GALD_SPARE_ROUTE_DEFS } from '../../content/events/spareRouteLife';
import {
  SPARE_ROUTE_ACTIONS,
  SPARE_ROUTE_BLOOMS,
  SPARE_ROUTE_CORES,
  SPARE_ROUTE_SEED_KINDS,
} from '../../content/world/spareRouteLife';
import { BAKERY_ROUTE_ACTIONS, BAKERY_ROUTE_CORES, BAKERY_ROUTE_SEED_KINDS } from '../../content/world/bakeryRouteLife';
import { DAILY_SCENES, dailySceneMark } from '../../content/story/dailyScenes';
import { VILLAGE_RUMORS, rumorsFor } from '../../content/story/villageRumors';
import { GALD_LIFE_CHAPTERS } from '../../content/archive/galdChapters';
import { ALL_NPCS } from '../../content/people/allPeople';
import { GALD_FUTURE_VISION_ID } from '../../content/events/galdLifeChoice';
import { SAVE_VERSION } from './saveSchema';

/**
 * OFF-SCREEN LIFE, THE BAKERY ROUTE (PoC, 作者 2026-10-17;
 * docs/OFF_SCREEN_LIFE_SYSTEM.md, docs/GALD_FIVE_ROUTES.md ROUTE A).
 *
 * What the author asked this to prove, each pinned below:
 *   1. a LIFE TICK that moves only with story time (the night)
 *   2. people doing things with one another where the player is not —
 *      GALD → saves LINA → RIZEL sees him differently → ELNA's story is
 *      learned → it reaches people who were never there
 *   3. WORLD TRUTH and PLAYER KNOWLEDGE held apart: it happened, and the
 *      player knows only what somebody told them — afterwards
 * and what it must not do: involve バルド, add a free TIME SHIFT, or move
 * the save's version. (TIGS2027 STEP ① made the look ahead read this same
 * chain, and made each step wait for what the last left in somebody —
 * core/world/bakeryChain.test.ts.)
 */

let dbCounter = 0;
const freshDbName = () => `off-screen-${++dbCounter}`;
const openWorld = (dbName = freshDbName()) => World.open(new IdbMemoryStore(dbName));

const ROUTE: OffScreenLifeEventType[] = [
  'GALD_SAVES_LINA',
  'RIZEL_TENDS_GALD',
  'GALD_TELLS_OF_ELNA',
  'RIZEL_OFFERS_TO_SEE_ELNA',
  'VILLAGE_HEARS_OF_GALD',
  'RIZEL_SPEAKS_FOR_GALD',
  'BAKER_OFFERS_WORK',
  'GALD_TAKES_BAKERY_WORK',
  'LINA_WRITES_TO_ELNA',
];
const routeEvents = (world: World) => world.getEvents().filter((e) => (ROUTE as string[]).includes(e.type));
const day = (e: { worldYear: number; worldDay: number }) => (e.worldYear - 1) * 365 + e.worldDay;

async function helped(dbName?: string): Promise<World> {
  const world = await openWorld(dbName);
  await world.recordGaldLifeChoice('HELP');
  return world;
}

describe('1. the LIFE TICK: only when story time passes', () => {
  it('nothing happens without a night, however often the world is looked at', async () => {
    const world = await helped();
    for (let i = 0; i < 5; i++) {
      world.getKnownEvents();
      world.getLifeArchive();
      world.getDailyScene('BAKERY_LINA');
    }
    expect(routeEvents(world)).toEqual([]);
    expect(world.getEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD']);
  });

  it('a night at a time, the chain moves on — and the player is asleep for all of it', async () => {
    const world = await helped();
    const byNight: string[][] = [];
    for (let n = 0; n < 6; n++) byNight.push((await world.advanceDay()).map((e) => e.type));
    expect(byNight).toEqual([
      ['GALD_SAVES_LINA', 'RIZEL_TENDS_GALD'],
      ['GALD_TELLS_OF_ELNA', 'RIZEL_OFFERS_TO_SEE_ELNA'],
      ['VILLAGE_HEARS_OF_GALD', 'RIZEL_SPEAKS_FOR_GALD', 'BAKER_OFFERS_WORK'],
      ['GALD_TAKES_BAKERY_WORK'],
      ['LINA_WRITES_TO_ELNA'],
      [],
    ]);
    // Each caused by the one before it, back to the player's answer.
    const events = routeEvents(world);
    expect(events.map((e) => e.type)).toEqual(ROUTE);
    events.forEach((e, i) => expect(e.causedBy, e.type).toEqual([i === 0 ? 'PLAYER_HELPED_GALD' : ROUTE[i - 1]]));
  });

  it('several nights at once, or a shift, write the same history on the same days', async () => {
    const nightly = await helped();
    for (let n = 0; n < 6; n++) await nightly.advanceDay();
    const atOnce = await helped();
    await atOnce.advanceDays(6);
    const shifted = await helped();
    await shifted.timeShift(1);
    const dated = (w: World) => routeEvents(w).map((e) => [e.type, day(e)]);
    expect(dated(atOnce)).toEqual(dated(nightly));
    expect(dated(shifted)).toEqual(dated(nightly));
  });

  it('Gald\'s current state follows it: carried into the village, then the bakery\'s hand', async () => {
    const world = await helped();
    await world.advanceDay();
    expect(world.getCharacter('GALD')).toMatchObject({ location: 'ALDEN_VILLAGE', occupation: 'BANDIT' });
    await world.advanceDays(2);
    // Offered, not yet taken: the work is his decision, the night after.
    expect(world.getCharacter('GALD')).toMatchObject({ location: 'ALDEN_VILLAGE', occupation: 'BANDIT' });
    await world.advanceDay();
    expect(world.getCharacter('GALD')).toMatchObject({ location: 'ALDEN_VILLAGE', occupation: 'BAKERY_HAND' });
  });
});

describe('2. people, among themselves, where the player is not', () => {
  it('the player is an actor on none of it; each is somebody\'s own doing, between people', () => {
    for (const def of OFF_SCREEN_LIFE_DEFS) {
      expect(def.actors).not.toContain('PLAYER');
      expect(def.actors.length, def.type).toBeGreaterThanOrEqual(2);
      const info = OFF_SCREEN_EVENT_INFO[def.type as OffScreenLifeEventType];
      expect(info.playerObserved).toBe(false);
      expect(info.newSeeds.length).toBeGreaterThan(0);
    }
    // His work at the bakery is HIS decision; the letter is リナ's.
    expect(OFF_SCREEN_EVENT_INFO.GALD_TAKES_BAKERY_WORK.decidedBy).toBe('GALD');
    expect(OFF_SCREEN_EVENT_INFO.LINA_WRITES_TO_ELNA.decidedBy).toBe('LINA');
  });

  it('it reaches people who were never in the forest: the baker, エルナ, the guard', async () => {
    const world = await helped();
    await world.advanceDays(6);
    const touched = new Set(routeEvents(world).flatMap((e) => e.actors));
    for (const id of ['GALD', 'LINA', 'RIZEL', 'BAKERY_OWNER', 'ELNA', 'ALDEN_GUARD']) expect(touched).toContain(id);
    // Everyone it names is somebody the world has written down.
    const registry = new Set(ALL_NPCS.map((p) => p.npcId));
    for (const id of touched) expect(registry.has(id), id).toBe(true);
  });

  it('the life engine reads it: what each of them was left with, and nothing stored', async () => {
    const world = await helped();
    await world.advanceDays(6);
    const life = readWorldLife(world.getEvents(), world.getClock());
    const has = (npc: string, type: string) => life.seeds.some((s) => s.targetNpcId === npc && s.type === type);
    expect(has('LINA', 'SEEN_DIFFERENTLY')).toBe(true);
    expect(has('RIZEL', 'SEEN_DIFFERENTLY')).toBe(true);
    expect(has('RIZEL', 'UNDERSTANDING_BEFORE_JUDGMENT')).toBe(true);
    expect(has('BAKERY_OWNER', 'UNDERSTANDING_BEFORE_JUDGMENT')).toBe(true);
    expect(has('GALD', 'GALD_ROOTS_IN_ALDEN')).toBe(true);
    expect(has('ELNA', 'A_FRIEND_BY_LETTER')).toBe(true);
    expect(has('ALDEN_GUARD', 'ANOTHER_SIDE_HEARD')).toBe(true);
    // The guard's old wariness is still there: one talk does not clear it.
    expect(has('ALDEN_GUARD', 'GUARD_WARINESS')).toBe(true);
    // A world where none of it happened has none of it.
    const spared = await openWorld();
    await spared.recordGaldLifeChoice('SPARE');
    await spared.advanceDays(6);
    const quiet = readWorldLife(spared.getEvents(), spared.getClock());
    expect(quiet.seeds.some((s) => s.type === 'SEEN_DIFFERENTLY' || s.type === 'A_FRIEND_BY_LETTER')).toBe(false);
  });

  it.each(['SPARE', 'KILL', 'CAPTURE'] as const)('%s: none of it happens', async (choice) => {
    const world = await openWorld();
    await world.recordGaldLifeChoice(choice);
    await world.advanceDays(30);
    expect(routeEvents(world)).toEqual([]);
  });
});

describe('the road gives way; the look ahead shows the same route', () => {
  it('once he has saved her he does not also walk out onto the road', async () => {
    const world = await helped();
    await world.advanceDays(200);
    expect(world.hasEventOfType('GALD_WALKS_THE_ROAD')).toBe(false);
    expect(world.hasEventOfType('GALD_BECOMES_HEALER')).toBe(false);
    expect(world.getOpenFutureSites()).toEqual([]);
  });

  it('TIME SHIFT shows the bakery route the nights will live, and writes nothing (STEP ①)', async () => {
    const world = await helped();
    const before = world.previewLifeEvents(3);
    expect(before.map((e) => e.type)).toEqual(ROUTE);
    expect(before.map((e) => e.type)).not.toContain('GALD_WALKS_THE_ROAD');
    // A look ahead writes nothing.
    expect(routeEvents(world)).toEqual([]);
    // And the nights then live exactly that, on the same days.
    await world.advanceDays(6);
    expect(routeEvents(world).map((e) => [e.type, day(e)])).toEqual(before.map((e) => [e.type, day(e)]));
    // With all of it behind the world, there is nothing left to show of it.
    expect(world.previewLifeEvents(3)).toEqual([]);
  });

  it('a world that had already taken the road (a save from before the route) keeps it', () => {
    const helpedEvent: MemoryEvent = {
      id: 'evt_gald_life_choice',
      type: 'PLAYER_HELPED_GALD',
      worldYear: 1,
      worldDay: 1,
      location: 'GREENWOOD_FOREST',
      actors: ['PLAYER', 'GALD'],
      importance: 'MAJOR',
      createdAt: 'x',
    };
    const road: MemoryEvent = { ...helpedEvent, id: 'evt_gald_walks_the_road', type: 'GALD_WALKS_THE_ROAD', worldDay: 4, actors: ['GALD'] };
    const due = findDueLifeEvents(LIFE_TICK_DEFS, [helpedEvent, road], { worldYear: 1, worldDay: 10 });
    expect(due.map((d) => d.def.type)).not.toContain('GALD_SAVES_LINA');
  });

  it('the four answers\' own chains are unchanged, the road aside', () => {
    // Eight since ROUTE D (2026-10-20) retired SPARE's way to Alden and a bakery of his own.
    expect(LIFE_EVENT_DEFS).toHaveLength(8);
    expect(LIFE_EVENT_DEFS.map((d) => d.type)).not.toContain('GALD_ARRIVES_IN_ALDEN');
    expect(LIFE_EVENT_DEFS.map((d) => d.type)).not.toContain('GALD_BECOMES_BAKER');
    expect(LIFE_EVENT_DEFS.filter((d) => d.unless).map((d) => [d.type, d.unless])).toEqual([
      ['GALD_WALKS_THE_ROAD', ['GALD_SAVES_LINA']],
    ]);
    expect(LIFE_TICK_DEFS).toEqual([...LIFE_EVENT_DEFS, ...GALD_BAKERY_ROUTE_DEFS, ...GALD_SPARE_ROUTE_DEFS]);
  });
});

describe('3. WORLD TRUTH and PLAYER KNOWLEDGE, apart', () => {
  it('it happened, and the player knows nothing of it until told', async () => {
    const world = await helped();
    await world.advanceDays(6);
    expect(routeEvents(world)).toHaveLength(ROUTE.length);
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD']);
    expect(world.getPlayerKnowledge()).toEqual({});
    expect(world.getLifeArchive()[0].chapters.map((c) => c.id)).toEqual(['GALD_CH_FIRST_ENCOUNTER']);
  });

  it('nothing can be learned before it is true', async () => {
    const world = await helped();
    expect(await world.learnFacts(['GALD_SAVED_LINA'], 'talk:X')).toEqual([]);
    expect(world.knows('GALD_SAVED_LINA')).toBe(false);
    await world.advanceDay();
    expect(await world.learnFacts(['GALD_SAVED_LINA', 'GALD_WORKS_AT_BAKERY'], 'talk:X')).toEqual(['GALD_SAVED_LINA']);
    expect(world.knows('GALD_WORKS_AT_BAKERY')).toBe(false);
  });

  it('told part of it, the player knows the part — and WORLD MEMORY lists only what was told whole', async () => {
    const world = await helped();
    await world.advanceDays(6);
    await world.learnFacts(['NEW_HAND_AT_BAKERY'], 'rumor:BAKERY_NEW_HAND');
    expect(world.knows('NEW_HAND_AT_BAKERY')).toBe(true);
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD']);
    await world.learnFacts(['GALD_WORKS_AT_BAKERY'], 'talk:DAILY_OWNER_ON_THE_NEW_HAND');
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD', 'GALD_TAKES_BAKERY_WORK']);
    // The life record follows the same knowledge, and only that.
    expect(world.getLifeArchive()[0].chapters.map((c) => c.id)).toEqual(['GALD_CH_FIRST_ENCOUNTER', 'GALD_CH_BAKERY_HAND']);
    // Dated the day it happened, not the day it was heard.
    const told = world.getKnownEvents().find((e) => e.type === 'GALD_TAKES_BAKERY_WORK')!;
    expect(day(told)).toBe(5);
    expect(world.getPlayerKnowledge().GALD_WORKS_AT_BAKERY).toEqual({ day: 7, via: 'talk:DAILY_OWNER_ON_THE_NEW_HAND' });
  });

  it('kept across a restart; a damaged row is repaired, never trusted', async () => {
    const dbName = freshDbName();
    const world = await helped(dbName);
    await world.advanceDays(6);
    await world.learnFacts(['GALD_SAVED_LINA'], 'talk:X');
    const reopened = await openWorld(dbName);
    expect(reopened.knows('GALD_SAVED_LINA')).toBe(true);
    expect(reopened.getKnownEvents().map((e) => e.type)).toContain('GALD_SAVES_LINA');
    expect(readPlayerKnowledge(undefined)).toEqual({ value: {}, health: 'ok' });
    expect(readPlayerKnowledge([1, 2]).health).toBe('repaired');
    expect(
      readPlayerKnowledge({ GOOD: { day: 3, via: 'talk:X' }, bad: { day: 1, via: 'talk:X' }, ALSO_BAD: { day: -1, via: 'x' } }),
    ).toEqual({ value: { GOOD: { day: 3, via: 'talk:X' } }, health: 'repaired' });
    expect(SAVE_VERSION).toBe(3);
  });

  it('a world reset forgets what the player was told', async () => {
    const world = await helped();
    await world.advanceDays(6);
    await world.learnFacts(['GALD_SAVED_LINA'], 'talk:X');
    await world.resetWorld();
    expect(world.getPlayerKnowledge()).toEqual({});
  });

  it('every fact is about a route event, and every listed one has its WORLD MEMORY line and life chapter', () => {
    for (const fact of OFF_SCREEN_FACTS) {
      expect(ROUTE as MemoryEventType[]).toContain(fact.truth);
      if (fact.listsEvent) expect(GALD_LIFE_CHAPTERS[fact.truth], fact.id).toBeDefined();
    }
    // Every route event can be told whole by something — except STEP ①'s three,
    // which nothing tells yet: their scenes and words are the author's to
    // write (要判断), so the player never hears of them and WORLD MEMORY never
    // lists them. They are world truth all the same.
    const UNTOLD = ['RIZEL_OFFERS_TO_SEE_ELNA', 'VILLAGE_HEARS_OF_GALD', 'BAKER_OFFERS_WORK'];
    for (const type of ROUTE) {
      expect(OFF_SCREEN_FACTS.some((f) => f.truth === type && f.listsEvent), type).toBe(!UNTOLD.includes(type));
      expect(GALD_LIFE_CHAPTERS[type] !== undefined, type).toBe(!UNTOLD.includes(type));
    }
  });
});

describe('how the player hears of it, afterwards', () => {
  async function settledHelpWorld(nights: number) {
    const world = await helped();
    // Past the look ahead and セキリュウガ's part: the everyday has begun.
    await world.markExperienceSeen(GALD_FUTURE_VISION_ID);
    expect(await world.advanceSekiryugaArc('SETTLED')).toBe(true);
    // The common scenes at these places come first; read them out of the way.
    await world.markRead(
      ['LINA_BURNT_BREAD', 'RIZEL_WOODEN_SWORD', 'RIZEL_ON_GALD_HELP', 'KAOS_DETOUR', 'FUUMIMI_AFTER_HELP', 'BALDO_FIRST_MEETING'].map(
        (id) => dailySceneMark(id as never),
      ),
    );
    await world.advanceDays(nights);
    return world;
  }

  it('リナ tells them she was saved — only once it happened, and only on this route', async () => {
    const before = await settledHelpWorld(0);
    expect(before.getDailyScene('BAKERY_LINA')).toBeNull();
    const world = await settledHelpWorld(1);
    const scene = world.getDailyScene('BAKERY_LINA')!;
    expect(scene.id).toBe('LINA_AFTER_THE_FOREST_EDGE');
    await world.finishDailyScene(scene.id);
    expect(world.knows('GALD_SAVED_LINA')).toBe(true);
    expect(world.getPlayerKnowledge().GALD_SAVED_LINA.via).toBe('talk:DAILY_LINA_AFTER_THE_FOREST_EDGE');
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD', 'GALD_SAVES_LINA']);
  });

  it('the baker tells them why he stole and that he chose the work; リゼル what she saw', async () => {
    const world = await settledHelpWorld(6);
    expect(world.getDailyScene('BAKERY_OWNER')?.id).toBe('OWNER_ON_THE_NEW_HAND');
    expect(world.getDailyScene('VILLAGE')?.id).toBe('RIZEL_SAW_THE_FOREST_EDGE');
    await world.finishDailyScene('OWNER_ON_THE_NEW_HAND');
    expect(world.knows('GALD_STOLE_FOR_ELNA') && world.knows('GALD_WORKS_AT_BAKERY')).toBe(true);
    expect(world.getKnownEvents().map((e) => e.type)).toEqual([
      'PLAYER_HELPED_GALD',
      'GALD_TELLS_OF_ELNA',
      'GALD_TAKES_BAKERY_WORK',
    ]);
    // One a day: リゼル's waits for tomorrow.
    expect(world.getDailyScene('VILLAGE')).toBeNull();
  });

  it('the village talks: a new face at the bakery (not who), and リゼル standing up to the guard', async () => {
    const world = await helped();
    const ids = () => rumorsFor({ arcOpen: true, stage: 'SETTLED', isTrue: (t) => world.hasEventOfType(t) }).map((r) => r.id);
    expect(ids()).not.toContain('BAKERY_NEW_HAND');
    await world.advanceDays(6);
    expect(ids()).toEqual(expect.arrayContaining(['BAKERY_NEW_HAND', 'RIZEL_AND_THE_GUARD']));
    expect(VILLAGE_RUMORS.find((r) => r.id === 'BAKERY_NEW_HAND')!.reveals).toEqual(['NEW_HAND_AT_BAKERY']);
  });

  it('the bakery route\'s scenes keep リナ\'s rule: separate scenes, only on this route, none deciding her future', () => {
    const route = DAILY_SCENES.filter((s) => s.truth);
    expect(route.map((s) => s.id)).toEqual([
      'LINA_AFTER_THE_FOREST_EDGE',
      'RIZEL_SAW_THE_FOREST_EDGE',
      'OWNER_ON_THE_NEW_HAND',
      'LINA_LETTER_TO_ELNA',
    ]);
    for (const s of route) expect(s.gald).toBe('HELP');
    // リナ's ordinary scene still says nothing of him.
    const ordinary = DAILY_SCENES.filter((s) => s.place === 'BAKERY_LINA' && !s.truth);
    expect(ordinary.flatMap((s) => s.lines.map((l) => l.text)).join('\n')).not.toMatch(/盗賊|包帯|エルナ/);
    const all = route.flatMap((s) => s.lines.map((l) => l.text)).join('\n');
    expect(all).not.toMatch(/将来|結婚|大人になったら/);
  });
});

describe('バルド is not part of it (作者 2026-10-16/17)', () => {
  it('in no event, seed, person, scene, rumour or chapter of the route', () => {
    // The bakery route's own (the let-go world's anonymous merchants are a
    // different route, and are checked below for バルド on their own).
    const text = JSON.stringify({
      defs: GALD_BAKERY_ROUTE_DEFS,
      info: ROUTE.map((t) => OFF_SCREEN_EVENT_INFO[t]),
      facts: OFF_SCREEN_FACTS,
      actions: BAKERY_ROUTE_ACTIONS,
      kinds: BAKERY_ROUTE_SEED_KINDS,
      cores: BAKERY_ROUTE_CORES,
      scenes: DAILY_SCENES.filter((s) => s.truth),
      rumors: VILLAGE_RUMORS.filter((r) => r.truth),
      chapters: ROUTE.map((t) => GALD_LIFE_CHAPTERS[t]),
    });
    expect(text).not.toMatch(/BALDO|バルド|商会|MERCHANT/);
  });

  it('nor in the let-go world: its merchants are anonymous (作者 2026-10-20)', () => {
    const text = JSON.stringify({
      defs: GALD_SPARE_ROUTE_DEFS,
      info: GALD_SPARE_ROUTE_DEFS.map((d) => OFF_SCREEN_EVENT_INFO[d.type as OffScreenLifeEventType]),
      actions: SPARE_ROUTE_ACTIONS,
      kinds: SPARE_ROUTE_SEED_KINDS,
      cores: SPARE_ROUTE_CORES,
      blooms: SPARE_ROUTE_BLOOMS,
    });
    expect(text).not.toMatch(/BALDO|バルド/);
  });

  it('and a whole run of the route leaves no mark on him', async () => {
    const world = await helped();
    await world.advanceDays(6);
    expect(world.getEvents().some((e) => e.actors.includes('BALDO'))).toBe(false);
    const life = readWorldLife(world.getEvents(), world.getClock());
    expect(life.seeds.some((s) => s.targetNpcId === 'BALDO')).toBe(false);
  });
});
