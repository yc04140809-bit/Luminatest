import { test, expect, type Page } from './fixtures';
import { RING_TAPS, enterDevAdmin } from './helpers';

/**
 * WHAT A FIGHT IS WORTH, END TO END.
 *
 * The systems underneath — the curve, the ledger, the atomic commit —
 * are unit-tested where they live. What is checked here is the one
 * thing only a real browser can tell you: that a player who walks into
 * the forest, wins, and walks back out is actually holding what the
 * fight paid, and is holding it exactly once.
 */

async function freshWorld(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
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
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Straight out of the save, so nothing about the UI is being trusted. */
function saved(page: Page, key: string) {
  return page.evaluate(
    (k) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const rq = db.transaction('world_state', 'readonly').objectStore('world_state').get(k);
          rq.onsuccess = () => {
            db.close();
            resolve((rq.result as { value: unknown } | undefined)?.value ?? null);
          };
          rq.onerror = () => reject(rq.error);
        };
      }),
    key,
  );
}

async function armAForestFight(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();
}

async function walkIntoAFight(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  // ROUND THE RING SPOTS, TWICE. Only one ring stands in the forest at
  // a time and it is placed at random, so this taps each place it could
  // be and waits to see whether the walk arrived — the same reason
  // explorationLoop and battlePrototype both go round twice.
  const fighting = () =>
    page
      .getByTestId('bp-commands')
      .isVisible()
      .catch(() => false);
  for (let pass = 0; pass < 3 && !(await fighting()); pass++) {
    for (const at of RING_TAPS) {
      if (await fighting()) break;
      await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
      for (let i = 0; i < 14; i++) {
        await page.waitForTimeout(180);
        if (await fighting()) break;
      }
    }
  }
  await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 40_000 });
}

/** Swings until the result screen is up. */
async function winTheFight(page: Page) {
  const result = page.getByTestId('battle-result');
  for (let i = 0; i < 80; i++) {
    if (await result.isVisible().catch(() => false)) break;
    await page
      .getByTestId('bp-attack')
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(160);
  }
  await expect(result).toBeVisible({ timeout: 40_000 });
}

test.describe('what a fight is worth', () => {
  test('is earned, shown, saved, and still there after a reload', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page);
    await walkIntoAFight(page);
    await winTheFight(page);

    // The screen says what happened.
    await expect(page.getByTestId('result-exp')).toHaveText(/^\+\d+$/);
    await expect(page.getByTestId('result-lumi')).toHaveText(/^\+\d+$/);
    const exp = Number((await page.getByTestId('result-exp').innerText()).replace('+', ''));
    const lumi = Number((await page.getByTestId('result-lumi').innerText()).replace('+', ''));
    expect(exp).toBeGreaterThan(0);
    expect(lumi).toBeGreaterThan(0);

    // And the save agrees with the screen.
    expect(await saved(page, 'lumi')).toBe(lumi);
    const progression = (await saved(page, 'progression')) as Record<
      string,
      { level: number; totalExp: number }
    >;
    expect(progression.hero.totalExp).toBe(exp);
    expect(progression.kaos.totalExp, 'she was in the fight too').toBe(exp);

    // Back to the path, and the forest is walkable again.
    await page.getByTestId('result-done').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // Closed and opened again: still owned.
    await page.reload();
    await page.waitForLoadState('load');
    await expect(page.locator('.app')).toBeVisible({ timeout: 20_000 });
    expect(await saved(page, 'lumi')).toBe(lumi);
  });

  /**
   * THE ONE THE LEDGER EXISTS FOR. The fight's ending can be reached
   * more than once — a timer, a re-render, a thumb — and a second
   * helping of experience would be invisible in a screenshot.
   */
  test('is paid once, however hard the player hammers the way out', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page);
    await walkIntoAFight(page);
    await winTheFight(page);

    const lumi = Number((await page.getByTestId('result-lumi').innerText()).replace('+', ''));
    const done = page.getByTestId('result-done');
    // Hammer it: only the first can be the one that lands.
    for (let i = 0; i < 8; i++) await done.click({ timeout: 1500 }).catch(() => {});
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
    expect(await saved(page, 'lumi'), 'one fight, one purse').toBe(lumi);

    const claimed = (await saved(page, 'claimed_rewards')) as string[];
    expect(claimed, 'exactly one fight has been paid for').toHaveLength(1);
  });

  test('is paid once at ×2 with AUTO on, too', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page);
    await walkIntoAFight(page);
    await page.getByTestId('bp-auto').click();
    await page.getByTestId('bp-speed').click();
    await expect(page.getByTestId('battle-result')).toBeVisible({ timeout: 90_000 });

    const lumi = Number((await page.getByTestId('result-lumi').innerText()).replace('+', ''));
    expect(await saved(page, 'lumi')).toBe(lumi);
    expect((await saved(page, 'claimed_rewards')) as string[]).toHaveLength(1);
  });
});
