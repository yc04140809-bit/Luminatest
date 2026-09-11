// THE LINES BETWEEN THINGS, which nobody draws on purpose.
//
// A vine is not a relationship somebody decided to have. It is what you
// see when you notice that everything that has taken root in a person
// points the same way — at one other person, at one place, at one idea.
// So vines are DERIVED, every time, from the seeds as they stand today.
// There is no vine table to keep in agreement with anything, and a vine
// cannot outlive the reason it existed.

import type { WorldClock } from '../time/calendar';
import { atLeast, grownSeed } from './growth';
import { seedKind, type SeedKindDef } from './defs';
import type { WorldMemoryRecord, WorldSeed, WorldVine } from './types';

/**
 * The two kinds there are, and two is the point.
 *
 * 'INSPIRED_BY' points at the person who was there when it started.
 * 'DRAWN_TO'    points at the thing itself, whoever showed it to them.
 *
 * A third kind is a design decision and should be argued for; the
 * temptation to add 'RESENTS', 'OWES', 'FEARS' and so on before
 * anything in the game reads even these two is exactly the temptation
 * that turns a small engine into an unfinished large one.
 */
export type VineRelation = 'INSPIRED_BY' | 'DRAWN_TO';

export interface VineInput {
  seeds: readonly WorldSeed[];
  memories: readonly WorldMemoryRecord[];
  kinds: readonly SeedKindDef[];
  now: WorldClock;
}

/**
 * Every line currently held, drawn fresh from the seeds.
 *
 * A seed that has faded draws a BROKEN vine rather than no vine: a
 * thing somebody used to be full of and is not any more is a fact about
 * them, and a world that simply forgets it has no room for anybody to
 * have given up on something.
 */
export function vinesOf(input: VineInput): WorldVine[] {
  const { seeds, memories, kinds, now } = input;
  const vines = new Map<string, WorldVine>();

  for (const stored of seeds) {
    const kind = seedKind(kinds, stored.type);
    if (!kind) continue;
    const seed = grownSeed(stored, kind, now);
    const status: WorldVine['status'] =
      seed.status === 'FADED' ? 'BROKEN' : seed.status === 'ROOTED' ? 'HELD' : 'FORMING';
    // Below this nothing is visible even to the person themselves, and
    // a line nobody could name is not a line.
    if (!atLeast(seed.status, 'GROWING') && status !== 'BROKEN') continue;

    add(vines, seed.targetNpcId, seed.type, 'DRAWN_TO', seed.id, status);

    const source = memories.find((memory) => memory.id === seed.sourceMemoryId);
    if (source && source.actor !== seed.targetNpcId) {
      add(vines, seed.targetNpcId, source.actor, 'INSPIRED_BY', seed.id, status);
    }
  }
  return [...vines.values()];
}

function add(
  into: Map<string, WorldVine>,
  source: string,
  target: string,
  relationType: VineRelation,
  seedId: string,
  status: WorldVine['status'],
): void {
  const id = `vine:${relationType}:${source}>${target}`;
  const held = into.get(id);
  if (!held) {
    into.set(id, { id, source, target, relationType, sourceSeedIds: [seedId], status });
    return;
  }
  into.set(id, {
    ...held,
    sourceSeedIds: [...held.sourceSeedIds, seedId],
    // One living seed is enough to hold a line that another has let go
    // of: a person with two reasons for something has not stopped
    // having it because one of them wore out.
    status: strongest(held.status, status),
  });
}

const HOLD: Record<WorldVine['status'], number> = { BROKEN: 0, FORMING: 1, HELD: 2 };
function strongest(a: WorldVine['status'], b: WorldVine['status']): WorldVine['status'] {
  return HOLD[a] >= HOLD[b] ? a : b;
}

/** Whether this person currently holds this particular line. */
export function holdsVine(
  vines: readonly WorldVine[],
  source: string,
  target: string,
  relationType: string,
): boolean {
  return vines.some(
    (vine) =>
      vine.source === source &&
      vine.target === target &&
      vine.relationType === relationType &&
      vine.status !== 'BROKEN',
  );
}

/** Everything currently pointing out of one person. For a trace to read. */
export function vinesFrom(vines: readonly WorldVine[], npcId: string): WorldVine[] {
  return vines.filter((vine) => vine.source === npcId);
}
