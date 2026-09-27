// CHARACTER FORGE → MUGEN ZERO: adopt a character into the game's content.
//
//   npm run forge:import -w @mugen/core -- <deploy.json> --npc-id SERA [--region ALDEN] [--life-actor yes|no] [--apply]
//   npm run forge:import -w @mugen/core -- <forge-export.json> [--pick HUM-000001 --npc-id SERA ...] [--apply]
//   npm run forge:import -w @mugen/core -- --rollback HUM-000001 [--apply]
//   npm run forge:import -w @mugen/core -- --set-life-actor MON-000007 yes|no [--apply]
//   npm run forge:import -w @mugen/core -- --list
//
// Without --apply nothing is written: it checks the file and prints, in
// Japanese, everything to confirm before a real adoption — the FORGE
// JSON's validity, its voidIds, the FORGE ID, the NPC_ID, the type, the
// WORLD LIFE ENGINE decision and what the vocabulary adapter could not
// map. With --apply it writes under packages/mugen-core/content/forge/,
// which then goes through git and ships in the build.
//
// A FORGE export (`{ schemaVersion: 1, characters, voidIds }`): with
// --apply its voidIds go into the ledger first (only ever added), then
// the character chosen with --pick, if any, is adopted.
// `--content-dir <dir>` points it at another folder (tests, rehearsal).

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import {
  FORGE_CONTENT_DIR,
  adoptOnDisk,
  ensureForgeContentDir,
  importVoidOnDisk,
  loadForgeContent,
  planOnDisk,
  rollbackOnDisk,
  setLifeActorOnDisk,
} from './forgeContentFs';
import { FORGE_KIND_LABEL, forgeKindOf } from '../core/forge/record';
import { isForgeExport, readForgeExport, type ForgeAdoptionPlan } from '../core/forge/content';
import { isObject } from '../core/forge/validate';
import { zeroCharacterDefinition } from '../content/forge/forgeVocabularyAdapter';

const DECISION: Record<string, string> = {
  NEW: '新規登録',
  UPDATE: '更新候補',
  UNCHANGED: '変更なし',
  BLOCKED_ID_TYPE_CONFLICT: '競合 — 取込不可',
  BLOCKED_DEPLOYMENT_CONFLICT: '競合 — 取込不可',
  BLOCKED_SAMPLE_DATA: '取込不可（サンプルデータ）',
  BLOCKED_VALIDATION: '取込不可（形式エラー）',
  BLOCKED_RESERVED_ID: '取込不可（予約済み／VOID ID）',
  BLOCKED_SAVE_DAMAGED: '取込不可（登録済みデータを読めません）',
};

interface Options {
  file?: string;
  npcId?: string;
  region?: string;
  lifeActor?: boolean;
  pick?: string;
  apply: boolean;
  rollback?: string;
  setLifeActor?: { id: string; value: boolean };
  list: boolean;
  dir?: string;
}

function yesNo(value: string | undefined, flag: string): boolean {
  if (value === 'yes' || value === 'true') return true;
  if (value === 'no' || value === 'false') return false;
  throw new Error(`${flag} には yes / no を指定してください`);
}

function args(argv: string[]): Options {
  const out: Options = { apply: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') continue;
    else if (a === '--apply') out.apply = true;
    else if (a === '--list') out.list = true;
    else if (a === '--npc-id') out.npcId = argv[++i];
    else if (a === '--region') out.region = argv[++i];
    else if (a === '--life-actor') out.lifeActor = yesNo(argv[++i], a);
    else if (a === '--pick') out.pick = argv[++i];
    else if (a === '--rollback') out.rollback = argv[++i];
    else if (a === '--set-life-actor') out.setLifeActor = { id: argv[++i], value: yesNo(argv[++i], a) };
    else if (a === '--content-dir') out.dir = argv[++i];
    else if (!a.startsWith('--')) out.file = a;
    else throw new Error(`知らないオプションです: ${a}`);
  }
  return out;
}

function report(plan: ForgeAdoptionPlan): void {
  const s = plan.summary;
  console.log(`判定: ${DECISION[plan.decision] ?? plan.decision}`);
  console.log(`FORGE ID: ${s?.characterId ?? '（読めません）'}   characterType: ${s?.characterType ?? '—'}   種類: ${plan.kind ? FORGE_KIND_LABEL[plan.kind] : '—'}   名前: ${s?.displayName ?? '—'}`);
  console.log(`送出版: ${s?.deployedVersion ?? '—'}   送出日時: ${s?.deployedAt ?? '—'}`);
  console.log(
    `NPC_ID: ${plan.npcId ?? '（未指定）'}   地域: ${plan.region ?? '未配置'}   WORLD LIFE ENGINE: ${plan.lifeActor === null ? '—' : plan.lifeActor ? '対象（lifeActor）' : '対象外'}`,
  );
  if (plan.payload && plan.npcId) {
    const def = zeroCharacterDefinition(plan.payload, {
      characterId: plan.payload.characterId,
      npcId: plan.npcId,
      region: plan.region,
      lifeActor: plan.lifeActor ?? false,
      encounterRole: plan.payload.encounterRole,
    });
    console.log(
      `正式定義: entityType ${def.entityType} / standing ${def.standing ?? 'UNMAPPED'} / habitat ${def.habitat ?? '—'}` +
        ` / life traits[${def.life.traits.join(',')}] values[${def.life.values.join(',')}] desires[${def.life.desires.join(',')}] aptitudes ${JSON.stringify(def.life.aptitudes)}`,
    );
  }
  for (const e of [...plan.errors, ...plan.npcErrors]) console.log(`  × ${e.message}`);
  for (const w of [...plan.warnings, ...plan.npcNotes, ...plan.unmapped]) console.log(`  ! ${w.message}`);
  if (plan.diff && plan.decision === 'UPDATE') {
    for (const entry of plan.diff.entries.filter((e) => e.change !== 'SAME')) console.log(`  変更: ${entry.path}`);
  }
}

