import { test, expect, chromium, type BrowserContext, type Page, pageOf } from './fixtures';
import { enterDevAdmin, intoTheVillage } from './helpers';
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

async function goHomeFresh(page: Page) {
  await page.goto(`${BASE}/`);
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** The whole record, as the player reads it: one connected life, every chapter known. Returns each chapter's text. */
async function readFullGaldRecord(page: Page): Promise<string[]> {
  await page.getByTestId('archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail')).toContainText('ガルド の人生');
  const cards = page.getByTestId('archive-detail').locator('.location-card');
  await expect(cards).toHaveCount(5);
  await expect(page.getByTestId('archive-chapter-GALD_CH_TRIAL')).toContainText('1年目');
  await expect(page.getByTestId('archive-unknown')).toHaveCount(0);
  return cards.allInnerTexts();
}

/**
 * A world whose record is whole: 捕らえる three years on, the workyard found
 * through the game's own screens. (Since 2026-10-20 見逃す leaves nowhere to
 * find him, so the old REUNITED preset — the bakery reunion — is gone.)
 */
async function discoverTheWorkyard(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-CAPTURE_3Y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_WORKYARD').click();
  const scene = page.getByTestId('workyard-first-visit');
  const done = page.getByTestId('workyard-reunion-done');
  await expect(scene).toBeVisible();
  for (let i = 0; i < 30 && !(await done.isVisible().catch(() => false)); i++) {
    if (await scene.isVisible().catch(() => false)) await scene.click();
  }
  await expect(done).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('workyard-leave').click();
  const ending = page.getByTestId('ending-kaos');
  await expect(ending).toBeVisible();
  for (let i = 0; i < 4; i++) await ending.click();
  await page.getByTestId('ending-keep-playing').click();
}

// Phase F: the connected life record survives a full browser restart,
// with identical chapters, order and dates.
test('the LIFE ARCHIVE record survives a full browser restart unchanged', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: a world with a whole record (the workyard found), read it. ---
    let context = await launch(userDataDir);
    let page = await pageOf(context);
    await goHomeFresh(page);
    await discoverTheWorkyard(page);
    const before = await readFullGaldRecord(page);
    await context.close(); // full browser shutdown

    // --- Session 2: identical record after restart. ---
    context = await launch(userDataDir);
    page = await pageOf(context);
    await page.goto(`${BASE}/`);
    await page.getByTestId('continue-button').click();
    // 「つづきから」 puts the player back where they left off; the village is where the record is read.
    await intoTheVillage(page);
    // The same chapters, in the same order, with the same dates.
    expect(await readFullGaldRecord(page)).toEqual(before);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
