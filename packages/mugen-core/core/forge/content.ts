// ADOPTING A FORGE CHARACTER AS AN OFFICIAL NPC OF THE GAME.
//
// CHARACTER FORGE is the author's tool for making characters and
// choosing which of them join the world. A character that is adopted
// becomes CONTENT — part of the game every player gets, like Gald or
// Lina — not something that lives in one device's save. So adopting
// one means writing files into the repository, which the build then
// carries to everybody:
//
//   content/forge/roster.json             the ledger: who was adopted, as
//                                         which NPC_ID, from which send,
//                                         and every import since
//   content/forge/characters/<ID>.json    the adopted deploy file, verbatim
//   content/forge/previous/<ID>.json      the definition before the last
//                                         update (for one rollback; tools
//                                         only, never bundled)
//   content/forge/void.json               FORGE's retired ids
//   content/forge/index.generated.ts      the import list the build reads
//
// Everything here is PURE: it takes the content as it is and returns
// the files that should change, and the tools (scripts/forgeContentFs.ts
// — the command line and the dev server) write them. Nothing here
// touches a save: a save keeps only what happens to an NPC in one world
// (their current state, the WORLD MEMORY they took part in), keyed by
// their NPC_ID, exactly as it already does for everybody else.
//
// THE NPC_ID IS FIXED AT ADOPTION. The author says which formal id the
// character is — a new one, or an existing person whose official
// definition this is (FORGE's HUM-000003 may well be LINA). The ledger
// then keeps the pair for good: a re-send keeps it, and nothing renames
// either id or the name the game already uses.

import { payloadHash } from './canonical';
import { forgeDisplayName, forgeKindOf } from './record';
import { planForgeImport, type ForgePlan, type ForgeWorldView } from './plan';
import type {
  ForgeContent,
  ForgeDeployPackage,
  ForgeImportHistoryEntry,
  ForgeImportResult,
  ForgeIssue,
  ForgeRoster,
  ForgeRosterEntry,
} from './types';
import { FORGE_ROSTER_FORMAT } from './types';
import { CHARACTER_ID_PATTERN, issue, isObject } from './validate';
import { isFormalNpcId, type NpcRegistryEntry } from '../link/npcId';

// ---- The content as data ---------------------------------------------------

export const FORGE_VOID_FORMAT = 'mugen-zero.forge-void';

export interface ForgeVoidLedger {
  format: typeof FORGE_VOID_FORMAT;
  version: 1;
  /** Every retired id ever received, sorted. Only ever grows. */
  ids: string[];
  /** Where they came from, one line per FORGE export taken in. */
  sources: { receivedAt: string; fileName: string | null; added: string[] }[];
}

export const EMPTY_ROSTER: ForgeRoster = { format: FORGE_ROSTER_FORMAT, version: 1, characters: [] };
export const EMPTY_VOID_LEDGER: ForgeVoidLedger = { format: FORGE_VOID_FORMAT, version: 1, ids: [], sources: [] };

export const ROSTER_FILE = 'roster.json';
export const VOID_FILE = 'void.json';
export const INDEX_FILE = 'index.generated.ts';
export const characterFile = (id: string) => `characters/${id}.json`;
export const previousFile = (id: string) => `previous/${id}.json`;

/** The text every JSON content file is written as: two-space indent, trailing newline. */
export function contentJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Builds the in-memory content from the raw data (the build's imports,
 * or the files the tools read). A character whose definition is missing
 * or is not the file the ledger says it is, is `damaged`: shown, never
 * written over.
 */
export function contentFromData(
  rosterData: unknown,
  voidData: unknown,
  baselineData: Readonly<Record<string, unknown>>,
  previousData: Readonly<Record<string, unknown>> = {},
): { content: ForgeContent; problems: string[] } {
  const problems: string[] = [];
  const roster = readRoster(rosterData, problems);
  const damaged: string[] = [];
  const baselines: Record<string, ForgeDeployPackage> = {};
  for (const entry of roster.characters) {
    const data = baselineData[entry.characterId];
    if (!isObject(data) || data.characterId !== entry.characterId) {
      damaged.push(entry.characterId);
      problems.push(`${entry.characterId}: ${characterFile(entry.characterId)} がありません（または別人のファイルです）`);
      continue;
    }
    if (payloadHash(data) !== entry.payloadHash) {
      damaged.push(entry.characterId);
      problems.push(`${entry.characterId}: ${characterFile(entry.characterId)} の内容が台帳の hash と一致しません`);
      continue;
    }
    baselines[entry.characterId] = data as unknown as ForgeDeployPackage;
  }
  const previous: Record<string, ForgeDeployPackage> = {};
  for (const [id, data] of Object.entries(previousData)) {
    if (isObject(data) && data.characterId === id) previous[id] = data as unknown as ForgeDeployPackage;
  }
  return {
    content: { roster, baselines, previous, voidIds: readVoidLedger(voidData, problems).ids, damaged },
    problems,
  };
}

