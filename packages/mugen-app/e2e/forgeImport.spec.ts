import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * CHARACTER FORGE → MUGEN ZERO, on the screen (debug builds only).
 *
 * The rules are tested in the core (core/forge, core/world/forgeImport);
 * this is the author's walk through them: the three steps, the four
 * verdicts, HUMAN / 通常モンスター / BOSS told apart, a sample and a
 * broken file refused, the same file twice registered once, a re-send
 * shown as a diff and applied, one step back — and the title still
 * offering 「はじめる」 afterwards, because importing is not playing.
 *
 * The files are FORGE's own examples. Registering one needs the sample
 * mark taken off, which happens here, in the test, into the test
 * browser's throwaway save — never into anybody's.
 */

const FIXTURES = new URL('../../mugen-core/core/forge/fixtures/', import.meta.url);
type Name = 'human' | 'normal-monster' | 'boss-monster';
const sampleText = (name: Name) => readFileSync(new URL(`${name}-deploy.sample.json`, FIXTURES), 'utf8');
function real(name: Name, change: (p: Record<string, any>) => void = () => {}): string {
  const p = JSON.parse(sampleText(name));
  delete p.sampleOnly;
  change(p);
  return JSON.stringify(p, null, 2);
}
const SHOTS = process.env.FORGE_SHOTS;

async function openTool(page: Page) {
  await page.goto('/?tool=forge-import');
  await expect(page.getByTestId('forge-step-1')).toBeVisible();
}

async function paste(page: Page, text: string) {
  if (!(await page.getByTestId('forge-paste-text').isVisible())) await page.getByTestId('forge-paste-toggle').click();
  await page.getByTestId('forge-paste-text').fill(text);
  await page.getByTestId('forge-paste-load').click();
}

async function choose(page: Page, name: string, text: string) {
  await page.getByTestId('forge-file-input').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}

const decision = (page: Page) => page.getByTestId('forge-decision');

test('the title’s DEBUG button opens the import tool', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('debug-forge-import').click();
  await expect(page).toHaveURL(/tool=forge-import/);
  await expect(page.getByTestId('forge-step-1')).toContainText('データを選ぶ');
  await expect(page.getByTestId('forge-file-button')).toHaveText('JSONファイルを選ぶ');
  await expect(page.getByTestId('forge-paste-toggle')).toHaveText('JSONを貼り付ける');
});

test('A2 / A6: a broken file and a sample are refused, and the save is not touched', async ({ page }) => {
  await openTool(page);
  await paste(page, '{ "schemaVersion": "1.0", ');
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('JSONとして読めません');
  await expect(page.getByTestId('forge-register')).toBeDisabled();

  for (const name of ['human', 'normal-monster', 'boss-monster'] as const) {
    await choose(page, `${name}.json`, sampleText(name));
    await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_SAMPLE_DATA');
    await expect(decision(page)).toHaveText('取込不可（サンプルデータ）');
    await expect(page.getByTestId('forge-register')).toBeDisabled();
    await expect(page.getByTestId('forge-blocked-reason')).toContainText('サンプルデータ');
  }
  await expect(page.getByTestId('forge-records')).toContainText('まだありません');
});

