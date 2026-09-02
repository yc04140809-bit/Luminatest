// MUGEN EXPERIENCE ENGINE v0.1 — types.
//
// This module knows nothing about Gald, Kaos, Alden or MUGEN at all. It
// describes "an event that may occur at a place, under conditions, once".
// Everything specific lives in src/content/experience/.
//
// The three layers are the shape of a play session, not a difficulty or a
// quality ranking:
//
//   NOW   seconds to a minute. "Something happened."
//   NEXT  leaves a question. "What is that? What happens after?"
//   LIFE  a person's life moving on across years (the Gald chain).
//
// LIFE events are produced by the older, canon-writing EVENT ENGINE
// (core/events) because they are world truth. NOW and NEXT are experience:
// they are what the player bumps into while the world turns.

export type ExperienceLayer = 'NOW' | 'NEXT' | 'LIFE';

/** What an event is FOR. Metadata only — never used to gate anything. */
export type EmotionTarget = 'CURIOSITY' | 'WARMTH' | 'HUMOR' | 'DISCOVERY' | 'QUIET';

/**
 * EVENT DNA — the beginnings of a vocabulary for describing why an event
 * exists. Recorded so playtest results can be read against intent later;
 * the engine itself never reads it.
 */
export interface EventDna {
  emotionTarget: EmotionTarget;
  /** What the player is meant to wonder about, in one phrase. */
  curiosityTarget?: string;
  /** What this event is expected to make the player do or feel. */
  expectedEffect: string;
  /** Foreshadowing, if this event plants or resolves a seed. */
  seed?: { id: string; role: 'PLANTS' | 'RESOLVES' };
}

/**
 * Conditions. Deliberately a tiny closed set: enough for a playtest, not
 * a scripting language. Anything that needs more belongs in content code
 * or in a later version — never in a UI component.
 */
export type ExperienceRequirement =
  | { kind: 'MEMORY_PRESENT'; type: string }
  | { kind: 'MEMORY_ABSENT'; type: string }
  | { kind: 'ANY_MEMORY_PRESENT'; types: string[] }
  | { kind: 'MIN_WORLD_YEAR'; year: number }
  | { kind: 'SEEN'; eventId: string }
  | { kind: 'NOT_SEEN'; eventId: string };

export interface ExperienceEventDef<TContent = unknown> {
  eventId: string;
  layer: ExperienceLayer;
  /** Where it can happen. One place per event keeps lookup trivial. */
  location: string;
  requirements?: ExperienceRequirement[];
  /** Once true = never offered again after it has been seen. */
  once: boolean;
  /** Higher wins when several are available at the same place. */
  priority: number;
  content: TContent;
  dna?: EventDna;
}

/**
 * Everything the engine is allowed to know about the world. The world
 * aggregate supplies it; the engine never imports the world.
 */
export interface ExperienceWorldView {
  hasMemory(type: string): boolean;
  hasSeen(eventId: string): boolean;
  worldYear: number;
  worldDay: number;
}
