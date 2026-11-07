import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { MemoryEvent, OffScreenLifeEventType } from '../memory/types';
import { findDueLifeEvents, resolveDueLifeEvents } from '../events/eventEngine';
import { bloomCheckAt, bloomPossible, readWorldLife, WORLD_LIFE_RULES } from '../life/worldReading';
import { seedsOf } from '../life/engine';
import { addYears } from '../time/calendar';
import {
  GALD_BAKERY_ROUTE_DEFS,
  LIFE_TICK_DEFS,
  OFF_SCREEN_EVENT_INFO,
  causalChainOf,
  linksOf,
} from '../../content/events/offScreenLife';
import { BAKERY_ROUTE_BLOOMS } from '../../content/world/bakeryRouteLife';
import { GALD_FUTURE_VISION_ID, GALD_FUTURE_VISION_YEARS } from '../../content/events/galdLifeChoice';

/**
 * THE BAKERY ROUTE, MADE WHOLE (TIGS2027 STEP ①, 2026-10-19).
 *
 * The brief's chain, as the world lives it with nobody watching:
 *
 *   GARDO → LINAを助ける → RIZELがGARDOを見る目を変える → ELNAの事情を知る
 *   → RIZELにELNAを診る／助ける機会 → 村側の評価変化 → 衛兵との関係変化
 *   → パン屋との接点 → パン屋で働く可能性へ到達 → 3年後 → 再会
 *
 * and the brief's ten checks, each pinned below by number. The one thing
 * this file is most careful about is 5: each step happens because the last
 * one CHANGED SOMEBODY, not because it is next in a list — so a world where
 * the change did not happen does not go on.
 */

let dbCounter = 0;
const freshDbName = () => `bakery-chain-${++dbCounter}`;
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

/** The brief's DEV chain, in its own spelling. */
const DEV_CHAIN = [
  'GARDO_SAVED_LINA',
  'RIZEL_VIEW_CHANGED',
  'ELNA_CONTEXT_DISCOVERED',
  'RIZEL_HELP_OPPORTUNITY',
  'VILLAGE_VIEW_CHANGED',
  'GUARD_RELATION_CHANGED',
  'BAKERY_OPPORTUNITY',
  'GARDO_BAKERY_BLOOM',
];

const routeEvents = (world: World) =>
  world.getEvents().filter((e) => (ROUTE as string[]).includes(e.type));
const day = (e: { worldYear: number; worldDay: number }) => (e.worldYear - 1) * 365 + e.worldDay;

async function helped(dbName?: string): Promise<World> {
  const world = await openWorld(dbName);
  await world.recordGaldLifeChoice('HELP');
  return world;
}

/** A hand-built history: the answer, then the route's own events up to `upTo`, some of them altered. */
function history(
  upTo: OffScreenLifeEventType,
  alter: Partial<Record<OffScreenLifeEventType, Partial<MemoryEvent>>> = {},
): MemoryEvent[] {
  const answer: MemoryEvent = {
    id: 'evt_gald_life_choice',
    type: 'PLAYER_HELPED_GALD',
    worldYear: 1,
    worldDay: 1,
    location: 'GREENWOOD_FOREST',
    actors: ['PLAYER', 'GALD'],
    importance: 'MAJOR',
    createdAt: 'x',
  };
  const days: Partial<Record<OffScreenLifeEventType, number>> = {
    GALD_SAVES_LINA: 2,
    RIZEL_TENDS_GALD: 2,
    GALD_TELLS_OF_ELNA: 3,
    RIZEL_OFFERS_TO_SEE_ELNA: 3,
    VILLAGE_HEARS_OF_GALD: 4,
    RIZEL_SPEAKS_FOR_GALD: 4,
    BAKER_OFFERS_WORK: 4,
    GALD_TAKES_BAKERY_WORK: 5,
    LINA_WRITES_TO_ELNA: 6,
  };
  const out = [answer];
  for (const def of GALD_BAKERY_ROUTE_DEFS) {
    out.push({
      id: def.eventId,
      type: def.type,
      worldYear: 1,
      worldDay: days[def.type as OffScreenLifeEventType]!,
      location: def.location,
      actors: [...def.actors],
      importance: def.importance,
      createdAt: 'x',
      causedBy: [def.requiredMemory],
      ...alter[def.type as OffScreenLifeEventType],
    });
    if (def.type === upTo) break;
  }
  return out;
}

