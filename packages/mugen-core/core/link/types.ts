// THE LINK — the contract between MUGEN ZERO and the tools outside it.
//
// CHARACTER FORGE (where people are written) and the NPC app (where
// they are looked at) are separate programs in separate repositories.
// Neither knows how the game is built, and the game does not know how
// they are built. What passes between them is THIS: plain data, with a
// format name and a version, and nothing else — no function, no class,
// no reference into anybody's code. A document that survives
// JSON.stringify → JSON.parse unchanged is a valid link document; one
// that does not is not.
//
// WHAT THIS IS NOT. It is not a save format and it does not change
// one: SAVE_VERSION stays 3 and nothing here is written to the save.
// Relationships, feelings and aims appear below as things the game
// READS OUT (derived from WORLD MEMORY and the life engine's seeds,
// every time) — never as numbers anybody stores. Event and conversation
// candidates are exactly that: candidates. The game decides; only the
// game's `World` ever writes a fact.
//
// Decided 2026-09-27 (docs/WORLD_LIFE_LINK_DESIGN.md §9). This file is
// C-1 of that plan: types only. Nothing reads or produces these yet.

import type { LifePhase } from '../characters/types';
import type { SeedStatus, SeedVisibility } from '../life/types';
import type { WorldClock } from '../time/calendar';

/**
 * The version of this contract. Separate from SAVE_VERSION on purpose:
 * the link can change without the save changing, and the save must
 * never change because the link did.
 */
export const LINK_SCHEMA_VERSION = 1;

/** Every link document names itself with this, so a stray JSON file is never mistaken for one. */
export const LINK_FORMAT = 'mugen-zero.link';

/**
 * A person's formal id: upper-case letters, digits and underscores,
 * starting with a letter — `GALD`, `LINA`, `MARTA`. Never renamed, never
 * reused (saves and WORLD MEMORY hold them). See `npcId.ts` for the rule
 * and for how an old spelling (an alias) is taken in at the boundary.
 */
export type NpcId = string;

/**
 * A picture's id — `hero`, `gald`, `LINA`. A DIFFERENT THING from a
 * person's id, kept in a different field, even where the two are spelt
 * alike: a person is not their picture, one person can have several,
 * and a picture can exist before anybody decides whose it is.
 */
export type ArtId = string;

/** A region — `ALDEN`, `PORT_TOWN`. */
export type RegionId = string;
/** A place in the world — `ALDEN_VILLAGE`, `MOONLIGHT_TAVERN`. */
export type LocationId = string;

/**
 * What kind of thing an id names.
 *
 * 'PERSON'     somebody with a life of their own
 * 'PLAYER'     the one the player plays
 * 'COMPANION'  who travels with the player (Kaos)
 * 'CREATURE'   a creature with a life of its own — a monster adopted
 *              from CHARACTER FORGE (core/forge/content.ts)
 * 'PLACE'      not a person at all — a village that holds seeds
 * 'SYSTEM'     the world itself, as the author of time passing
 */
export type PersonKind = 'PERSON' | 'PLAYER' | 'COMPANION' | 'CREATURE' | 'PLACE' | 'SYSTEM';

/** How much the story is about them (for people looking at the world, never read by rules). */
export type PersonStanding = 'PRINCIPAL' | 'ORDINARY' | 'PLACE' | 'SYSTEM';

// ---- 人の定義 (Forge → game) -------------------------------------------

/**
 * WHO SOMEBODY IS, as the author wrote them.
 *
 * Only what has been decided. Anything undecided is null or left out —
 * never filled with something plausible, because a plausible guess and
 * a decision cannot be told apart a week later.
 */
export interface PersonDefinition {
  npcId: NpcId;
  displayName: string;
  kind: PersonKind;
  region: RegionId;
  standing: PersonStanding;
  /** Their picture, if they have one. Never used as their id. */
  artId: ArtId | null;
  /** 種／傾向 — what they are made of (the life engine's NpcCore). */
  nature: {
    traits: readonly string[];
    values: readonly string[];
    desires: readonly string[];
    /** 0..1, only for the few worth saying. */
    aptitudes: Readonly<Record<string, number>>;
  };
  /** 基本属性 — as they are on the world's first morning. Null: not decided. */
  basics: {
    age: number | null;
    lifePhase: LifePhase | null;
    occupation: string | null;
    home: LocationId | null;
  };
  /**
   * Family, only where the author has decided it. Null: not decided —
   * which is a statement, not a gap to fill (e.g. MARTA today).
   * Children are listed on the parent, as CharacterState does.
   */
  family: { spouse: NpcId | null; children: readonly NpcId[] } | null;
  /** DRAFT never enters the game. */
  canon: 'CANON' | 'DRAFT';
}

// ---- 人の今の様子 (game → NPC app) -------------------------------------

/**
 * WHERE SOMEBODY IS IN THEIR LIFE, TODAY.
 *
 * `current` is the game's own current state (CharacterState). `reading`
 * is derived — from WORLD MEMORY and their seeds — every time it is
 * asked for, and is never saved. Only what the player may know leaves
 * the game: a life the player has not found is not in here.
 */
