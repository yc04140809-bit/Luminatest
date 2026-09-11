// WORLD LIFE ENGINE — the words the world is written in.
//
// THE ONE RULE THIS WHOLE MODULE EXISTS TO ENFORCE: what the player
// does never settles what somebody becomes.
//
// Showing a village girl a spell does not make her a mage. It plants
// SEED_MAGIC_DREAM in her, and what that turns into depends on who she
// already was, on how long it is left alone, on what else happens to
// her, and on whether the world ever offers her a door. Four of those
// five are not the player's business, and the fifth is only half.
//
// WHY IT IS SHAPED LIKE THIS. The obvious way to build this is a table
// of (what the player did × who it happened to × what they became), and
// that table is why nobody finishes building a living world: it has to
// be written by hand, every entry is a design decision, and it grows
// faster than anybody can fill it in. There is no such table here, and
// there is no room for one to appear:
//
//   an ACTION says what impression it leaves — one line, once
//   an NPC says what they are made of        — one entry, once
//   a SEED KIND says what it resonates with  — one entry, once
//
// The number of futures those three produce is their product. The
// amount anybody has to write is their sum. That is the whole trick,
// and every other rule below is in service of keeping it true.
//
// WHAT IS DELIBERATELY NOT HERE: a tick. Nothing in this engine
// simulates anybody. A seed is not updated as days pass — it is asked
// what it has become, and answers from when it was planted and what
// time it is now. So a village of a thousand people costs exactly as
// much as a village of one until somebody looks at one of them.

import type { WorldClock } from '../time/calendar';

/** Anybody or anything a record can be about. */
export type WorldActorId = string;

/**
 * SOMETHING THAT HAPPENED, as the world will always remember it.
 *
 * Write-once and interpretation-free. A record says a thing was done,
 * where, and who saw — never what it meant, because what it meant is
 * different for each of the people who saw it and is settled later, by
 * them. This is the difference between a memory and a consequence, and
 * conflating the two is how a world ends up with one future.
 */
export interface WorldMemoryRecord {
  id: string;
  /** Who did it. The player is an actor like any other. */
  actor: WorldActorId;
  /** Who it was done to or for. Null for something simply done. */
  target: WorldActorId | null;
  action: string;
  location: string;
  time: WorldClock;
  /**
   * Who saw it happen, not counting the actor.
   *
   * The reason a world can have rumours: an impression lands on people
   * who were merely present, and a thing done where nobody could see
   * leaves nothing behind in anybody.
   */
  witnesses: readonly WorldActorId[];
  /** Whatever the thing that recorded it wanted to keep. Never read by rules. */
  metadata: Readonly<Record<string, string | number | boolean>>;
}

/**
 * What a seed is doing, and it is only ever one of these four.
 *
 * 'DORMANT' landed, but has not taken
 * 'GROWING' taking, and would still fade if left
 * 'ROOTED'  part of who they are now — and whether that can ever be
 *           undone is the seed kind's business, not this type's: a
 *           dream can be let go of, becoming somebody cannot
 * 'FADED'   nothing fed it and it is gone
 *
 * Read from strength rather than stored, so there is no state machine
 * to get wrong and no way for a seed's status to disagree with itself.
 */
export type SeedStatus = 'DORMANT' | 'GROWING' | 'ROOTED' | 'FADED';

/**
 * How much of it is showing.
 *
 * 'HIDDEN' nobody could tell, including them
 * 'FELT'   they know something has changed; it is legible up close
 * 'SPOKEN' it is a thing they say out loud, and others know it
 *
 * For the game to read, never for the engine: what a seed DOES does not
 * depend on whether anybody has noticed it.
 */
export type SeedVisibility = 'HIDDEN' | 'FELT' | 'SPOKEN';

/**
 * SOMETHING PLANTED IN SOMEBODY, which may or may not come to anything.
 *
 * `strength` is what it was worth the day it landed. What it is worth
 * NOW is `grownSeed` in growth.ts, which is a question rather than a
 * stored number — see the note about ticks at the top of this file.
 */
export interface WorldSeed {
  id: string;
  targetNpcId: string;
  type: string;
  /** The record that planted it. The causal chain's only backward link. */
  sourceMemoryId: string;
  /** 0..1, as planted. */
  strength: number;
  status: SeedStatus;
  createdAt: WorldClock;
  visibility: SeedVisibility;
  /**
   * Every time something fed it since, and when.
   *
   * Kept as a list rather than folded into `strength` because the
   * engine has to be able to answer "why is she like this" with the
   * actual events, and a number that has been added to five times
   * cannot answer anything.
   */
  fedBy: readonly { memoryId: string; at: WorldClock; amount: number }[];
}