test('B / C: HUMAN, 通常モンスター and BOSS come in once each; a re-send is a diff; one step back', async ({ page }) => {
  await openTool(page);

  // ---- HUMAN, by file.
  await choose(page, 'HUM-900001_MUGEN_ZERO_0-1.json', real('human'));
  await expect(page.getByTestId('forge-summary-id')).toHaveText('HUM-900001');
  await expect(page.getByTestId('forge-kind')).toHaveAttribute('data-kind', 'HUMAN');
  await expect(decision(page)).toHaveText('新規登録');
  await expect(page.getByTestId('forge-valid')).toBeVisible();
  await expect(page.getByTestId('forge-warnings')).toContainText('関係ID REL-900001 は本編にまだありません');
  await expect(page.getByTestId('forge-warnings')).toContainText('実ファイルは本編に未登録');
  await expect(page.getByTestId('forge-skills')).toContainText('未習得');
  await expect(page.getByTestId('forge-game-owned')).toContainText('WORLD MEMORY');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-human-review.png`, fullPage: true });
  await page.getByTestId('forge-register').click();
  await expect(page.getByTestId('forge-done')).toContainText('MUGEN ZEROへ受け入れました。');
  await expect(page.getByTestId('forge-done')).toHaveAttribute('data-result', 'NEW');
  await expect(page.getByTestId('forge-record-HUM-900001')).toHaveAttribute('data-kind', 'HUMAN');

  // ---- The same file again: 変更なし, nothing to register.
  await choose(page, 'again.json', real('human'));
  await expect(decision(page)).toHaveAttribute('data-decision', 'UNCHANGED');
  await expect(decision(page)).toHaveText('変更なし');
  await expect(page.getByTestId('forge-register')).toBeDisabled();
  await expect(page.getByTestId('forge-blocked-reason')).toContainText('二重登録はしません');

  // ---- 通常モンスター, by paste.
  await paste(page, real('normal-monster'));
  await expect(page.getByTestId('forge-kind')).toHaveAttribute('data-kind', 'MONSTER');
  await expect(page.getByTestId('forge-summary')).toContainText('未設定 — 種族名で表示します');
  await expect(page.getByTestId('forge-boss')).toContainText('BOSS遭遇設計: なし');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-monster-review.png`, fullPage: true });
  await page.getByTestId('forge-register').click();
  await expect(page.getByTestId('forge-done')).toContainText('MUGEN ZEROへ受け入れました。');

  // ---- BOSS.
  await paste(page, real('boss-monster'));
  await expect(page.getByTestId('forge-kind')).toHaveAttribute('data-kind', 'BOSS');
  await expect(page.getByTestId('forge-kind')).toContainText('MONSTER / encounterRole: BOSS');
  await expect(page.getByTestId('forge-boss')).toContainText('19項目');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-boss-review.png`, fullPage: true });
  await page.getByTestId('forge-register').click();
  await expect(page.getByTestId('forge-done')).toContainText('MUGEN ZEROへ受け入れました。');

  // ---- B6: still there after a reload.
  await page.reload();
  for (const [id, kind] of [
    ['HUM-900001', 'HUMAN'],
    ['MON-900001', 'MONSTER'],
    ['MON-900002', 'BOSS'],
  ]) {
    await expect(page.getByTestId(`forge-record-${id}`)).toHaveAttribute('data-kind', kind);
  }

  // ---- C2: the human sent again as 0.1-r2 — shown as a diff, applied only on 差分を反映.
  await paste(
    page,
    real('human', (p) => {
      p.deployment.deployedVersion = '0.1-r2';
      p.deployment.deployedAt = '2026-09-28T01:00:00.000Z';
      p.profile.occupation = '薬師';
    }),
  );
  await expect(decision(page)).toHaveText('更新候補');
  await expect(page.getByTestId('forge-diff-changed')).toContainText('基本設定 › occupation');
  await expect(page.getByTestId('forge-diff-changed')).toContainText('薬草採集人');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1・');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/forge-update-review.png`, fullPage: true });
  await page.getByTestId('forge-update').click();
  await expect(page.getByTestId('forge-done')).toHaveAttribute('data-result', 'UPDATED');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1-r2');

  // ---- C6: one step back.
  await page.getByTestId('forge-rollback-HUM-900001').click();
  await page.getByTestId('forge-rollback-confirm').click();
  await expect(page.getByTestId('forge-records-message')).toContainText('直前の状態に戻しました');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1・');
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('直前へ戻した');
  await expect(page.getByTestId('forge-rollback-HUM-900001')).toHaveCount(0);

  // ---- 取り込まない clears the screen and writes nothing.
  await paste(page, real('human', (p) => ((p.deployment.deployedAt = '2026-09-29T01:00:00.000Z'), (p.deployment.deployedVersion = '0.1-r3'))));
  await expect(decision(page)).toHaveText('更新候補');
  await page.getByTestId('forge-cancel').click();
  await expect(page.getByTestId('forge-step-2')).toHaveCount(0);
  await expect(page.getByTestId('forge-record-HUM-900001')).toContainText('送出版 0.1・');

  // ---- Importing is not playing: the title still offers a new game.
  await page.goto('/');
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('continue-button')).toHaveCount(0);
});

test('C7 / D4: a different type under a known id, and unjustified equipment, are refused', async ({ page }) => {
  await openTool(page);
  await paste(page, real('normal-monster', (p) => (p.characterId = 'HUM-900001')));
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('モンスター（MON-）の番号ではありません');

  await paste(page, real('human', (p) => (p.equipment.validation.permitted = false)));
  await expect(decision(page)).toHaveAttribute('data-decision', 'BLOCKED_VALIDATION');
  await expect(page.getByTestId('forge-errors')).toContainText('装備の根拠が不足しています');
  await expect(page.getByTestId('forge-register')).toBeDisabled();
});

test('D6: a child’s dream job is shown as a dream, not a job', async ({ page }) => {
  await openTool(page);
  await paste(
    page,
    real('human', (p) => {
      p.profile.occupation = '騎士';
      p.lifeStage = { visualAge: 'child', adultAxisMode: 'FUTURE_TENDENCY', occupationMode: 'FUTURE_ASPIRATION' };
    }),
  );
  await expect(page.getByTestId('forge-occupation')).toContainText('現在の職業: （なし）');
  await expect(page.getByTestId('forge-occupation')).toContainText('将来の希望: 騎士');
  await expect(page.getByTestId('forge-warnings')).toContainText('将来の傾向');
});
