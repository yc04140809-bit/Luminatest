import { test, expect, chromium, type BrowserContext } from './fixtures';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { playToLifeChoice, readMemoryEvents, readWorldStateValue } from './helpers';

const BASE = 'http://localhost:5173';

function launch(userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath: '/opt/pw-browsers/chromium',
    viewport: { width: 390, height: 844 },
  });
}

// Phase D completion: SPARE -> TIME SHIFT +3y -> full browser restart ->
// clock, Gald's age and every event restored.
test('clock, age and events survive a full browser restart after a TIME SHIFT', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: spare Gald, shift 3 years, close the browser. ---
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());
    await playToLifeChoice(page, BASE);
    await page.getByTestId('choice-SPARE').click();
    const result = page.getByTestId('choice-result-dialogue');
    await expect(result).toBeVisible();
    await result.click();
    await result.click();
    await result.click();
    await page.getByTestId('choice-recorded-screen').waitFor();
    await page.getByTestId('return-home-button').click();

    await page.getByTestId('time-shift-button').click();
    await page.getByTestId('time-shift-go').click();
    await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('time-shift-return').click();
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 1日目');
    await context.close(); // full browser shutdown

    // --- Session 2: relaunch and verify everything was restored. ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);

    const events = await readMemoryEvents(page);
    expect(events.map((e) => e.type).sort()).toEqual([
      'GALD_ARRIVES_IN_ALDEN',
      'GALD_BECOMES_BAKER',
      'GALD_LEAVES_BANDITS',
      'PLAYER_SPARED_GALD',
      'WORLD_TIME_SHIFTED',
    ]);
    expect(await readWorldStateValue(page, 'world_clock')).toEqual({ worldYear: 4, worldDay: 1 });
    const gald = (await readWorldStateValue(page, 'character_GALD')) as {
      age: number;
      occupation: string;
    };
    expect(gald.age).toBe(30);
    expect(gald.occupation).toBe('BAKER');

    // The game agrees with the DB.
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toHaveText('4年目 1日目');
    await page.getByTestId('dev-admin-entry').click();
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
    await expect(page.getByTestId('dev-gald')).toContainText('age: 30');

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
