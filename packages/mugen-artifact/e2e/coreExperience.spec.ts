import { test, expect, chromium, type BrowserContext, type Page, pageOf } from './fixtures';
import {
  GALD_TAP,
  devTimeShiftGo,
  intoTheVillage,
  leaveDevTimeShift,
  swingUntil,
} from './helpers';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:5173';

function launch(userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath: '/opt/pw-browsers/chromium',
    // Landscape, like the rest of the suite: the game has no portrait layout.
    viewport: { width: 844, height: 390 },
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
 *
 * Played through 捕らえる (CAPTURE): since 2026-10-20 見逃す leaves nowhere to
 * find him (ROUTE D: 「ガルドは村には残らない」), so the loop that ends in a
 * reunion runs through a route that still has one — the workyard.
 */
test('CORE EXPERIENCE: meet, choose, wait, discover, reunite, remember — across a restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-core-'));
  try {
    let context = await launch(userDataDir);
    let page = await pageOf(context);

    // --- TITLE / PROLOGUE ---
    await page.goto(`${BASE}/`);
    await expect(page.getByText('MUGEN ZERO')).toBeVisible();
    await page.getByTestId('start-button').click();
    // The opening line carries its own break, so match the clause
    // rather than the whole sentence.
    await expect(page.getByText('世界は覚えている。')).toBeVisible();
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
    await page.mouse.click(box.x + box.width * GALD_TAP.fx, box.y + box.height * GALD_TAP.fy);

    // --- GALD ENCOUNTER -> BATTLE ---
    const encounter = page.getByTestId('gald-encounter');
    await expect(encounter).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('……止まれ。')).toBeVisible();
    await encounter.click();
    await encounter.click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await swingUntil(page, 'bp-attack', () =>
      page.getByTestId('life-choice-screen').isVisible().catch(() => false),
    );

    // --- LIFE CHOICE: CAPTURE, and WORLD MEMORY records it ---
    await expect(page.getByTestId('life-choice-screen')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('彼の人生を、どうしますか？')).toBeVisible();
    await page.getByTestId('choice-CAPTURE').click();
    const result = page.getByTestId('choice-result-dialogue');
    await expect(result).toBeVisible();
    const recorded = page.getByTestId('choice-recorded-screen');
    for (let i = 0; i < 8 && !(await recorded.isVisible().catch(() => false)); i++) await result.click();
    await expect(recorded).toBeVisible();
    await expect(page.getByTestId('recorded-event-type')).toHaveText('PLAYER_CAPTURED_GALD');
    await page.getByTestId('return-home-button').click();

    // --- Time passes: three days, then three years ---
    await advanceDays(page, 3);
    await expect(page.getByTestId('world-clock')).toHaveText('1年目 4日目');
    await devTimeShiftGo(page);
    await expect(page.getByText('――3年後。')).toBeVisible();
    await leaveDevTimeShift(page);
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');

    // --- No spoilers anywhere before the discovery ---
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    const archiveBefore = await page.getByTestId('archive-detail').innerText();
    expect(archiveBefore).not.toContain('作業場');
    expect(archiveBefore).toContain('まだ知らない人生がある。');
    await page.getByTestId('archive-detail-back').click();
    await page.getByTestId('archive-back').click();

    // --- Discovery: an unfamiliar place, entered by choice (and no bakery of his: that chain is retired) ---
    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('location-ALDEN_BAKERY')).toHaveCount(0);
    const workyard = page.getByTestId('location-ALDEN_WORKYARD');
    await expect(workyard).toContainText('？？？');
    await workyard.click();

    // --- 「捕まったから、逃げられなかった。」 ---
    const scene = page.getByTestId('workyard-first-visit');
    const done = page.getByTestId('workyard-reunion-done');
    await expect(scene).toBeVisible();
    let heard = false;
    for (let i = 0; i < 30 && !(await done.isVisible().catch(() => false)); i++) {
      if (await page.getByText('捕まったから、逃げられなかった。').isVisible().catch(() => false)) heard = true;
      if (await scene.isVisible().catch(() => false)) await scene.click();
    }
    expect(heard).toBe(true);
    await expect(done).toBeVisible({ timeout: 10_000 });
    await expect(done).toContainText('自由にすることだけが、救うことじゃない');
    await page.getByTestId('workyard-leave').click();

    // --- The playtest arc closes in world terms ---
    const ending = page.getByTestId('ending-kaos');
    await expect(ending).toBeVisible();
    await expect(page.getByText('……どうだった？')).toBeVisible();
    for (let i = 0; i < 4; i++) await ending.click();
    await expect(page.getByTestId('ending-screen')).toBeVisible();
    await page.getByTestId('ending-keep-playing').click();

    // --- Revisit is an ordinary place ---
    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-ALDEN_WORKYARD').click();
    const revisit = page.getByTestId('workyard-revisit');
    await expect(revisit).toBeVisible();
    for (let i = 0; i < 12 && (await revisit.isVisible().catch(() => false)); i++) await revisit.click();
    await expect(page.getByTestId('workyard-revisit-done')).toContainText('石を積む音が、まだ続いている。');
    await expect(page.getByText('捕まったから、逃げられなかった。')).toHaveCount(0);
    await page.getByTestId('workyard-leave').click();
    await page.locator('.screen-footer .btn').click(); // back to HOME

    // --- LIFE ARCHIVE: the whole life, five chapters ---
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    await expect(page.getByTestId('archive-detail')).toContainText('ガルド の人生');
    await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
    await expect(page.getByTestId('archive-chapter-GALD_CH_TRIAL')).toBeVisible();
    await context.close(); // FULL browser shutdown

    // --- Restart: the collected life is still there ---
    context = await launch(userDataDir);
    page = await pageOf(context);
    await page.goto(`${BASE}/`);
    await page.getByTestId('continue-button').click();
    await intoTheVillage(page);
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
    await expect(page.getByTestId('archive-chapter-GALD_CH_VILLAGE_WORK')).toBeVisible();
    await expect(page.getByTestId('archive-unknown')).toHaveCount(0);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
