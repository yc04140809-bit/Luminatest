// THE CAUSAL CHAIN, PLAYED OUT AND PRINTED.
//
// A developer's answer to "does the engine actually do what it says",
// runnable without playing anything: it performs a few years of one
// girl's life in Alden and hands back the trace, step by step.
//
// Deliberately not part of the game. Nothing here is written into the
// player's world, nothing reads their save, and no screen outside DEV
// REVIEW HUB imports it.

import { INITIAL_CLOCK } from '../core/time/calendar';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  traceNpc,
  type WorldLifeRules,
} from '../core/life/engine';
import type { WorldLifeState } from '../core/life/types';
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
