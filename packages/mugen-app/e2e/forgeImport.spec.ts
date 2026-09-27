import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * CHARACTER FORGE → MUGEN ZERO, on the screen (debug builds only).
 *
 * Adopting a character writes CONTENT (packages/mugen-core/content/forge),
 * which the dev server does on the author's PC. Every test here writes
 * into its own sandbox folder in the OS temp directory (`&sandbox=`), so
 * the repository's content is never touched — and the last test checks
 * that it was not.
 *
 * The files are FORGE's own examples. Adopting one needs the sample mark
 * taken off, which happens here, in the test, into the sandbox.
 */

const FIXTURES = new URL('../../mugen-core/core/forge/fixtures/', import.meta.url);
const REPO_ROSTER = new URL('../../mugen-core/content/forge/roster.json', import.meta.url);
type Name = 'human' | 'normal-monster' | 'boss-monster';
const sampleText = (name: Name) => readFileSync(new URL(`${name}-deploy.sample.json`, FIXTURES), 'utf8');
function real(name: Name, change: (p: Record<string, any>) => void = () => {}): string {
  const p = JSON.parse(sampleText(name));
  delete p.sampleOnly;
  change(p);
  return JSON.stringify(p, null, 2);
}
const SHOTS = process.env.FORGE_SHOTS;

