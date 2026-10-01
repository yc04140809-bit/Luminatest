// WHAT CHARACTER FORGE SENDS, AND WHAT THE GAME KEEPS OF IT.
//
// FORGE is a separate program (another repository) where the author
// writes people and creatures. When one is finished it is "deployed":
// written out as ONE JSON file per character, in the contract the
// bridge package fixes (INTEGRATION_CONTRACT.md, schema
// forge-deploy-package 1.0). This file is the game's side of that
// contract: the shape it expects, and the shape it stores.
//
// WHAT IS KEPT IS CONTENT, NOT SAVE DATA. FORGE is the author's tool
// for making and adopting characters; an adopted character is an
// official NPC of the game, the same for every player. Its definition
// goes into the repository's content (content/forge/) and ships in the
// build. A save only ever holds what has HAPPENED to them in one world.
//
// THE KEY IS THE CHARACTER ID. `HUM-000001`, `MON-000001` — FORGE's
// permanent id, never renumbered, never reused, never given to anyone
// else. The game takes it as it comes. It is a different thing from a
// formal NPC_ID (`GALD`, `LINA`); the author fixes which NPC_ID a
// character is when adopting it, and the ledger keeps the pair for
// good (docs/WORLD_LIFE_LINK_DESIGN.md §11). Neither is ever renamed.
//
// BOSS IS NOT A THIRD TYPE. A boss is a monster whose `encounterRole`
// is BOSS. The type stays `monster`; `ForgeKind` below is a label for
// people looking at it, worked out every time and never stored.

/** What FORGE says a character is. Only two. */
export type ForgeCharacterType = 'human' | 'monster';

/** How a monster is met. Null for a human. */
export type ForgeEncounterRole = 'NORMAL' | 'BOSS' | null;

/** For display: which of the three the author would call it. Derived, never stored. */
export type ForgeKind = 'HUMAN' | 'MONSTER' | 'BOSS';

export type ForgeSkillLevel = 'UNLEARNED' | 'EXPOSURE' | 'BASIC' | 'PRACTICAL' | 'SKILLED' | 'MASTER';

/** An asset's metadata. The picture itself never travels in a deploy file. */
export interface ForgeAssetMeta {
  assetId: string;
  assetType: string;
  internalFileName?: string;
  primary?: boolean;
  approved?: boolean;
  [key: string]: unknown;
}

export interface ForgeDeployment {
  source: 'MUGEN_CHARACTER_FORGE';
  target: 'MUGEN_ZERO';
  deployedAt: string;
  deployedVersion: string;
  [key: string]: unknown;
}

/**
 * ONE DEPLOY FILE, as FORGE writes it.
 *
 * Typed loosely below the top level on purpose: the game keeps every
 * field exactly as it arrived (including ones it does not know yet), and
 * reads the few it needs through the helpers in `record.ts`. Nothing
 * here is game state.
 */
export interface ForgeDeployPackage {
  schemaVersion: string;
  source: 'MUGEN_CHARACTER_FORGE';
  sampleOnly?: boolean;
  characterId: string;
  characterType: ForgeCharacterType;
  encounterRole: ForgeEncounterRole;
  status: 'CANONIZED';
  identity: {
    name: string;
    speciesName: string | null;
    individualName: string | null;
    nameStatus: string | null;
    speciesNameStatus: string | null;
    individualNameStatus: string | null;
    nameOrigin: string | null;
    speciesNameOrigin: string | null;
    individualNameOrigin: string | null;
    [key: string]: unknown;
  };
  profile: Record<string, unknown>;
  lifeAxis: Record<string, unknown> | null;
  worldViewAxis: Record<string, unknown> | null;
  relationshipPotential: string[];
  /** Potential. Never a skill the character has — see `currentSkills`. */
  aptitudes: Record<string, number>;
  aptitudeSemantics: 'POTENTIAL_NOT_ACQUIRED_SKILL' | 'SPECIES_COMBAT_POTENTIAL';
  /** The only skills a human actually has now. Null for a monster. */
  currentSkills: Record<string, ForgeSkillLevel> | null;
  equipment: Record<string, unknown> | null;
  lifeStage: Record<string, unknown> | null;
  visualDiversity: Record<string, unknown> | null;
  visualDirection: Record<string, unknown> | null;
  visualReviewStatus: 'UNREVIEWED' | 'APPROVED' | 'REVISION_REQUIRED';
  visualReviewChecklist: Record<string, unknown>;
  /** Where the author would like them. A wish, not a placement. */
  worldAssignment: Record<string, unknown>;
  productionChecklist: Record<string, unknown>;
  /** FORGE relationship ids. Candidates; the game may hold none of them. */
  relationshipRefs: string[];
  characterHistory: { event: string; at: string; origin: string; details: Record<string, unknown> }[];
  ecology: Record<string, unknown> | null;
  combat: Record<string, unknown> | null;
  /** How a boss is met — encounter design, never numbers for the battle system. */
  bossEncounter: Record<string, unknown> | null;
  seeds: string[];
  dramaHooks: string[];
  worldMemory: { registered: boolean; events: unknown[]; memo: string; [key: string]: unknown };
  worldLifeEngine: { enabled: boolean; [key: string]: unknown };
  assets: ForgeAssetMeta[];
  deployment: ForgeDeployment;
  [key: string]: unknown;
}