function readRoster(value: unknown, problems: string[]): ForgeRoster {
  if (value === undefined || value === null) return EMPTY_ROSTER;
  if (!isObject(value) || value.format !== FORGE_ROSTER_FORMAT || value.version !== 1 || !Array.isArray(value.characters)) {
    problems.push(`${ROSTER_FILE} の形式が違います`);
    return EMPTY_ROSTER;
  }
  const seenIds = new Set<string>();
  const seenNpcs = new Set<string>();
  const characters: ForgeRosterEntry[] = [];
  for (const raw of value.characters) {
    if (
      !isObject(raw) ||
      typeof raw.characterId !== 'string' ||
      !CHARACTER_ID_PATTERN.test(raw.characterId) ||
      typeof raw.npcId !== 'string' ||
      !isFormalNpcId(raw.npcId) ||
      typeof raw.payloadHash !== 'string' ||
      !Array.isArray(raw.history)
    ) {
      problems.push(`${ROSTER_FILE}: 読めない行があります: ${JSON.stringify(raw).slice(0, 80)}`);
      continue;
    }
    if (seenIds.has(raw.characterId)) problems.push(`${ROSTER_FILE}: ${raw.characterId} が2回あります`);
    if (seenNpcs.has(raw.npcId)) problems.push(`${ROSTER_FILE}: NPC_ID ${raw.npcId} が2人に使われています`);
    seenIds.add(raw.characterId);
    seenNpcs.add(raw.npcId);
    characters.push(raw as unknown as ForgeRosterEntry);
  }
  return { format: FORGE_ROSTER_FORMAT, version: 1, characters };
}

export function readVoidLedger(value: unknown, problems: string[] = []): ForgeVoidLedger {
  if (value === undefined || value === null) return EMPTY_VOID_LEDGER;
  if (!isObject(value) || value.format !== FORGE_VOID_FORMAT || !Array.isArray(value.ids)) {
    problems.push(`${VOID_FILE} の形式が違います`);
    return EMPTY_VOID_LEDGER;
  }
  const ids = value.ids.filter((id): id is string => typeof id === 'string' && CHARACTER_ID_PATTERN.test(id));
  return {
    format: FORGE_VOID_FORMAT,
    version: 1,
    ids,
    sources: Array.isArray(value.sources) ? (value.sources as ForgeVoidLedger['sources']) : [],
  };
}

// ---- Choosing the NPC_ID ---------------------------------------------------

export interface ForgeAdoptionView extends ForgeWorldView {
  /** The people the game already has (content/people/registry.ts), written by hand. */
  people: readonly NpcRegistryEntry[];
  /** Regions a character can be placed in. */
  regions: readonly string[];
}

export interface ForgeAdoptionInput {
  /** The formal NPC_ID the author adopts the character as. Required for a new one. */
  npcId?: string | null;
  /** Where to place them. Optional; null leaves them unplaced (未配置). */
  region?: string | null;
}

export interface ForgeAdoptionPlan extends ForgePlan {
  /** The NPC_ID they will be (or already are). */
  npcId: string | null;
  region: string | null;
  /** When the NPC_ID is an existing hand-written person: who. */
  existingPerson: NpcRegistryEntry | null;
  /** Problems with the NPC_ID or region. Any of these stops the adoption. */
  npcErrors: ForgeIssue[];
  /** Things worth saying about the NPC_ID that do not stop it. */
  npcNotes: ForgeIssue[];
  /** True when there is something to write and everything needed to write it. */
  ready: boolean;
}

