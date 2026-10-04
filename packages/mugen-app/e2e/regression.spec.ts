import { test, expect } from '@playwright/test';
import { throughTheOpening } from './opening';
import { fightToResult, fightUntil, readyToAct, throughTheAwakening } from './battle';

/**
 * THE GOLDEN PATH, IN ONE RUN — the regression smoke.
 *
 * Every step below has a spec of its own that looks at it closely
 * (docs/REGRESSION_TESTS.md lists which). This one looks at none of
 * them closely and at the SEAMS between all of them: one save, one
 * browser, start to finish, so a change that breaks the hand-over from
 * one screen to the next fails here even when each screen's own spec
 * is still green.
 *
 *   はじめる → OPENING → 命名 → アルデン → ステータス → 森 → 戦闘 → 勝利 →
 *   ガルド → 覚醒 → CUT-IN → 四択 → TIME SHIFT → WORLD MEMORY →
 *   再起動 → つづきから
 */

test('start to finish on one save, and all of it still there after a restart', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();

  // ゲーム開始 — a fresh device offers only はじめる.
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('continue-button')).toHaveCount(0);
  await page.getByTestId('start-button').click();

  // OPENING → 命名.
  await throughTheOpening(page);
  await page.getByTestId('naming-input').fill('レイ');
  await page.getByTestId('naming-confirm').click();

  // 村.
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const day = await page.getByTestId('world-clock').textContent();

  // ステータス画面 — the name given above, and the way back.
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
  await expect(page.getByTestId('status-name-text')).toHaveText('レイ');
  await expect(page.getByTestId('status-scroll')).toBeVisible();
  await page.getByTestId('status-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  // 森 → 戦闘開始 → 勝利.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  await fightToResult(page);
  await expect(page.getByTestId('result-exp')).toBeVisible();
  await expect(page.getByTestId('result-items')).not.toContainText(/[A-Z]+_[A-Z_]+/);
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();

  // ガルド — the story's fight, from the same forest.
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expect(page.getByTestId('battle-screen')).toBeVisible();

  // 覚醒 → CUT-IN: her first spell in the game's own fight.
  const awakening = page.getByTestId('magic-awakening');
  await fightUntil(page, () => awakening.isVisible().catch(() => false), { maxTurns: 200 });
  await throughTheAwakening(page);
  await readyToAct(page);
  await page.getByTestId('bp-magic').click();
  await page.getByTestId('magic-starlight_bolt').click();
  await expect(page.getByTestId('cut-in-name')).toHaveText('星光弾');

  // 四択.
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), {
    maxTurns: 200,
  });
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
  for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
    await expect(page.getByTestId(`choice-${id}`)).toBeVisible();
  }
  await page.getByTestId('choice-SPARE').click();
  await expect(page.getByTestId('choice-result')).toHaveAttribute('data-choice', 'SPARE');

  // TIME SHIFT 特殊イベント — she asks, shows, brings them back.
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  // The look ahead costs the world no time.
  await expect(page.getByTestId('world-clock')).toHaveText(day ?? '');

  // WORLD MEMORY 保存.
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-count')).toHaveText('1 件');
  await expect(page.getByTestId('memory-PLAYER_SPARED_GALD')).toBeVisible();
  await page.getByTestId('memory-back').click();

  // 再起動 → つづきから: the name, the memory and the answer are the save's.
  await page.reload();
  await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('continue-button').click();
  if (await page.getByTestId('back-to-village').isVisible().catch(() => false)) {
    await page.getByTestId('back-to-village').click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-count')).toHaveText('1 件');
  await page.getByTestId('memory-back').click();
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-name-text')).toHaveText('レイ');
  await page.getByTestId('status-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('gald-button')).toHaveCount(0);

  expect(errors).toEqual([]);
});
