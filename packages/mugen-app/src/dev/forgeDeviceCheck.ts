// 実機確認 — the device checks for an adopted FORGE character, any of them.
//
// Debug builds only (src/dev). Loaded when the check screen opens. It
// READS: the build's own content (who was adopted, the registry, the WORLD
// LIFE ENGINE's rules) and this device's save, straight from IndexedDB —
// without opening a World, so looking changes nothing (World.open would
// repair and back up the save). It writes nothing anywhere, and choosing
// who to check is only a choice on the screen.
//
// THE SAME 11 ITEMS FOR EVERYONE. They were written for RIZEL (the first
// adopted character, checked on a real phone on 2026-09-29) and are asked
// of whoever is chosen, from what that character's own files say — no
// per-character code. The list to choose from is the build's roster: only
// characters actually adopted into content/forge, with their file present.

import { FORGE_CONTENT, FORGE_CONTENT_PROBLEMS, FORGE_VOID_IDS, forgeNpcs, type ForgeNpc } from '@mugen/content/forge/forgeContent';
import { forgeRegistrationState } from '@mugen/content/forge/forgeStatus';
import { FORGE_SOURCE_ONLY_FIELDS, consistencyIssues } from '@mugen/content/forge/forgeVocabularyAdapter';
import { FORGE_KIND_LABEL } from '@mugen/core/forge/record';
import type { ForgeKind } from '@mugen/core/forge/types';
import { personEntry } from '@mugen/content/people/allPeople';
import { NPC_REGISTRY } from '@mugen/content/people/registry';
import { WORLD_LIFE_RULES } from '@mugen/core/life/worldReading';
import { SAVE_VERSION } from '@mugen/core/world/saveSchema';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { isForgeEventType } from '@mugen/core/memory/types';
import { APP_DB_NAME } from '../platform/save';

/**
 * PASS / FAIL, or UNCHECKED: the item can only be judged in a save state
 * the phone is not in right now (e.g. #6 needs a wiped save). The detail
 * says what to do to check it. Never PASS for something not judged.
 */
export type DeviceCheckState = 'PASS' | 'FAIL' | 'UNCHECKED' | 'INFO';

export interface DeviceCheckRow {
  id: string;
  label: string;
  state: DeviceCheckState;
  detail: string;
}

/** Someone who can be chosen: adopted in this build, file present, not VOID. */
export interface DeviceCheckTarget {
  characterId: string;
  npcId: string;
  name: string;
  kind: ForgeKind;
  kindLabel: string;
  lifeActor: boolean;
}

/** What was read from this device's save. */
export interface DeviceSave {
  events: { type: string; actors: string[] }[];
  stateRows: { key: string; value: unknown }[];
  storedVersion: unknown;
  error: string | null;
}

function adoptedNpcs(): ForgeNpc[] {
  return forgeNpcs().filter((npc) => !FORGE_VOID_IDS.includes(npc.characterId));
}

/** The characters the check can be run for, in the roster's order. */
export function forgeDeviceCheckTargets(): DeviceCheckTarget[] {
  return adoptedNpcs().map((npc) => ({
    characterId: npc.characterId,
    npcId: npc.npcId,
    name: npc.forgeName,
    kind: npc.kind,
    kindLabel: FORGE_KIND_LABEL[npc.kind],
    lifeActor: npc.lifeActor,
  }));
}

/** This device's save, read without opening a World. */
export async function readDeviceSave(dbName: string = APP_DB_NAME): Promise<DeviceSave> {
  const store = new IdbMemoryStore(dbName);
  const save: DeviceSave = { events: [], stateRows: [], storedVersion: undefined, error: null };
  try {
    await store.init();
    save.events = await store.getAll();
    save.stateRows = await store.getAllState();
    save.storedVersion = await store.getMeta('saveSchemaVersion');
  } catch (e) {
    save.error = e instanceof Error ? e.message : String(e);
  } finally {
    store.close();
  }
  return save;
}