/** Kinds of hand-written entry a FORGE human may be the official definition of. */
const HUMAN_MAY_BE = new Set(['PERSON']);

export function planForgeAdoption(
  input: string | unknown,
  view: ForgeAdoptionView,
  choice: ForgeAdoptionInput = {},
): ForgeAdoptionPlan {
  const plan = planForgeImport(input, view);
  const npcErrors: ForgeIssue[] = [];
  const npcNotes: ForgeIssue[] = [];
  const existing = plan.existing;
  const wanted = choice.npcId?.trim() || null;
  const wantedRegion = choice.region?.trim() || null;

  // Already adopted: the pair is fixed.
  if (existing) {
    if (wanted && wanted !== existing.npcId) {
      npcErrors.push(
        issue('NPC_ID_CHANGE', 'npcId', `${existing.characterId} は NPC_ID ${existing.npcId} として採用済みです。NPC_ID は変更できません。`),
      );
    }
    const person = view.people.find((p) => p.npcId === existing.npcId) ?? null;
    return finish(plan, existing.npcId, existing.region, person, npcErrors, npcNotes);
  }
  if (!plan.canRegister || !plan.payload) return finish(plan, wanted, wantedRegion, null, npcErrors, npcNotes);

  const payload = plan.payload;
  if (!wanted) {
    npcErrors.push(
      issue('NPC_ID_REQUIRED', 'npcId', 'このキャラクターの MUGEN ZERO 側の NPC_ID を決めてください（大文字・数字・_、例: SERA）。'),
    );
    return finish(plan, null, wantedRegion, null, npcErrors, npcNotes);
  }
  if (!isFormalNpcId(wanted)) {
    npcErrors.push(
      issue('NPC_ID_INVALID', 'npcId', `「${wanted}」は正式な NPC_ID の形ではありません（英大文字で始まり、英大文字・数字・_ のみ）。`),
    );
    return finish(plan, wanted, wantedRegion, null, npcErrors, npcNotes);
  }
  const taken = view.content.roster.characters.find((entry) => entry.npcId === wanted);
  if (taken) {
    npcErrors.push(
      issue('NPC_ID_TAKEN', 'npcId', `NPC_ID ${wanted} は FORGE の ${taken.characterId} に対応済みです。1つの NPC_ID は1人だけです。`),
    );
  }
  const aliasOf = view.people.find((p) => p.aliases.includes(wanted));
  if (aliasOf) {
    npcErrors.push(issue('NPC_ID_TAKEN', 'npcId', `「${wanted}」は ${aliasOf.npcId} の旧表記（別名）です。`));
  }

  let region = wantedRegion;
  const person = view.people.find((p) => p.npcId === wanted) ?? null;
  if (person) {
    const fits = payload.characterType === 'human' && HUMAN_MAY_BE.has(person.kind);
    if (!fits) {
      npcErrors.push(
        issue(
          'NPC_ID_KIND_MISMATCH',
          'npcId',
          `${wanted}（${person.displayName}）は ${person.kind} です。FORGE の${payload.characterType === 'human' ? '人間' : 'モンスター'}をこの人物の定義にすることはできません。`,
        ),
      );
    } else {
      npcNotes.push(
        issue(
          'NPC_ID_EXISTING_PERSON',
          'npcId',
          `既存の人物「${person.displayName}」（${wanted}）の正式定義として対応づけます。既存の ID・名前・現在状態の初期値は変更しません。`,
        ),
      );
      const forgeName = forgeDisplayName(payload);
      if (forgeName !== person.displayName) {
        npcNotes.push(
          issue(
            'NPC_ID_NAME_DIFFERS',
            'npcId',
            `名前が違います（本編: ${person.displayName} ／ FORGE: ${forgeName}）。本編の名前はそのまま使います。`,
          ),
        );
      }
      // An existing person already lives somewhere; that is not an import's to move.
      region = person.region;
    }
  } else if (region && !view.regions.includes(region)) {
    npcErrors.push(
      issue('REGION_UNKNOWN', 'region', `地域「${region}」は本編にありません（${view.regions.join(' / ')}）。空欄なら未配置のまま登録します。`),
    );
  }
  return finish(plan, wanted, region, person, npcErrors, npcNotes);
}

