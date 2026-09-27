// REGISTERING WHAT WAS PLANNED, AND GOING BACK ONE STEP.
//
// Pure functions that turn an approved plan into exactly what the save
// must hold afterwards — rows, one WORLD MEMORY event, a history entry,
// a snapshot — and the result the bridge contract asks for. The World
// writes all of it in ONE store commit, so an import either happened
// completely or not at all.
//
// WHAT AN UPDATE REPLACES: the FORGE baseline and the note of which file
// it is. Nothing else. `runtimeState` (what the game has made of the
// character) and `npcId` (the author's correspondence) are carried over
// untouched, and WORLD MEMORY is only ever added to.
//
// WHAT A ROLLBACK RESTORES: the baseline as it was before the last
// update, from the snapshot taken then. Again only FORGE's part — the
// game's own state stays as it is now, because rolling back an author's
// send must not roll back somebody's playthrough. Events stay too:
// "an update was taken in" remains true after it is undone. One step,
// as the contract asks; the snapshot is used up by going back.

import type { MemoryEvent, WorldStateRow } from '../memory/types';
import type { WorldClock } from '../time/calendar';
import { forgeCharacterKey, forgeHistoryKey, forgeSnapshotKey, type ForgeState } from './record';
import type { ForgePlan } from './plan';
import type {
  ForgeCharacterRecord,
  ForgeImportHistoryEntry,
  ForgeImportResult,
  ForgeSnapshot,
} from './types';
import { FORGE_SOURCE } from './validate';

/** Where a FORGE event is recorded: not a place in the world, but where it came from. */
export const FORGE_EVENT_LOCATION = 'MUGEN_CHARACTER_FORGE';

export const forgeImportEventId = (characterId: string) => `evt_forge_import_${characterId}`;
export const forgeUpdateEventId = (importId: string) => `evt_forge_update_${importId}`;

export interface ForgeCommit {
  record: ForgeCharacterRecord;
  history: ForgeImportHistoryEntry[];
  entry: ForgeImportHistoryEntry;
  snapshot: ForgeSnapshot | null;
  /** Null only when the character's arrival is already on record (see below). */
  event: MemoryEvent | null;
  rows: WorldStateRow[];
  result: ForgeImportResult;
}

/**
 * Everything registering a NEW or UPDATE plan writes.
 *
 * `hasEvent` answers whether WORLD MEMORY already holds an event id —
 * because the arrival event is once per character, ever, and a world
 * whose record of somebody was lost (a developer's scenario reset) must
 * not try to write "arrived" a second time.
 */
export function applyForgePlan(
  plan: ForgePlan,
  state: ForgeState,
  importedAt: string,
  clock: WorldClock,
  hasEvent: (eventId: string) => boolean,
): ForgeCommit {
  if (!plan.canRegister || !plan.payload || !plan.payloadHash || !plan.characterId) {
    throw new Error(`Nothing to register: ${plan.decision}`);
  }
  const payload = plan.payload;
  const id = plan.characterId;
  const hash = plan.payloadHash;
  const importId = makeImportId(importedAt, id, hash);
  const existing = state.records[id] ?? null;

  const snapshot: ForgeSnapshot | null = existing
    ? { snapshotRef: `SNAP-${importId.slice(4)}`, characterId: id, takenAt: importedAt, importId, record: existing }
    : null;

  const record: ForgeCharacterRecord = {
    recordVersion: 1,
    characterId: id,
    characterType: payload.characterType,
    encounterRole: payload.encounterRole,
    // The author's, and the game's: never an import's to set or clear.
    npcId: existing?.npcId ?? null,
    forgeBaseline: payload,
    runtimeState: existing?.runtimeState ?? {},
    importMetadata: {
      payloadHash: hash,
      sourceSchemaVersion: payload.schemaVersion,
      deployedVersion: payload.deployment.deployedVersion,
      deployedAt: payload.deployment.deployedAt,
      firstImportedAt: existing?.importMetadata.firstImportedAt ?? importedAt,
      lastImportedAt: importedAt,
      lastImportId: importId,
    },
  };

  const entry: ForgeImportHistoryEntry = {
    importId,
    characterId: id,
    payloadHash: hash,
    sourceSchemaVersion: payload.schemaVersion,
    deployedVersion: payload.deployment.deployedVersion,
    deployedAt: payload.deployment.deployedAt,
    importedAt,
    result: existing ? 'UPDATED' : 'NEW',
    warnings: plan.warnings,
    snapshotRef: snapshot?.snapshotRef ?? null,
  };
  const history = [...(state.histories[id] ?? []), entry];

  const eventId = existing ? forgeUpdateEventId(importId) : forgeImportEventId(id);
  const event: MemoryEvent | null = hasEvent(eventId)
    ? null
    : {
        id: eventId,
        type: existing ? 'CHARACTER_UPDATED_FROM_FORGE' : 'CHARACTER_IMPORTED_FROM_FORGE',
        worldYear: clock.worldYear,
        worldDay: clock.worldDay,
        location: FORGE_EVENT_LOCATION,
        actors: [id],
        importance: 'AMBIENT',
        createdAt: importedAt,
        forge: {
          source: FORGE_SOURCE,
          characterId: id,
          deployedVersion: payload.deployment.deployedVersion,
          deployedAt: payload.deployment.deployedAt,
          payloadHash: hash,
          importId,
          canonStatus: 'CANON',
        },
      };

  const rows: WorldStateRow[] = [
    { key: forgeCharacterKey(id), value: record },
    { key: forgeHistoryKey(id), value: history },
  ];
  // Only an update has a "before" to keep. A new character's snapshot
  // row is left alone rather than written empty.
  if (snapshot) rows.push({ key: forgeSnapshotKey(id), value: snapshot });

  return {
    record,
    history,
    entry,
    snapshot,
    event,
    rows,
    result: resultOf(plan, importedAt, importId, existing ? 'UPDATED' : 'NEW', snapshot?.snapshotRef ?? null),
  };
}