export interface PersonState {
  npcId: NpcId;
  at: WorldClock;
  current: {
    /** Null: the author has not decided. Never aged from null. */
    age: number | null;
    location: LocationId;
    alive: boolean;
    occupation: string;
    lifePhase: LifePhase;
    /** 所属 — the region they belong to now. */
    region: RegionId;
  };
  /** Read out, not stored. */
  reading: {
    /** Which part of the life engine's chain they are at. */
    lifeStage: LifeStage;
    /** 感情状態 — what shows in them now (from seeds that are FELT or SPOKEN). */
    feelings: readonly string[];
    /** 現在の目的 — what they are reaching for (from their desires and what has taken root). */
    aims: readonly string[];
    seeds: readonly { type: string; status: SeedStatus; visibility: SeedVisibility }[];
  };
}

/**
 * The life engine's chain, as one word for where somebody stands.
 *
 * 'QUIET'     nothing has been planted in them yet
 * 'SEED'      something has landed and not taken
 * 'GROWTH'    something is taking
 * 'VINE'      it has drawn a line to someone or something
 * 'BLOOM'     a shape their life could take is now possible (a candidate)
 * 'NEW_SEED'  a shape was realised — written as a fact — and it is planting again
 */
export type LifeStage = 'QUIET' | 'SEED' | 'GROWTH' | 'VINE' | 'BLOOM' | 'NEW_SEED';

// ---- 関係 (read out, never stored) ----------------------------------------

/**
 * WHAT ONE PERSON IS TO ANOTHER, as the game reads it today.
 *
 * An output, not a record. Intimacy, trust and conflict are worked out
 * from what happened (WORLD MEMORY) and what grew from it (seeds and
 * vines) every time; family comes from current state. Nothing here is a
 * number that anybody sets or saves.
 */
export interface RelationshipView {
  from: NpcId;
  to: NpcId;
  kind: RelationshipKind;
  /** 0..1 for the read-out kinds; null for family, which has no strength. */
  value: number | null;
  /** Where it was read from. */
  source: 'CURRENT_STATE' | 'SEED' | 'VINE';
  /** The facts it rests on, so any reading can be traced back. */
  becauseOf: readonly string[];
}

export type RelationshipKind =
  | 'PARENT_OF'
  | 'CHILD_OF'
  | 'SPOUSE_OF'
  | 'INTIMACY'
  | 'TRUST'
  | 'CONFLICT'
  | 'BECAUSE_OF'
  | 'DRAWN_TO';

// ---- 候補 (life engine → game; the game decides) ---------------------------

/**
 * WHY A CANDIDATE IS ON OFFER, in a form a person can read and a test
 * can check. A summary of conditions — not a scripting language.
 */
export type ConditionSummary =
  | { kind: 'MEMORY_PRESENT'; type: string }
  | { kind: 'MEMORY_ABSENT'; type: string }
  | { kind: 'DAYS_SINCE_MEMORY'; type: string; days: number }
  | { kind: 'SEED_AT_LEAST'; npcId: NpcId; type: string; status: SeedStatus }
  | { kind: 'BLOOM_CANDIDATE'; bloomId: string }
  | { kind: 'NOT_SEEN'; id: string };

/** SOMETHING THAT COULD HAPPEN NOW. Offered, never fired. */
export interface EventCandidate {
  candidateId: string;
  /** 対象人物. */
  npcIds: readonly NpcId[];
  location: LocationId;
  /** Higher first, among candidates at the same place. */
  priority: number;
  /** Only one candidate of a group may happen. Null: none. */
  exclusiveGroup: string | null;
  /** 起こすのに必要な条件の要約 — all of them hold, or it would not be offered. */
  conditions: readonly ConditionSummary[];
  /**
   * The WORLD MEMORY event type the game writes if it makes this happen.
   * Only a type the author has decided on; null when none has been.
   */
  realizes: string | null;
}

/** SOMETHING SOMEBODY COULD SAY NOW. Offered, never shown by itself. */
export interface ConversationCandidate {
  candidateId: string;
  speaker: NpcId;
  /** Who they say it to; null for talk overheard or said to the room. */
  listener: NpcId | null;
  location: LocationId;
  kind: 'DAILY' | 'EVENT' | 'RELATION_CHANGE' | 'TIME_PASSED';
  /** 表示条件の要約. */
  conditions: readonly ConditionSummary[];
  priority: number;
  /** Where the lines are, in content. The link carries the reference, not the words. */
  linesRef: string;
}

// ---- 包み (every file that crosses the boundary) -------------------------

export type LinkDocumentKind =
  | 'PERSON_DEFINITIONS'
  | 'PERSON_STATES'
  | 'RELATIONSHIPS'
  | 'EVENT_CANDIDATES'
  | 'CONVERSATION_CANDIDATES';

/** What each kind of document carries. */
export interface LinkPayloads {
  PERSON_DEFINITIONS: PersonDefinition;
  PERSON_STATES: PersonState;
  RELATIONSHIPS: RelationshipView;
  EVENT_CANDIDATES: EventCandidate;
  CONVERSATION_CANDIDATES: ConversationCandidate;
}

/**
 * ONE FILE THAT CROSSES THE BOUNDARY.
 *
 * Versioned, named and signed with who produced it, so the receiver can
 * refuse what it does not understand instead of guessing at it.
 */
export interface LinkDocument<K extends LinkDocumentKind = LinkDocumentKind> {
  format: typeof LINK_FORMAT;
  kind: K;
  schemaVersion: number;
  producedBy: { tool: 'MUGEN_ZERO' | 'CHARACTER_FORGE' | 'NPC_APP' | 'HAND'; version?: string };
  /** ISO time the file was written. */
  producedAt: string;
  items: readonly LinkPayloads[K][];
}
