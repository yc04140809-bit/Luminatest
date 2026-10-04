import { test, expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { throughTheOpening } from './opening';

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

const FIXTURES = new URL('../../mugen-core/core/forge/fixtures/bridge-v1.1/', import.meta.url);
const REPO_ROSTER = new URL('../../mugen-core/content/forge/roster.json', import.meta.url);
/** The repository's own ledger as it was when this file started — the tests write only to sandboxes. */
const REPO_ROSTER_AT_START = readFileSync(REPO_ROSTER, 'utf8');
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
    await expect(page.getByTestId('forge-preflight')).toHaveAttribute('data-result', 'ERROR');
    await expect(page.getByTestId('forge-preflight-items')).toContainText('サンプルデータ');
    await expect(page.getByTestId('forge-register')).toBeDisabled();
  }
  // A package that may be applied after a look: WARNING, with what to look at.
  await paste(page, real('normal-monster'));
  await expect(page.getByTestId('forge-preflight')).toHaveAttribute('data-result', 'WARNING');
  await expect(page.getByTestId('forge-preflight-items')).toContainText('combat.uniqueSkillCandidates');
  await expect(page.getByTestId('forge-records')).toContainText('まだありません');
  expect(existsSync(join(sandboxDir(), 'characters', 'HUM-900001.json'))).toBe(false);
});

test('B / C: HUMAN, 通常モンスター and BOSS are adopted once each as NPC_IDs; a re-send is a diff; one step back', async ({ page }) => {
  await openTool(page);

  // ---- HUMAN, by file. Nothing can be written until the NPC_ID is decided.
  // The v1.1 sample names no relationship; one is added here to show it is held, not made.
  await choose(page, 'HUM-900001_MUGEN_ZERO_0-1.json', real('human', (p) => (p.relationshipRefs = ['REL-900001'])));
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
  await choose(page, 'again.json', real('human', (p) => (p.relationshipRefs = ['REL-900001'])));
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
      p.deployment.deployedAt = '2026-10-03T01:00:00.000Z';
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
  await paste(page, real('human', (p) => ((p.deployment.deployedAt = '2026-10-04T01:00:00.000Z'), (p.deployment.deployedVersion = '0.1-r3'))));
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

test('C7 / D4 / D6: wrong type for the id, a revision-required visual, intensity NORMAL, unjustified equipment, and a child’s dream job', async ({ page }) => {
  await openTool(page);
  // Breaches of the contract (bridge v1.1) are refused.
  await paste(page, real('normal-monster', (p) => (p.characterId = 'HUM-900001')));
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('モンスター（MON-）の番号ではありません');
  await paste(page, real('human', (p) => (p.visualDirection.intensity = 'NORMAL')));
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('SUBTLE / STANDARD / STRONG');
  await paste(page, real('human', (p) => (p.visualReviewStatus = 'REVISION_REQUIRED')));
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('REVISION_REQUIRED');

  await paste(page, real('human', (p) => (p.equipment.validation.permitted = false)));
  await expect(page.getByTestId('forge-errors')).toContainText('装備の根拠が不足しています');
  await expect(page.getByTestId('forge-register')).toBeDisabled();

  await paste(
    page,
    real('human', (p) => {
      p.profile.occupation = '騎士';
      p.visualDiversity.ageGroup = 'child';
      p.lifeStage = {
        stage: 'CHILD',
        source: 'VISUAL_AGE',
        visualAge: 'child',
        adultAxisMode: 'FUTURE_TENDENCY',
        occupationMode: 'FUTURE_ASPIRATION',
        futureFields: ['marriageDesire', 'romanceStyle', 'occupation', 'independence', 'adultCareer'],
        note: '未成年の成人向け項目は将来傾向として扱う。',
      };
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
  await expect(page.getByTestId('forge-life-engine')).toContainText('MAGIC 0.29');
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

test('実機確認: the build’s adopted characters to choose from, choosing writes nothing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(dbs.map((d) => new Promise((resolve) => {
      if (!d.name) return resolve(null);
      const rq = indexedDB.deleteDatabase(d.name);
      rq.onsuccess = rq.onerror = rq.onblocked = () => resolve(null);
    })));
  });
  await page.goto('/?tool=forge-import');
  // Exactly the roster in the repository's content/forge — nobody else.
  const roster = (JSON.parse(REPO_ROSTER_AT_START) as { characters: { characterId: string }[] }).characters.map((c) => c.characterId);
  const buttons = page.getByTestId('forge-device-check-targets').getByRole('radio');
  await expect(buttons).toHaveCount(roster.length);
  for (const id of roster) await expect(page.getByTestId(`forge-device-check-target-${id}`)).toBeVisible();
  await expect(page.getByTestId('forge-device-check-target-HUM-000005')).toHaveCount(0);
  await expect(page.getByTestId('forge-device-check-target-HUM-000001')).toHaveAttribute('aria-checked', 'true');
  // Choosing (again) and checking leave the save exactly as empty as it was.
  await page.getByTestId('forge-device-check-target-HUM-000001').click();
  await page.getByTestId('forge-device-check-run').click();
  await expect(page.getByTestId('forge-device-check-table')).toHaveAttribute('data-character', 'HUM-000001');
  await expect(page.getByTestId('forge-device-check-6')).toHaveAttribute('data-state', 'PASS');
  // Switching to each adopted character asks the same 11 items of them.
  for (const id of roster) {
    await page.getByTestId(`forge-device-check-target-${id}`).click();
    await expect(page.getByTestId(`forge-device-check-target-${id}`)).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('forge-device-check-run').click();
    await expect(page.getByTestId('forge-device-check-table')).toHaveAttribute('data-character', id);
    for (const item of ['1', '2', '3', '4', '6', '7', '8', '9', '10', '11']) {
      await expect(page.getByTestId(`forge-device-check-${item}`), `${id} #${item}`).toHaveAttribute('data-state', 'PASS');
    }
    await expect(page.getByTestId('forge-device-check-5')).toHaveAttribute('data-state', 'UNCHECKED');
  }
  const stored = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
  expect(stored).toEqual({ local: 0, session: 0 });
});

