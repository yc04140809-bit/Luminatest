import { test, expect, chromium, type BrowserContext, type Page, pageOf } from './fixtures';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readMemoryEvents, readWorldStateValue, enterDevAdmin, intoTheVillage } from './helpers';

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

// Phase E: Gald's state, the reunion record and the discovered place all
// survive a full browser restart. Played through 捕らえる (the workyard):
// since 2026-10-20 見逃す leaves nowhere to find him, so the bakery reunion
// (the old REUNITED preset) is gone.
test('Gald at his work and the reunion survive a full browser restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: three years on, find the workyard through the game's own screens. ---
    let context = await launch(userDataDir);
    let page = await pageOf(context);
    await goHomeFresh(page);
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
    await context.close(); // full browser shutdown

    // --- Session 2: everything restored. ---
    context = await launch(userDataDir);
    page = await pageOf(context);
    await page.goto(`${BASE}/`);

    const gald = (await readWorldStateValue(page, 'character_GALD')) as {
      age: number;
      alive: boolean;
    };
    expect(gald).toMatchObject({ age: 30, alive: true });
    const events = await readMemoryEvents(page);
    expect(events.filter((e) => e.type === 'PLAYER_MET_GALD_IN_ALDEN')).toHaveLength(1);
    expect(events.map((e) => e.type)).not.toContain('PLAYER_REUNITED_WITH_GALD');

    // The game reflects it: the workyard is a known place, and a visit is an
    // ordinary revisit — the first-reunion scene never replays.
    await page.getByTestId('continue-button').click();
    await intoTheVillage(page);
    await page.getByTestId('explore-button').click();
    const workyard = page.getByTestId('location-ALDEN_WORKYARD');
    await expect(workyard).toContainText('村外れの作業場');
    await workyard.click();
    await expect(page.getByTestId('workyard-revisit')).toBeVisible();
    await expect(page.getByText('捕まったから、逃げられなかった。')).toHaveCount(0);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