/** One finding about a file, in words the author can act on. */
export interface ForgeIssue {
  code: ForgeIssueCode;
  /** Where in the file, dotted (`identity.name`), or '' for the whole file. */
  path: string;
  /** Japanese, for the screen. */
  message: string;
}

export type ForgeIssueCode =
  // Stops the import.
  | 'JSON_PARSE'
  | 'SCHEMA'
  | 'UNSUPPORTED_SCHEMA_VERSION'
  | 'SAMPLE_ONLY'
  | 'ID_TYPE_MISMATCH'
  | 'EQUIPMENT_NOT_PERMITTED'
  | 'VISUAL_REVISION_REQUIRED'
  | 'RESERVED_ID'
  | 'ID_TYPE_CONFLICT'
  | 'DEPLOYMENT_CONFLICT'
  | 'SAVE_DAMAGED'
  // Taken in, and said out loud.
  | 'UNKNOWN_FIELD'
  | 'NEWER_MINOR_VERSION'
  | 'UNKNOWN_SCHEMA_VERSION'
  /** A rule known only from the old bridge package v1.0: said, never refused on. */
  | 'UNVERIFIED_CONTRACT'
  | 'UNRESOLVED_REFERENCE'
  | 'MISSING_ASSET'
  | 'NO_PRIMARY_ASSET'
  | 'WORLD_ASSIGNMENT_UNRESOLVED'
  | 'WORLD_ASSIGNMENT_NAME_MATCH'
  | 'VISUAL_NOT_APPROVED'
  | 'EQUIPMENT_FROM_POTENTIAL'
  | 'FUTURE_TENDENCY_KEPT'
  | 'FUTURE_ASPIRATION_KEPT'
  | 'ENCOUNTER_ROLE_CHANGED'
  | 'PAYLOAD_SEEN_BEFORE'
  // About the NPC_ID the author adopts the character as.
  | 'NPC_ID_REQUIRED'
  | 'NPC_ID_INVALID'
  | 'NPC_ID_TAKEN'
  | 'NPC_ID_KIND_MISMATCH'
  | 'NPC_ID_CHANGE'
  | 'NPC_ID_EXISTING_PERSON'
  | 'NPC_ID_NAME_DIFFERS'
  | 'REGION_UNKNOWN'
  | 'LIFE_ACTOR_FIXED'
  // From the vocabulary adapter (content/forge/forgeVocabularyAdapter.ts).
  | 'UNMAPPED_VOCABULARY'
  // Consistency inside the file (content/forge/forgeVocabularyAdapter.ts). Warnings only, never corrected.
  | 'AGE_VISUAL_GROUP_MISMATCH'
  // About a FORGE export file (several characters and voidIds).
  | 'EXPORT_FORMAT'
  | 'EXPORT_LEGACY_FORMAT';

/**
 * What the game decides about a file.
 *
 * The first seven are the bridge contract's (00_START_HERE §5).
 * The last two are the game's own, and both only ever refuse:
 *
 *   BLOCKED_DEPLOYMENT_CONFLICT  a different file for the same character
 *                                that is not newer than the one held
 *                                (older, or the same moment with other
 *                                contents). Taking it would put an older
 *                                baseline over a newer one.
 *   BLOCKED_SAVE_DAMAGED         the content's own file for this character
 *                                could not be read. Writing over it would
 *                                destroy the only copy of what was there.
 */
export type ForgeDecision =
  | 'NEW'
  | 'UPDATE'
  | 'UNCHANGED'
  | 'BLOCKED_ID_TYPE_CONFLICT'
  | 'BLOCKED_SAMPLE_DATA'
  | 'BLOCKED_VALIDATION'
  | 'BLOCKED_RESERVED_ID'
  | 'BLOCKED_DEPLOYMENT_CONFLICT'
  | 'BLOCKED_SAVE_DAMAGED';

/** What happened on one import, as the ledger keeps it. */
export type ForgeHistoryResult = 'NEW' | 'UPDATED' | 'ROLLED_BACK' | 'LIFE_ACTOR_CHANGED';

