// 実機確認（RIZEL）— the device checks for the first adopted FORGE character.
//
// Debug builds only (src/dev). Loaded when the check button is pressed. It
// READS: the build's own content (who was adopted, the registry, the WORLD
// LIFE ENGINE's rules) and this device's save, straight from IndexedDB —
// without opening a World, so looking changes nothing (World.open would
// repair and back up the save). It writes nothing anywhere.

import { FORGE_CONTENT, FORGE_CONTENT_PROBLEMS, forgeDefinitions } from '@mugen/content/forge/forgeContent';
import { forgeRegistrationState } from '@mugen/content/forge/forgeStatus';
import { personEntry } from '@mugen/content/people/allPeople';
import { WORLD_LIFE_RULES } from '@mugen/core/life/worldReading';
import { SAVE_VERSION } from '@mugen/core/world/saveSchema';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { isForgeEventType } from '@mugen/core/memory/types';
import { APP_DB_NAME } from '../platform/save';

export const CHECK_FORGE_ID = 'HUM-000001';
export const CHECK_NPC_ID = 'RIZEL';

export interface DeviceCheckRow {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
}

/** Values in her FORGE visualDiversity that contradict her sheet — none may reach the game. */
const VISUAL_MISMATCH = ['older_adult', 'heavy', 'very_tall', 'salt_and_pepper', 'very_short'];

export async function runForgeDeviceCheck(): Promise<DeviceCheckRow[]> {
  const rows: DeviceCheckRow[] = [];
  const add = (id: string, label: string, pass: boolean, detail: string) => rows.push({ id, label, pass, detail });

  // ---- The build.
  const entry = FORGE_CONTENT.roster.characters.find((e) => e.characterId === CHECK_FORGE_ID);
  add('1', '採用済み一覧に RIZEL がいる', !!entry && FORGE_CONTENT_PROBLEMS.length === 0,
    entry ? `採用済み ${FORGE_CONTENT.roster.characters.length} 人（${FORGE_CONTENT.roster.characters.map((e) => e.npcId).join('、')}）` : '見つかりません');
  add('2', 'NPC_ID = RIZEL', entry?.npcId === CHECK_NPC_ID && personEntry(CHECK_NPC_ID)?.displayName === 'リゼル',
    `NPC_ID ${entry?.npcId ?? '—'}／人物台帳 ${personEntry(CHECK_NPC_ID) ? `${personEntry(CHECK_NPC_ID)!.displayName}（${personEntry(CHECK_NPC_ID)!.kind}）` : 'なし'}`);
  add('3', 'HUM-000001 ↔ RIZEL の対応', entry?.characterId === CHECK_FORGE_ID && entry?.npcId === CHECK_NPC_ID,
    entry ? `${entry.characterId} → ${entry.npcId}（送出版 ${entry.deployedVersion}）` : '—');
  const core = WORLD_LIFE_RULES.cores.find((c) => c.npcId === CHECK_NPC_ID);
  add('4', 'lifeActor = true（Life Engine の対象）', entry?.lifeActor === true && !!core,
    `lifeActor ${String(entry?.lifeActor)}／Life Engine の人物 ${core ? 'あり' : 'なし'}`);

  // ---- This device's save, read without opening a World.
  const store = new IdbMemoryStore(APP_DB_NAME);
  let events: { type: string; actors: string[] }[] = [];
  let stateRows: { key: string; value: unknown }[] = [];
  let storedVersion: unknown;
  let saveError: string | null = null;
  try {
    await store.init();
    events = await store.getAll();
    stateRows = await store.getAllState();
    storedVersion = await store.getMeta('saveSchemaVersion');
  } catch (e) {
    saveError = e instanceof Error ? e.message : String(e);
  } finally {
    store.close();
  }
  add('5', 'この端末のセーブが読める', saveError === null,
    saveError ?? `出来事 ${events.length} 件・状態 ${stateRows.length} 行（${events.length || stateRows.length ? 'プレイ中のセーブ' : '空のセーブ'}）`);
  add('8', 'SAVE_VERSION = 3', SAVE_VERSION === 3 && (storedVersion === undefined || storedVersion === 3),
    `ビルド ${SAVE_VERSION}／このセーブ ${storedVersion === undefined ? '（未記録＝新しいセーブ）' : String(storedVersion)}`);
  const text = JSON.stringify({ events, stateRows });
  const forgeInSave =
    events.some((e) => isForgeEventType(e.type)) ||
    stateRows.some((r) => r.key.startsWith('forge_')) ||
    /HUM-\d{6}|RIZEL|MUGEN_CHARACTER_FORGE/.test(text);
  add('9', 'WORLD MEMORY／セーブに FORGE のデータが書かれていない', saveError === null && !forgeInSave,
    forgeInSave ? 'FORGE のデータが見つかりました' : 'なし（出来事・状態のどちらにもない）');

  // ---- What the game made of her.
  const definition = forgeDefinitions().find((d) => d.characterId === CHECK_FORGE_ID);
  const readByGame = JSON.stringify({ definition, core, person: personEntry(CHECK_NPC_ID) });
  const leaked = VISUAL_MISMATCH.filter((v) => readByGame.includes(v));
  add('10', 'visualDiversity の不一致値からゲームのデータを作っていない', !!definition && leaked.length === 0,
    leaked.length ? `反映されている値: ${leaked.join('、')}` : `元データには ${VISUAL_MISMATCH.join('・')} が残り、ゲーム側の定義には無い`);
  add('11', '性格・価値観・願い（UNMAPPED）から Life Engine の状態を作っていない',
    !!core && core.traits.length === 0 && core.values.length === 0 && core.desires.length === 0,
    core ? `traits ${core.traits.length}・values ${core.values.length}・desires ${core.desires.length}（aptitudes: ${Object.keys(core.aptitudes).join('・')}）` : 'Life Engine の人物なし');

  // ---- Separate states (not a pass/fail: shown for the record).
  if (entry) {
    const state = forgeRegistrationState(entry, FORGE_CONTENT);
    add('状態', 'キャラクター／Life Engine／画像／関係（別々の状態）', true,
      `キャラクター 登録済み／Life Engine ${state.lifeEngine === 'ACTOR' ? '対象' : '対象外'}／画像 ${state.image === 'REGISTERED' ? '登録済み' : '未登録'}` +
        state.relationships.map((r) => `／関係 ${r.relationshipId} 保留`).join(''));
  }
  return rows;
}
