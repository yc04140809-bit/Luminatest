import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { LifeChoiceId } from '../flow/types';
import type { MemoryEventType } from '../memory/types';
import { FUTURE_SITE_DEFS } from '../../content/world/futureSites';
import { EVENT_CG, GALD_PORTRAITS } from '../../assets/manifest';

// GALD FOUR FUTURES: every one of the four choices leaves something in the
// world three years later, and no route can ever see another route's.

let dbCounter = 0;
const freshDbName = () => `four-futures-${++dbCounter}`;
const openWorld = (dbName = freshDbName()) => World.open(new IdbMemoryStore(dbName));

interface RouteSpec {
  choice: LifeChoiceId;
  root: MemoryEventType;
  /** The route's own chain, in causal order. */
  chain: MemoryEventType[];
  siteId: string;
  discovery: MemoryEventType;
  /** Gald's occupation once the chain has run (unchanged for the dead). */
  occupation: string;
  alive: boolean;
}

const ROUTES: RouteSpec[] = [
  {
    choice: 'SPARE',
    root: 'PLAYER_SPARED_GALD',
    chain: ['GALD_LEAVES_BANDITS', 'GALD_ARRIVES_IN_ALDEN', 'GALD_BECOMES_BAKER'],
    siteId: 'ALDEN_BAKERY',
    discovery: 'PLAYER_REUNITED_WITH_GALD',
    occupation: 'BAKER',
    alive: true,
  },
  {
    choice: 'HELP',
    root: 'PLAYER_HELPED_GALD',
    chain: ['GALD_WALKS_THE_ROAD', 'GALD_BECOMES_HEALER'],
    siteId: 'GREENWOOD_WAYSTATION',
    discovery: 'PLAYER_MET_GALD_ON_THE_ROAD',
    occupation: 'ROADSIDE_HEALER',
    alive: true,
  },
  {
    choice: 'CAPTURE',
    root: 'PLAYER_CAPTURED_GALD',
    chain: ['GALD_STANDS_TRIAL', 'GALD_COMPLETES_SENTENCE', 'GALD_WORKS_FOR_ALDEN'],
    siteId: 'ALDEN_WORKYARD',
    discovery: 'PLAYER_MET_GALD_IN_ALDEN',
    occupation: 'WORKER',
    alive: true,
  },
  {
    choice: 'KILL',
    root: 'PLAYER_KILLED_GALD',
    chain: ['GALD_IS_BURIED', 'GALD_GRAVE_TENDED'],
    siteId: 'GREENWOOD_GRAVE',
    discovery: 'PLAYER_FOUND_GALD_GRAVE',
    // He died a bandit. Nothing after his death is his state.
    occupation: 'BANDIT',
    alive: false,
  },
];

const ALL_CHAIN_TYPES = ROUTES.flatMap((r) => r.chain);

async function threeYearsAfter(choice: LifeChoiceId, dbName = freshDbName()): Promise<World> {
  const world = await openWorld(dbName);
  await world.recordGaldLifeChoice(choice);
  await world.timeShift(3);
  return world;
}

describe('four futures — each choice leaves its own three years behind', () => {
  it.each(ROUTES)('$choice: the whole chain fires, dated and caused correctly', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const byType = Object.fromEntries(world.getEvents().map((e) => [e.type, e]));

    for (const type of route.chain) {
      expect(byType[type], `${type} should have fired`).toBeDefined();
    }
    // Every link names the fact that caused it, back to the player's choice.
    const causes = [route.root, ...route.chain.slice(0, -1)];
    route.chain.forEach((type, i) => {
      expect(byType[type].causedBy).toEqual([causes[i]]);
    });
    // Dated when they became true, not when the shift was taken.
    for (const type of route.chain) {
      expect(byType[type].worldYear * 365 + byType[type].worldDay).toBeLessThanOrEqual(
        world.getClock().worldYear * 365 + world.getClock().worldDay,
      );
    }
  });

  it.each(ROUTES)('$choice: no other route leaks in', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const foreign = ALL_CHAIN_TYPES.filter((t) => !route.chain.includes(t));
    for (const type of foreign) {
      expect(world.hasEventOfType(type), `${type} must not exist on ${route.choice}`).toBe(false);
    }
    // Only this route's site is on the map.
    expect(world.getOpenFutureSites().map((s) => s.def.id)).toEqual([route.siteId]);
  });

  it.each(ROUTES)('$choice: CHARACTER STATE ends where the route says', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const gald = world.getCharacter('GALD')!;
    expect(gald.alive).toBe(route.alive);
    expect(gald.occupation).toBe(route.occupation);
    // The dead do not age; the living walk their three years.
    expect(gald.age).toBe(route.alive ? 30 : 27);
  });

  it('KILL never brings him back: no event or state makes him alive again', async () => {
    const world = await threeYearsAfter('KILL');
    expect(world.getCharacter('GALD')!.alive).toBe(false);
    await world.timeShift(50);
    expect(world.getCharacter('GALD')!.alive).toBe(false);
    expect(world.hasEventOfType('PLAYER_KILLED_GALD')).toBe(true);
    // And his death is still the first thing the record says.
    expect(world.getLifeArchive()[0].chapters[0].title).toBe('森で終わった命');
  });
});

