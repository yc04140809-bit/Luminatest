import { test, expect, chromium, type BrowserContext } from './fixtures';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { playToLifeChoice, readMemoryEvents } from './helpers';

const BASE = 'http://localhost:5173';

function launch(userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath: '/opt/pw-browsers/chromium',
    // Landscape, like the rest of the suite: the game has no portrait layout.
    viewport: { width: 844, height: 390 },
  });
}

// The strictest Phase B acceptance test: the browser is fully closed and
// relaunched (new browser process, same profile) and PLAYER_SPARED_GALD
// must still exist in IndexedDB.
test('PLAYER_SPARED_GALD survives a full browser restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: play, spare Gald, close the browser. ---
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());
    await playToLifeChoice(page, BASE);
    await page.getByTestId('choice-SPARE').click();
    await expect(page.getByTestId('choice-result-dialogue')).toBeVisible();
    await context.close(); // full browser shutdown

    // --- Session 2: relaunch and verify the world remembered. ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);

    const events = await readMemoryEvents(page);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('PLAYER_SPARED_GALD');

    // And the game itself offers to continue the same world.
    await expect(page.getByTestId('continue-button')).toBeVisible();
    await page.getByTestId('continue-button').click();
    await page.getByTestId('world-memory-button').click();
    await expect(page.getByTestId('memory-event-PLAYER_SPARED_GALD')).toBeVisible();

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