function finish(
  plan: ForgePlan,
  npcId: string | null,
  region: string | null,
  existingPerson: NpcRegistryEntry | null,
  npcErrors: ForgeIssue[],
  npcNotes: ForgeIssue[],
): ForgeAdoptionPlan {
  return {
    ...plan,
    npcId,
    region,
    existingPerson,
    npcErrors,
    npcNotes,
    ready: plan.canRegister && npcErrors.length === 0 && !!npcId,
  };
}

// ---- Writing it down -------------------------------------------------------

export interface ForgeContentChange {
  /** Paths under content/forge/ → new text, or null to delete. */
  files: Record<string, string | null>;
  roster: ForgeRoster;
  entry: ForgeImportHistoryEntry;
  result: ForgeImportResult;
}

/** The files a ready NEW or UPDATE adoption writes. */
export function applyForgeAdoption(plan: ForgeAdoptionPlan, content: ForgeContent, at: string): ForgeContentChange {
  if (!plan.ready || !plan.payload || !plan.payloadHash || !plan.characterId || !plan.npcId) {
    throw new Error(`採用できない状態です: ${plan.decision}${plan.npcErrors.length ? ` / ${plan.npcErrors[0].message}` : ''}`);
  }
  const payload = plan.payload;
  const id = plan.characterId;
  const hash = plan.payloadHash;
  const importId = makeImportId(at, id, hash);
  const existing = content.roster.characters.find((entry) => entry.characterId === id) ?? null;
  const held = existing ? content.baselines[id] : null;
  const files: Record<string, string | null> = { [characterFile(id)]: contentJson(payload) };

  let previous: ForgeRosterEntry['previous'] = null;
  if (existing && held) {
    previous = {
      snapshotRef: `${previousFile(id)}#${importId}`,
      payloadHash: existing.payloadHash,
      sourceSchemaVersion: existing.sourceSchemaVersion,
      deployedVersion: existing.deployedVersion,
      deployedAt: existing.deployedAt,
      replacedBy: importId,
    };
    files[previousFile(id)] = contentJson(held);
  }

  const entry: ForgeImportHistoryEntry = {
    importId,
    characterId: id,
    npcId: plan.npcId,
    payloadHash: hash,
    sourceSchemaVersion: payload.schemaVersion,
    deployedVersion: payload.deployment.deployedVersion,
    deployedAt: payload.deployment.deployedAt,
    importedAt: at,
    result: existing ? 'UPDATED' : 'NEW',
    warnings: [...plan.warnings, ...plan.npcNotes],
    snapshotRef: previous?.snapshotRef ?? null,
  };
  const next: ForgeRosterEntry = {
    characterId: id,
    npcId: plan.npcId,
    characterType: payload.characterType,
    encounterRole: payload.encounterRole,
    region: plan.region,
    payloadHash: hash,
    sourceSchemaVersion: payload.schemaVersion,
    deployedVersion: payload.deployment.deployedVersion,
    deployedAt: payload.deployment.deployedAt,
    adoptedAt: existing?.adoptedAt ?? at,
    lastImportedAt: at,
    lastImportId: importId,
    previous,
    history: [...(existing?.history ?? []), entry],
  };
  const roster = withEntry(content.roster, next);
  files[ROSTER_FILE] = contentJson(roster);
  files[INDEX_FILE] = generateForgeIndex(roster);
  return {
    files,
    roster,
    entry,
    result: resultOf(plan, at, importId, existing ? 'UPDATED' : 'NEW', previous?.snapshotRef ?? null),
  };
}

