import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:5173';

function launch(userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath: '/opt/pw-browsers/chromium',
    viewport: { width: 390, height: 844 },
  });
}

async function advanceDays(page: Page, n: number) {
  const button = page.getByTestId('rest-button');
  const clock = page.getByTestId('world-clock');
  for (let i = 0; i < n; i++) {
    const before = await clock.textContent();
    await button.click();
    await expect(clock).not.toHaveText(before ?? '');
  }
}

/**
 * THE game: one uninterrupted run of the MUGEN ZERO core loop on a phone
 * viewport, ending in a full browser restart that must restore the life
 * the player collected.
 */
test('CORE EXPERIENCE: meet, choose, wait, discover, reunite, remember — across a restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-core-'));
  try {
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());

    // --- TITLE / PROLOGUE ---
    await page.goto(`${BASE}/`);
    await expect(page.getByText('MUGEN ZERO')).toBeVisible();
    await page.getByTestId('start-button').click();
    await expect(page.getByText('あなたが忘れても、世界は覚えている。')).toBeVisible();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    await expect(page.getByText('やっと来た。')).toBeVisible();
    for (let i = 0; i < 6; i++) await kaos.click();

    // --- HOME -> GREENWOOD (Phaser loads on demand here) ---
    await expect(page.getByTestId('world-clock')).toHaveText('1年目 1日目');
    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-GREENWOOD_FOREST').click();
    const canvas = page.locator('.phaser-wrap canvas');
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    await expect(canvas).toHaveCount(1); // exactly one game instance
    await page.waitForTimeout(500);
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas bounding box unavailable');
    await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));

    // --- GALD ENCOUNTER -> BATTLE ---
    const encounter = page.getByTestId('gald-encounter');
    await expect(encounter).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('……止まれ。')).toBeVisible();
    await encounter.click();
    await encounter.click();
    await expect(page.getByTestId('battle-screen')).toBeVisible();
    const attack = page.getByTestId('attack-button');
    for (let i = 0; i < 8; i++) {
      if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
      if (await attack.isEnabled().catch(() => false)) await attack.click();
      await page.waitForTimeout(150);
    }

    // --- LIFE CHOICE: SPARE, and WORLD MEMORY records it ---
    await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('彼の人生を、どうしますか？')).toBeVisible();
    await page.getByTestId('choice-SPARE').click();
    const result = page.getByTestId('choice-result-dialogue');
    await expect(result).toBeVisible();
    await expect(page.getByText('俺はお前を殺そうとしたんだぞ。')).toBeVisible();
    await result.click();
    await result.click();
    await result.click();
    await expect(page.getByTestId('choice-recorded-screen')).toBeVisible();
    await expect(page.getByTestId('recorded-event-type')).toHaveText('PLAYER_SPARED_GALD');
    await page.getByTestId('return-home-button').click();

    // --- Time passes: three days, then three years ---
    await advanceDays(page, 3);
    await expect(page.getByTestId('world-clock')).toHaveText('1年目 4日目');
    await page.getByTestId('time-shift-button').click();
    await page.getByTestId('time-shift-go').click();
    await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('――3年後。')).toBeVisible();
    await page.getByTestId('time-shift-return').click();
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');

    // --- No spoilers anywhere before the discovery ---
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    const archiveBefore = await page.getByTestId('archive-detail').innerText();
    expect(archiveBefore).not.toContain('パン');
    expect(archiveBefore).toContain('まだ知らない人生がある。');
    await page.getByTestId('archive-detail-back').click();
    await page.getByTestId('archive-back').click();

    // --- Discovery: an unfamiliar shop, entered by choice ---
    await page.getByTestId('explore-button').click();
    const bakery = page.getByTestId('location-ALDEN_BAKERY');
    await expect(bakery).toContainText('？？？');
    await bakery.click();

    // --- 「……見るな。」 ---
    const scene = page.getByTestId('bakery-first-visit');
    await expect(scene).toBeVisible();
    for (let i = 0; i < 5; i++) await scene.click();
    await expect(page.getByText('……見るな。')).toBeVisible();
    await scene.click();
    await scene.click();
    await scene.click();
    await expect(page.getByTestId('bakery-reunion-done')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('「……続き、あったでしょ？」')).toBeVisible();
    await page.getByTestId('bakery-leave').click();

    // --- Revisit is an ordinary bakery ---
    await page.getByTestId('location-ALDEN_BAKERY').click();
    await expect(page.getByText('今日は何だ。')).toBeVisible();
    await expect(page.getByText('……見るな。')).toHaveCount(0);
    await page.getByTestId('bakery-revisit').click();
    await page.getByTestId('bakery-leave').click();
    await page.locator('.screen-footer .btn').click(); // back to HOME

    // --- LIFE ARCHIVE: the whole life, five chapters ---
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    await expect(page.getByTestId('archive-detail')).toContainText('ガルド の人生');
    await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
    await expect(page.getByTestId('archive-chapter-GALD_CH_REUNION')).toContainText('……見るな。');
    await context.close(); // FULL browser shutdown

    // --- Restart: the collected life is still there ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
    await expect(page.getByTestId('archive-chapter-GALD_CH_NEW_WORK')).toContainText('1年目 94日目');
    await expect(page.getByTestId('archive-unknown')).toHaveCount(0);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