/** What follows from a history, given years to live it in. */
const follows = (events: MemoryEvent[], years = 3) =>
  resolveDueLifeEvents(LIFE_TICK_DEFS, events, addYears({ worldYear: 1, worldDay: 6 }, years), () => 'x', bloomPossible).map(
    (r) => r.event.type,
  );

describe('1. the first choice is saved, and locked', () => {
  it('HELP is written once; a different answer is refused, and the same one changes nothing', async () => {
    const dbName = freshDbName();
    const world = await helped(dbName);
    await expect(world.recordGaldLifeChoice('KILL')).rejects.toThrow();
    await world.recordGaldLifeChoice('HELP');
    expect(world.getEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD']);
    expect((await openWorld(dbName)).getGaldLifeChoice()).toBe('HELP');
  });
});

describe('2. it survives leaving and coming back', () => {
  it('a world closed halfway and reopened goes on exactly as one played straight through', async () => {
    const straight = await helped();
    await straight.advanceDays(6);

    const dbName = freshDbName();
    const first = await helped(dbName);
    await first.advanceDays(2);
    const again = await openWorld(dbName);
    expect(routeEvents(again).map((e) => e.type)).toEqual(routeEvents(first).map((e) => e.type));
    await again.advanceDays(4);

    const dated = (w: World) => routeEvents(w).map((e) => [e.type, day(e), e.causedBy]);
    expect(dated(again)).toEqual(dated(straight));
    expect(again.getCharacter('GALD')).toEqual(straight.getCharacter('GALD'));
  });
});

describe('3. their lives go on without the player (LIFE TICK + EventRule)', () => {
  it('only the nights move it; the player is in none of it and is told nothing', async () => {
    const world = await helped();
    world.previewLifeEvents(GALD_FUTURE_VISION_YEARS);
    expect(routeEvents(world)).toEqual([]);
    await world.advanceDays(6);
    expect(routeEvents(world).map((e) => e.type)).toEqual(ROUTE);
    for (const e of routeEvents(world)) expect(e.actors, e.type).not.toContain('PLAYER');
    expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD']);
  });

  it('every step is somebody\'s own move between people — never the player\'s', () => {
    for (const def of GALD_BAKERY_ROUTE_DEFS) {
      const info = OFF_SCREEN_EVENT_INFO[def.type as OffScreenLifeEventType];
      expect(def.actors, def.type).not.toContain('PLAYER');
      expect(info.decidedBy ?? def.actors[0], def.type).not.toBe('PLAYER');
      for (const link of info.links) expect([...link.from, link.to], def.type).not.toContain('PLAYER');
    }
  });
});

describe('4. in causal order', () => {
  it('each follows from the one before, on its own day, and the DEV chain reads as written', async () => {
    const world = await helped();
    await world.advanceDays(6);
    const events = routeEvents(world);
    expect(events.map((e) => e.type)).toEqual(ROUTE);
    events.forEach((e, i) => {
      expect(e.causedBy, e.type).toEqual([i === 0 ? 'PLAYER_HELPED_GALD' : ROUTE[i - 1]]);
      if (i > 0) expect(day(e), e.type).toBeGreaterThanOrEqual(day(events[i - 1]));
    });
    expect(causalChainOf(world.getEvents()).map((s) => s.chainCode).slice(0, DEV_CHAIN.length)).toEqual(DEV_CHAIN);
  });

  it('WORLD MEMORY can be asked who helped whom, whose view changed, who learned what, who gave whom a chance', async () => {
    const world = await helped();
    await world.advanceDays(6);
    const events = world.getEvents();
    expect(linksOf(events, 'HELPED')).toEqual(
      expect.arrayContaining([
        { kind: 'HELPED', from: ['GALD'], to: 'LINA' },
        { kind: 'HELPED', from: ['RIZEL'], to: 'GALD' },
      ]),
    );
    expect(linksOf(events, 'VIEW_CHANGED')).toEqual([{ kind: 'VIEW_CHANGED', from: ['LINA', 'RIZEL'], to: 'GALD' }]);
    expect(linksOf(events, 'LEARNED_CIRCUMSTANCES')).toEqual([
      { kind: 'LEARNED_CIRCUMSTANCES', from: ['BAKERY_OWNER', 'LINA', 'RIZEL'], to: 'ELNA' },
    ]);
    expect(linksOf(events, 'GAVE_OPPORTUNITY')).toEqual([
      { kind: 'GAVE_OPPORTUNITY', from: ['RIZEL'], to: 'ELNA' },
      { kind: 'GAVE_OPPORTUNITY', from: ['BAKERY_OWNER'], to: 'GALD' },
    ]);
    expect(linksOf(events, 'RELATION_CHANGED').map((l) => l.from[0])).toEqual(['ALDEN_VILLAGE', 'ALDEN_GUARD', 'BAKERY_OWNER']);
  });

  it('the relationships around him are read off what happened — LINA, RIZEL, ELNA, the guard, the baker', async () => {
    const world = await helped();
    await world.advanceDays(6);
    const life = readWorldLife(world.getEvents(), world.getClock());
    const because = (npc: string, of: string) =>
      life.vines.some((v) => v.source === npc && v.target === of && v.relationType === 'BECAUSE_OF' && v.status !== 'BROKEN');
    expect(because('LINA', 'GALD')).toBe(true);
    expect(because('RIZEL', 'GALD')).toBe(true);
    expect(because('GALD', 'RIZEL')).toBe(true);
    expect(because('GALD', 'BAKERY_OWNER')).toBe(true);
    expect(because('ELNA', 'LINA')).toBe(true);
    const has = (npc: string, type: string) => seedsOf(life, WORLD_LIFE_RULES, npc).some((s) => s.type === type);
    expect(has('ALDEN_GUARD', 'ANOTHER_SIDE_HEARD')).toBe(true);
    // Heard, not persuaded: his wariness is still there.
    expect(has('ALDEN_GUARD', 'GUARD_WARINESS')).toBe(true);
    expect(has('ALDEN_VILLAGE', 'TALK_OF_GALD_TURNS')).toBe(true);
    expect(has('BAKERY_OWNER', 'SOMEONE_WILL_LOOK')).toBe(true);
  });
});

describe('5. nothing happens before the people are ready', () => {
  it('the whole history above resolves to itself — the conditions hold in the world that lived it', () => {
    expect(follows(history('GALD_SAVES_LINA'))).toEqual(ROUTE.slice(1));
  });

  it('asked nothing about the people, a conditioned step never happens', () => {
    const due = findDueLifeEvents(LIFE_TICK_DEFS, history('GALD_SAVES_LINA'), { worldYear: 2, worldDay: 1 });
    expect(due.map((d) => d.def.type)).not.toContain('RIZEL_TENDS_GALD');
  });

  it('リゼル did not see him save リナ → she does not bind his wounds, and the route stops there', () => {
    const unseen = history('GALD_SAVES_LINA', { GALD_SAVES_LINA: { actors: ['GALD', 'LINA'] } });
    expect(follows(unseen)).not.toContain('RIZEL_TENDS_GALD');
    expect(follows(unseen).filter((t) => (ROUTE as string[]).includes(t))).toEqual([]);
  });

  it('リナ was not there → nobody brings him home, and nobody hears why he stole', () => {
    const alone = history('RIZEL_TENDS_GALD', {
      GALD_SAVES_LINA: { actors: ['GALD', 'SOMEONE', 'RIZEL'] },
      RIZEL_TENDS_GALD: { actors: ['RIZEL', 'GALD'] },
    });
    expect(follows(alone)).not.toContain('GALD_TELLS_OF_ELNA');
  });

  it('the baker was not at the table → the village does not hear it from his counter', () => {
    const away = history('RIZEL_OFFERS_TO_SEE_ELNA', {
      GALD_TELLS_OF_ELNA: { actors: ['GALD', 'SOMEONE', 'LINA', 'RIZEL'] },
    });
    const after = follows(away);
    expect(after).not.toContain('VILLAGE_HEARS_OF_GALD');
    expect(after).not.toContain('BAKER_OFFERS_WORK');
    expect(after).not.toContain('GALD_TAKES_BAKERY_WORK');
  });

  it('the guard never heard another side → the baker does not offer, and Gald does not take the work', () => {
    const unheard = history('RIZEL_SPEAKS_FOR_GALD', {
      RIZEL_SPEAKS_FOR_GALD: { actors: ['RIZEL', 'SOMEONE', 'GALD'] },
    });
    const after = follows(unheard);
    expect(after).not.toContain('BAKER_OFFERS_WORK');
    expect(after).not.toContain('GALD_TAKES_BAKERY_WORK');
  });

  it('the work is a possibility reached (SEED → GROWTH → VINE → BLOOM), not a stored future', () => {
    // Before the offer, the bloom says what it is still waiting for.
    const beforeOffer = bloomCheckAt('GALD_BAKERY_HAND', history('RIZEL_SPEAKS_FOR_GALD'), { worldYear: 1, worldDay: 4 })!;
    expect(beforeOffer.met).toBe(false);
    expect(beforeOffer.reasons.filter((r) => !r.met).map((r) => r.requirement)).toEqual([
      'seed A_PLACE_OFFERED ≥ GROWING',
      'vine BECAUSE_OF → BAKERY_OWNER',
    ]);
    // Offered: reached.
    expect(bloomPossible('GALD_BAKERY_HAND', history('BAKER_OFFERS_WORK'), { worldYear: 1, worldDay: 4 })).toBe(true);
    // And nothing is written down as his future — the only place it lives is the bloom's conditions.
    expect(BAKERY_ROUTE_BLOOMS.find((b) => b.id === 'GALD_BAKERY_HAND')!.requirements.vine).toEqual({
      target: 'BAKERY_OWNER',
      relationType: 'BECAUSE_OF',
    });
  });

  it('every step asks about a person, and every condition is a bloom that exists', () => {
    for (const def of GALD_BAKERY_ROUTE_DEFS) {
      expect(def.bloom, def.type).toBeDefined();
      expect(WORLD_LIFE_RULES.blooms.some((b) => b.id === def.bloom), def.bloom).toBe(true);
    }
  });
});

describe('a save from the PoC (2026-10-17), already past the old steps', () => {
  it('the new steps take their place in its past, and nobody offers him work he already has', () => {
    // The PoC's order: TAKES_WORK the night after TELLS, then the letter, then リゼル.
    const old = history('GALD_TELLS_OF_ELNA');
    const at = (type: OffScreenLifeEventType, d: number, causedBy: MemoryEvent['type']): MemoryEvent => {
      const def = GALD_BAKERY_ROUTE_DEFS.find((x) => x.type === type)!;
      return { id: def.eventId, type, worldYear: 1, worldDay: d, location: def.location, actors: [...def.actors], importance: def.importance, createdAt: 'x', causedBy: [causedBy] };
    };
    old.push(
      at('GALD_TAKES_BAKERY_WORK', 4, 'GALD_TELLS_OF_ELNA'),
      at('LINA_WRITES_TO_ELNA', 5, 'GALD_TAKES_BAKERY_WORK'),
      at('RIZEL_SPEAKS_FOR_GALD', 6, 'GALD_TAKES_BAKERY_WORK'),
    );
    const added = resolveDueLifeEvents(LIFE_TICK_DEFS, old, { worldYear: 1, worldDay: 7 }, () => 'x', bloomPossible).map(
      (r) => [r.event.type, r.event.worldDay],
    );
    expect(added).toEqual([
      ['RIZEL_OFFERS_TO_SEE_ELNA', 3],
      ['VILLAGE_HEARS_OF_GALD', 4],
    ]);
  });
});

describe('6. nothing twice', () => {
  it('a year of nights, a shift on top, and a resolve of the finished world add nothing more', async () => {
    const world = await helped();
    await world.advanceDays(400);
    await world.timeShift(3);
    for (const type of ROUTE) expect(world.getEvents().filter((e) => e.type === type), type).toHaveLength(1);
    expect(follows(world.getEvents())).toEqual([]);
  });
});

describe('7. three years later', () => {
  it('Gald works at the bakery in Alden; the route behind him is the one the nights will live', async () => {
    const world = await helped();
    const preview = world.previewLifeEvents(GALD_FUTURE_VISION_YEARS);
    expect(preview.map((e) => e.type)).toEqual(ROUTE);
    expect(world.previewCharacterStates(GALD_FUTURE_VISION_YEARS).GALD).toMatchObject({
      location: 'ALDEN_VILLAGE',
      occupation: 'BAKERY_HAND',
      alive: true,
      // Looked at, not lived: nobody is older.
      age: world.getCharacter('GALD')!.age,
    });
    // He is somebody who lives here by then.
    const later = readWorldLife([...world.getEvents(), ...preview], addYears(world.getClock(), 3));
    const roots = seedsOf(later, WORLD_LIFE_RULES, 'GALD').find((s) => s.type === 'GALD_ROOTS_IN_ALDEN');
    expect(roots?.status).toBe('GROWING');
  });

  it('it is fixed: the same three years on every look, after a reopen, and once the vision is seen', async () => {
    const dbName = freshDbName();
    const world = await helped(dbName);
    const look = world.previewLifeEvents(3);
    expect(world.previewLifeEvents(3)).toEqual(look);
    expect((await openWorld(dbName)).previewLifeEvents(3)).toEqual(look);
    await world.markExperienceSeen(GALD_FUTURE_VISION_ID);
    expect((await openWorld(dbName)).previewLifeEvents(3)).toEqual(look);
  });
});

describe('8. the vision is a look, and the player comes back to the moment they chose', () => {
  it('seen once: nothing moved, nothing written but "seen", and it is not owed again', async () => {
    const dbName = freshDbName();
    const world = await helped(dbName);
    const before = { clock: world.getClock(), events: world.getEvents(), gald: world.getCharacter('GALD') };
    world.previewLifeEvents(GALD_FUTURE_VISION_YEARS);
    world.previewCharacterStates(GALD_FUTURE_VISION_YEARS);
    await world.markExperienceSeen(GALD_FUTURE_VISION_ID);
    const back = await openWorld(dbName);
    expect(back.getClock()).toEqual(before.clock);
    expect(back.getEvents()).toEqual(before.events);
    expect(back.getCharacter('GALD')).toEqual(before.gald);
    expect(back.hasSeenExperience(GALD_FUTURE_VISION_ID)).toBe(true);
    expect(back.hasEventOfType('WORLD_TIME_SHIFTED')).toBe(false);
    // And then the present goes on — the route is lived from here.
    await back.advanceDays(6);
    expect(routeEvents(back).map((e) => e.type)).toEqual(ROUTE);
  });
});

describe('9. the other three answers are untouched', () => {
  // SPARE is ROUTE D now (作者 2026-10-20: the let-go world, off screen);
  // CAPTURE and KILL are as they always were. None of them reaches the bakery route.
  it('SPARE, CAPTURE and KILL look ahead and live their own lives — never the bakery route', async () => {
    const expected = {
      SPARE: ['GALD_LEAVES_BANDITS', 'GALD_SAVES_MERCHANTS', 'MERCHANTS_LEARN_OF_ELNA'],
      CAPTURE: ['GALD_STANDS_TRIAL', 'GALD_COMPLETES_SENTENCE', 'GALD_WORKS_FOR_ALDEN'],
      KILL: ['GALD_IS_BURIED', 'GALD_GRAVE_TENDED'],
    } as const;
    for (const [choice, chain] of Object.entries(expected) as [keyof typeof expected, readonly string[]][]) {
      const world = await openWorld();
      await world.recordGaldLifeChoice(choice);
      expect(world.previewLifeEvents(3).map((e) => e.type), choice).toEqual(chain);
      await world.advanceDays(10);
      for (const e of world.getEvents()) expect(ROUTE as string[], choice).not.toContain(e.type);
    }
  });
});
