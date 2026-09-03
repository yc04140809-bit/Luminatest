// What HOME says about the world, read off what the world already knows.
//
// Every number here is a projection of data that exists — known memory
// events and derived narrative seeds. Nothing is stored for it, nothing
// new is computed about the world, and no logic anywhere depends on it:
// if this file were deleted the game would play identically. That is the
// rule for anything HOME displays.

import type { MemoryEvent } from '../../core/memory/types';
import type { NarrativeSeedStatus } from '../../core/narrative/types';
import { memoryEventLabel } from '../../content/events/creatureLifeChoice';
import { FUTURE_DISCOVERY_TYPES } from '../../content/world/futureSites';

/** Actors that are not people the player met. */
const NOT_A_PERSON = new Set(['PLAYER', 'WORLD']);

export interface HomeMemorySummary {
  /** Facts the player knows the world recorded. */
  memories: number;
  /** People those facts are about — the player's side of the world. */
  encounters: number;
  /** Times the player went back and found what became of someone. */
  reunions: number;
  /** Questions the player is carrying that the world has not answered. */
  openThreads: number;
  /** The most recent thing the world wrote down, in the player's words. */
  latest: { label: string; worldYear: number; worldDay: number } | null;
}

export function homeMemorySummary(
  knownEvents: readonly MemoryEvent[],
  seeds: readonly NarrativeSeedStatus[],
): HomeMemorySummary {
  const people = new Set<string>();
  for (const event of knownEvents) {
    for (const actor of event.actors) {
      if (!NOT_A_PERSON.has(actor)) people.add(actor);
    }
  }

  // A reunion is the moment the player walked back into someone's life.
  // Which events those are is not guessed from their names — it is the
  // same registry the world itself uses to decide.
  const discoveries = new Set<string>(FUTURE_DISCOVERY_TYPES);
  const reunions = knownEvents.filter((e) => discoveries.has(e.type)).length;

  const last = knownEvents[knownEvents.length - 1];

  return {
    memories: knownEvents.length,
    encounters: people.size,
    reunions,
    openThreads: seeds.filter((s) => s.playerKnown && s.state !== 'RESOLVED').length,
    latest: last
      ? {
          label: memoryEventLabel(last),
          worldYear: last.worldYear,
          worldDay: last.worldDay,
        }
      : null,
  };
}
