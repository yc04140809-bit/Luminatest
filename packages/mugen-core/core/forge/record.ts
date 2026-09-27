// HOW A FORGE CHARACTER SITS IN THE SAVE, AND HOW IT IS READ BACK.
//
// THREE ROWS PER CHARACTER, NOT ONE ROW FOR ALL OF THEM:
//
//   forge_character_<ID>   the record (types.ts ForgeCharacterRecord)
//   forge_history_<ID>     every import that changed it, oldest first
//   forge_snapshot_<ID>    the record as it was before the last change
//
// One row per character means an import writes only its own
// character's rows, so a row that cannot be read belongs to exactly one
// character and holds up only that one — it is never rewritten, and
// importing somebody else carries on. A single shared table would put
// every imported character behind the first damaged byte.
//
// NO SAVE_VERSION CHANGE. These are new rows; a save from before they
// existed simply has none, which reads as "nothing imported" — the same
// "missing row = new-world default" rule every other row follows
// (saveSchema.ts). The save's repair pass does not know these keys and
// leaves them exactly as they are.
//
// READERS REPAIR DOWNWARD ONLY: a row that is not what it should be is
// reported, not fixed. What the author sent is not something the game
// gets to guess at.

import type { WorldStateRow } from '../memory/types';
import type {
  ForgeCharacterRecord,
  ForgeDeployPackage,
  ForgeImportHistoryEntry,
  ForgeKind,
  ForgeSkillLevel,
  ForgeSnapshot,
} from './types';
import { CHARACTER_ID_PATTERN, isObject } from './validate';

export const FORGE_CHARACTER_PREFIX = 'forge_character_';
export const FORGE_HISTORY_PREFIX = 'forge_history_';
export const FORGE_SNAPSHOT_PREFIX = 'forge_snapshot_';

export const forgeCharacterKey = (id: string) => `${FORGE_CHARACTER_PREFIX}${id}`;
export const forgeHistoryKey = (id: string) => `${FORGE_HISTORY_PREFIX}${id}`;
export const forgeSnapshotKey = (id: string) => `${FORGE_SNAPSHOT_PREFIX}${id}`;

/** Whether a save row belongs to a FORGE character. */
export function isForgeRowKey(key: string): boolean {
  return (
    key.startsWith(FORGE_CHARACTER_PREFIX) ||
    key.startsWith(FORGE_HISTORY_PREFIX) ||
    key.startsWith(FORGE_SNAPSHOT_PREFIX)
  );
}

/** Everything the save holds about FORGE characters. */
export interface ForgeState {
  records: Record<string, ForgeCharacterRecord>;
  histories: Record<string, ForgeImportHistoryEntry[]>;
  snapshots: Record<string, ForgeSnapshot>;
  /** Characters with a row that could not be read. Nothing is written for them. */
  damaged: string[];
}

export const EMPTY_FORGE_STATE: ForgeState = { records: {}, histories: {}, snapshots: {}, damaged: [] };

/** Reads every FORGE row out of a save. Rows it cannot read are named, never dropped or rewritten. */
export function readForgeRows(rows: readonly WorldStateRow[]): ForgeState {
  const state: ForgeState = { records: {}, histories: {}, snapshots: {}, damaged: [] };
  const damaged = new Set<string>();
  for (const { key, value } of rows) {
    if (key.startsWith(FORGE_CHARACTER_PREFIX)) {
      const id = key.slice(FORGE_CHARACTER_PREFIX.length);
      const record = readRecord(value, id);
      if (record) state.records[id] = record;
      else if (value !== null && value !== undefined) damaged.add(id);
    } else if (key.startsWith(FORGE_HISTORY_PREFIX)) {
      const id = key.slice(FORGE_HISTORY_PREFIX.length);
      const history = readHistory(value, id);
      if (history) state.histories[id] = history;
      else if (value !== null && value !== undefined) damaged.add(id);
    } else if (key.startsWith(FORGE_SNAPSHOT_PREFIX)) {
      const id = key.slice(FORGE_SNAPSHOT_PREFIX.length);
      // A consumed snapshot is written as null: nothing to go back to.
      if (value === null || value === undefined) continue;
      const snapshot = readSnapshot(value, id);
      if (snapshot) state.snapshots[id] = snapshot;
      else damaged.add(id);
    }
  }
  state.damaged = [...damaged].sort();
  return state;
}

