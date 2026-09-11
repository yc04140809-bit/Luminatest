// THE CAUSAL CHAIN, PLAYED OUT AND PRINTED.
//
// A developer's answer to "does the engine actually do what it says",
// runnable without playing anything: it performs a few years of one
// girl's life in Alden and hands back the trace, step by step.
//
// Deliberately not part of the game. Nothing here is written into the
// player's world, nothing reads their save, and no screen outside DEV
// REVIEW HUB imports it.

import { INITIAL_CLOCK, addDays, toAbsoluteDay } from '../core/time/calendar';
import type { MemoryEvent, MemoryEventType } from '../core/memory/types';
import { canonAsWorldMemories } from '../core/life/canonBridge';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  replayCanon,
  traceNpc,
  type WorldLifeRules,
} from '../core/life/engine';
import type { WorldLifeState } from '../core/life/types';
import {
  ALDEN_GUARD,
  GALD,
  HELP_AFTER_BATTLE,
  GALD_ACTIONS,
  GALD_BLOOMS,
  GALD_CORES,
  GALD_SEED_KINDS,
} from '../content/world/galdLife';
import {
  ALDEN_ACTIONS,
  ALDEN_BLOOMS,
  ALDEN_CORES,
  ALDEN_SEED_KINDS,
  PLAYER_ACTOR,
} from '../content/world/aldenLife';

const RULES: WorldLifeRules = {
  actions: ALDEN_ACTIONS,
  kinds: ALDEN_SEED_KINDS,
  cores: ALDEN_CORES,
  blooms: ALDEN_BLOOMS,
};

/**
 * How many times the player comes back to the well.
 *
 * Four, which is what it takes — and having to say a number here at all
 * is the demonstration: one visit is an afternoon, four across three
 * years is a life going a different way.
 */
const VISITS = 4;
const DAYS_BETWEEN = 150;

export interface WorldLifeDemo {
  /** Every step, in the order the world took them. */
  steps: readonly string[];
  /** What a developer would read about Lina at the end. */
  trace: readonly string[];
  state: WorldLifeState;
}

/**
 * One girl, four visits, three years.
 *
 * Runs the whole chain — ACTION, MEMORY, SEED, GROWTH, VINE, BLOOM —
 * and narrates each step in the engine's own terms rather than in a
 * summary, so a step that stops happening shows up as a line that stops
 * being printed.
 */
export function runAldenDemo(): WorldLifeDemo {
  const steps: string[] = [];
  let world = emptyWorld(INITIAL_CLOCK);

  for (let visit = 0; visit < VISITS; visit++) {
    if (visit > 0) {
      world = advanceTime(world, DAYS_BETWEEN, 'STORY_TIME_ADVANCE');
      steps.push(`TIME   +${DAYS_BETWEEN}日 (STORY_TIME_ADVANCE) → Y${world.now.worldYear}D${world.now.worldDay}`);
    }
    const result = observe(
      world,
      {
        action: 'SHOW_MAGIC',
        actor: PLAYER_ACTOR,
        target: 'alden_lina',
        location: 'ALDEN_VILLAGE',
        witnesses: ['alden_marta'],
        metadata: { spell: 'starlight_bolt' },
      },
      RULES,
    );
    world = result.state;
    steps.push(`ACTION SHOW_MAGIC → MEMORY ${result.memory.id}`);
    for (const seed of result.planted) {
      steps.push(`  SEED 新規 ${seed.type} → ${seed.targetNpcId} (${seed.strength.toFixed(2)} ${seed.status})`);
    }
    for (const seed of result.fed) {
      steps.push(`  SEED 補強 ${seed.type} → ${seed.targetNpcId} (${seed.fedBy.length}回目)`);
    }
    if (result.planted.length === 0 && result.fed.length === 0) {
      steps.push('  SEED なし（誰にも根づかなかった）');
    }
    for (const id of result.newBlooms) steps.push(`  BLOOM 候補が立った: ${id}`);
  }

  world = recompute(world, RULES);
  return { steps, trace: traceNpc(world, RULES, 'alden_lina'), state: world };
}

/** The whole thing as one block, for a console or a dev panel. */
export function aldenDemoText(): string {
  const demo = runAldenDemo();
  return [...demo.steps, '', ...demo.trace].join('\n');
}


// ---------------------------------------------------------------------
// GALD — the HELP route, three years of it.
//
// The engine's first vertical slice, run without playing anything: the
// player binds a beaten bandit's wounds, canon does what canon does,
// nobody does anything to the guard, and three years later there is a
// scene. Every step printed, so that a step which stops happening shows
// up as a line that stops being printed.