/** The files that put one character's definition back to before its last update. */
export function applyForgeRollback(content: ForgeContent, characterId: string, at: string): ForgeContentChange {
  const current = content.roster.characters.find((entry) => entry.characterId === characterId);
  if (!current) throw new Error(`${characterId} は採用されていません。`);
  if (content.damaged.includes(characterId)) throw new Error(`${characterId} のファイルを読めないため、戻せません。`);
  const ref = current.previous;
  const before = content.previous[characterId];
  if (!ref) throw new Error(`${characterId} には戻せる直前の状態がありません。`);
  if (!before || payloadHash(before) !== ref.payloadHash) {
    throw new Error(`${previousFile(characterId)} がないか、台帳と一致しません。戻せません。`);
  }
  const entry: ForgeImportHistoryEntry = {
    importId: `RBK-${compact(at)}-${characterId}`,
    characterId,
    npcId: current.npcId,
    payloadHash: ref.payloadHash,
    sourceSchemaVersion: ref.sourceSchemaVersion,
    deployedVersion: ref.deployedVersion,
    deployedAt: ref.deployedAt,
    importedAt: at,
    result: 'ROLLED_BACK',
    warnings: [],
    snapshotRef: ref.snapshotRef,
  };
  const next: ForgeRosterEntry = {
    ...current,
    // The definition goes back. The NPC_ID, placement and adoption stay.
    characterType: before.characterType,
    encounterRole: before.encounterRole,
    payloadHash: ref.payloadHash,
    sourceSchemaVersion: ref.sourceSchemaVersion,
    deployedVersion: ref.deployedVersion,
    deployedAt: ref.deployedAt,
    lastImportedAt: at,
    lastImportId: entry.importId,
    previous: null,
    history: [...current.history, entry],
  };
  const roster = withEntry(content.roster, next);
  return {
    files: {
      [characterFile(characterId)]: contentJson(before),
      // Used up: one step back, and no further.
      [previousFile(characterId)]: null,
      [ROSTER_FILE]: contentJson(roster),
      [INDEX_FILE]: generateForgeIndex(roster),
    },
    roster,
    entry,
    result: {
      schemaVersion: '1.0',
      importId: entry.importId,
      characterId,
      result: 'UPDATED',
      importedAt: at,
      payloadHash: ref.payloadHash,
      sourceDeployment: { deployedVersion: ref.deployedVersion, deployedAt: ref.deployedAt },
      warnings: [],
      errors: [],
      diffSummary: { added: [], changed: [], preserved: [], gameOwned: [] },
      rollback: { available: false, snapshotRef: null },
      decision: 'UPDATE',
      npcId: current.npcId,
    },
  };
}

function withEntry(roster: ForgeRoster, entry: ForgeRosterEntry): ForgeRoster {
  const others = roster.characters.filter((e) => e.characterId !== entry.characterId);
  return {
    format: FORGE_ROSTER_FORMAT,
    version: 1,
    characters: [...others, entry].sort((a, b) => a.characterId.localeCompare(b.characterId)),
  };
}

/**
 * The module the build reads: roster, VOID ledger and one import per
 * adopted character. Generated so that adding a character is a data
 * change and nothing else; a test keeps it in step with the roster.
 */
export function generateForgeIndex(roster: ForgeRoster): string {
  const ids = roster.characters.map((entry) => entry.characterId);
  const name = (id: string) => id.replace(/-/g, '_');
  return [
    '// GENERATED by the FORGE content import (core/forge/content.ts `generateForgeIndex`).',
    '// Do not edit by hand: `npm run forge:import -w @mugen/core` rewrites it.',
    '// The adopted characters are content — in the build, the same for every player.',
    '',
    "import roster from './roster.json';",
    "import voidLedger from './void.json';",
    ...ids.map((id) => `import ${name(id)} from './characters/${id}.json';`),
    '',
    'export const FORGE_ROSTER_DATA: unknown = roster;',
    'export const FORGE_VOID_DATA: unknown = voidLedger;',
    'export const FORGE_BASELINE_DATA: Readonly<Record<string, unknown>> = {',
    ...ids.map((id) => `  '${id}': ${name(id)},`),
    '};',
    '',
  ].join('\n');
}

// ---- FORGE's retired ids ---------------------------------------------------

/**
 * The retired (VOID / DISCARDED) ids in a file FORGE exported.
 *
 * FORGE's exact export shape is not fixed yet, so this reads the shapes
 * such a file can reasonably take — a list of ids; `{ voidIds: [...] }`
 * (or `discardedIds`); a list or `{ characters | entries | ids: [...] }`
 * of `{ characterId, status }` where status is VOID or DISCARDED; or
 * this game's own ledger — and says what it could not read rather than
 * guessing.
 */
