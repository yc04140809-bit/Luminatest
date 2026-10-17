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
 * How much presentation an event is worth. Recorded now so the budget
 * can be planned against intent later; nothing reads it yet, and the
 * engine never will — it is a note to ourselves, not a switch.
 *
 *   NORMAL     a villager, a rumour, a passing beat
 *   FEATURED   a named person, a discovery
 *   CINEMATIC  a life turning, a core moment
 */
export type VisualTier = 'NORMAL' | 'FEATURED' | 'CINEMATIC';

/**
 * EVENT DNA — the beginnings of a vocabulary for describing why an event
 * exists. Recorded so playtest results can be read against intent later;
 * the engine itself never reads it.
 */
export interface EventDna {
  emotionTarget: EmotionTarget;
  /** Presentation budget this event deserves. Descriptive only. */
  visualTier?: VisualTier;
  /** What the player is meant to wonder about, in one phrase. */
  curiosityTarget?: string;
  /** What this event is expected to make the player do or feel. */
  expectedEffect: string;
  /** Foreshadowing, if this event plants or resolves a seed. */
  seed?: { id: string; role: 'PLANTS' | 'RESOLVES' };
  /**
   * Who the player actually meets here. The DIRECTOR uses it to stop one
   * face filling every beat; it is a cast list, not a requirement, and
   * an event with nobody in it simply omits it.
   */
  characters?: string[];
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

/**
 * How often an event should turn up relative to its neighbours. Only
 * meaningful among events of equal priority — it is a tie-breaker, not a
 * lottery: the same world always plays the same sequence.
 */
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE';

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
  /** Repeatable events only: days that must pass before it comes round again. */
  cooldownDays?: number;
  rarity?: Rarity;
  /**
   * A beat the story cannot do without. The DIRECTOR may never push a
   * core event down for pacing — being bored is recoverable, missing the
   * story is not.
   */
  core?: boolean;
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
  /**
   * EXPERIENCE CONTROL v0.2 — what the last few minutes felt like.
   *
   * Newest first, the emotion of the events the player just met. The
   * engine uses it to avoid handing out four jokes in a row; it never
   * uses it to gate anything.
   */
  recentEmotions?: EmotionTarget[];
  /** Absolute day an event was last played, for repeatable cooldowns. */
  lastSeenDay?(eventId: string): number | null;
  /** Today, on the same absolute scale. */
  today?: number;
  /** Planted questions the world has not answered yet. */
  unresolvedSeeds?: number;
  /**
   * EXPERIENCE DIRECTOR v0.1 — the ids of the events just played, newest
   * first. Everything the director reasons about (which feelings, which
   * faces, which layers have been coming up) is derived from this plus
   * the definitions; nothing extra is stored anywhere.
   */
  recentEventIds?: readonly string[];
  /**
   * Whether a LIFE beat is ready elsewhere in the world. The director
   * uses it to keep 「また会えた」 from being outvoted forever by ambient
   * chatter; it never fires anything itself.
   */
  lifeEventAvailable?: boolean;
}
