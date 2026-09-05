import { test, expect, chromium, type BrowserContext, type Page } from './fixtures';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readMemoryEvents, readWorldStateValue, enterDevAdmin } from './helpers';

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

// Phase E: baker state, reunion record and the discovered bakery all
// survive a full browser restart.
test('baker Gald and the reunion survive a full browser restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-profile-'));
  try {
    // --- Session 1: build the reunited world through the admin. ---
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());
    await goHomeFresh(page);
    await enterDevAdmin(page);
    await page.getByTestId('preset-REUNITED').click();
    await expect(page.getByTestId('dev-event-PLAYER_REUNITED_WITH_GALD')).toBeVisible();
    await context.close(); // full browser shutdown

    // --- Session 2: everything restored. ---
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);

    const gald = (await readWorldStateValue(page, 'character_GALD')) as {
      age: number;
      occupation: string;
      alive: boolean;
    };
    expect(gald).toMatchObject({ age: 30, occupation: 'BAKER', alive: true });
    const events = await readMemoryEvents(page);
    expect(events.filter((e) => e.type === 'PLAYER_REUNITED_WITH_GALD')).toHaveLength(1);

    // The game reflects it: the bakery is a known place, and a visit is an
    // ordinary revisit — the first-reunion scene never replays.
    await page.getByTestId('continue-button').click();
    await page.getByTestId('explore-button').click();
    const bakery = page.getByTestId('location-ALDEN_BAKERY');
    await expect(bakery).toContainText('パン屋');
    await bakery.click();
    await expect(page.getByTestId('bakery-revisit')).toBeVisible();
    await expect(page.getByText('今日は何だ。')).toBeVisible();
    await expect(page.getByText('……見るな。')).toHaveCount(0);

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
