// THE FIRST VERTICAL SLICE OF THE WORLD LIFE ENGINE.
//
//   PLAYER helps a beaten bandit
//     → WORLD MEMORY
//     → SEED
//     → time, and canon happening on its own
//     → GROWTH
//     → what Gald is becoming
//     → what the guard stops doing
//     → BLOOM: 「かつて追われていた男が、衛兵と普通に話している」
//
// And, just as importantly, the things that must NOT be true: that
// helping him settles anything, that the engine touches canon, that the
// route is a corridor, or that any of it can be read as a score.

import { describe, it, expect } from 'vitest';
import { INITIAL_CLOCK, addDays, toAbsoluteDay, type WorldClock } from '../time/calendar';
import type { MemoryEvent } from '../memory/types';
import { canonAsWorldMemories, asWorldMemory, isCanon } from './canonBridge';
import { readWorldLife, WORLD_LIFE_RULES } from './worldReading';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  replayCanon,
  seedsOf,
  traceNpc,
  witness,
  type WorldLifeRules,
} from './engine';
import type { WorldLifeState } from './types';
import { PLAYER_ACTOR } from '../../content/world/aldenLife';
import {
  ALDEN_GUARD,
  GALD,
  HELP_AFTER_BATTLE,
  GALD_ACTIONS,
  GALD_BLOOMS,
  GALD_CORES,
  GALD_SEED_KINDS,
} from '../../content/world/galdLife';

const RULES: WorldLifeRules = {
  actions: GALD_ACTIONS,
  kinds: GALD_SEED_KINDS,
  cores: GALD_CORES,
  blooms: GALD_BLOOMS,
};

const FOREST = 'ALDEN_FOREST';