test('実機確認（RIZEL）: 11 items across the phone procedure — empty save, つづきから, data wipe, はじめる', async ({ page }) => {
  const ALWAYS = ['1', '2', '3', '4', '7', '8', '9', '10', '11'];
  const check = async (label: string, expected: Record<string, string>) => {
    await page.goto('/?tool=forge-import');
    await page.getByTestId('forge-device-check-target-HUM-000001').click();
    await page.getByTestId('forge-device-check-run').click();
    await expect(page.getByTestId('forge-device-check-table')).toHaveAttribute('data-character', 'HUM-000001');
    for (const id of ALWAYS) {
      await expect(page.getByTestId(`forge-device-check-${id}`), `${label} #${id}`).toHaveAttribute('data-state', 'PASS');
    }
    for (const [id, state] of Object.entries(expected)) {
      await expect(page.getByTestId(`forge-device-check-${id}`), `${label} #${id}`).toHaveAttribute('data-state', state);
    }
    await expect(page.getByTestId('forge-device-check-状態')).toContainText('画像 未登録');
    await expect(page.getByTestId('forge-device-check-状態')).toContainText('関係 REL-000001 保留');
  };
  const wipe = async () => {
    // What Android's 設定 → アプリ → MUGEN ZERO → ストレージ → データ消去 does to the app's save.
    await page.evaluate(async () => {
      const dbs = (await indexedDB.databases?.()) ?? [];
      await Promise.all(dbs.map((d) => new Promise((resolve) => {
        if (!d.name) return resolve(null);
        const rq = indexedDB.deleteDatabase(d.name);
        rq.onsuccess = rq.onerror = rq.onblocked = () => resolve(null);
      })));
    });
  };

  await page.goto('/');
  await wipe();
  await check('empty save', { '5': 'UNCHECKED', '6': 'PASS' });

  // An existing save: played, closed, and reopened with 「つづきから」.
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await check('after つづきから', { '5': 'PASS', '6': 'UNCHECKED' });

  // データ消去: the save is gone completely.
  await wipe();
  await check('after data wipe', { '5': 'UNCHECKED', '6': 'PASS' });

  // はじめる on the wiped save.
  await page.goto('/');
  await expect(page.getByTestId('start-button')).toBeVisible();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await check('after はじめる', {});
});

test('none of this touched the repository’s own content', async () => {
  expect(readFileSync(REPO_ROSTER, 'utf8')).toBe(REPO_ROSTER_AT_START);
});
