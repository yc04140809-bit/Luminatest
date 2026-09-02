// MUGEN EXPERIENCE ENGINE v0.1 — pure selection.
//
// definitions + a read-only view of the world in, "what can happen here
// right now" out. No storage, no React, no Phaser, no side effects, and
// no knowledge of any particular game's content.

import type {
  EmotionTarget,
  ExperienceEventDef,
  ExperienceLayer,
  ExperienceRequirement,
  ExperienceWorldView,
} from './types';

/**
 * EXPERIENCE CONTROL v0.2 — the pacing knobs.
 *
 * This is not a director and must not become one. It expresses three
 * things a human designer would otherwise have to hand-tune forever:
 * a repeatable beat should not come round immediately, four jokes in a
 * row is not variety, and a world that keeps asking questions it never
 * answers stops being intriguing and starts being noise.
 */
export interface ExperienceControl {
  /** How many recent events count as "just now" for emotion variety. */
  emotionWindow: number;
  /** Stop planting new questions once this many are still open. */
  maxUnresolvedSeeds: number;
}

export const DEFAULT_CONTROL: ExperienceControl = {
  emotionWindow: 2,
  maxUnresolvedSeeds: 2,
};

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

/** Rarity nudges an event down its priority tier; it never blocks it. */
function rank(def: ExperienceEventDef): number {
  return def.priority + RARITY_WEIGHT[def.rarity ?? 'COMMON'];
}

/** The world has stopped answering: hold back new questions for now. */
function plantsANewSeed(def: ExperienceEventDef): boolean {
  return def.dna?.seed?.role === 'PLANTS';
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

/**
 * The single event to play here, or null when the place has nothing.
 *
 * Availability is decided first and never overruled — pacing only chooses
 * BETWEEN things that could all legitimately happen. If the pacing rules
 * would leave the player with nothing, they yield: an empty room is worse
 * than a repeated feeling.
 */
export function pickEvent(
  defs: readonly ExperienceEventDef[],
  view: ExperienceWorldView,
  query: EventQuery = {},
  control: ExperienceControl = DEFAULT_CONTROL,
): ExperienceEventDef | null {
  const available = findAvailableEvents(defs, view, query);
  if (available.length === 0) return null;

  // Too many open questions already: stop planting more, unless that is
  // all this place has.
  const openSeeds = view.unresolvedSeeds ?? 0;
  let pool = available;
  if (openSeeds >= control.maxUnresolvedSeeds) {
    const withoutNewSeeds = pool.filter((def) => !plantsANewSeed(def));
    if (withoutNewSeeds.length > 0) pool = withoutNewSeeds;
  }

  // Four jokes in a row is not variety. Prefer a different feeling from
  // the last few, but only among equals — a rumour still outranks a gag.
  const recent = (view.recentEmotions ?? []).slice(0, control.emotionWindow);
  if (recent.length > 0) {
    const topRank = rank(pool[0]);
    const tier = pool.filter((def) => rank(def) === topRank);
    const fresh = tier.find(
      (def) => def.dna?.emotionTarget && !recent.includes(def.dna.emotionTarget),
    );
    if (fresh) return fresh;
  }
  return pool[0];
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
