import { test, expect, type Page } from './fixtures';
import { advanceDays, enterDevAdmin, readWorldStateValue } from './helpers';

/**
 * A SAVE THAT HAS TO SURVIVE A REAL BROWSER.
 *
 * The readers, the migration steps and the recovery are unit-tested
 * where they live, against a database in memory. What only a real
 * browser can answer is whether any of it is actually wired to the
 * game: whether closing the tab mid-play keeps what was earned,
 * whether the page being backgrounded on a phone loses the last thing
 * that happened, and whether a save with a row of nonsense in it still
 * opens on something other than a new game.
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

/**
 * Lives in the world for a day.
 *
 * 「つづきから」 is only offered for a world that has been played in,
 * which is the whole point of `hasProgress` — so a test about coming
 * BACK has to have been somewhere first. Resting is the shortest
 * honest way: it moves the clock, which is a thing that happened.
 */
async function liveInIt(page: Page) {
  await advanceDays(page, 1);
}

/** Closes the game and opens it again, the way a returning player does. */
async function closeAndOpen(page: Page) {
  await page.reload();
  await page.waitForLoadState('load');
  const carryOn = page.getByTestId('continue-button');
  await expect(carryOn, 'a world that has been played in is offered back').toBeVisible({
    timeout: 20_000,
  });
  await carryOn.click();
}

/** Writes rows straight into the save — damage, or a build that does not exist. */
async function writeRows(page: Page, rows: Record<string, unknown>) {
  await page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('world_state', 'readwrite');
          for (const [key, value] of Object.entries(rows)) {
            tx.objectStore('world_state').put({ key, value });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

/** Earns something real: LUMI, a bag, a level, a fact, all at once. */
async function playUntilThereIsSomethingToLose(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();
}

test.describe('what a save keeps', () => {
  test('everything earned is still there after closing and opening, twice over', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await playUntilThereIsSomethingToLose(page);
    // Given rather than fought for: what is under test here is the
    // save, and a fight has its own spec.
    await writeRows(page, {
      lumi: 210,
      inventory: [{ itemId: 'FOREST_HERB', quantity: 4 }],
      progression: { hero: { level: 3, totalExp: 45 }, kaos: { level: 2, totalExp: 20 } },
    });

    for (const round of [1, 2]) {
      await closeAndOpen(page);
      await expect(page.getByTestId('world-clock'), `round ${round}`).toBeVisible({
        timeout: 20_000,
      });
      expect(await readWorldStateValue(page, 'lumi'), `round ${round}: LUMI`).toBe(210);
      expect(await readWorldStateValue(page, 'inventory'), `round ${round}: the bag`).toEqual([
        { itemId: 'FOREST_HERB', quantity: 4 },
      ]);
      expect(await readWorldStateValue(page, 'progression'), `round ${round}: growth`).toEqual({
        hero: { level: 3, totalExp: 45 },
        kaos: { level: 2, totalExp: 20 },
      });
      // And the two older systems, unchanged by any of this.
      expect(await readWorldStateValue(page, 'world_clock')).toBeTruthy();
      expect(await readWorldStateValue(page, 'character_GALD')).toBeTruthy();
    }
  });

  test('is stamped with the version that wrote it', async ({ page }) => {
    await freshWorld(page);
    const version = await page.evaluate(
      () =>
        new Promise<unknown>((resolve, reject) => {
          const open = indexedDB.open('mugen-zero-save');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const rq = db
              .transaction('meta', 'readonly')
              .objectStore('meta')
              .get('saveSchemaVersion');
            rq.onsuccess = () => {
              db.close();
              resolve((rq.result as { value: unknown } | undefined)?.value ?? null);
            };
            rq.onerror = () => reject(rq.error);
          };
        }),
    );
    expect(typeof version).toBe('number');
  });

  test('keeps a copy of itself to fall back on', async ({ page }) => {
    await freshWorld(page);
    await liveInIt(page);
    await closeAndOpen(page);
    const backup = await page.evaluate(
      () =>
        new Promise<unknown>((resolve, reject) => {
          const open = indexedDB.open('mugen-zero-save');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const rq = db.transaction('meta', 'readonly').objectStore('meta').get('worldBackup');
            rq.onsuccess = () => {
              db.close();
              resolve((rq.result as { value: unknown } | undefined)?.value ?? null);
            };
            rq.onerror = () => reject(rq.error);
          };
        }),
    );
    expect(backup, 'a clean load leaves a copy behind').toBeTruthy();
  });
});

