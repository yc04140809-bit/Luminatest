// MUGEN EXPERIENCE ENGINE v0.1 — pure selection.
//
// definitions + a read-only view of the world in, "what can happen here
// right now" out. No storage, no React, no Phaser, no side effects, and
// no knowledge of any particular game's content.

import type {
  ExperienceEventDef,
  ExperienceLayer,
  ExperienceRequirement,
  ExperienceWorldView,
} from './types';

function requirementHolds(req: ExperienceRequirement, view: ExperienceWorldView): boolean {
  switch (req.kind) {
    case 'MEMORY_PRESENT':
      return view.hasMemory(req.type);
    case 'MEMORY_ABSENT':
      return !view.hasMemory(req.type);
    case 'ANY_MEMORY_PRESENT':
      return req.types.some((type) => view.hasMemory(type));
    case 'MIN_WORLD_YEAR':
      return view.worldYear >= req.year;
    case 'SEEN':
      return view.hasSeen(req.eventId);
    case 'NOT_SEEN':
      return !view.hasSeen(req.eventId);
  }
}

/** Whether this event could happen right now. */
export function isAvailable(def: ExperienceEventDef, view: ExperienceWorldView): boolean {
  if (def.once && view.hasSeen(def.eventId)) return false;
  return (def.requirements ?? []).every((req) => requirementHolds(req, view));
}

export interface EventQuery {
  location?: string;
  layer?: ExperienceLayer;
}

/**
 * Every event that could happen now, most important first. Ties break on
 * definition order so the same world always produces the same sequence —
 * a playtest has to be reproducible.
 */
export function findAvailableEvents(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
  query: EventQuery = {},
): ExperienceEventDef[] {
  return defs
    .map((def, index) => ({ def, index }))
    .filter(({ def }) => {
      if (query.location !== undefined && def.location !== query.location) return false;
      if (query.layer !== undefined && def.layer !== query.layer) return false;
      return isAvailable(def, view);
    })
    .sort((a, b) => b.def.priority - a.def.priority || a.index - b.index)
    .map(({ def }) => def);
}

/** The single event to play here, or null when the place has nothing new. */
export function pickEvent(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
  query: EventQuery = {},
): ExperienceEventDef | null {
  return findAvailableEvents(defs, view, query)[0] ?? null;
}

/**
 * Places that have something the player has not met yet.
 *
 * Only once-events count. A repeatable event — an innkeeper who always
 * has a word for you — is hospitality, not news, and a marker that never
 * goes out would stop meaning anything.
 */
export function locationsWithSomethingNew(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
): Set<string> {
  const places = new Set<string>();
  for (const def of findAvailableEvents(defs, view)) {
    if (def.once) places.add(def.location);
  }
  return places;
}
