import { test, expect, chromium, type BrowserContext } from './fixtures';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { playToLifeChoice, readMemoryEvents, readWorldStateValue, advanceDays } from './helpers';

const BASE = 'http://localhost:5173';

function launch(userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath: '/opt/pw-browsers/chromium',
    // Landscape, like the rest of the suite: the game has no portrait layout.
    viewport: { width: 844, height: 390 },
  });
}

// Phase C acceptance steps 14-17: after a FULL browser restart the world
// still holds PLAYER_SPARED_GALD + GALD_LEAVES_BANDITS, the clock, and
// Gald's updated CHARACTER_STATE.
test('causality chain and character state survive a full browser restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: spare Gald, let 3 days pass, close the browser. ---
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
    await advanceDays(page, 3);
    const before = await readMemoryEvents(page);
    expect(before.map((e) => e.type).sort()).toEqual([
      'GALD_LEAVES_BANDITS',
      'PLAYER_SPARED_GALD',
    ]);
    await context.close(); // full browser shutdown

    // --- Session 2: relaunch and verify everything was restored. ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);

    const events = await readMemoryEvents(page);
    expect(events.map((e) => e.type).sort()).toEqual([
      'GALD_LEAVES_BANDITS',
      'PLAYER_SPARED_GALD',
    ]);
    const leaves = events.find((e) => e.type === 'GALD_LEAVES_BANDITS') as {
      causedBy?: string[];
    };
    expect(leaves.causedBy).toEqual(['PLAYER_SPARED_GALD']);

    expect(await readWorldStateValue(page, 'world_clock')).toEqual({ worldYear: 1, worldDay: 4 });
    const gald = (await readWorldStateValue(page, 'character_GALD')) as {
      occupation: string;
      location: string;
    };
    expect(gald.occupation).toBe('NONE');
    expect(gald.location).toBe('UNKNOWN');

    // In-game view agrees, and advancing further never re-fires the event.
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toHaveText('1年目 4日目');
    await advanceDays(page, 2);
    const after = await readMemoryEvents(page);
    expect(after.filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