test.describe('where the player was', () => {
  test('is where they come back to', async ({ page }) => {
    await freshWorld(page);
    await liveInIt(page);
    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
    // The doorway is written a beat late on purpose.
    await page.waitForTimeout(800);
    expect(await readWorldStateValue(page, 'session')).toMatchObject({ screen: 'EXPLORE' });

    await closeAndOpen(page);
    await expect(
      page.getByTestId('location-GREENWOOD_FOREST'),
      'back on the map, not back in the village',
    ).toBeVisible({ timeout: 20_000 });
  });

  test('is the village when that is where they were', async ({ page }) => {
    await freshWorld(page);
    await liveInIt(page);
    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
    await page.getByRole('button', { name: 'もどる' }).click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    await page.waitForTimeout(800);

    await closeAndOpen(page);
    await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
  });

  /**
   * THE PHONE CASE. The game is not closed, it is backgrounded — a
   * call arrives, the browser is swapped away from — and the tab may
   * never be given another frame. Whatever is owed has to be written
   * on the way out, not on the way back.
   */
  test('is written down the moment the page is hidden, not a beat later', async ({ page }) => {
    await freshWorld(page);
    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
    // Hidden immediately, inside the window the debounce is still
    // holding the write in. Without the flush this row is never written.
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect
      .poll(() => readWorldStateValue(page, 'session'), { timeout: 10_000 })
      .toMatchObject({ screen: 'EXPLORE' });
  });

  test('comes back to a page that was only backgrounded, without starting over', async ({
    page,
  }) => {
    await freshWorld(page);
    await page.getByTestId('explore-button').click();
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    // Still exactly where it was: nothing re-initialised, nothing reset.
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
    await expect(page.getByTestId('start-button')).toHaveCount(0);
  });
});

test.describe('a shop transaction', () => {
  test('is whole or it never happened, across a reload', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await writeRows(page, { lumi: 100, inventory: [] });
    await closeAndOpen(page);
    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-ALDEN_ITEM_SHOP').click();
    await expect(page.getByTestId('item-shop')).toBeVisible();
    await page.getByTestId('shop-buy-button-FOREST_HERB').click();
    await expect(page.getByTestId('shop-lumi')).toHaveText('84');

    // Closed the instant the purchase lands.
    await closeAndOpen(page);
    const lumi = await readWorldStateValue(page, 'lumi');
    const bag = (await readWorldStateValue(page, 'inventory')) as { quantity: number }[];
    expect(lumi, 'the LUMI went').toBe(84);
    expect(bag, 'and the herb arrived — never one without the other').toEqual([
      { itemId: 'FOREST_HERB', quantity: 1 },
    ]);
  });
});

test.describe('a save with something wrong in it', () => {
  test('opens on the rest of the world rather than on a new game', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await writeRows(page, { lumi: 66, inventory: [{ itemId: 'FOREST_HERB', quantity: 2 }] });
    await closeAndOpen(page);
    await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });

    // The kind of damage a write cut off halfway leaves behind.
    await writeRows(page, { world_clock: 'undefined' });
    await closeAndOpen(page);
    await expect(page.getByTestId('world-clock'), 'the game still opens').toBeVisible({
      timeout: 20_000,
    });
    expect(await readWorldStateValue(page, 'lumi'), 'and the purse is still there').toBe(66);
  });

  test('repairs a bad value downward and writes the repair down', async ({ page }) => {
    await freshWorld(page);
    // Lived in first: a purse repaired to zero is not progress, and
    // this test is about the repair rather than about the title.
    await liveInIt(page);
    await writeRows(page, { lumi: -4000 });
    await closeAndOpen(page);
    expect(await readWorldStateValue(page, 'lumi'), 'never negative, and fixed on disk').toBe(0);
  });

  /**
   * A row from a build that does not exist yet. An older game opening a
   * newer save must not quietly eat the part it cannot read.
   */
  test('carries a row it has never heard of through untouched', async ({ page }) => {
    await freshWorld(page);
    await writeRows(page, { lumi: 12, something_from_later: { deep: [1, 2, 3] } });
    await closeAndOpen(page);
    await page.getByTestId('explore-button').click();
    await page.waitForTimeout(800);
    expect(await readWorldStateValue(page, 'something_from_later')).toEqual({ deep: [1, 2, 3] });
  });
});