/** Every string a JSON value holds, at any depth. */
function strings(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') out.add(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

/** A hand-written person the game already had (adopted AS them): their own name, core and entry stay. */
function handWritten(npcId: string): boolean {
  return NPC_REGISTRY.some((e) => e.npcId === npcId || e.aliases.includes(npcId));
}

function lifeCoreOf(npcId: string) {
  const names = new Set([npcId, ...(NPC_REGISTRY.find((e) => e.npcId === npcId)?.aliases ?? [])]);
  return WORLD_LIFE_RULES.cores.find((c) => names.has(c.npcId)) ?? null;
}

/** The 11 items (and the separate states) for one adopted character. Pure: reads the build and `save`. */
export function evaluateForgeDeviceCheck(characterId: string, save: DeviceSave): DeviceCheckRow[] {
  const rows: DeviceCheckRow[] = [];
  const add = (id: string, label: string, pass: boolean, detail: string) =>
    rows.push({ id, label, state: pass ? 'PASS' : 'FAIL', detail });
  const addState = (id: string, label: string, state: DeviceCheckState, detail: string) => rows.push({ id, label, state, detail });

  const roster = FORGE_CONTENT.roster.characters;
  const entry = roster.find((e) => e.characterId === characterId) ?? null;
  const npc = adoptedNpcs().find((n) => n.characterId === characterId) ?? null;
  const npcId = entry?.npcId ?? '—';
  const name = npc?.forgeName ?? '—';
  const who = `${characterId} → ${npcId}`;

  // ---- The build.
  add('1', `採用済み一覧に ${who} がある`, !!entry && !!npc && FORGE_CONTENT_PROBLEMS.length === 0,
    entry ? `採用済み ${roster.length} 人（${roster.map((e) => e.npcId).join('、')}）` : '見つかりません');
  const person = entry ? personEntry(entry.npcId) : null;
  const own = entry ? handWritten(entry.npcId) : false;
  // A new person is listed under FORGE's name; an existing one keeps the game's.
  add('2', `NPC_ID = ${npcId}`,
    !!entry && /^[A-Z][A-Z0-9_]*$/.test(entry.npcId) && !!person && (own || person.displayName === name),
    `NPC_ID ${npcId}／人物台帳 ${person ? `${person.displayName}（${person.kind}）${own ? '・既存の人物' : ''}` : 'なし'}`);
  const sameNpc = entry ? roster.filter((e) => e.npcId === entry.npcId).length : 0;
  add('3', `${characterId} ↔ ${npcId} の対応`, !!entry && sameNpc === 1,
    entry ? `${entry.characterId} → ${entry.npcId}（送出版 ${entry.deployedVersion}${sameNpc > 1 ? `・同じ NPC_ID が ${sameNpc} 人` : ''}）` : '—');
  const core = entry ? lifeCoreOf(entry.npcId) : null;
  if (entry?.lifeActor === false) {
    add('4', '一覧に「Life Engine 対象外」（lifeActor = false）', !core,
      `lifeActor false／Life Engine の人物 ${core ? 'あり（対象外なのに入っている）' : 'なし'}`);
  } else {
    add('4', '一覧に「Life Engine 対象」（lifeActor = true）', entry?.lifeActor === true && !!core,
      `lifeActor ${String(entry?.lifeActor)}／Life Engine の人物 ${core ? 'あり' : 'なし'}`);
  }

  // ---- This device's save.
  const { events, stateRows, storedVersion, error } = save;
  const adopted = !!entry && !!npc;
  const empty = error === null && events.length === 0 && stateRows.length === 0;
  const saveSummary = error ?? `出来事 ${events.length} 件・状態 ${stateRows.length} 行`;
  // 5: judged only on a save that has been played.
  const label5 = `既存セーブ（つづきから）でも ${npcId} が採用済みのまま`;
  if (error !== null) add('5', label5, false, `セーブを読めません: ${error}`);
  else if (empty) addState('5', label5, 'UNCHECKED', `このセーブは空です（${saveSummary}）。プレイ中のセーブを「つづきから」で開いた後に押してください。`);
  else add('5', label5, adopted, `プレイ中のセーブ（${saveSummary}）で ${npcId} ${adopted ? '採用済み' : 'なし'}`);
  // 6: judged only right after the app's storage is wiped.
  const label6 = 'データ消去後、App のセーブが完全に空';
  if (error !== null) add('6', label6, false, `セーブを読めません: ${error}`);
  else if (empty) add('6', label6, true, `空です（${saveSummary}）`);
  else addState('6', label6, 'UNCHECKED', `このセーブにはデータがあります（${saveSummary}）。設定 → アプリ → MUGEN ZERO → ストレージ →「ストレージを消去」（機種により「データ消去」）の後、アプリを開き直してすぐ押してください。`);
  // 7: they are in the build, so they are there whatever the save holds.
  add('7', `「はじめる」で開始しても ${npcId} が採用済み一覧に残る`, adopted,
    `${npcId} ${adopted ? '採用済み' : 'なし'}（このセーブ: ${empty ? '空' : saveSummary}）。データ消去 →「はじめる」の後に押して確認してください。`);
  add('8', 'SAVE_VERSION = 3', SAVE_VERSION === 3 && (storedVersion === undefined || storedVersion === 3),
    `ビルド ${SAVE_VERSION}／このセーブ ${storedVersion === undefined ? '（未記録＝新しいセーブ）' : String(storedVersion)}`);
  // 9: FORGE's own data — its ids, its format, its hash, its event types.
  const text = JSON.stringify({ events, stateRows });
  const forgeInSave =
    events.some((e) => isForgeEventType(e.type)) ||
    stateRows.some((r) => r.key.startsWith('forge_')) ||
    /(HUM|MON)-\d{6}|MUGEN_CHARACTER_FORGE/.test(text) ||
    (!!entry?.payloadHash && text.includes(entry.payloadHash));
  add('9', 'WORLD MEMORY／セーブに FORGE のデータが書かれていない', error === null && !forgeInSave,
    forgeInSave ? 'FORGE のデータが見つかりました' : 'なし（出来事・状態のどちらにもない）');

  // ---- What the game made of them.
  const definition = npc?.definition ?? null;
  // The game's reading. `unmapped` is left out: it is the report of what
  // was NOT taken, which names FORGE's values on purpose.
  const reading = definition ? { ...definition, unmapped: [] } : null;
  const gameStrings = strings({ reading, core: own ? null : core, person: own ? null : person });
  const visual = npc ? strings((npc.forge as unknown as Record<string, unknown>).visualDiversity) : new Set<string>();
  const leaked = [...visual].filter((v) => gameStrings.has(v));
  const sourceKeys = definition ? FORGE_SOURCE_ONLY_FIELDS.filter((f) => f in definition) : [];
  const warnings = npc ? consistencyIssues(npc.forge).length : 0;
  add('10', 'visualDiversity（FORGE 専用データ）がゲーム側に反映・修正されていない',
    !!definition && leaked.length === 0 && sourceKeys.length === 0,
    leaked.length || sourceKeys.length
      ? `反映されている値: ${[...leaked, ...sourceKeys].join('、')}`
      : `元データの visualDiversity は ${visual.size ? 'そのまま保持' : 'なし'}・ゲーム側の定義には無い（年齢・外見の不一致 WARNING ${warnings} 件、修正なし）`);
  // 11: nothing made from personality, values or desires — in the game's
  // definition, and in the life engine for a character FORGE created.
  const life = definition?.life;
  const madeFromForge = !own && !!core;
  const lifeEmpty = !!life && life.traits.length === 0 && life.values.length === 0 && life.desires.length === 0;
  const coreEmpty = !madeFromForge || (core!.traits.length === 0 && core!.values.length === 0 && core!.desires.length === 0);
  add('11', '性格・価値観・願いから Life Engine の traits／values／desires を作っていない（0 のまま）', lifeEmpty && coreEmpty,
    life
      ? `traits ${life.traits.length}・values ${life.values.length}・desires ${life.desires.length}（aptitudes: ${Object.keys(life.aptitudes).join('・') || 'なし'}）` +
          (own ? '／既存の人物：手書きの Life Engine 設定のまま' : core ? '' : '／Life Engine の人物なし')
      : '定義を読めません');

  // ---- Separate states (not a pass/fail: shown for the record).
  if (entry) {
    const state = forgeRegistrationState(entry, FORGE_CONTENT);
    addState('状態', 'キャラクター／Life Engine／画像／関係（別々の状態）', 'INFO',
      `キャラクター 登録済み／Life Engine ${state.lifeEngine === 'ACTOR' ? '対象' : '対象外'}／画像 ${state.image === 'REGISTERED' ? '登録済み' : '未登録'}` +
        state.relationships.map((r) => `／関係 ${r.relationshipId} 保留`).join(''));
  }
  return rows;
}

/** Reads this device's save and checks one adopted character. Writes nothing. */
export async function runForgeDeviceCheck(characterId: string): Promise<DeviceCheckRow[]> {
  return evaluateForgeDeviceCheck(characterId, await readDeviceSave());
}