/**
 * WHO SOMEBODY ALREADY WAS before the player met them.
 *
 * The half of every outcome that is not the player's doing. Two people
 * shown the same spell on the same day do not end up in the same place,
 * and this is the entire reason why — so it is written per person, by
 * hand, and there are meant to be few enough of them for that to be
 * true.
 */
export interface NpcCore {
  npcId: string;
  /** How they are. 'CURIOUS', 'TIMID'. */
  traits: readonly string[];
  /** What they hold to. 'FAMILY', 'WONDER'. */
  values: readonly string[];
  /** What they would be good at, 0..1, for the few that are worth saying. */
  aptitudes: Readonly<Record<string, number>>;
  /** What they already want, before anybody showed them anything. */
  desires: readonly string[];
}

/**
 * A LINE BETWEEN TWO THINGS, drawn by what has taken root.
 *
 * Not a relationship system. A vine is the observation that somebody's
 * seeds all point at the same thing — a person, a place, an idea — and
 * it exists so that a future can ask "is she attached to this" without
 * re-deriving it from every record in the world.
 */
export interface WorldVine {
  id: string;
  source: WorldActorId;
  target: WorldActorId;
  relationType: string;
  /** Which seeds drew it. Never empty. */
  sourceSeedIds: readonly string[];
  status: 'FORMING' | 'HELD' | 'BROKEN';
}

/**
 * WHAT COULD BECOME OF SOMEBODY, and what it would take.
 *
 * A bloom is a CANDIDATE and the word is load-bearing. The engine
 * produces it when the conditions are met and stops there; nothing here
 * writes a future into the world, because the moment this module could
 * do that, the player's action would once again be settling somebody's
 * life and the rule at the top of the file would be gone.
 */
export interface WorldBloomDef {
  id: string;
  /** Whose life this is a possible shape of. */
  npcId: string;
  requirements: BloomRequirements;
  /** What it would be, in the world's own words. Never shown raw. */
  result: string;
}

export interface BloomRequirements {
  /** What must be true of somebody's seeds. Usually their own. */
  seeds: readonly SeedRequirement[];
  /** A line that must be held, if the shape needs one. */
  vine?: { target: WorldActorId; relationType: string };
  /** How long the world must have had to work on it, in days. */
  afterDays?: number;
}

/**
 * ONE THING THAT MUST BE TRUE OF SOMEBODY, for a life to take a shape.
 *
 * `npcId` is the reason this is an interface rather than a pair: a
 * future is very often not about one person. Whether a man who used to
 * be hunted can stand in a village square and be spoken to normally is
 * half about him and half about the man who used to hunt him, and a
 * requirement that could only ask about one of them could not say so.
 * Left out, it means the person whose bloom this is.
 *
 * `atMost` is the other half of the same thought. Most of what has to
 * happen for somebody to be forgiven is something ELSE wearing out —
 * so a requirement has to be able to say "and this has faded", not only
 * "and this has grown". A requirement with neither bound asks nothing
 * and is content being wrong; it is treated as unmet and says so.
 */
export interface SeedRequirement {
  /** Whose seed. Defaults to the bloom's own npcId. */
  npcId?: string;
  type: string;
  atLeast?: SeedStatus;
  /** No further along than this. 'FADED' means gone. */
  atMost?: SeedStatus;
  /**
   * Whether never having had it at all satisfies an `atMost`.
   *
   * True by default and it matters: a guard who was never wary of this
   * man is not a guard whose wariness is unresolved. Set false where
   * the seed having existed is part of the point.
   */
  absentCounts?: boolean;
}

export interface WorldBloom {
  id: string;
  npcId: string;
  requirements: BloomRequirements;
  result: string;
  /**
   * 'CANDIDATE' is as far as this engine goes, on purpose.
   *
   * 'REALISED' exists for whatever eventually decides — a story beat, a
   * scene the player walks into — and is never set from in here.
   */
  status: 'CANDIDATE' | 'REALISED' | 'LOST';
  foundAt: WorldClock;
}

/**
 * WHAT THE WORLD IS HOLDING at one moment.
 *
 * All three lists in one place and all three immutable: everything in
 * this module takes one of these and returns a new one, so a world can
 * be replayed, forked, inspected or thrown away without anything
 * needing to be undone.
 */
export interface WorldLifeState {
  now: WorldClock;
  memories: readonly WorldMemoryRecord[];
  seeds: readonly WorldSeed[];
  vines: readonly WorldVine[];
  blooms: readonly WorldBloom[];
}