export interface ForgeRollback {
  record: ForgeCharacterRecord;
  history: ForgeImportHistoryEntry[];
  entry: ForgeImportHistoryEntry;
  rows: WorldStateRow[];
}

/** Returns a character's FORGE baseline to what it was before the last update. */
export function applyForgeRollback(state: ForgeState, characterId: string, at: string): ForgeRollback {
  const current = state.records[characterId];
  const snapshot = state.snapshots[characterId];
  if (!current) throw new Error(`${characterId} is not registered`);
  if (!snapshot) throw new Error(`${characterId} has nothing to roll back to`);

  const record: ForgeCharacterRecord = {
    ...snapshot.record,
    // FORGE's part goes back. The game's part stays where the game is.
    runtimeState: current.runtimeState,
    npcId: current.npcId,
    importMetadata: {
      ...snapshot.record.importMetadata,
      firstImportedAt: current.importMetadata.firstImportedAt,
    },
  };
  const entry: ForgeImportHistoryEntry = {
    importId: `RBK-${compact(at)}-${characterId}`,
    characterId,
    payloadHash: record.importMetadata.payloadHash,
    sourceSchemaVersion: record.importMetadata.sourceSchemaVersion,
    deployedVersion: record.importMetadata.deployedVersion,
    deployedAt: record.importMetadata.deployedAt,
    importedAt: at,
    result: 'ROLLED_BACK',
    warnings: [],
    snapshotRef: snapshot.snapshotRef,
  };
  const history = [...(state.histories[characterId] ?? []), entry];
  return {
    record,
    history,
    entry,
    rows: [
      { key: forgeCharacterKey(characterId), value: record },
      { key: forgeHistoryKey(characterId), value: history },
      // Used up: one step back, and no further.
      { key: forgeSnapshotKey(characterId), value: null },
    ],
  };
}

/**
 * The contract's import result for a plan that registers nothing
 * (UNCHANGED, or refused). Null when the file does not even carry a
 * character id — the result schema needs one to say whose result it is.
 */
export function resultOfPlan(plan: ForgePlan, at: string): ForgeImportResult | null {
  const id = plan.characterId;
  if (!id || !/^(HUM|MON)-[0-9]{6,}$/.test(id)) return null;
  const importId = makeImportId(at, id, plan.payloadHash ?? 'sha256:00000000');
  return resultOf(plan, at, importId, plan.decision === 'UNCHANGED' ? 'UNCHANGED' : 'BLOCKED', null);
}

function resultOf(
  plan: ForgePlan,
  at: string,
  importId: string,
  result: ForgeImportResult['result'],
  snapshotRef: string | null,
): ForgeImportResult {
  return {
    schemaVersion: '1.0',
    importId,
    characterId: plan.characterId!,
    result,
    importedAt: at,
    ...(plan.payloadHash ? { payloadHash: plan.payloadHash } : {}),
    sourceDeployment: {
      deployedVersion: plan.summary?.deployedVersion ?? '',
      deployedAt: plan.summary?.deployedAt ?? '',
    },
    warnings: plan.warnings,
    errors: plan.errors,
    diffSummary: {
      added: plan.diff?.added ?? [],
      changed: [...(plan.diff?.changed ?? []), ...(plan.diff?.removed ?? [])],
      preserved: plan.diff?.preserved ?? [],
      gameOwned: plan.gameOwned,
    },
    rollback: { available: snapshotRef !== null, snapshotRef },
    decision: plan.decision,
  };
}

function makeImportId(at: string, characterId: string, hash: string): string {
  return `IMP-${compact(at)}-${characterId}-${hash.replace(/^sha256:/, '').slice(0, 8)}`;
}

function compact(at: string): string {
  return at.replace(/[-:.]/g, '');
}