export interface ForgeImportHistoryEntry {
  importId: string;
  characterId: string;
  /** The NPC_ID the character was adopted as. */
  npcId: string;
  payloadHash: string;
  sourceSchemaVersion: string;
  deployedVersion: string;
  deployedAt: string;
  importedAt: string;
  result: ForgeHistoryResult;
  warnings: ForgeIssue[];
  /** The previous definition kept for one rollback; null when there was nothing before. */
  snapshotRef: string | null;
}

/** Which file the previous definition is — the one step a rollback goes back to. */
export interface ForgePreviousRef {
  snapshotRef: string;
  payloadHash: string;
  sourceSchemaVersion: string;
  deployedVersion: string;
  deployedAt: string;
  /** The import that replaced it. */
  replacedBy: string;
}

/**
 * ONE ADOPTED CHARACTER, in the content ledger (content/forge/roster.json).
 *
 * The definition itself is the deploy file, kept verbatim next to it
 * (content/forge/characters/<ID>.json). This entry is what the game
 * needs to know ABOUT it: which NPC_ID the author adopted it as, which
 * send it is, and how it got here. Content, in the build, the same for
 * every player — never in anybody's save.
 */
export interface ForgeRosterEntry {
  characterId: string;
  /** The formal NPC_ID (upper-case), fixed at adoption and never changed. */
  npcId: string;
  characterType: ForgeCharacterType;
  encounterRole: ForgeEncounterRole;
  /** The region the author placed them in at adoption; null = not placed (未配置). */
  region: string | null;
  /**
   * Whether the WORLD LIFE ENGINE follows this one as an individual with a
   * life of its own (seeds, growth, vines, blooms). A separate decision
   * from adoption: ADOPTED means "official content", nothing more. People
   * are followed by default; a creature only when the author says it is
   * one particular individual the story tracks.
   */
  lifeActor: boolean;
  payloadHash: string;
  sourceSchemaVersion: string;
  deployedVersion: string;
  deployedAt: string;
  adoptedAt: string;
  lastImportedAt: string;
  lastImportId: string;
  previous: ForgePreviousRef | null;
  history: ForgeImportHistoryEntry[];
}

export const FORGE_ROSTER_FORMAT = 'mugen-zero.forge-roster';

export interface ForgeRoster {
  format: typeof FORGE_ROSTER_FORMAT;
  version: 1;
  characters: ForgeRosterEntry[];
}

/**
 * EVERYTHING THE CONTENT HOLDS ABOUT FORGE CHARACTERS, read into memory.
 *
 * In the game this comes from the build (content/forge/forgeContent.ts),
 * where `previous` is empty — the game never needs an old definition.
 * The authoring tools read it from the repository's files, including
 * `previous` (for one rollback) and any file they could not read.
 */
export interface ForgeContent {
  roster: ForgeRoster;
  /** content/forge/characters/<ID>.json — the adopted deploy file, verbatim. */
  baselines: Readonly<Record<string, ForgeDeployPackage>>;
  /** content/forge/previous/<ID>.json — the definition before the last update. */
  previous: Readonly<Record<string, ForgeDeployPackage>>;
  /** FORGE's retired ids (content/forge/void.json). Never adopted, ever. */
  voidIds: readonly string[];
  /** Characters whose content files could not be read. Nothing is written for them. */
  damaged: readonly string[];
}

/** One field that differs between the baseline held and the one offered. */
export interface ForgeDiffEntry {
  path: string;
  change: 'ADDED' | 'CHANGED' | 'REMOVED' | 'SAME';
  before?: unknown;
  after?: unknown;
}

export interface ForgeDiff {
  added: string[];
  changed: string[];
  removed: string[];
  preserved: string[];
  entries: ForgeDiffEntry[];
}

/**
 * The result the bridge contract asks the game to make for every import
 * (schemas/mugen-zero-import-result.schema.json). Kept inside the game
 * in v1; one day it may be sent back to FORGE.
 */
export interface ForgeImportResult {
  schemaVersion: '1.0';
  importId: string;
  characterId: string;
  result: 'NEW' | 'UPDATED' | 'UNCHANGED' | 'BLOCKED';
  importedAt: string;
  payloadHash?: string;
  sourceDeployment: { deployedVersion: string; deployedAt: string };
  warnings: ForgeIssue[];
  errors: ForgeIssue[];
  diffSummary: { added: string[]; changed: string[]; preserved: string[]; gameOwned: string[] };
  rollback: { available: boolean; snapshotRef: string | null };
  decision: ForgeDecision;
  /** The NPC_ID the character was adopted as, when it was. */
  npcId?: string;
}
