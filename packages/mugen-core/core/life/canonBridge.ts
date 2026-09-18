// WHERE THE ENGINE READS CANON, AND NOWHERE ELSE DOES IT TOUCH IT.
//
// WORLD MEMORY — the write-once store of what actually happened — is
// the game's truth. It says Gald was helped, took to the road, and
// became a healer at a waystation, and those facts are settled by the
// EVENT ENGINE, not by anything here.
//
// The WORLD LIFE ENGINE is a second reading of the same events. It
// never writes one, never contradicts one, and could be deleted
// tomorrow without a single canonical fact changing. What it adds is
// the part canon has no room for: not WHAT he did, but what it did to
// him, and to the man who used to hunt him.
//
// The direction is one-way and must stay that way. If anything in this
// file ever grew a function that wrote a MemoryEvent, the engine would
// have become a second author of canon and the four routes would no
// longer be four routes.

import type { MemoryEvent } from '../memory/types';
import type { WorldMemoryRecord } from './types';

/**
 * A canonical fact, in the words the life engine understands.
 *
 * The event's own type becomes the action, unchanged — so a life engine
 * rule that responds to `GALD_BECOMES_HEALER` is responding to the
 * canonical fact by its canonical name, and a route that stops firing
 * that event stops feeding whatever grew on it. There is no second
 * naming of anything and no place for the two to drift apart.
 */
export function asWorldMemory(event: MemoryEvent): WorldMemoryRecord {
  const [actor = 'WORLD', ...rest] = event.actors;
  return {
    id: `canon:${event.id}`,
    // Canon records who was involved, not who did it to whom, so the
    // first actor is read as the doer and the rest as those it reached.
    // Content that needs the distinction says so in its own action
    // definitions rather than by rewriting history here.
    actor,
    target: rest[0] ?? null,
    action: event.type,
    location: event.location,
    time: { worldYear: event.worldYear, worldDay: event.worldDay },
    witnesses: rest.slice(1),
    metadata: {
      canon: true,
      importance: event.importance,
      ...(event.causedBy ? { causedBy: event.causedBy.join(',') } : {}),
    },
  };
}

/**
 * Every canonical fact, oldest first.
 *
 * Sorted by world time rather than by insertion, because the engine's
 * whole arithmetic is about when things happened relative to each
 * other, and a store is under no obligation to hand them back in order.
 */
export function canonAsWorldMemories(events: readonly MemoryEvent[]): WorldMemoryRecord[] {
  return [...events]
    .map(asWorldMemory)
    .sort(
      (a, b) =>
        a.time.worldYear - b.time.worldYear ||
        a.time.worldDay - b.time.worldDay ||
        a.id.localeCompare(b.id),
    );
}

/** Whether a life-engine record came from canon rather than from play. */
export function isCanon(memory: WorldMemoryRecord): boolean {
  return memory.metadata.canon === true;
}
