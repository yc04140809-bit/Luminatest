// FROM SOMETHING THAT HAPPENED TO SOMETHING PLANTED.
//
// The step where the engine could most easily cheat, and the one place
// to watch. What is forbidden here is deciding anything about anybody's
// future — this turns a record into a wanting, and a wanting is not a
// future. Nothing below names an outcome, reads a bloom, or knows that
// blooms exist.

import type { WorldClock } from '../time/calendar';
import {
  catchesOn,
  resonance,
  actionDef,
  seedKind,
  type SeedKindDef,
  type WorldActionDef,
} from './defs';
import { ROOTED_AT, statusOf, visibilityOf } from './growth';
import type { NpcCore, WorldMemoryRecord, WorldSeed } from './types';

/**
 * Below this, nothing is planted at all.
 *
 * Not everything that happens near somebody leaves something in them,
 * and a world that records a seed for every passer-by is a world whose
 * seeds mean nothing. A person who is simply not the sort of person
 * this lands on walks away unchanged, and the engine says so by
 * planting nothing rather than by planting a zero.
 */
export const SOW_FLOOR = 0.08;

/**
 * HOW MUCH OF SOMEBODY ONE AFTERNOON MAY EVER BE.
 *
 * Strictly below what it takes to root, and this is the hard limit on
 * the player's reach into anybody's life. However rare the thing shown,
 * however perfectly the person was built to want it, a single doing
 * leaves something that is GROWING at most — something that will fade
 * on its own if nobody ever comes back.
 *
 * Which means no action the player can take settles a future, ever, by
 * construction rather than by careful tuning of content. A life this
 * engine changes is one that was returned to.
 */
export const SOW_CEILING = ROOTED_AT - 0.05;

export interface SowInput {
  memory: WorldMemoryRecord;
  actions: readonly WorldActionDef[];
  kinds: readonly SeedKindDef[];
  /** The people the engine knows anything about. Strangers are skipped. */
  cores: readonly NpcCore[];
}

/**
 * Everyone this particular doing reaches, in the order it reaches them.
 *
 * The actor is not among them unless the action says 'ACTOR'. The
 * default matters — a world where doing a thing planted it in yourself
 * would have the player germinating their own futures every time they
 * cast a spell — and so does the exception: a man who walks out of a
 * forest and spends four months binding other people's wounds is
 * changed by that, and nobody was watching.
 */
export function reachedBy(
  memory: WorldMemoryRecord,
  def: WorldActionDef,
): readonly string[] {
  if (def.reaches === 'ACTOR') return [memory.actor];
  const reached =
    def.reaches === 'TARGET'
      ? memory.target
        ? [memory.target]
        : []
      : [...(memory.target ? [memory.target] : []), ...memory.witnesses];
  const seen = new Set<string>();
  return reached.filter((id) => id !== memory.actor && !seen.has(id) && seen.add(id));
}

/**
 * What this record plants, in whom, and how deep.
 *
 * Returns new seeds only. Feeding a seed somebody already has is a
 * different thing with a different name (`feed` below), because the
 * difference between "she was shown magic once" and "she has been shown
 * magic every spring for four years" is the entire subject of this
 * engine and must not be flattened into one number by accident.
 */
export function sow(input: SowInput, existing: readonly WorldSeed[] = []): WorldSeed[] {
  const { memory, actions, kinds, cores } = input;
  const def = actionDef(actions, memory.action);
  if (!def || !def.plants) return [];
  const kind = seedKind(kinds, def.plants);
  if (!kind) return [];

  const planted: WorldSeed[] = [];
  for (const npcId of reachedBy(memory, def)) {
    const core = cores.find((c) => c.npcId === npcId);
    // Somebody the world has nothing written about is somebody this
    // engine has nothing to say about. Not an error: most of a village
    // is scenery, and scenery must not cost anything.
    if (!core) continue;
    // Nothing in them that this touches: they were present, and that is
    // all. The record of the afternoon still exists; they are simply
    // not in its consequences.
    if (!catchesOn(kind, core)) continue;
    if (existing.some((seed) => seed.targetNpcId === npcId && seed.type === kind.type)) continue;
    const strength = Math.min(SOW_CEILING, def.impact * resonance(kind, core));
    if (strength < SOW_FLOOR) continue;
    planted.push({
      id: seedId(memory, npcId, kind.type),
      targetNpcId: npcId,
      type: kind.type,
      sourceMemoryId: memory.id,
      strength,
      status: statusOf(strength),
      createdAt: memory.time,
      visibility: visibilityOf(strength),
      fedBy: [],
    });
  }
  return planted;
}

/**
 * The same thing happening again, to somebody it already happened to.
 *
 * Worth less than the first time and deliberately so: the second spell
 * anybody sees is not the one they remember. What it buys is time — a
 * wanting that is fed does not fade, and a life changed by this engine
 * is one that was fed for years rather than one that was struck once.
 */
export const FEED_SHARE = 0.55;

export function feed(
  seed: WorldSeed,
  memory: WorldMemoryRecord,
  amount: number,
): WorldSeed {
  if (seed.fedBy.some((fed) => fed.memoryId === memory.id)) return seed;
  const worth = Math.min(SOW_CEILING, amount) * FEED_SHARE;
  return {
    ...seed,
    fedBy: [...seed.fedBy, { memoryId: memory.id, at: memory.time, amount: worth }],
  };
}

/**
 * An id that says where it came from.
 *
 * Derived rather than counted so that the same world replayed from the
 * same records comes out with the same seed ids — which is what makes a
 * saved world, a test and a debug trace able to talk about the same
 * thing.
 */
export function seedId(memory: WorldMemoryRecord, npcId: string, type: string): string {
  return `seed:${type}:${npcId}:${memory.id}`;
}

/** The id of a record, likewise derived and likewise stable. */
export function memoryId(
  action: string,
  actor: string,
  target: string | null,
  time: WorldClock,
): string {
  return `mem:${action}:${actor}>${target ?? '-'}:${time.worldYear}.${time.worldDay}`;
}
