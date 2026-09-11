// THE WHOLE CHAIN, in one file, so it can be read in one sitting.
//
//   ACTION → WORLD MEMORY → WORLD SEED → WORLD GROWTH
//          → WORLD VINE → WORLD BLOOM
//
// Six steps, each of which is a pure function of the step before it and
// the world as it stands. Nothing here holds state, schedules anything,
// or runs in the background. A world is a value; doing something to it
// returns a new one.
//
// TIME. There is no player-facing way to move the clock and there is
// not going to be one. Time is what the world and the people in it are
// MADE of, not a resource the player spends — so it moves only when the
// story moves it, through `advanceTime` below, which takes a reason and
// writes that reason into the record. A build where the player can sit
// at a menu and push a village girl through four years is a build where
// her life was never hers.

import { addDays, toAbsoluteDay, type WorldClock } from '../time/calendar';
import { actionDef, seedKind, resonance, type SeedKindDef, type WorldActionDef } from './defs';
import { grownSeed } from './growth';
import { bloomCandidates, allBloomChecks, type BloomCheck } from './bloom';
import { feed, memoryId, reachedBy, sow } from './sow';
import { vinesOf } from './vine';
import type {
  NpcCore,
  WorldBloomDef,
  WorldLifeState,
  WorldMemoryRecord,
  WorldSeed,
} from './types';

/**
 * The world's own rules, handed in rather than imported.
 *
 * So that a test can run a world made of three made-up people without
 * touching the real village, and so that the engine cannot quietly grow
 * a dependency on one particular region's content.
 */
export interface WorldLifeRules {
  actions: readonly WorldActionDef[];
  kinds: readonly SeedKindDef[];
  cores: readonly NpcCore[];
  blooms: readonly WorldBloomDef[];
}

/** A world with nothing in it yet, on a given day. */
export function emptyWorld(now: WorldClock): WorldLifeState {
  return { now, memories: [], seeds: [], vines: [], blooms: [] };
}

/**
 * WHY THE CLOCK MOVED. Never 'THE PLAYER WANTED IT TO'.
 *
 * Every one of these is something the story does. Adding one is a
 * design decision about the shape of the game, which is the correct
 * amount of friction for a thing that ages everybody in the world.
 */
export type TimeAdvanceReason =
  | 'STORY_TIME_ADVANCE'
  | 'CHAPTER_BREAK'
  | 'JOURNEY'
  | 'SEASON_TURN';

/**
 * The world, later.
 *
 * Nothing is recomputed and nothing is aged: the seeds are untouched
 * because a seed already knows how to answer for any date. This
 * function moves one number and writes down why.
 */
export function advanceTime(
  state: WorldLifeState,
  days: number,
  reason: TimeAdvanceReason,
): WorldLifeState {
  const moved = Math.max(0, Math.floor(days));
  if (moved === 0) return state;
  const now = addDays(state.now, moved);
  return {
    ...state,
    now,
    memories: [
      ...state.memories,
      {
        id: `mem:TIME:${reason}:${now.worldYear}.${now.worldDay}`,
        actor: 'WORLD',
        target: null,
        action: reason,
        location: 'WORLD',
        time: now,
        witnesses: [],
        metadata: { days: moved, from: `${state.now.worldYear}.${state.now.worldDay}` },
      },
    ],
  };
}

