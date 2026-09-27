// WHAT CHARACTER FORGE SENDS, AND WHAT THE GAME KEEPS OF IT.
//
// FORGE is a separate program (another repository) where the author
// writes people and creatures. When one is finished it is "deployed":
// written out as ONE JSON file per character, in the contract the
// bridge package fixes (INTEGRATION_CONTRACT.md, schema
// forge-deploy-package 1.0). This file is the game's side of that
// contract: the shape it expects, and the shape it stores.
//
// THE KEY IS THE CHARACTER ID. `HUM-000001`, `MON-000001` — FORGE's
// permanent id, never renumbered, never reused, never given to anyone
// else. The game takes it as it comes and keys everything on it. It is
// a different thing from a formal NPC_ID (`GALD`); the two are joined,
// when the author decides to, by a correspondence table
// (docs/WORLD_LIFE_LINK_DESIGN.md §11) and never by renaming either.
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
  | 'RESERVED_ID'
  | 'ID_TYPE_CONFLICT'
  | 'DEPLOYMENT_CONFLICT'
  | 'SAVE_DAMAGED'
  // Taken in, and said out loud.
  | 'UNKNOWN_FIELD'
  | 'NEWER_MINOR_VERSION'
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
  | 'PAYLOAD_SEEN_BEFORE';

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
 *   BLOCKED_SAVE_DAMAGED         the save's own record of this character
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

/**
 * WHAT THE GAME KEEPS OF A CHARACTER FORGE SENT.
 *
 * Four parts, kept apart so that a re-send can only ever touch one:
 *
 *   forgeBaseline   the deploy file exactly as it arrived — FORGE's
 *                   decision about who they are. Replaced, whole, by an
 *                   accepted update, and by nothing else.
 *   runtimeState    what the GAME has made of them since: where they
 *                   are, what they have been through, a name earned in
 *                   the world. Empty when they arrive. No import ever
 *                   writes it.
 *   importMetadata  which file the baseline is, and when it came.
 *   npcId           the formal NPC_ID they correspond to, once the
 *                   author decides one (§11). Null until then; never
 *                   guessed, never written by an import.
 *
 * Their WORLD MEMORY facts are events in the event store, like every
 * other fact, and are not copied here.
 */
export interface ForgeCharacterRecord {
  recordVersion: 1;
  characterId: string;
  characterType: ForgeCharacterType;
  encounterRole: ForgeEncounterRole;
  npcId: string | null;
  forgeBaseline: ForgeDeployPackage;
  runtimeState: Record<string, unknown>;
  importMetadata: {
    payloadHash: string;
    sourceSchemaVersion: string;
    deployedVersion: string;
    deployedAt: string;
    firstImportedAt: string;
    lastImportedAt: string;
    lastImportId: string;
  };
}

/** What happened on one import, as the history keeps it. */
export type ForgeHistoryResult = 'NEW' | 'UPDATED' | 'ROLLED_BACK';

export interface ForgeImportHistoryEntry {
  importId: string;
  characterId: string;
  payloadHash: string;
  sourceSchemaVersion: string;
  deployedVersion: string;
  deployedAt: string;
  importedAt: string;
  result: ForgeHistoryResult;
  warnings: ForgeIssue[];
  /** The snapshot taken before this import changed anything; null when there was nothing before. */
  snapshotRef: string | null;
}

/** The record as it was before the last change — what one rollback returns to. */
export interface ForgeSnapshot {
  snapshotRef: string;
  characterId: string;
  takenAt: string;
  /** The import that replaced it. */
  importId: string;
  record: ForgeCharacterRecord;
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
}