let sandbox = '';
test.beforeEach(() => {
  sandbox = `e2e-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
});
const sandboxDir = () => join(tmpdir(), 'mugen-forge-sandbox', sandbox);

async function openTool(page: Page) {
  await page.goto(`/?tool=forge-import&sandbox=${sandbox}`);
  await expect(page.getByTestId('forge-step-1')).toBeVisible();
  await expect(page.getByTestId('forge-target')).toContainText('サンドボックス');
}

async function paste(page: Page, text: string) {
  if (!(await page.getByTestId('forge-paste-text').isVisible())) await page.getByTestId('forge-paste-toggle').click();
  await page.getByTestId('forge-paste-text').fill(text);
  await page.getByTestId('forge-paste-load').click();
}

async function choose(page: Page, name: string, text: string) {
  await page.getByTestId('forge-file-input').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}

async function adoptAs(page: Page, npcId: string, region?: string) {
  await page.getByTestId('forge-npc-id').fill(npcId);
  if (region) await page.getByTestId('forge-region').selectOption(region);
  await page.getByTestId('forge-register').click();
  await expect(page.getByTestId('forge-done')).toContainText('MUGEN ZEROへ受け入れました。');
  await expect(page.getByTestId('forge-done-npc')).toHaveText(npcId);
}

const decision = (page: Page) => page.getByTestId('forge-decision');

test('the title’s DEBUG button opens the adoption tool, which writes to content — not to a save', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('debug-forge-import').click();
  await expect(page).toHaveURL(/tool=forge-import/);
  await expect(page.getByTestId('forge-import')).toHaveAttribute('data-mode', 'AUTHORING');
  await expect(page.getByTestId('forge-target')).toContainText('リポジトリの content/forge');
  await expect(page.getByTestId('forge-target')).toContainText('端末のSAVEには入りません');
  await expect(page.getByTestId('forge-file-button')).toHaveText('JSONファイルを選ぶ');
  await expect(page.getByTestId('forge-paste-toggle')).toHaveText('JSONを貼り付ける');
});

test('A2 / A6: a broken file and a sample are refused, and nothing is written', async ({ page }) => {
  await openTool(page);
  await paste(page, '{ "schemaVersion": "1.0", ');
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('JSONとして読めません');
  await expect(page.getByTestId('forge-register')).toBeDisabled();

  for (const name of ['human', 'normal-monster', 'boss-monster'] as const) {
    await choose(page, `${name}.json`, sampleText(name));
    await expect(decision(page)).toHaveText('取込不可（サンプルデータ）');
    await expect(page.getByTestId('forge-register')).toBeDisabled();
  }
  await expect(page.getByTestId('forge-records')).toContainText('まだありません');
  expect(existsSync(join(sandboxDir(), 'characters', 'HUM-900001.json'))).toBe(false);
});

test('B / C: HUMAN, 通常モンスター and BOSS are adopted once each as NPC_IDs; a re-send is a diff; one step back', async ({ page }) => {
  await openTool(page);

  // ---- HUMAN, by file. Nothing can be written until the NPC_ID is decided.
  await choose(page, 'HUM-900001_MUGEN_ZERO_0-1.json', real('human'));
  await expect(page.getByTestId('forge-summary-id')).toHaveText('HUM-900001');
  await expect(page.getByTestId('forge-kind')).toHaveAttribute('data-kind', 'HUMAN');
  await expect(decision(page)).toHaveText('新規登録');
  await expect(page.getByTestId('forge-npc-errors')).toContainText('NPC_ID を決めてください');
  await expect(page.getByTestId('forge-register')).toBeDisabled();
  await page.getByTestId('forge-npc-id').fill('sera');
  await expect(page.getByTestId('forge-npc-errors')).toContainText('正式な NPC_ID の形ではありません');
  await expect(page.getByTestId('forge-register')).toBeDisabled();
  await expect(page.getByTestId('forge-warnings')).toContainText('関係ID REL-900001 は本編にまだありません');
  await expect(page.getByTestId('forge-skills')).toContainText('未習得');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-human-review.png` });
  await adoptAs(page, 'SERA', 'ALDEN');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('→ SERA');
  await expect(page.getByTestId('forge-record-HUM-900001')).toHaveAttribute('data-kind', 'HUMAN');
  // It is a content file now.
  expect(JSON.parse(readFileSync(join(sandboxDir(), 'characters', 'HUM-900001.json'), 'utf8')).characterId).toBe('HUM-900001');

  // ---- The same file again: 変更なし, and the NPC_ID shown as fixed.
  await choose(page, 'again.json', real('human'));
  await expect(decision(page)).toHaveText('変更なし');
  await expect(page.getByTestId('forge-npc-fixed')).toContainText('SERA');
  await expect(page.getByTestId('forge-register')).toBeDisabled();
  await expect(page.getByTestId('forge-blocked-reason')).toContainText('二重登録はしません');

  // ---- 通常モンスター, by paste.
  await paste(page, real('normal-monster'));
  await expect(page.getByTestId('forge-kind')).toHaveAttribute('data-kind', 'MONSTER');
  await expect(page.getByTestId('forge-summary')).toContainText('未設定 — 種族名で表示します');
  await expect(page.getByTestId('forge-boss')).toContainText('BOSS遭遇設計: なし');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-monster-review.png` });
  await adoptAs(page, 'MOSS_ROLLER');

  // ---- BOSS.
  await paste(page, real('boss-monster'));
  await expect(page.getByTestId('forge-kind')).toContainText('MONSTER / encounterRole: BOSS');
  await expect(page.getByTestId('forge-boss')).toContainText('19項目');
  // An NPC_ID already used is refused.
  await page.getByTestId('forge-npc-id').fill('SERA');
  await expect(page.getByTestId('forge-npc-errors')).toContainText('HUM-900001 に対応済み');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-boss-review.png` });
  await adoptAs(page, 'ROOTRING_WARDEN');

  // ---- Still there after a reload: read back from the content files.
  await page.reload();
  for (const [id, kind, npc] of [
    ['HUM-900001', 'HUMAN', 'SERA'],
    ['MON-900001', 'MONSTER', 'MOSS_ROLLER'],
    ['MON-900002', 'BOSS', 'ROOTRING_WARDEN'],
  ]) {
    await expect(page.getByTestId(`forge-record-${id}`)).toHaveAttribute('data-kind', kind);
    await expect(page.getByTestId(`forge-record-${id}`)).toContainText(`→ ${npc}`);
  }

  // ---- C2: the human sent again as 0.1-r2 — a diff, applied only on 差分を反映.
  await paste(
    page,
    real('human', (p) => {
      p.deployment.deployedVersion = '0.1-r2';
      p.deployment.deployedAt = '2026-09-28T01:00:00.000Z';
      p.profile.occupation = '薬師';
    }),
  );
  await expect(decision(page)).toHaveText('更新候補');
  await expect(page.getByTestId('forge-npc-fixed')).toContainText('SERA');
  await expect(page.getByTestId('forge-diff-changed')).toContainText('基本設定 › occupation');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-update-review.png` });
  await page.getByTestId('forge-update').click();
  await expect(page.getByTestId('forge-done')).toHaveAttribute('data-result', 'UPDATED');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1-r2');
  expect(existsSync(join(sandboxDir(), 'previous', 'HUM-900001.json'))).toBe(true);

  // ---- C6: one step back.
  await page.getByTestId('forge-rollback-HUM-900001').click();
  await page.getByTestId('forge-rollback-confirm').click();
  await expect(page.getByTestId('forge-records-message')).toContainText('直前の送出へ戻しました');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1・');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('直前へ戻した');
  await expect(page.getByTestId('forge-rollback-HUM-900001')).toHaveCount(0);

  // ---- 取り込まない clears the screen and writes nothing.
  await paste(page, real('human', (p) => ((p.deployment.deployedAt = '2026-09-29T01:00:00.000Z'), (p.deployment.deployedVersion = '0.1-r3'))));
  await expect(decision(page)).toHaveText('更新候補');
  await page.getByTestId('forge-cancel').click();
  await expect(page.getByTestId('forge-step-2')).toHaveCount(0);
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1・');

  // ---- Adopting is not playing: the title still offers a new game.
  await page.goto('/');
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('continue-button')).toHaveCount(0);
});

test('an existing person can be the one adopted — their id and name stay', async ({ page }) => {
  await openTool(page);
  await paste(page, real('human'));
  await page.getByTestId('forge-npc-id').fill('LINA');
  await expect(page.getByTestId('forge-npc-notes')).toContainText('既存の人物「リナ」（LINA）の正式定義として対応づけます');
  await expect(page.getByTestId('forge-npc-notes')).toContainText('本編の名前はそのまま使います');
  await page.getByTestId('forge-npc-id').fill('PLAYER');
  await expect(page.getByTestId('forge-npc-errors')).toContainText('PLAYER');
  await expect(page.getByTestId('forge-register')).toBeDisabled();
});

test('C7 / D4 / D6: wrong type for the id, unjustified equipment, and a child’s dream job', async ({ page }) => {
  await openTool(page);
  await paste(page, real('normal-monster', (p) => (p.characterId = 'HUM-900001')));
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('モンスター（MON-）の番号ではありません');

  await paste(page, real('human', (p) => (p.equipment.validation.permitted = false)));
  await expect(page.getByTestId('forge-errors')).toContainText('装備の根拠が不足しています');
  await expect(page.getByTestId('forge-register')).toBeDisabled();

  await paste(
    page,
    real('human', (p) => {
      p.profile.occupation = '騎士';
      p.lifeStage = { visualAge: 'child', adultAxisMode: 'FUTURE_TENDENCY', occupationMode: 'FUTURE_ASPIRATION' };
    }),
  );
  await expect(page.getByTestId('forge-occupation')).toContainText('現在の職業: （なし）');
  await expect(page.getByTestId('forge-occupation')).toContainText('将来の希望: 騎士');
});

test('a FORGE export: its voidIds go to the ledger and are refused; a character is picked out of it and adopted', async ({ page }) => {
  await openTool(page);
  const exported = {
    schemaVersion: 1,
    exportedAt: '2026-09-27T03:00:00.000Z',
    characters: [JSON.parse(real('human')), JSON.parse(real('boss-monster', (p) => (p.characterId = 'MON-000004')))],
    voidIds: [{ characterId: 'MON-000004', status: 'VOID' }],
  };
  await choose(page, 'forge-export.json', JSON.stringify(exported));
  await expect(page.getByTestId('forge-export')).toHaveAttribute('data-format', 'OFFICIAL');
  await expect(page.getByTestId('forge-export-voids')).toContainText('MON-000004（新規）');

  // The retired one is refused, even before the ledger has it.
  await page.getByTestId('forge-export-pick-MON-000004').click();
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_RESERVED_ID');
  await expect(page.getByTestId('forge-errors')).toContainText('VOID');

  await page.getByTestId('forge-void-import').click();
  await expect(page.getByTestId('forge-void-message')).toContainText('MON-000004');
  await expect(page.getByTestId('forge-export-voids')).toContainText('MON-000004（台帳にあり）');
  expect(JSON.parse(readFileSync(join(sandboxDir(), 'void.json'), 'utf8')).ids).toEqual(['MON-000004']);

  // The human in the same export is adopted as usual.
  await page.getByTestId('forge-export-pick-HUM-900001').click();
  await expect(decision(page)).toHaveText('新規登録');
  await adoptAs(page, 'SERA');
});

test('WORLD LIFE ENGINE: a person by default, a monster not — decided at adoption, switchable later; UNMAPPED is shown', async ({ page }) => {
  await openTool(page);
  await paste(page, real('human'));
  await expect(page.getByTestId('forge-life-actor')).toBeChecked();
  await expect(page.getByTestId('forge-entity-type')).toHaveText('PERSON');
  await expect(page.getByTestId('forge-life-engine')).toContainText('MAGIC 0.78');
  await expect(page.getByTestId('forge-unmapped')).toContainText('UNMAPPED: profile.core.personality「慎重」');
  await expect(page.getByTestId('forge-unmapped')).toContainText('aptitudes「commerce」');
  await adoptAs(page, 'SERA');
  await expect(page.getByTestId('forge-life-HUM-900001')).toHaveText('Life Engine 対象');

  await paste(page, real('boss-monster'));
  await expect(page.getByTestId('forge-life-actor')).not.toBeChecked();
  await expect(page.getByTestId('forge-entity-type')).toHaveText('CREATURE');
  await expect(page.getByTestId('forge-life-engine')).toContainText('対象外');
  await expect(page.getByTestId('forge-unmapped')).toContainText('活動時間');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-boss-lifeactor.png` });
  await adoptAs(page, 'MON_ROOTRING');
  await expect(page.getByTestId('forge-life-MON-900002')).toHaveText('Life Engine 対象外');

  // The boss has become an individual the story follows.
  await page.getByTestId('forge-life-toggle-MON-900002').click();
  await expect(page.getByTestId('forge-life-MON-900002')).toHaveText('Life Engine 対象');
  await expect(page.getByTestId('forge-record-MON-900002')).toContainText('Life Engine 対象を変更');
});

test('none of this touched the repository’s own content', async () => {
  expect(JSON.parse(readFileSync(REPO_ROSTER, 'utf8')).characters).toEqual([]);
});
