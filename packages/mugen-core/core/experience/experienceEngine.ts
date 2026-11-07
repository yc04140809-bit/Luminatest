// MUGEN EXPERIENCE ENGINE — pure eligibility.
//
// definitions + a read-only view of the world in, "what can happen here
// right now" out. No storage, no React, no Phaser, no side effects, and
// no knowledge of any particular game's content.
//
// Choosing between the eligible events is a separate job, and lives one
// layer up in director.ts. The split is the point: eligibility is the
// rules of the world and is not negotiable, pacing is an opinion.

import type {
  EmotionTarget,
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

/** A repeatable event that played recently is resting, not available. */
function isCoolingDown(def: ExperienceEventDef, view: ExperienceWorldView): boolean {
  if (def.once || !def.cooldownDays) return false;
  const last = view.lastSeenDay?.(def.eventId);
  if (last === null || last === undefined) return false;
  const today = view.today ?? 0;
  return today - last < def.cooldownDays;
}

/** Whether this event could happen right now. */
export function isAvailable(def: ExperienceEventDef, view: ExperienceWorldView): boolean {
  if (def.once && view.hasSeen(def.eventId)) return false;
  if (isCoolingDown(def, view)) return false;
  return (def.requirements ?? []).every((req) => requirementHolds(req, view));
}

export interface EventQuery {
  location?: string;
  layer?: ExperienceLayer;
}

const RARITY_WEIGHT = { COMMON: 0, UNCOMMON: -1, RARE: -2 } as const;

/**
 * Rarity nudges an event down its priority tier; it never blocks it.
 * This is the ordering the DIRECTOR starts from before any pacing rule
 * has an opinion.
 */
export function rank(def: ExperienceEventDef): number {
  return def.priority + RARITY_WEIGHT[def.rarity ?? 'COMMON'];
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
    .sort((a, b) => rank(b.def) - rank(a.def) || a.index - b.index)
    .map(({ def }) => def);
}

/** Emotions of the events just played, newest first — for the view. */
export function recentEmotionsOf(
  defs: readonly ExperienceEventDef[],
  playedNewestFirst: readonly string[],
  window: number,
): EmotionTarget[] {
  const byId = new Map(defs.map((d) => [d.eventId, d]));
  const out: EmotionTarget[] = [];
  for (const id of playedNewestFirst) {
    const emotion = byId.get(id)?.dna?.emotionTarget;
    if (emotion) out.push(emotion);
    if (out.length >= window) break;
  }
  return out;
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