function readRecord(value: unknown, id: string): ForgeCharacterRecord | null {
  if (!isObject(value) || value.recordVersion !== 1) return null;
  if (value.characterId !== id || !CHARACTER_ID_PATTERN.test(id)) return null;
  if (value.characterType !== 'human' && value.characterType !== 'monster') return null;
  if (!isObject(value.forgeBaseline) || value.forgeBaseline.characterId !== id) return null;
  if (!isObject(value.runtimeState) || !isObject(value.importMetadata)) return null;
  const meta = value.importMetadata;
  for (const key of ['payloadHash', 'sourceSchemaVersion', 'deployedVersion', 'deployedAt', 'firstImportedAt', 'lastImportedAt', 'lastImportId']) {
    if (typeof meta[key] !== 'string') return null;
  }
  if (value.npcId !== null && typeof value.npcId !== 'string') return null;
  return value as unknown as ForgeCharacterRecord;
}

function readHistory(value: unknown, id: string): ForgeImportHistoryEntry[] | null {
  if (!Array.isArray(value)) return null;
  const ok = value.every(
    (entry) =>
      isObject(entry) &&
      entry.characterId === id &&
      typeof entry.importId === 'string' &&
      typeof entry.payloadHash === 'string' &&
      typeof entry.importedAt === 'string' &&
      (entry.result === 'NEW' || entry.result === 'UPDATED' || entry.result === 'ROLLED_BACK'),
  );
  return ok ? (value as ForgeImportHistoryEntry[]) : null;
}

function readSnapshot(value: unknown, id: string): ForgeSnapshot | null {
  if (!isObject(value) || value.characterId !== id || typeof value.snapshotRef !== 'string') return null;
  const record = readRecord(value.record, id);
  return record ? ({ ...(value as unknown as ForgeSnapshot), record } as ForgeSnapshot) : null;
}

// ---- Reading a character, for people and for the game ------------------

/** HUMAN, MONSTER or BOSS — worked out from type and role, never stored. */
export function forgeKindOf(item: Pick<ForgeDeployPackage, 'characterType' | 'encounterRole'>): ForgeKind {
  if (item.characterType === 'human') return 'HUMAN';
  return item.encounterRole === 'BOSS' ? 'BOSS' : 'MONSTER';
}

export const FORGE_KIND_LABEL: Record<ForgeKind, string> = {
  HUMAN: '人間',
  MONSTER: '通常モンスター',
  BOSS: 'BOSS',
};

/**
 * What to call them on a screen.
 *
 * A human by their name. A monster by its own name if it has one, and
 * otherwise by its species — for display only: the individual name in
 * the record stays null, because nobody has given it one.
 */
export function forgeDisplayName(payload: ForgeDeployPackage): string {
  const identity = payload.identity;
  if (payload.characterType === 'human') return identity.name;
  return identity.individualName ?? identity.speciesName ?? identity.name;
}

/**
 * WHAT IS TRUE OF A HUMAN NOW, as opposed to what they could become.
 *
 * Skills are `currentSkills` exactly — the aptitudes (potential) are
 * not consulted, so a gifted swordsman who has never held a sword has no
 * sword skill here. The occupation is theirs only when FORGE marks it a
 * current fact; a child's "wants to be a knight" comes back as an
 * aspiration and nothing else. Monsters have none of this: null.
 */
export function forgeHumanCurrentFacts(payload: ForgeDeployPackage): {
  skills: Record<string, ForgeSkillLevel>;
  occupation: string | null;
  aspiration: string | null;
} | null {
  if (payload.characterType !== 'human' || !payload.currentSkills) return null;
  const occupation = typeof payload.profile.occupation === 'string' ? payload.profile.occupation : null;
  const mode = payload.lifeStage?.occupationMode;
  return {
    skills: { ...payload.currentSkills },
    occupation: mode === 'CURRENT_FACT' ? occupation : null,
    aspiration: mode === 'FUTURE_ASPIRATION' ? occupation : null,
  };
}
