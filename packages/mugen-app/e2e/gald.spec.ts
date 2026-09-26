import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { fightUntil, readyToAct, throughTheAwakening } from './battle';

/**
 * THE FIRST COMPLETE TURN OF THE GAME'S OWN LOOP.
 *
 *   遭遇 → 戦闘 → LIFE_CHOICE → WORLD MEMORY → 後続状態変化
 *
 * One route (SPARE) is walked here end to end, through a real browser
 * and a real IndexedDB, including the restart. The other three are
 * covered by core unit tests, which is the right split: what differs
 * between the four is what the world records, and that is the core's
 * business, while what this proves is that the App reaches the
 * question at all and does not lose the answer.
 */

async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
}

async function intoTheVillage(page: Page) {
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  // Naming sits between the opening and the village now. Taking the
  // default keeps every test in this file about what it was about.
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function toTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();
}

/**
 * Through the one look ahead: she asks, she shows, she brings them
 * back. These tests are about the four answers and the awakening, so
 * they walk it and carry on.
 */
async function walkTheVision(page: Page) {
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
}

/** Through his two lines and into the fight. */
async function meetGald(page: Page) {
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await expect(page.getByTestId('battle-screen')).toBeVisible();
}

/**
 * Beat him.
 *
 * He has 220 health and hits for 3–5, and the awakening arrives
 * partway through — a scene that has to be tapped past before the
 * commands come back. Swinging until the four answers are on screen is
 * the whole of the strategy; there is no need for a good one.
 */
async function beatGald(page: Page) {
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), {
    maxTurns: 200,
  });
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
}

test('she wakes during his fight, which is the only way she ever does', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await toTheForest(page);
  await meetGald(page);

  // THE AWAKENING IS HIS FIGHT'S, not a rabbit's: a moss rabbit has no
  // awakening beat, which is why magic was unreachable before this
  // round existed. Somewhere in here she steps forward.
  const awakening = page.getByTestId('magic-awakening');
  await fightUntil(
    page,
    async () =>
      (await awakening.isVisible().catch(() => false)) ||
      (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)),
    { maxTurns: 200 },
  );
  expect(await awakening.isVisible(), 'Kaos should wake during the story fight').toBe(true);
  await throughTheAwakening(page);
  // And from that moment 魔法 is on the row, with her spells in it.
  await readyToAct(page);
  await page.getByTestId('bp-magic').click();
  await expect(page.getByTestId('magic-tray')).toBeVisible();
  await expect(page.getByTestId('magic-starlight_bolt')).toBeVisible();
});

test('the four answers are offered, and only once per world', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await toTheForest(page);
  await meetGald(page);
  await beatGald(page);

  // All four, in the words content gives them.
  for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
    await expect(page.getByTestId(`choice-${id}`)).toBeVisible();
  }

  await page.getByTestId('choice-SPARE').click();
  await expect(page.getByTestId('choice-result')).toHaveAttribute('data-choice', 'SPARE');
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  // The scene ends on the one look ahead — she asks, shows, returns.
  // This test is about the four answers, so it walks through and on.
  await walkTheVision(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();

  // HE IS NOT OUT THERE ANY MORE. The world holds an answer, so the
  // encounter cannot be offered a second time — the forest still has
  // its rabbit and nothing else.
  await toTheForest(page);
  await expect(page.getByTestId('gald-button')).toHaveCount(0);
  await expect(page.getByTestId('encounter-button')).toBeVisible();
});

test('the answer, and what it unlocked, survive a restart', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await toTheForest(page);
  await meetGald(page);
  await beatGald(page);
  await page.getByTestId('choice-SPARE').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  await walkTheVision(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await page.reload();
  await page.getByTestId('continue-button').click();
  if (await page.getByTestId('back-to-village').isVisible().catch(() => false)) {
    await page.getByTestId('back-to-village').click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();

  // The answer is still the world's: he is still not on the path.
  await toTheForest(page);
  await expect(page.getByTestId('gald-button')).toHaveCount(0);

  /**
   * AND MAGIC IS STILL UNLOCKED, which is the point of the whole
   * round. `kaosHasAwakened` reads the world's memory of what became
   * of Gald, so an ordinary rabbit fight — which has no awakening beat
   * of its own and offered nothing before today — now starts with her
   * spells available. This is the assertion that the gate moved.
   */
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  await readyToAct(page);
  await page.getByTestId('bp-magic').click();
  await expect(page.getByTestId('magic-tray')).toBeVisible();
  await expect(page.getByTestId('magic-starlight_bolt')).toBeVisible();
});
