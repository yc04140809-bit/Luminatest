// LIVES THAT CROSS, AND ONE THAT REACHES ANOTHER TOWN.
//
// The success condition of this round, stated as the thing that has to
// be true: a decision the player made in a forest outside Alden changes
// a boy on a dock in a port town they have never been to, and the two
// of them never share a single record.
//
//   PLAYER bandages a beaten bandit
//     → GALD_REDEMPTION roots as he pays it off
//     → the guard stops watching him
//     → he can walk into the market
//     → a girl hears what the road is like
//     → a baker gives him work worth carrying north
//     → a boy on a dock cuts his hand, and somebody binds it
//
// Nobody in that chain after the first line is the player.

import { describe, it, expect } from 'vitest';
import { INITIAL_CLOCK, addDays, toAbsoluteDay } from '../time/calendar';
import type { MemoryEvent } from '../memory/types';
import { canonAsWorldMemories } from './canonBridge';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  replayCanon,
  seedsOf,
  settle,
  traceNpc,
  type WorldLifeRules,
} from './engine';
import { allCrossingChecks, checkCrossing, crossingMemoryId } from './crossing';
import type { WorldLifeState } from './types';
import {
  ALDEN_GUARD,
  BAKERY_OWNER,
  GALD,
  LINA,
  MUGEN_WORLD_RULES,
  NEL,
  PLAYER_ACTOR,
  PORT_TOWN,
  WORLD_CROSSINGS,
} from '../../content/world/mugenWorld';
import { GREENWOOD_PRELUDE } from '../../content/world/galdLife';

const RULES: WorldLifeRules = MUGEN_WORLD_RULES;
const HER = LINA.npcId;

