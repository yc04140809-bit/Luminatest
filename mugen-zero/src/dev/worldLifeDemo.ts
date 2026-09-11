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
import { allCrossingChecks } from '../core/life/crossing';
import {
  MUGEN_WORLD_RULES,
  NEL,
  PORT_TOWN,
  WORLD_CROSSINGS,
} from '../content/world/mugenWorld';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  replayCanon,
  settle,
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
  GREENWOOD_PRELUDE,
} from '../content/world/galdLife';
import {
  ALDEN_VILLAGE_ACTOR,
  KAOS_ACTOR,
  LINA,
  MARTA,
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
        target: LINA.npcId,
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
  return { steps, trace: traceNpc(world, RULES, LINA.npcId), state: world };
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


// ---------------------------------------------------------------------
// LINA — one seed, four women.
//
// The second character the engine watches, and the claim that decides
// whether a life-collecting game is possible at all: the same
// SEED_MAGIC_DREAM, in the same girl, planted by the same afternoon,
// becomes a different life depending only on what else the world did.
//
// Every world below opens identically. Nothing chooses between the
// endings. Read the four side by side and the difference is never the
// player — it is whether the village was raided, whether anybody bound
// a wound in front of her, whether Kaos kept telling her what was out
// there, and whether anybody came back at all.

const LINA_RULES: WorldLifeRules = {
  actions: ALDEN_ACTIONS,
  kinds: ALDEN_SEED_KINDS,
  cores: ALDEN_CORES,
  blooms: ALDEN_BLOOMS,
};

const HER = LINA.npcId;

function happens(
  state: WorldLifeState,
  action: string,
  actor: string,
  extra: { target?: string | null; witnesses?: string[] } = {},
): WorldLifeState {
  return observe(
    state,
    {
      action,
      actor,
      target: extra.target ?? HER,
      location: 'ALDEN_VILLAGE',
      witnesses: extra.witnesses ?? [MARTA.npcId],
    },
    LINA_RULES,
  ).state;
}

const on = (state: WorldLifeState, days: number) =>
  advanceTime(state, days, 'STORY_TIME_ADVANCE');

/** The one afternoon every life below starts from. */
const theAfternoon = () =>
  happens(emptyWorld(INITIAL_CLOCK), 'SHOW_MAGIC', KAOS_ACTOR);

function comesBack(state: WorldLifeState, times: number): WorldLifeState {
  let world = state;
  for (let i = 0; i < times; i++) world = happens(on(world, 150), 'SHOW_MAGIC', KAOS_ACTOR);
  return world;
}

const raid = (state: WorldLifeState) =>
  happens(state, 'VILLAGE_ATTACKED', 'BANDITS', {
    target: ALDEN_VILLAGE_ACTOR,
    witnesses: [HER, MARTA.npcId],
  });

export interface LinaWorld {
  /** What was different about this one, in one line. */
  life: string;
  /** What the world did, as a list. */
  happened: readonly string[];
  /** Which futures are open, with the sentence each would be. */
  futures: readonly string[];
  trace: readonly string[];
}

/**
 * Four worlds, built from the same childhood.
 *
 * Each one is a handful of lines, and the difference between any two of
 * them is what happened to a village.
 */
export function runLinaFuturesDemo(): LinaWorld[] {
  const attacked = () => {
    let w = comesBack(theAfternoon(), 4);
    w = raid(on(w, 50));
    w = raid(on(w, 300));
    return recompute(on(w, 200), LINA_RULES);
  };
  const helped = () => {
    let w = comesBack(theAfternoon(), 4);
    for (let i = 0; i < 3; i++) {
      w = happens(on(w, 150), 'TENDED_THE_HURT', KAOS_ACTOR, {
        target: MARTA.npcId,
        witnesses: [HER],
      });
    }
    return recompute(on(w, 100), LINA_RULES);
  };
  const told = () => {
    let w = theAfternoon();
    for (let i = 0; i < 6; i++) {
      w = happens(on(w, 150), 'TELL_OF_THE_WORLD', KAOS_ACTOR);
      w = happens(w, 'SHOW_MAGIC', KAOS_ACTOR);
    }
    return recompute(on(w, 60), LINA_RULES);
  };
  const alone = () => recompute(on(theAfternoon(), 1500), LINA_RULES);

  const worlds: { life: string; happened: string[]; build: () => WorldLifeState }[] = [
    {
      life: 'A  襲われた村',
      happened: ['ケイオスが魔法を見せる ×5', '盗賊の襲撃 ×2（リナが見ている）'],
      build: attacked,
    },
    {
      life: 'B  傷を診ていた村',
      happened: ['ケイオスが魔法を見せる ×5', '目の前で傷の手当て ×3'],
      build: helped,
    },
    {
      life: 'C  外を語られた村',
      happened: ['ケイオスが魔法を見せる ×7', 'ケイオスが外の世界を語る ×6'],
      build: told,
    },
    {
      life: 'D  誰も戻らなかった村',
      happened: ['ケイオスが魔法を見せる ×1', 'その後、四年間なにもない'],
      build: alone,
    },
  ];

  return worlds.map(({ life, happened, build }) => {
    const world = build();
    return {
      life,
      happened,
      futures: world.blooms.map((bloom) => `${bloom.id} — ${bloom.result}`),
      trace: traceNpc(world, LINA_RULES, HER),
    };
  });
}

/** The comparison as one block, for a console or a dev panel. */
export function linaFuturesText(): string {
  return runLinaFuturesDemo()
    .flatMap((world) => [
      `########## ${world.life}`,
      ...world.happened.map((line) => `  ${line}`),
      ...world.futures.map((line) => `  → ${line}`),
      '',
    ])
    .join('\n');
}


// ---------------------------------------------------------------------
// WHERE LIVES CROSS, and how far one decision travels.
//
// The last and largest of the demonstrations: a player action in a
// forest outside Alden, followed all the way to a boy on a dock in a
// town the player has never visited and will never visit.
//
// Read the meeting list and note who is in it. After the first line,
// never the player.

const WORLD_RULES: WorldLifeRules = MUGEN_WORLD_RULES;
const LINA_ID = LINA.npcId;

const CROSSING_CANON: readonly { type: MemoryEventType; day: number; actors: string[]; at: string }[] =
  [
    { type: 'PLAYER_HELPED_GALD', day: 1, actors: [PLAYER_ACTOR, GALD], at: 'ALDEN_FOREST' },
    { type: 'GALD_WALKS_THE_ROAD', day: 5, actors: [GALD], at: 'GREENWOOD_FOREST' },
    { type: 'GALD_BECOMES_HEALER', day: 125, actors: [GALD], at: 'GREENWOOD_WAYSTATION' },
  ];

export interface CrossingDemo {
  steps: readonly string[];
  /** Every meeting the world produced, in the order it produced them. */
  meetings: readonly string[];
  /** Why any that have not happened have not happened. */
  waiting: readonly string[];
  /** The far end: a boy the player never met. */
  faraway: readonly string[];
}

/**
 * One forest, four days' walk, and five years.
 *
 * Time is moved in story-sized steps rather than one jump, because that
 * is how the game moves it and because a meeting is recorded when the
 * story next looks.
 */
export function runCrossingDemo(): CrossingDemo {
  const steps: string[] = [];

  let world = emptyWorld(INITIAL_CLOCK);
  for (const fact of GREENWOOD_PRELUDE) {
    world = observe(world, { ...fact, witnesses: [...fact.witnesses] }, WORLD_RULES).state;
  }
  steps.push('WORLD  盗賊が街道で働いていた → 衛兵に GUARD_WARINESS');

  for (let i = 0; i < 5; i++) {
    if (i > 0) world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
    world = observe(
      world,
      {
        action: 'SHOW_MAGIC',
        actor: KAOS_ACTOR,
        target: LINA_ID,
        location: 'ALDEN_VILLAGE',
        witnesses: [MARTA.npcId],
      },
      WORLD_RULES,
    ).state;
  }
  steps.push('ACTION ケイオスがリナに魔法を見せる ×5 → LINA に MAGIC_DREAM');

  world = replayCanon(
    world,
    canonAsWorldMemories(
      CROSSING_CANON.map((spec) => {
        const when = addDays(INITIAL_CLOCK, spec.day);
        return {
          id: `demo_cross_${spec.type}`,
          type: spec.type,
          worldYear: when.worldYear,
          worldDay: when.worldDay,
          location: spec.at,
          actors: spec.actors,
          importance: 'MAJOR' as const,
          createdAt: new Date(0).toISOString(),
        };
      }),
    ),
    WORLD_RULES,
  );
  steps.push('ACTION PLAYERがガルドをHELP（森） → GALD に GALD_REDEMPTION');
  steps.push('CANON  街道へ / 街道の救護者に（EVENT ENGINE）');

  while (toAbsoluteDay(world.now) - 1 < 1500) {
    const step = Math.min(180, 1500 - (toAbsoluteDay(world.now) - 1));
    world = settle(advanceTime(world, step, 'STORY_TIME_ADVANCE'), WORLD_RULES);
  }
  steps.push(`TIME   約4年 → Y${world.now.worldYear}D${world.now.worldDay}`);

  const meetings = world.memories
    .filter((memory) => memory.id.startsWith('cross:'))
    .map(
      (memory) =>
        `Y${memory.time.worldYear}D${memory.time.worldDay}  ${memory.id.slice(6)}` +
        `\n        ${memory.actor} → ${memory.target ?? '—'} @ ${memory.location}`,
    );

  const waiting = allCrossingChecks(WORLD_CROSSINGS, {
    state: world,
    kinds: WORLD_RULES.kinds,
    cores: WORLD_RULES.cores,
  })
    .filter((check) => !check.already)
    .flatMap((check) => [
      `${check.def.id} — まだ`,
      ...check.reasons.map((r) => `  ${r.met ? '✓' : '·'} ${r.requirement}: ${r.detail}`),
    ]);

  return {
    steps,
    meetings,
    waiting: waiting.length > 0 ? waiting : ['（書かれた交差はすべて起きた）'],
    faraway: traceNpc(world, WORLD_RULES, NEL),
  };
}

/**
 * THE DEMONSTRATION WORLD, as a world rather than as a printout.
 *
 * The same HELP route four years on that `runCrossingDemo` narrates,
 * handed back whole so GOD VIEW can be pointed at it. An author whose
 * save is one day old still needs something to look at, and a world
 * built from the real rules is a better answer than fixtures.
 */
export function grownDemoWorld(days = 1500): WorldLifeState {
  let world = emptyWorld(INITIAL_CLOCK);
  for (const fact of GREENWOOD_PRELUDE) {
    world = observe(world, { ...fact, witnesses: [...fact.witnesses] }, WORLD_RULES).state;
  }
  for (let i = 0; i < 5; i++) {
    if (i > 0) world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
    world = observe(
      world,
      {
        action: 'SHOW_MAGIC',
        actor: KAOS_ACTOR,
        target: LINA_ID,
        location: 'ALDEN_VILLAGE',
        witnesses: [MARTA.npcId],
      },
      WORLD_RULES,
    ).state;
  }
  world = replayCanon(
    world,
    canonAsWorldMemories(
      CROSSING_CANON.map((spec) => {
        const when = addDays(INITIAL_CLOCK, spec.day);
        return {
          id: `demo_cross_${spec.type}`,
          type: spec.type,
          worldYear: when.worldYear,
          worldDay: when.worldDay,
          location: spec.at,
          actors: spec.actors,
          importance: 'MAJOR' as const,
          createdAt: new Date(0).toISOString(),
        };
      }),
    ),
    WORLD_RULES,
  );
  while (toAbsoluteDay(world.now) - 1 < days) {
    const step = Math.min(180, days - (toAbsoluteDay(world.now) - 1));
    world = settle(advanceTime(world, step, 'STORY_TIME_ADVANCE'), WORLD_RULES);
  }
  return settle(world, WORLD_RULES);
}

/** The whole thing as one block, for a console. */
export function crossingDemoText(): string {
  const demo = runCrossingDemo();
  return [
    ...demo.steps,
    '',
    `===== 交差した出会い（PLAYERはこの先どこにもいない） =====`,
    ...demo.meetings,
    '',
    `===== ${PORT_TOWN}：PLAYERが行ったことのない町 =====`,
    ...demo.faraway,
  ].join('\n');
}
