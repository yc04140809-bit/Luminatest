// CHARACTER FORGE → MUGEN ZERO: adopt a character into the game's content.
//
//   npm run forge:import -w @mugen/core -- <deploy.json> --npc-id SERA [--region ALDEN] [--apply]
//   npm run forge:import -w @mugen/core -- --rollback HUM-000001 [--apply]
//   npm run forge:import -w @mugen/core -- --void <forge-void-export.json> [--apply]
//   npm run forge:import -w @mugen/core -- --list
//
// Without --apply nothing is written: it checks the file and says, in
// Japanese, what adopting it would do. With --apply it writes the files
// under packages/mugen-core/content/forge/, which then go through git
// review and ship in the build like any other content.
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
} from './forgeContentFs';
import { FORGE_KIND_LABEL, forgeKindOf } from '../core/forge/record';
import type { ForgeAdoptionPlan } from '../core/forge/content';

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

function args(argv: string[]) {
  const out: { file?: string; npcId?: string; region?: string; apply: boolean; rollback?: string; void?: string; list: boolean; dir?: string } = {
    apply: false,
    list: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') continue;
    else if (a === '--apply') out.apply = true;
    else if (a === '--list') out.list = true;
    else if (a === '--npc-id') out.npcId = argv[++i];
    else if (a === '--region') out.region = argv[++i];
    else if (a === '--rollback') out.rollback = argv[++i];
    else if (a === '--void') out.void = argv[++i];
    else if (a === '--content-dir') out.dir = argv[++i];
    else if (!a.startsWith('--')) out.file = a;
    else throw new Error(`知らないオプションです: ${a}`);
  }
  return out;
}

function report(plan: ForgeAdoptionPlan): void {
  const s = plan.summary;
  console.log(`判定: ${DECISION[plan.decision] ?? plan.decision}`);
  console.log(`Character ID: ${s?.characterId ?? '（読めません）'}   種類: ${plan.kind ? FORGE_KIND_LABEL[plan.kind] : '—'}   名前: ${s?.displayName ?? '—'}`);
  console.log(`送出版: ${s?.deployedVersion ?? '—'}   送出日時: ${s?.deployedAt ?? '—'}`);
  console.log(`NPC_ID: ${plan.npcId ?? '（未指定）'}   地域: ${plan.region ?? '未配置'}`);
  for (const e of [...plan.errors, ...plan.npcErrors]) console.log(`  × ${e.message}`);
  for (const w of [...plan.warnings, ...plan.npcNotes]) console.log(`  ! ${w.message}`);
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
      console.log(`  ${e.characterId} → ${e.npcId}  ${FORGE_KIND_LABEL[forgeKindOf(e)]}  ${e.deployedVersion}  ${e.region ?? '未配置'}${e.previous ? '  (戻せる)' : ''}`);
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

  if (opt.void) {
    const text = readFileSync(opt.void, 'utf8');
    console.log(`FORGE の VOID ID を台帳へ足します ${mode}`);
    if (!opt.apply) return 0;
    const { change, issues } = importVoidOnDisk(dir, text, basename(opt.void));
    console.log(`追加: ${change.added.join('、') || 'なし（すべて登録済み）'} ／ 合計 ${change.ledger.ids.length} 件`);
    for (const i of issues) console.log(`  ! ${i}`);
    return 0;
  }

  if (!opt.file) {
    console.log('使い方: npm run forge:import -w @mugen/core -- <deploy.json> --npc-id SERA [--region ALDEN] [--apply]');
    return 2;
  }
  const text = readFileSync(opt.file, 'utf8');
  const choice = { npcId: opt.npcId ?? null, region: opt.region ?? null };
  const plan = planOnDisk(dir, text, choice);
  console.log(`${basename(opt.file)} ${mode}`);
  report(plan);
  if (!plan.ready) return plan.decision === 'UNCHANGED' ? 0 : 1;
  if (!opt.apply) return 0;
  const { change, written } = adoptOnDisk(dir, text, choice, { decision: plan.decision, payloadHash: plan.payloadHash });
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