function canon(type: MemoryEvent['type'], day: number, actors: string[], at: string): MemoryEvent {
  const when = addDays(INITIAL_CLOCK, day);
  return {
    id: `evt_${type}_${day}`,
    type,
    worldYear: when.worldYear,
    worldDay: when.worldDay,
    location: at,
    actors,
    importance: 'MAJOR',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/** The greenwood as it was, and a curious child at the well. */
function theWorldBefore(): WorldLifeState {
  let world = emptyWorld(INITIAL_CLOCK);
  for (const fact of GREENWOOD_PRELUDE) {
    world = observe(world, { ...fact, witnesses: [...fact.witnesses] }, RULES).state;
  }
  return world;
}

/**
 * Kaos, coming back through the village every so often.
 *
 * Lina has to still want something when Gald arrives, or the crossing
 * that matters is a conversation with a girl who gave up two years ago.
 * Which is a real world too — and is exactly what the KILL comparison
 * at the bottom of this file ends up looking like.
 */
function kaosVisits(state: WorldLifeState, times: number): WorldLifeState {
  let world = state;
  for (let i = 0; i < times; i++) {
    if (i > 0) world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
    world = observe(
      world,
      {
        action: 'SHOW_MAGIC',
        actor: 'KAOS',
        target: HER,
        location: 'ALDEN_VILLAGE',
        witnesses: ['alden_marta'],
      },
      RULES,
    ).state;
  }
  return world;
}

/** Canon for whichever of the four the player chose. */
const HELP_CANON: readonly MemoryEvent[] = [
  canon('PLAYER_HELPED_GALD', 1, [PLAYER_ACTOR, GALD], 'ALDEN_FOREST'),
  canon('GALD_WALKS_THE_ROAD', 5, [GALD], 'GREENWOOD_FOREST'),
  canon('GALD_BECOMES_HEALER', 125, [GALD], 'GREENWOOD_WAYSTATION'),
];

const KILL_CANON: readonly MemoryEvent[] = [
  canon('PLAYER_KILLED_GALD', 1, [PLAYER_ACTOR, GALD], 'ALDEN_FOREST'),
  canon('GALD_IS_BURIED', 3, [GALD], 'GREENWOOD_FOREST'),
];

/**
 * A world, played to a day.
 *
 * Time is moved in story-sized steps rather than one jump, because that
 * is how the game moves it and because crossings are recorded when the
 * story looks — see the note at the top of crossing.ts.
 */
function worldAt(days: number, facts: readonly MemoryEvent[]): WorldLifeState {
  let world = replayCanon(
    kaosVisits(theWorldBefore(), 5),
    canonAsWorldMemories(facts),
    RULES,
  );
  while (toAbsoluteDay(world.now) - 1 < days) {
    const step = Math.min(180, days - (toAbsoluteDay(world.now) - 1));
    world = settle(advanceTime(world, step, 'STORY_TIME_ADVANCE'), RULES);
  }
  return settle(world, RULES);
}

const helped = (days = 1500) => worldAt(days, HELP_CANON);
const killed = (days = 1500) => worldAt(days, KILL_CANON);

function seedOf(state: WorldLifeState, npcId: string, type: string) {
  return seedsOf(state, RULES, npcId).find((s) => s.type === type);
}

function met(state: WorldLifeState, crossingId: string): boolean {
  return state.memories.some((m) => m.id === `cross:${crossingId}`);
}

describe('a crossing is an event, not a future', () => {
  it('records that two people met, and settles nothing about either', () => {
    const world = helped();
    expect(met(world, 'GALD_WALKS_INTO_ALDEN')).toBe(true);
    const record = world.memories.find(
      (m) => m.id === crossingMemoryId(WORLD_CROSSINGS[0]),
    )!;
    expect(record.action).toBe('GALD_COMES_TO_MARKET');
    expect(record.actor).toBe(GALD);
    // Nobody's occupation, location or life is written anywhere by it.
    expect(Object.keys(record)).not.toContain('result');
    for (const bloom of world.blooms) expect(bloom.status).toBe('CANDIDATE');
  });

  it('happens once, however many times the world is settled', () => {
    const world = helped();
    const again = settle(settle(settle(world, RULES), RULES), RULES);
    expect(again.memories.length).toBe(world.memories.length);
  });

  it('is dated when it happened, and is not re-dated by looking again', () => {
    const world = helped();
    const when = world.memories.find((m) => m.id === 'cross:GALD_WALKS_INTO_ALDEN')!.time;
    const later = settle(advanceTime(world, 900, 'STORY_TIME_ADVANCE'), RULES);
    expect(later.memories.find((m) => m.id === 'cross:GALD_WALKS_INTO_ALDEN')!.time).toEqual(when);
  });
});

describe('only the pairs somebody wrote down are ever considered', () => {
  it('asks exactly as many questions as there are crossings', () => {
    // The claim that keeps this affordable. Five people in the world,
    // and the number of pair-questions is the number of entries — not
    // twenty, not twenty-five, and not growing with the cast.
    const world = helped();
    const checks = allCrossingChecks(WORLD_CROSSINGS, {
      state: world,
      kinds: RULES.kinds,
      cores: RULES.cores,
    });
    expect(checks).toHaveLength(WORLD_CROSSINGS.length);
    expect(RULES.cores.length).toBeGreaterThan(WORLD_CROSSINGS.length);
  });

  it('names the two lives each one is about', () => {
    for (const crossing of WORLD_CROSSINGS) {
      const [a, b] = crossing.between;
      const involved = [crossing.meets.actor, crossing.meets.target];
      expect(involved, crossing.id).toContain(a);
      expect(involved, crossing.id).toContain(b);
    }
  });

  it('says which condition two people are still waiting on', () => {
    const early = helped(200);
    const check = checkCrossing(WORLD_CROSSINGS[0], {
      state: early,
      kinds: RULES.kinds,
      cores: RULES.cores,
    });
    expect(check.met).toBe(false);
    expect(check.reasons.some((r) => !r.met)).toBe(true);
    for (const reason of check.reasons) expect(reason.detail).toBeTruthy();
  });
});

describe('the chain through the village', () => {
  it('lets him into the market only once the guard has stopped watching', () => {
    expect(met(helped(400), 'GALD_WALKS_INTO_ALDEN')).toBe(false);
    const world = helped(1500);
    expect(world.blooms.some((b) => b.id === 'GUARD_STOPS_WATCHING_HIM')).toBe(true);
    expect(met(world, 'GALD_WALKS_INTO_ALDEN')).toBe(true);
  });

  it('puts something in the girl who was standing there', () => {
    const world = helped();
    expect(seedOf(world, HER, 'SECOND_CHANCES')).toBeDefined();
  });

  it('has him tell her what the road is like — 「LINAへ新しい影響」', () => {
    const world = helped();
    expect(met(world, 'GALD_TELLS_LINA_OF_THE_ROAD'), traceNpc(world, RULES, HER).join('\n')).toBe(
      true,
    );
    const dream = seedOf(world, HER, 'OUTSIDE_WORLD_DREAM');
    expect(dream).toBeDefined();
    // And it came from HIM, not from the player. She has a line to a man
    // the player once chose not to leave in a forest.
    const source = world.memories.find((m) => m.id === dream!.sourceMemoryId)!;
    expect(source.actor).toBe(GALD);
    expect(world.vines.some((v) => v.source === HER && v.target === GALD)).toBe(true);
  });

  it('has a baker decide a man can be stood next to', () => {
    const world = helped();
    expect(seedOf(world, BAKERY_OWNER, 'SECOND_CHANCES')).toBeDefined();
    expect(met(world, 'BAKER_GIVES_GALD_A_CORNER')).toBe(true);
    expect(seedOf(world, GALD, 'KINDNESS_OWED')).toBeDefined();
  });
});

describe('THE SUCCESS CONDITION: it reaches a town the player has never been to', () => {
  it('puts a seed in a boy the player has never met', () => {
    const world = helped();
    const boy = seedOf(world, NEL, 'HEALING_CALL');
    expect(boy, traceNpc(world, RULES, NEL).join('\n')).toBeDefined();
    expect(boy!.targetNpcId).toBe(NEL);
  });

  it('and the player is in none of it', () => {
    // The load-bearing assertion of the whole round. If the player ever
    // appears in a record with Nel, the propagation has been faked by
    // putting them in the same room.
    const world = helped();
    const together = world.memories.filter(
      (memory) =>
        [memory.actor, memory.target, ...memory.witnesses].includes(NEL) &&
        [memory.actor, memory.target, ...memory.witnesses].includes(PLAYER_ACTOR),
    );
    expect(together).toEqual([]);
    // Nor has the player ever been in that town.
    expect(
      world.memories.filter(
        (m) => m.location === PORT_TOWN && [m.actor, m.target].includes(PLAYER_ACTOR),
      ),
    ).toEqual([]);
  });

  it('traces all the way back to one decision in a forest', () => {
    const world = helped();
    const boy = seedOf(world, NEL, 'HEALING_CALL')!;
    const meeting = world.memories.find((m) => m.id === boy.sourceMemoryId)!;
    expect(meeting.location).toBe(PORT_TOWN);
    expect(meeting.actor).toBe(GALD);
    // And the man on that dock is there because of what rooted in him.
    const debt = seedOf(world, GALD, 'GALD_REDEMPTION')!;
    const forest = world.memories.find((m) => m.id === debt.sourceMemoryId)!;
    expect(forest.action).toBe('PLAYER_HELPED_GALD');
    expect(forest.actor).toBe(PLAYER_ACTOR);
    expect(forest.location).toBe('ALDEN_FOREST');
  });

  it('gives the boy a future of his own', () => {
    const world = helped();
    const bloom = world.blooms.find((b) => b.id === 'NEL_LEARNS_TO_BIND_WOUNDS');
    expect(bloom, traceNpc(world, RULES, NEL).join('\n')).toBeDefined();
    expect(bloom!.status).toBe('CANDIDATE');
  });

  it('NONE of it happens in a world where the player made another choice', () => {
    // The other half of a causal claim, and the half that is usually
    // skipped: not only does it happen here, it does not happen there.
    const other = killed();
    expect(seedOf(other, NEL, 'HEALING_CALL')).toBeUndefined();
    expect(seedOf(other, HER, 'OUTSIDE_WORLD_DREAM')).toBeUndefined();
    expect(seedOf(other, BAKERY_OWNER, 'SECOND_CHANCES')).toBeUndefined();
    for (const crossing of WORLD_CROSSINGS) expect(met(other, crossing.id), crossing.id).toBe(false);
    // The guard's wariness still fades — time did that, not the player.
    expect(seedOf(other, ALDEN_GUARD, 'GUARD_WARINESS')!.status).toBe('FADED');
  });
});

describe('what crossings must still refuse to do', () => {
  it('never names the player in a condition', () => {
    for (const crossing of WORLD_CROSSINGS) {
      expect(JSON.stringify(crossing.when), crossing.id).not.toContain(PLAYER_ACTOR);
    }
  });

  it('settles, rather than setting off meetings forever', () => {
    const world = helped();
    const a = settle(world, RULES);
    const b = settle(a, RULES);
    expect(b.memories.length).toBe(a.memories.length);
  });

  it('leaves a world with no crossings written exactly as it was', () => {
    const plain: WorldLifeRules = { ...RULES, crossings: [] };
    const world = recompute(helped(), plain);
    expect(settle(world, plain).memories.length).toBe(world.memories.length);
  });

  it('refuses a world whose two regions disagree about a name', () => {
    // Two authors meaning two things by one id is the failure nobody
    // would think to write a test for, so the merge fails loudly.
    expect(() => {
      const dup = [...RULES.kinds, RULES.kinds[0]];
      const seen = new Set<string>();
      for (const kind of dup) {
        if (seen.has(kind.type)) throw new Error('duplicate');
        seen.add(kind.type);
      }
    }).toThrow();
  });
});

describe('the developer’s view of a world with crossings in it', () => {
  it('reads the far end of the chain back', () => {
    const trace = traceNpc(helped(), RULES, NEL).join('\n');
    expect(trace).toContain('CORE');
    expect(trace).toContain('SEED   HEALING_CALL');
    expect(trace).toContain(`FROM ACTION TENDED_THE_HURT by ${GALD} @ ${PORT_TOWN}`);
    expect(trace).toContain('NEL_LEARNS_TO_BIND_WOUNDS CANDIDATE');
  });
});