describe('four futures — discovery belongs to the player', () => {
  it.each(ROUTES)('$choice: the site is 「？？？」 until the player goes', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const [site] = world.getOpenFutureSites();
    expect(site.discovered).toBe(false);
    expect(site.def.unknownName).toBe('？？？');
    // Nothing about the future has reached the player yet.
    expect(world.hasDiscoveredGaldFuture()).toBe(false);
    expect(world.getKnownEvents().some((e) => route.chain.includes(e.type))).toBe(false);
    expect(world.getLifeArchive()[0].chapters).toHaveLength(1);
    expect(world.getLifeArchive()[0].hasUnknownContinuation).toBe(true);
  });

  it.each(ROUTES)('$choice: visiting writes the discovery and opens the record', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const event = await world.recordFutureSiteDiscovery(route.siteId);

    expect(event.type).toBe(route.discovery);
    expect(event.location).toBe(route.siteId);
    expect(event.causedBy).toEqual([route.chain[route.chain.length - 1]]);
    expect(world.hasDiscoveredGaldFuture()).toBe(true);
    expect(world.hasDiscoveredSite(route.siteId)).toBe(true);

    const [entry] = world.getLifeArchive();
    expect(entry.hasUnknownContinuation).toBe(false);
    expect(entry.displayName).toBe('ガルド');
    // First encounter + the whole chain + the discovery itself.
    expect(entry.chapters).toHaveLength(route.chain.length + 2);
    expect(entry.chapters[entry.chapters.length - 1].id).toBe('GALD_CH_REUNION');
  });

  it.each(ROUTES)('$choice: a second visit records nothing new', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const first = await world.recordFutureSiteDiscovery(route.siteId);
    const second = await world.recordFutureSiteDiscovery(route.siteId);
    expect(second.id).toBe(first.id);
    expect(world.getEvents().filter((e) => e.type === route.discovery)).toHaveLength(1);
  });

  it.each(ROUTES)('$choice: no other route\'s discovery can be forced', async (route) => {
    const world = await threeYearsAfter(route.choice);
    for (const other of FUTURE_SITE_DEFS.filter((d) => d.id !== route.siteId)) {
      await expect(world.recordFutureSiteDiscovery(other.id)).rejects.toThrow(
        /requires .* in world truth/,
      );
    }
  });

  it('a site cannot be discovered before its world event has happened', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await expect(world.recordFutureSiteDiscovery('ALDEN_BAKERY')).rejects.toThrow();
    expect(world.getOpenFutureSites()).toEqual([]);
  });
});

describe('four futures — nothing fires twice', () => {
  it.each(ROUTES)('$choice: repeated TIME SHIFTs never re-register events', async (route) => {
    const world = await threeYearsAfter(route.choice);
    const before = world.getEvents().length;
    await world.timeShift(3);
    await world.timeShift(3);
    for (const type of route.chain) {
      expect(world.getEvents().filter((e) => e.type === type)).toHaveLength(1);
    }
    // Only the two new WORLD_TIME_SHIFTED rows were added.
    expect(world.getEvents().length).toBe(before + 2);
  });

  it.each(ROUTES)('$choice: a reopened world re-fires nothing', async (route) => {
    const dbName = freshDbName();
    await threeYearsAfter(route.choice, dbName);
    const reopened = await openWorld(dbName);
    const counts = route.chain.map(
      (type) => reopened.getEvents().filter((e) => e.type === type).length,
    );
    expect(counts).toEqual(route.chain.map(() => 1));
    await reopened.advanceDays(5);
    const after = route.chain.map(
      (type) => reopened.getEvents().filter((e) => e.type === type).length,
    );
    expect(after).toEqual(route.chain.map(() => 1));
  });

  it.each(ROUTES)('$choice: the discovery survives a reopen', async (route) => {
    const dbName = freshDbName();
    const world = await threeYearsAfter(route.choice, dbName);
    await world.recordFutureSiteDiscovery(route.siteId);

    const reopened = await openWorld(dbName);
    expect(reopened.hasDiscoveredSite(route.siteId)).toBe(true);
    expect(reopened.getLifeArchive()[0].chapters).toHaveLength(route.chain.length + 2);
    expect(reopened.getLifeArchive()[0].hasUnknownContinuation).toBe(false);
  });
});

