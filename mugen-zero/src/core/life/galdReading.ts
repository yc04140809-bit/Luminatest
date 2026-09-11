// GALD'S LIFE, READ OFF THE PLAYER'S OWN WORLD.
//
// The connection between the game that is actually being played and the
// engine that watches what it does to people. One function, one
// direction: canon in, a reading out.
//
// Everything a live world needs that a test does not is here — the
// greenwood's own past, and the clock the player is actually standing
// at — so that the same rules that produce the demonstration produce
// the real thing, with no second set of numbers anywhere.

import type { WorldClock } from '../time/calendar';
import type { MemoryEvent } from '../memory/types';
import { canonAsWorldMemories } from './canonBridge';
import {
  emptyWorld,
  observe,
  recompute,
  replayCanon,
  type WorldLifeRules,
} from './engine';
import type { WorldLifeState } from './types';
import {
  GALD_ACTIONS,
  GALD_BLOOMS,
  GALD_CORES,
  GALD_SEED_KINDS,
  GREENWOOD_PRELUDE,
} from '../../content/world/galdLife';

export const GALD_LIFE_RULES: WorldLifeRules = {
  actions: GALD_ACTIONS,
  kinds: GALD_SEED_KINDS,
  cores: GALD_CORES,
  blooms: GALD_BLOOMS,
};

/**
 * What this world has made of him so far.
 *
 * Rebuilt from canon every time rather than stored anywhere: there is
 * no life-engine save file, nothing to migrate, and nothing that can
 * fall out of step with the history it was derived from. A world loaded
 * from disk and a world played straight through give the same reading,
 * because they are the same reading of the same facts.
 *
 * Costs one pass over the event log, which is a few dozen entries.
 *
 * It is READ-ONLY with respect to the game. Nothing here writes a
 * MemoryEvent, changes a CharacterState, or decides anything the four
 * routes have an opinion about — canon says what happened to Gald, and
 * this says what it did to him and to the man who used to hunt him.
 */
export function readGaldLife(
  events: readonly MemoryEvent[],
  now: WorldClock,
): WorldLifeState {
  // The greenwood's own past first, at the world's first day, so the
  // guard's wariness is older than anything the player did.
  let world = emptyWorld({ worldYear: 1, worldDay: 1 });
  for (const fact of GREENWOOD_PRELUDE) {
    world = observe(world, { ...fact, witnesses: [...fact.witnesses] }, GALD_LIFE_RULES).state;
  }
  world = replayCanon(world, canonAsWorldMemories(events), GALD_LIFE_RULES);
  // And then to where the player is standing, which may be well past
  // the last thing that happened.
  return recompute({ ...world, now: laterOf(world.now, now) }, GALD_LIFE_RULES);
}

function laterOf(a: WorldClock, b: WorldClock): WorldClock {
  if (b.worldYear > a.worldYear) return b;
  if (b.worldYear === a.worldYear && b.worldDay > a.worldDay) return b;
  return a;
}
