import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readMemoryEvents, readWorldStateValue } from './helpers';

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

async function openAdmin(page: Page) {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
}

// D.5 section 8: after a FULL browser restart, the world state the admin
// showed matches both the DB and the game itself.
test('admin-built state survives a full browser restart and matches the game', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: build SPARE + 3 YEARS canon through the admin. ---
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());
    await goHomeFresh(page);
    await openAdmin(page);
    await page.getByTestId('preset-SPARE_3Y').click();
    await expect(page.getByTestId('dev-clock')).toContainText('4年目 4日目');
    await expect(page.getByTestId('dev-gald')).toContainText('age: 30');
    await context.close(); // full browser shutdown

    // --- Session 2: relaunch; DB, game and admin all agree. ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);

    const events = await readMemoryEvents(page);
    expect(events.map((e) => e.type).sort()).toEqual([
      'GALD_LEAVES_BANDITS',
      'PLAYER_SPARED_GALD',
      'WORLD_TIME_SHIFTED',
    ]);
    expect(await readWorldStateValue(page, 'world_clock')).toEqual({ worldYear: 4, worldDay: 4 });
    expect(
      ((await readWorldStateValue(page, 'character_GALD')) as { age: number }).age,
    ).toBe(30);

    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');
    await openAdmin(page);
    await expect(page.getByTestId('dev-clock')).toContainText('4年目 4日目');
    await expect(page.getByTestId('dev-gald')).toContainText('age: 30');
    await expect(page.getByTestId('dev-choice')).toContainText('SPARE');

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