/** What somebody is about to do, before the world has written it down. */
export interface WorldAction {
  action: string;
  actor: string;
  target?: string | null;
  location: string;
  witnesses?: readonly string[];
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * ONE THING HAPPENING, all the way through.
 *
 * Record it, plant what it plants, feed what it feeds, redraw the lines
 * and see what is now possible. Returned together with a trace of
 * exactly what each step did, because an engine whose causality cannot
 * be read is an engine nobody can trust to be causal.
 */
export interface ObserveResult {
  state: WorldLifeState;
  memory: WorldMemoryRecord;
  /** Seeds planted by this action, as planted. */
  planted: readonly WorldSeed[];
  /** Seeds that already existed and were fed by it. */
  fed: readonly WorldSeed[];
  /** Candidates that were not candidates before this. */
  newBlooms: readonly string[];
}

export function observe(
  state: WorldLifeState,
  doing: WorldAction,
  rules: WorldLifeRules,
): ObserveResult {
  const memory: WorldMemoryRecord = {
    id: memoryId(doing.action, doing.actor, doing.target ?? null, state.now),
    actor: doing.actor,
    target: doing.target ?? null,
    action: doing.action,
    location: doing.location,
    time: state.now,
    witnesses: doing.witnesses ?? [],
    metadata: doing.metadata ?? {},
  };

  // A record is written whether or not anybody was changed by it. Most
  // of what happens in a world changes nobody, and a history that only
  // keeps the consequential parts is a history that has already decided
  // what was consequential.
  if (state.memories.some((held) => held.id === memory.id)) {
    return { state, memory, planted: [], fed: [], newBlooms: [] };
  }
  const memories = [...state.memories, memory];

  const planted = sow({ memory, ...rules }, state.seeds);
  const def = actionDef(rules.actions, memory.action);
  const kind = def?.plants ? seedKind(rules.kinds, def.plants) : null;

  // The same thing happening again to somebody it already happened to.
  const fedIds = new Set<string>();
  const seeds = state.seeds.map((seed) => {
    if (!def || !kind || seed.type !== kind.type) return seed;
    if (!reachedBy(memory, def).includes(seed.targetNpcId)) return seed;
    const core = rules.cores.find((c) => c.npcId === seed.targetNpcId);
    if (!core) return seed;
    fedIds.add(seed.id);
    return feed(seed, memory, def.impact * resonance(kind, core));
  });

  const before = new Set(state.blooms.map((bloom) => bloom.id));
  const next = recompute({ ...state, now: state.now, memories, seeds: [...seeds, ...planted] }, rules);
  return {
    state: next,
    memory,
    planted,
    fed: next.seeds.filter((seed) => fedIds.has(seed.id)),
    newBlooms: next.blooms.filter((bloom) => !before.has(bloom.id)).map((bloom) => bloom.id),
  };
}

/**
 * The derived halves of the world, redrawn from the stored halves.
 *
 * Memories and seeds are what the world IS; vines and blooms are what
 * it currently looks like. Keeping the second pair derived is what
 * stops them from ever being stale or contradicting the first — and it
 * is why moving the clock needs no special handling anywhere.
 */
export function recompute(state: WorldLifeState, rules: WorldLifeRules): WorldLifeState {
  const vines = vinesOf({
    seeds: state.seeds,
    memories: state.memories,
    kinds: rules.kinds,
    now: state.now,
  });
  const blooms = bloomCandidates({
    defs: rules.blooms,
    seeds: state.seeds,
    vines,
    kinds: rules.kinds,
    now: state.now,
    since: state.memories[0]?.time ?? state.now,
  });
  return { ...state, vines, blooms };
}

/** Every seed of one person's, as they stand today. */
export function seedsOf(
  state: WorldLifeState,
  rules: WorldLifeRules,
  npcId: string,
): WorldSeed[] {
  return state.seeds
    .filter((seed) => seed.targetNpcId === npcId)
    .flatMap((seed) => {
      const kind = seedKind(rules.kinds, seed.type);
      return kind ? [grownSeed(seed, kind, state.now)] : [];
    });
}

/** Why one person is the way they are, as lines a developer can read. */
export function traceNpc(
  state: WorldLifeState,
  rules: WorldLifeRules,
  npcId: string,
): string[] {
  const core = rules.cores.find((c) => c.npcId === npcId);
  const lines: string[] = [
    `── ${npcId} @ Y${state.now.worldYear}D${state.now.worldDay} ──`,
    core
      ? `CORE   traits=[${core.traits}] values=[${core.values}] desires=[${core.desires}] aptitudes=${JSON.stringify(core.aptitudes)}`
      : 'CORE   (この世界に記録がない)',
  ];

  const seeds = seedsOf(state, rules, npcId);
  if (seeds.length === 0) lines.push('SEED   なし');
  for (const seed of seeds) {
    const source = state.memories.find((memory) => memory.id === seed.sourceMemoryId);
    const kind = seedKind(rules.kinds, seed.type);
    lines.push(
      `SEED   ${seed.type} ${seed.status} ${seed.strength.toFixed(2)} (${seed.visibility})` +
        `  ← ${kind?.label ?? seed.type}`,
    );
    if (source) {
      lines.push(
        `  FROM ACTION ${source.action} by ${source.actor} @ ${source.location}` +
          ` Y${source.time.worldYear}D${source.time.worldDay}`,
      );
    }
    for (const fed of seed.fedBy) {
      lines.push(`  FED  +${fed.amount.toFixed(2)} @ Y${fed.at.worldYear}D${fed.at.worldDay}`);
    }
  }

  for (const vine of state.vines.filter((v) => v.source === npcId)) {
    lines.push(`VINE   ${vine.relationType} → ${vine.target} [${vine.status}]`);
  }

  for (const check of allBloomChecks({
    defs: rules.blooms.filter((bloom) => bloom.npcId === npcId),
    seeds: state.seeds,
    vines: state.vines,
    kinds: rules.kinds,
    now: state.now,
    since: state.memories[0]?.time ?? state.now,
  })) {
    lines.push(`BLOOM  ${check.def.id} ${check.met ? 'CANDIDATE' : 'まだ'} — ${check.def.result}`);
    for (const reason of check.reasons) {
      lines.push(`  ${reason.met ? '✓' : '·'} ${reason.requirement}: ${reason.detail}`);
    }
  }
  return lines;
}

/** How many days the world has been running, for anything that reports. */
export function worldAge(state: WorldLifeState): number {
  const first = state.memories[0]?.time;
  return first ? toAbsoluteDay(state.now) - toAbsoluteDay(first) : 0;
}

export type { BloomCheck };