/** A canonical fact, shaped exactly as the real store holds them. */
function canon(
  type: MemoryEvent['type'],
  day: number,
  actors: string[],
  location: string,
): MemoryEvent {
  const at = addDays(INITIAL_CLOCK, day);
  return {
    id: `evt_${type}_${day}`,
    type,
    worldYear: at.worldYear,
    worldDay: at.worldDay,
    location,
    actors,
    importance: 'MAJOR',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * The greenwood before any of this: bandits on the road, and a guard
 * who walked it. Not the player's doing and not aimed at anybody.
 */
function theWorldAsItWas(): WorldLifeState {
  return observe(
    emptyWorld(INITIAL_CLOCK),
    {
      action: 'BANDITS_WORKED_THE_ROAD',
      actor: GALD,
      target: null,
      location: FOREST,
      witnesses: [ALDEN_GUARD],
    },
    RULES,
  ).state;
}

/** The battle ends, and the player binds his wounds instead of leaving. */
function helpHim(state: WorldLifeState) {
  return observe(
    state,
    {
      action: HELP_AFTER_BATTLE,
      actor: PLAYER_ACTOR,
      target: GALD,
      location: FOREST,
      metadata: { choice: 'HELP' },
    },
    RULES,
  );
}

/**
 * The HELP route as canon actually fires it: the road at three days,
 * the waystation at four months, and the player walking back into it
 * three years on.
 */
const HELP_CANON: readonly MemoryEvent[] = [
  canon('GALD_WALKS_THE_ROAD', 4, [GALD], 'GREENWOOD_FOREST'),
  canon('GALD_BECOMES_HEALER', 124, [GALD], 'GREENWOOD_WAYSTATION'),
  canon('PLAYER_MET_GALD_ON_THE_ROAD', 1096, [PLAYER_ACTOR, GALD], 'GREENWOOD_WAYSTATION'),
];

/**
 * The whole route, played out to a given day.
 *
 * `days` is absolute — day 0 is the fight — so every test below says
 * plainly when it is standing, and the clock is moved to there rather
 * than by there. A route is a thing you look at from a date.
 */
function routeTo(days = 1096, alsoCanon: readonly MemoryEvent[] = []): WorldLifeState {
  const helped = helpHim(theWorldAsItWas()).state;
  const facts = [...HELP_CANON, ...alsoCanon].filter((event) => dayOf(event) <= days);
  const withCanon = replayCanon(helped, canonAsWorldMemories(facts), RULES);
  const toGo = days - (toAbsoluteDay(withCanon.now) - 1);
  return recompute(advanceTime(withCanon, Math.max(0, toGo), 'STORY_TIME_ADVANCE'), RULES);
}

function dayOf(event: MemoryEvent): number {
  return toAbsoluteDay({ worldYear: event.worldYear, worldDay: event.worldDay }) - 1;
}

function seed(state: WorldLifeState, npcId: string, type: string) {
  return seedsOf(state, RULES, npcId).find((s) => s.type === type);
}

function bloomed(state: WorldLifeState, id: string): boolean {
  return state.blooms.some((bloom) => bloom.id === id);
}

describe('PLAYERのHELP → WORLD MEMORY', () => {
  it('writes down what was done, to whom, and where — and nothing about what it made him', () => {
    const { memory } = helpHim(theWorldAsItWas());
    expect(memory.actor).toBe(PLAYER_ACTOR);
    expect(memory.target).toBe(GALD);
    expect(memory.action).toBe(HELP_AFTER_BATTLE);
    expect(memory.location).toBe(FOREST);
    expect(memory.metadata.choice).toBe('HELP');
  });

  it('is not a redemption: the moment it happens, nothing about him is settled', () => {
    // THE CONSTRAINT THE WHOLE ROUND IS ABOUT. Helping him buys a
    // wanting and no outcome at all.
    const { state, planted } = helpHim(theWorldAsItWas());
    expect(planted.map((s) => s.type)).toEqual(['GALD_REDEMPTION']);
    expect(planted[0].status).not.toBe('ROOTED');
    expect(state.blooms.filter((b) => b.npcId === GALD)).toEqual([]);
  });
});

describe('WORLD SEED', () => {
  it('plants the debt in him, because of who he already was', () => {
    const { state } = helpHim(theWorldAsItWas());
    const debt = seed(state, GALD, 'GALD_REDEMPTION');
    expect(debt).toBeDefined();
    expect(debt!.status).toBe('GROWING');
    // Traced back to the one thing that caused it, and no further.
    expect(state.memories.some((m) => m.id === debt!.sourceMemoryId)).toBe(true);
  });

  it('gives the guard his own, which nobody put there for the player’s benefit', () => {
    const wary = seed(theWorldAsItWas(), ALDEN_GUARD, 'GUARD_WARINESS');
    expect(wary).toBeDefined();
    expect(wary!.targetNpcId).toBe(ALDEN_GUARD);
  });

  it('never plants anything in the player', () => {
    const { state } = helpHim(theWorldAsItWas());
    expect(state.seeds.some((s) => s.targetNpcId === PLAYER_ACTOR)).toBe(false);
  });
});

describe('canon is read, never written', () => {
  it('takes a canonical fact in under its own name, at its own date', () => {
    const event = canon('GALD_BECOMES_HEALER', 124, [GALD], 'GREENWOOD_WAYSTATION');
    const record = asWorldMemory(event);
    expect(record.action).toBe('GALD_BECOMES_HEALER');
    expect(record.actor).toBe(GALD);
    expect(record.time).toEqual(addDays(INITIAL_CLOCK, 124));
    expect(isCanon(record)).toBe(true);
  });

  it('changes nothing about the events it was handed', () => {
    const events = HELP_CANON.map((e) => ({ ...e }));
    const before = JSON.stringify(events);
    replayCanon(theWorldAsItWas(), canonAsWorldMemories(events), RULES);
    expect(JSON.stringify(events)).toBe(before);
  });

  it('reads them oldest first, whatever order the store hands them back', () => {
    const shuffled = [...HELP_CANON].reverse();
    const a = replayCanon(helpHim(theWorldAsItWas()).state, canonAsWorldMemories(HELP_CANON), RULES);
    const b = replayCanon(helpHim(theWorldAsItWas()).state, canonAsWorldMemories(shuffled), RULES);
    expect(a.seeds).toEqual(b.seeds);
  });

  it('grows nothing from a route whose events never fire', () => {
    // A HELP that canon never followed up — the player helped him and
    // the world did nothing — leaves a wanting that simply fades.
    const helped = helpHim(theWorldAsItWas()).state;
    const alone = recompute(advanceTime(helped, 1096, 'STORY_TIME_ADVANCE'), RULES);
    const debt = seed(alone, GALD, 'GALD_REDEMPTION')!;
    expect(debt.status).not.toBe('ROOTED');
    expect(bloomed(alone, 'GALD_AND_THE_GUARD_SPEAK')).toBe(false);
  });
});

describe('GROWTH — 時間と、本人がしたことで育つ', () => {
  it('deepens as he does something about it, not as the player does', () => {
    const atHelp = seed(helpHim(theWorldAsItWas()).state, GALD, 'GALD_REDEMPTION')!;
    const atRoad = seed(routeTo(10), GALD, 'GALD_REDEMPTION')!;
    const atHealer = seed(routeTo(130), GALD, 'GALD_REDEMPTION')!;
    expect(atRoad.strength).toBeGreaterThan(atHelp.strength);
    expect(atHealer.strength).toBeGreaterThan(atRoad.strength);
    expect(atHealer.status).toBe('ROOTED');
    // And every bit of it can be pointed at a fact.
    expect(atHealer.fedBy.length).toBe(2);
  });

  it('lets the guard’s wariness fade, because nothing kept feeding it', () => {
    const early = seed(routeTo(30), ALDEN_GUARD, 'GUARD_WARINESS')!;
    const late = seed(routeTo(700), ALDEN_GUARD, 'GUARD_WARINESS')!;
    expect(early.status).toBe('GROWING');
    expect(late.status).toBe('FADED');
    // Nobody did this. There is no action in the whole village that
    // reduces it — it is time, and a road that stayed quiet.
    expect(late.fedBy).toEqual([]);
  });
});

describe('BLOOM — 景色で見せる人生の変化', () => {
  it('has him leaving the bandits behind within days', () => {
    const early = routeTo(10);
    expect(bloomed(early, 'GALD_STOPS_BEING_A_BANDIT')).toBe(true);
    // But nothing further. Four days is not a life.
    expect(bloomed(early, 'GALD_LOOKS_FOR_WORK')).toBe(false);
    expect(bloomed(early, 'GALD_AND_THE_GUARD_SPEAK')).toBe(false);
  });

  it('has him looking for honest work a few months on', () => {
    const months = routeTo(130);
    expect(bloomed(months, 'GALD_LOOKS_FOR_WORK')).toBe(true);
    expect(bloomed(months, 'GUARD_STOPS_WATCHING_HIM')).toBe(false);
  });

  it('has the guard stop watching him after two years of nothing happening', () => {
    const years = routeTo(700);
    expect(bloomed(years, 'GUARD_STOPS_WATCHING_HIM')).toBe(true);
    // And this one is the GUARD's change, not Gald's.
    const bloom = years.blooms.find((b) => b.id === 'GUARD_STOPS_WATCHING_HIM')!;
    expect(bloom.npcId).toBe(ALDEN_GUARD);
  });

  it('THE SLICE: three years on, the two of them are talking', () => {
    // 「かつて追われていた盗賊ガルドが、村の衛兵と普通に笑って話している」
    const world = routeTo(1096);
    const bloom = world.blooms.find((b) => b.id === 'GALD_AND_THE_GUARD_SPEAK');
    expect(bloom, traceNpc(world, RULES, GALD).join('\n')).toBeDefined();
    expect(bloom!.result).toContain('衛兵と普通に話している');
    // A CANDIDATE, still. The engine found that his life could be this
    // shape; it did not make him into it.
    expect(bloom!.status).toBe('CANDIDATE');
  });

  it('does not un-become him: the scene is still there six years later', () => {
    // What he did cannot be undone by quiet. A debt fades; a man who
    // spent four months binding wounds is not a bandit who owes
    // somebody, and coming back late must not find that the world has
    // forgotten who he turned into.
    const later = routeTo(2192);
    expect(seed(later, GALD, 'GALD_REDEMPTION')!.status).toBe('ROOTED');
    expect(bloomed(later, 'GALD_LOOKS_FOR_WORK')).toBe(true);
  });

  it('is not a corridor: one of his futures this route simply never reaches', () => {
    const world = routeTo(1096);
    expect(bloomed(world, 'GALD_RETURNS_TO_THE_VILLAGE')).toBe(false);
    // And it is unreached for a reason that is about the world rather
    // than about a switch: canon never put him in Alden on this route.
    expect(seed(world, GALD, 'GALD_ROOTS_IN_ALDEN')).toBeUndefined();
  });

  it('reaches it on the route that does put him there', () => {
    // The same five blooms, a different life. Nothing was written twice.
    const settled = routeTo(1096, [canon('GALD_ARRIVES_IN_ALDEN', 40, [GALD], 'ALDEN_VILLAGE')]);
    expect(bloomed(settled, 'GALD_RETURNS_TO_THE_VILLAGE'), traceNpc(settled, RULES, GALD).join('\n')).toBe(true);
  });
});

describe('what the player is never told', () => {
  it('has no score, no level and no progress anywhere in a bloom', () => {
    // 「ガルド更生SEED +5」 must not be expressible. A bloom carries a
    // sentence about a scene and nothing a UI could turn into a bar.
    for (const bloom of GALD_BLOOMS) {
      expect(Object.keys(bloom)).toEqual(['id', 'npcId', 'requirements', 'result']);
      expect(bloom.result).not.toMatch(/[0-9]/);
      expect(bloom.result).not.toMatch(/SEED|POINT|LEVEL|\+/);
    }
  });

  it('never names the player’s choice in a requirement', () => {
    // What is required is true of a man, never true of a decision the
    // player made. If HELP ever appears here, the engine has started
    // rewarding choices instead of growing lives.
    for (const bloom of GALD_BLOOMS) {
      const written = JSON.stringify(bloom.requirements);
      for (const word of ['HELP', 'SPARE', 'KILL', 'CAPTURE', 'HELP_AFTER_BATTLE']) {
        expect(written, bloom.id).not.toContain(word);
      }
    }
  });
});

describe('the developer’s view', () => {
  it('reads the whole chain back, for both men', () => {
    const world = routeTo(1096);
    const gald = traceNpc(world, RULES, GALD).join('\n');
    expect(gald).toContain('CORE');
    expect(gald).toContain('SEED   GALD_REDEMPTION ROOTED');
    expect(gald).toContain(`FROM ACTION ${HELP_AFTER_BATTLE} by PLAYER`);
    expect(gald).toContain('VINE   BECAUSE_OF → PLAYER');
    expect(gald).toContain('GALD_AND_THE_GUARD_SPEAK CANDIDATE');

    const guard = traceNpc(world, RULES, ALDEN_GUARD).join('\n');
    expect(guard).toContain('SEED   GUARD_WARINESS FADED');
    expect(guard).toContain('GUARD_STOPS_WATCHING_HIM CANDIDATE');
  });

  it('says which requirement a future is still waiting on', () => {
    const early = routeTo(200);
    const trace = traceNpc(early, RULES, GALD).join('\n');
    expect(trace).toContain('GALD_AND_THE_GUARD_SPEAK まだ');
    expect(trace).toContain('·');
  });
});

describe('one world, two readings, no contradiction', () => {
  it('gives the same world for the same canon, however it was arrived at', () => {
    const a = routeTo(1096);
    const b = routeTo(1096);
    expect(a.seeds).toEqual(b.seeds);
    expect(a.blooms.map((x) => x.id)).toEqual(b.blooms.map((x) => x.id));
  });

  it('takes the same fact in once, however many times it is replayed', () => {
    const once = routeTo(1096);
    const twice = replayCanon(once, canonAsWorldMemories(HELP_CANON), RULES);
    expect(twice.seeds).toEqual(once.seeds);
    expect(twice.memories.length).toBe(once.memories.length);
  });

  it('never winds the clock backwards for a fact that arrives late', () => {
    const now: WorldClock = addDays(INITIAL_CLOCK, 2000);
    const late = replayCanon(
      { ...theWorldAsItWas(), now },
      canonAsWorldMemories(HELP_CANON),
      RULES,
    );
    expect(toAbsoluteDay(late.now)).toBe(toAbsoluteDay(now));
  });

  it('takes in a record that already knows its own date without re-dating it', () => {
    const record = asWorldMemory(canon('GALD_WALKS_THE_ROAD', 4, [GALD], FOREST));
    const world = witness(helpHim(theWorldAsItWas()).state, record, RULES);
    expect(world.state.memories.find((m) => m.id === record.id)!.time).toEqual(record.time);
  });
});

describe('read off the world the player is actually in', () => {
  /** Canon exactly as the store holds it for a HELP playthrough. */
  const PLAYED: readonly MemoryEvent[] = [
    canon('PLAYER_HELPED_GALD', 0, [PLAYER_ACTOR, GALD], FOREST),
    ...HELP_CANON,
  ];

  it('starts from a greenwood that already had a past', () => {
    // The guard was walking that road before the player existed. If the
    // world began the day they arrived, his wariness would have to be
    // set by hand — and nothing in this engine is ever simply set.
    const day1 = readWorldLife([], INITIAL_CLOCK);
    const wary = seedsOf(day1, WORLD_LIFE_RULES, ALDEN_GUARD).find(
      (s) => s.type === 'GUARD_WARINESS',
    );
    expect(wary).toBeDefined();
    expect(wary!.status).toBe('GROWING');
  });

  it('builds the whole reading from canon alone, with nothing stored', () => {
    const read = readWorldLife(PLAYED, addDays(INITIAL_CLOCK, 1096));
    expect(
      seedsOf(read, WORLD_LIFE_RULES, GALD).find((s) => s.type === 'GALD_REDEMPTION')!.status,
    ).toBe('ROOTED');
    expect(read.blooms.some((b) => b.id === 'GALD_AND_THE_GUARD_SPEAK')).toBe(true);
  });

  it('gives the same reading for a world reloaded as for one played through', () => {
    // There is no life-engine save, so there is nothing to migrate and
    // nothing that can fall out of step with the history it came from.
    const shuffled = [...PLAYED].reverse();
    const a = readWorldLife(PLAYED, addDays(INITIAL_CLOCK, 1096));
    const b = readWorldLife(shuffled, addDays(INITIAL_CLOCK, 1096));
    expect(a.seeds).toEqual(b.seeds);
    expect(a.blooms.map((x) => x.id)).toEqual(b.blooms.map((x) => x.id));
  });

  it('says nothing about him on a route where he was not helped', () => {
    // SPARE, played straight. The HELP seed is never planted, because
    // the fact that plants it never happened.
    const spared = readWorldLife(
      [
        canon('PLAYER_SPARED_GALD', 0, [PLAYER_ACTOR, GALD], FOREST),
        canon('GALD_LEAVES_BANDITS', 4, [GALD], 'GREENWOOD_FOREST'),
        canon('GALD_ARRIVES_IN_ALDEN', 40, [GALD], 'ALDEN_VILLAGE'),
        canon('GALD_BECOMES_BAKER', 110, [GALD], 'ALDEN_VILLAGE'),
      ],
      addDays(INITIAL_CLOCK, 1096),
    );
    expect(
      seedsOf(spared, WORLD_LIFE_RULES, GALD).find((s) => s.type === 'GALD_REDEMPTION'),
    ).toBeUndefined();
    expect(spared.blooms.some((b) => b.id === 'GALD_AND_THE_GUARD_SPEAK')).toBe(false);
    // But the village did take him in, and the engine noticed.
    expect(
      seedsOf(spared, WORLD_LIFE_RULES, GALD).find((s) => s.type === 'GALD_ROOTS_IN_ALDEN'),
    ).toBeDefined();
  });

  it('says nothing at all about a man who was killed', () => {
    const killed = readWorldLife(
      [
        canon('PLAYER_KILLED_GALD', 0, [PLAYER_ACTOR, GALD], FOREST),
        canon('GALD_IS_BURIED', 2, [GALD], 'GREENWOOD_FOREST'),
      ],
      addDays(INITIAL_CLOCK, 1096),
    );
    expect(seedsOf(killed, WORLD_LIFE_RULES, GALD)).toEqual([]);
    expect(killed.blooms.filter((b) => b.npcId === GALD)).toEqual([]);
  });

  it('never claims the guard stopped watching somebody he never watched', () => {
    // A world with no prelude at all: the ceiling on a seed that was
    // never planted must not read as satisfied.
    const nothing = recompute(
      { ...emptyWorld(addDays(INITIAL_CLOCK, 2000)), memories: [], seeds: [] },
      WORLD_LIFE_RULES,
    );
    expect(nothing.blooms.some((b) => b.id === 'GUARD_STOPS_WATCHING_HIM')).toBe(false);
  });
});