const GALD_RULES: WorldLifeRules = {
  actions: GALD_ACTIONS,
  kinds: GALD_SEED_KINDS,
  cores: GALD_CORES,
  blooms: GALD_BLOOMS,
};

/** The HELP route as the EVENT ENGINE actually fires it. */
const HELP_ROUTE_CANON: readonly { type: MemoryEventType; day: number; actors: string[]; at: string }[] = [
  { type: 'GALD_WALKS_THE_ROAD', day: 4, actors: [GALD], at: 'GREENWOOD_FOREST' },
  { type: 'GALD_BECOMES_HEALER', day: 124, actors: [GALD], at: 'GREENWOOD_WAYSTATION' },
  {
    type: 'PLAYER_MET_GALD_ON_THE_ROAD',
    day: 1096,
    actors: [PLAYER_ACTOR, GALD],
    at: 'GREENWOOD_WAYSTATION',
  },
];

function canonEvent(spec: (typeof HELP_ROUTE_CANON)[number]): MemoryEvent {
  const when = addDays(INITIAL_CLOCK, spec.day);
  return {
    id: `demo_${spec.type}`,
    type: spec.type,
    worldYear: when.worldYear,
    worldDay: when.worldDay,
    location: spec.at,
    actors: spec.actors,
    importance: 'MAJOR',
    createdAt: new Date(0).toISOString(),
  };
}

export interface GaldLifeDemo {
  steps: readonly string[];
  /** His side of it. */
  gald: readonly string[];
  /** And the guard's, which nobody acted on. */
  guard: readonly string[];
  state: WorldLifeState;
}

/**
 * PLAYER → HELP → MEMORY → SEED → 時間 → GROWTH → BLOOM.
 *
 * Note what the player does here: one thing, at the start. Everything
 * after it is canon firing on its own and time passing, which is the
 * claim the whole engine makes about how a life changes.
 */
export function runGaldHelpDemo(): GaldLifeDemo {
  const steps: string[] = [];

  // The greenwood before any of it. Not the player's doing.
  let world = observe(
    emptyWorld(INITIAL_CLOCK),
    {
      action: 'BANDITS_WORKED_THE_ROAD',
      actor: GALD,
      target: null,
      location: 'GREENWOOD_FOREST',
      witnesses: [ALDEN_GUARD],
    },
    GALD_RULES,
  ).state;
  steps.push('WORLD  盗賊が街道で働いていた → 衛兵に GUARD_WARINESS');

  const helped = observe(
    world,
    {
      action: HELP_AFTER_BATTLE,
      actor: PLAYER_ACTOR,
      target: GALD,
      location: 'ALDEN_FOREST',
      metadata: { choice: 'HELP' },
    },
    GALD_RULES,
  );
  world = helped.state;
  steps.push(
    `ACTION ${HELP_AFTER_BATTLE} (PLAYER → GALD, 設計上のHELP_AFTER_BATTLE)` +
      ` → MEMORY ${helped.memory.id}`,
  );
  for (const seed of helped.planted) {
    steps.push(`  SEED 新規 ${seed.type} → ${seed.targetNpcId} (${seed.strength.toFixed(2)} ${seed.status})`);
  }
  steps.push('  ※ この時点で更生は確定していない');

  world = replayCanon(world, canonAsWorldMemories(HELP_ROUTE_CANON.map(canonEvent)), GALD_RULES);
  for (const spec of HELP_ROUTE_CANON) {
    steps.push(`CANON  +${spec.day}日 ${spec.type}（EVENT ENGINEが発火。LIFE ENGINEは読むだけ）`);
  }

  const toGo = 1096 - (toAbsoluteDay(world.now) - 1);
  if (toGo > 0) world = advanceTime(world, toGo, 'STORY_TIME_ADVANCE');
  world = recompute(world, GALD_RULES);
  steps.push(`TIME   3年後 → Y${world.now.worldYear}D${world.now.worldDay}`);
  for (const bloom of world.blooms) steps.push(`BLOOM  ${bloom.id} — ${bloom.result}`);

  return {
    steps,
    gald: traceNpc(world, GALD_RULES, GALD),
    guard: traceNpc(world, GALD_RULES, ALDEN_GUARD),
    state: world,
  };
}

/** The whole thing as one block, for a console or a dev panel. */
export function galdDemoText(): string {
  const demo = runGaldHelpDemo();
  return [...demo.steps, '', ...demo.gald, '', ...demo.guard].join('\n');
}
