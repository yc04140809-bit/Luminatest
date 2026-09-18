import { test, expect, type Page } from './fixtures';
import { RING_TAPS, enterDevAdmin, ontoTheMap, readWorldStateValue, swingUntil } from './helpers';

/**
 * THE HERB, ALL THE WAY ROUND.
 *
 * Until this round the only thing a player could do with a herb was
 * sell it, which made the shop a place to turn one number into
 * another. What is checked here is the loop actually closing: LUMI
 * buys a thing, the thing is in the bag, the bag is in the fight, using
 * it costs the turn and heals the wound, and the count comes down —
 * and is still down tomorrow.
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
 * Writes a bag and a purse straight into the save, then walks back in.
 *
 * ALWAYS AFTER THE PRESET, NEVER BEFORE IT. A dev preset is a reset —
 * it wipes the world and rebuilds it three years on — so a bag handed
 * out first is a bag that is gone by the time the fight starts. That
 * cost this spec two failures which looked exactly like the item tray
 * being broken.
 */
async function give(page: Page, lumi: number, items: { itemId: string; quantity: number }[]) {
  await page.evaluate(
    ({ lumi, items }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('world_state', 'readwrite');
          tx.objectStore('world_state').put({ key: 'lumi', value: lumi });
          tx.objectStore('world_state').put({ key: 'inventory', value: items });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { lumi, items },
  );
  await page.reload();
  const carryOn = page.getByTestId('continue-button');
  await expect(carryOn).toBeVisible({ timeout: 20_000 });
  await carryOn.click();
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
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
  // From wherever the player is standing — the village, or already out
  // on the map because they have just walked out of the shop.
  await ontoTheMap(page);
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
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

const HERB = 'FOREST_HERB';
const hpOf = (text: string | null) => Number((text ?? '').match(/(\d+)/)?.[1] ?? Number.NaN);

test.describe('a herb in a fight', () => {
  test('is in the bag, costs the turn, heals the wound, and is gone', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page);
    await give(page, 0, [{ itemId: HERB, quantity: 2 }]);
    await walkIntoAFight(page);

    // At full health it is refused, and the refusal says why rather
    // than leaving the player to guess at a grey button.
    await page.getByTestId('bp-item').click();
    const row = page.getByTestId(`bp-item-${HERB}`);
    await expect(row).toBeVisible();
    await expect(page.getByTestId(`bp-item-count-${HERB}`)).toHaveText('×2');
    await expect(row, 'no wound, no herb').toBeDisabled();
    await expect(row).toContainText('傷はない');
    await page.getByTestId('bp-item-close').click();

    // Take some damage first — the creature answers every swing.
    const hp = page.getByTestId('bp-player-hp');
    const full = hpOf(await hp.textContent());
    await swingUntil(page, 'bp-attack', async () => hpOf(await hp.textContent()) < full - 30);
    const hurt = hpOf(await hp.textContent());
    expect(hurt).toBeLessThan(full);

    await page.getByTestId('bp-item').click();
    await expect(row).toBeEnabled();
    await row.click();

    // The herb healed, and the creature still got its turn — so the
    // health afterwards is the healing minus whatever it hit for.
    await expect
      .poll(async () => hpOf(await hp.textContent()), { timeout: 20_000 })
      .toBeGreaterThan(hurt);

    // One fewer, on screen and in the save.
    await page.getByTestId('bp-item').click();
    await expect(page.getByTestId(`bp-item-count-${HERB}`)).toHaveText('×1');
    await expect
      .poll(() => readWorldStateValue(page, 'inventory'), { timeout: 20_000 })
      .toEqual([{ itemId: HERB, quantity: 1 }]);
  });

  test('says so plainly when there is nothing usable to reach for', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    // A bag with something in it that is not for using: an old
    // arrowhead is material, and the tray is the list of things a turn
    // can be spent on.
    await armAForestFight(page);
    await give(page, 0, [{ itemId: 'OLD_ARROWHEAD', quantity: 3 }]);
    await walkIntoAFight(page);
    await page.getByTestId('bp-item').click();
    await expect(page.getByTestId('bp-item-empty')).toBeVisible();
    await expect(page.getByTestId('bp-item-OLD_ARROWHEAD')).toHaveCount(0);
  });
});

test('LUMI buys a herb and the fight spends it', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  await armAForestFight(page);
  await give(page, 40, []);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_ITEM_SHOP').click();
  await page.getByTestId(`shop-buy-button-${HERB}`).click();
  await expect(page.getByTestId('shop-lumi')).toHaveText('24');
  await page.getByTestId('shop-leave').click();
  await walkIntoAFight(page);
  await page.getByTestId('bp-item').click();
  await expect(
    page.getByTestId(`bp-item-count-${HERB}`),
    'the thing that was bought is the thing in the fight',
  ).toHaveText('×1');
});