function main(): number {
  const opt = args(process.argv.slice(2));
  const dir = opt.dir ?? FORGE_CONTENT_DIR;
  ensureForgeContentDir(dir);
  const mode = opt.apply ? '（書き込みます）' : '（確認のみ・書き込みません。書き込むには --apply）';

  if (opt.list) {
    const { content, problems } = loadForgeContent(dir);
    console.log(`採用済み ${content.roster.characters.length} 人 / VOID ${content.voidIds.length} 件  [${dir}]`);
    for (const e of content.roster.characters) {
      console.log(
        `  ${e.characterId} → ${e.npcId}  ${FORGE_KIND_LABEL[forgeKindOf(e)]}  ${e.deployedVersion}  ${e.region ?? '未配置'}  ${e.lifeActor ? 'lifeActor' : '—'}${e.previous ? '  (戻せる)' : ''}`,
      );
    }
    for (const p of problems) console.log(`  × ${p}`);
    return problems.length ? 1 : 0;
  }

  if (opt.rollback) {
    console.log(`${opt.rollback} を直前の送出へ戻します ${mode}`);
    if (!opt.apply) return 0;
    const { change, written } = rollbackOnDisk(dir, opt.rollback);
    console.log(`戻しました: ${change.entry.deployedVersion}（${written.join(', ')}）`);
    return 0;
  }

  if (opt.setLifeActor) {
    const { id, value } = opt.setLifeActor;
    console.log(`${id} を WORLD LIFE ENGINE の${value ? '対象' : '対象外'}にします ${mode}`);
    if (!opt.apply) return 0;
    setLifeActorOnDisk(dir, id, value);
    console.log('変更しました（content/forge/roster.json）。');
    return 0;
  }

  if (!opt.file) {
    console.log('使い方: npm run forge:import -w @mugen/core -- <deploy.json | forge-export.json> --npc-id SERA [--region ALDEN] [--life-actor yes|no] [--apply]');
    return 2;
  }
  const raw = readFileSync(opt.file, 'utf8');
  let text = raw;
  let extraVoidIds: string[] = [];

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Not JSON: the planner says so, in Japanese, below.
  }
  if (isForgeExport(parsed)) {
    const exported = readForgeExport(parsed);
    extraVoidIds = exported.voidIds;
    console.log(`${basename(opt.file)}: FORGE 書き出し（${exported.format === 'OFFICIAL' ? '正式形式' : '旧形式'}） ${mode}`);
    console.log(`  characters: ${exported.characters.length} 人   voidIds: ${exported.voidIds.join('、') || 'なし'}`);
    for (const i of exported.issues) console.log(`  ! ${i.message}`);
    for (const c of exported.characters) {
      if (isObject(c)) console.log(`    - ${String(c.characterId)}  ${String(c.characterType)}  ${String((c.identity as Record<string, unknown> | undefined)?.name ?? '')}`);
    }
    if (opt.apply && exported.voidIds.length) {
      const { change } = importVoidOnDisk(dir, raw, basename(opt.file));
      console.log(`  VOID 台帳へ追加: ${change.added.join('、') || 'なし（すべて登録済み）'}`);
    }
    if (!opt.pick) return 0;
    const chosen = exported.characters.find((c) => isObject(c) && c.characterId === opt.pick);
    if (!chosen) throw new Error(`書き出しの中に ${opt.pick} がありません。`);
    text = JSON.stringify(chosen);
  }

  const choice = { npcId: opt.npcId ?? null, region: opt.region ?? null, lifeActor: opt.lifeActor ?? null };
  const plan = planOnDisk(dir, text, choice, extraVoidIds);
  console.log(`${opt.pick ?? basename(opt.file)} ${mode}`);
  report(plan);
  if (!plan.ready) return plan.decision === 'UNCHANGED' ? 0 : 1;
  if (!opt.apply) return 0;
  const { change, written } = adoptOnDisk(dir, text, choice, { decision: plan.decision, payloadHash: plan.payloadHash }, undefined, extraVoidIds);
  console.log(`MUGEN ZEROへ受け入れました。 ${change.entry.characterId} → ${change.entry.npcId}（${change.result.result}）`);
  for (const w of written) console.log(`  書き込み: content/forge/${w}`);
  return 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error(`× ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