describe('four futures — every route has its own event CG', () => {
  it('gives each site one picture, and no two sites the same one', () => {
    const cgs = FUTURE_SITE_DEFS.map((d) => d.eventCg);
    expect(cgs.every((cg) => typeof cg === 'string' && cg.length > 0)).toBe(true);
    expect(new Set(cgs).size).toBe(cgs.length);
  });

  it('describes each picture for a screen reader', () => {
    for (const def of FUTURE_SITE_DEFS) {
      expect(def.eventCgAlt.length).toBeGreaterThan(0);
      // The alt text is a description, never a spoiler of the route id.
      expect(def.eventCgAlt).not.toContain('ガルド');
    }
  });

  it('the KILL picture is a place, not a living man', () => {
    const grave = FUTURE_SITE_DEFS.find((d) => d.id === 'GREENWOOD_GRAVE')!;
    expect(grave.eventCg).toBe(EVENT_CG.GALD_GRAVE);
    // Not one of the portraits of a man who is alive.
    expect(Object.values(GALD_PORTRAITS)).not.toContain(grave.eventCg);
    // And it waits for the line that walks the player up to the stones.
    expect(grave.eventCgFromLine).toBeGreaterThan(0);
    expect(grave.firstVisitLines.length).toBeGreaterThan(grave.eventCgFromLine!);
  });

  it('the surviving routes each show their own point in one life', () => {
    const byId = Object.fromEntries(FUTURE_SITE_DEFS.map((d) => [d.id, d]));
    expect(byId.ALDEN_BAKERY.eventCg).toBe(GALD_PORTRAITS.baker);
    expect(byId.GREENWOOD_WAYSTATION.eventCg).toBe(GALD_PORTRAITS.healer);
    expect(byId.ALDEN_WORKYARD.eventCg).toBe(GALD_PORTRAITS.worker);
  });

  it('leaves the SPARE route exactly as Phase E drew it', () => {
    const bakery = FUTURE_SITE_DEFS.find((d) => d.id === 'ALDEN_BAKERY')!;
    expect(bakery.eventCg).toBe(GALD_PORTRAITS.baker);
    expect(bakery.eventCgFit).toBe('figure');
    expect(bakery.eventCgFromLine).toBeUndefined();
  });

  it('art is presentation only: no site def can gate an event on it', () => {
    // The world never reads eventCg — the discovery depends on
    // requiredMemory alone.
    for (const def of FUTURE_SITE_DEFS) {
      expect(def.requiredMemory).toBeTruthy();
      expect(def.discovery.eventId).toBeTruthy();
    }
  });
});

describe('four futures — the site registry itself', () => {
  it('gives every route exactly one site, with unique ids and events', () => {
    expect(FUTURE_SITE_DEFS).toHaveLength(ROUTES.length);
    const ids = FUTURE_SITE_DEFS.map((d) => d.id);
    const eventIds = FUTURE_SITE_DEFS.map((d) => d.discovery.eventId);
    const types = FUTURE_SITE_DEFS.map((d) => d.discovery.type);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(eventIds).size).toBe(eventIds.length);
    expect(new Set(types).size).toBe(types.length);
  });

  it('never names anything before the player has been', () => {
    for (const def of FUTURE_SITE_DEFS) {
      expect(def.unknownName).toBe('？？？');
      const teaser = def.unknownDescription;
      expect(teaser).not.toContain('ガルド');
      expect(teaser).not.toContain('盗賊');
      // The teaser says something is there, never what it means.
      expect(teaser.length).toBeGreaterThan(0);
    }
  });
});
