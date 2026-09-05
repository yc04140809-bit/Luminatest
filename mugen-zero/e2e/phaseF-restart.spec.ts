import { test, expect, chromium, type BrowserContext, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';
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

async function goHomeFresh(page: Page) {
  await page.goto(`${BASE}/`);
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function assertFullGaldRecord(page: Page) {
  await page.getByTestId('archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail')).toContainText('ガルド の人生');
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
  await expect(page.getByTestId('archive-chapter-GALD_CH_LEFT_FOREST')).toContainText('1年目 4日目');
  await expect(page.getByTestId('archive-chapter-GALD_CH_NEW_WORK')).toContainText('1年目 94日目');
  await expect(page.getByTestId('archive-chapter-GALD_CH_REUNION')).toContainText('4年目 4日目');
  await expect(page.getByTestId('archive-unknown')).toHaveCount(0);
}

// Phase F: the connected life record survives a full browser restart,
// with identical chapters, order and dates.
test('the LIFE ARCHIVE record survives a full browser restart unchanged', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: reunited world via the admin, verify the record. ---
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());
    await goHomeFresh(page);
    await enterDevAdmin(page);
    await page.getByTestId('preset-REUNITED').click();
    await expect(page.getByTestId('dev-archive-GALD_CH_REUNION')).toContainText('[KNOWN]');
    await page.getByTestId('dev-admin-back').click();
    await assertFullGaldRecord(page);
    await context.close(); // full browser shutdown

    // --- Session 2: identical record after restart. ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);
    await page.getByTestId('continue-button').click();
    await assertFullGaldRecord(page);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