export function readForgeVoidExport(value: unknown): { ids: string[]; issues: ForgeIssue[] } {
  const issues: ForgeIssue[] = [];
  const found: unknown[] = [];
  const retired = (status: unknown) => typeof status === 'string' && /^(VOID|VOIDED|DISCARDED)$/i.test(status);
  const take = (list: unknown[]) => {
    for (const item of list) {
      if (typeof item === 'string') found.push(item);
      else if (isObject(item)) {
        const id = item.characterId ?? item.id;
        if (retired(item.status)) found.push(id);
      }
    }
  };
  if (Array.isArray(value)) take(value);
  else if (isObject(value)) {
    for (const key of ['voidIds', 'discardedIds', 'voidedIds', 'ids']) {
      if (Array.isArray(value[key])) take(value[key] as unknown[]);
    }
    for (const key of ['characters', 'entries', 'ledger']) {
      if (Array.isArray(value[key])) take((value[key] as unknown[]).filter(isObject));
    }
  } else {
    issues.push(issue('SCHEMA', '', 'VOID ID の書き出しファイルとして読めません。'));
  }
  const ids: string[] = [];
  for (const id of found) {
    if (typeof id === 'string' && CHARACTER_ID_PATTERN.test(id)) ids.push(id);
    else issues.push(issue('SCHEMA', '', `「${String(id)}」は Character ID の形ではないため読み飛ばしました。`));
  }
  if (!ids.length && !issues.length) issues.push(issue('SCHEMA', '', 'VOID / DISCARDED の ID が見つかりませんでした。'));
  return { ids: [...new Set(ids)].sort(), issues };
}

export interface ForgeVoidChange {
  files: Record<string, string>;
  ledger: ForgeVoidLedger;
  added: string[];
}

/**
 * Adds retired ids to the ledger. Only ever adds — an id FORGE retired
 * is retired forever. Refuses, writing nothing, if FORGE has retired an
 * id the game has already adopted: that is a conflict for the author to
 * resolve, not something to settle by deleting an NPC.
 */
export function applyVoidExport(
  content: ForgeContent,
  ledger: ForgeVoidLedger,
  incoming: readonly string[],
  at: string,
  fileName: string | null,
): ForgeVoidChange {
  const adopted = incoming.filter((id) => content.roster.characters.some((entry) => entry.characterId === id));
  if (adopted.length) {
    throw new Error(
      `採用済みのキャラクターが VOID になっています: ${adopted.join('、')}。NPC は消さず、何も書き込みません。FORGE 側と照合してください。`,
    );
  }
  const added = incoming.filter((id) => !ledger.ids.includes(id));
  const next: ForgeVoidLedger = {
    format: FORGE_VOID_FORMAT,
    version: 1,
    ids: [...new Set([...ledger.ids, ...incoming])].sort(),
    sources: [...ledger.sources, { receivedAt: at, fileName, added }],
  };
  return { files: { [VOID_FILE]: contentJson(next) }, ledger: next, added };
}

// ---- Results ---------------------------------------------------------------

/**
 * The contract's import result for a plan that writes nothing
 * (UNCHANGED, or refused). Null when the file does not even carry a
 * character id — the result schema needs one to say whose it is.
 */
export function resultOfPlan(plan: ForgePlan, at: string): ForgeImportResult | null {
  const id = plan.characterId;
  if (!id || !CHARACTER_ID_PATTERN.test(id)) return null;
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
  const npcId = (plan as Partial<ForgeAdoptionPlan>).npcId ?? undefined;
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
    errors: [...plan.errors, ...((plan as Partial<ForgeAdoptionPlan>).npcErrors ?? [])],
    diffSummary: {
      added: plan.diff?.added ?? [],
      changed: [...(plan.diff?.changed ?? []), ...(plan.diff?.removed ?? [])],
      preserved: plan.diff?.preserved ?? [],
      gameOwned: plan.gameOwned,
    },
    rollback: { available: snapshotRef !== null, snapshotRef },
    decision: plan.decision,
    ...(npcId ? { npcId } : {}),
  };
}

function makeImportId(at: string, characterId: string, hash: string): string {
  return `IMP-${compact(at)}-${characterId}-${hash.replace(/^sha256:/, '').slice(0, 8)}`;
}

function compact(at: string): string {
  return at.replace(/[-:.]/g, '');
}

/** For display: HUMAN / MONSTER / BOSS of a ledger entry. */
export function rosterKind(entry: Pick<ForgeRosterEntry, 'characterType' | 'encounterRole'>) {
  return forgeKindOf(entry);
}
