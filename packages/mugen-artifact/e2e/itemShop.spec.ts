import { test, expect, type Page } from './fixtures';
import { PHONES, enterDevAdmin, swingUntil, viewportOf, walkTheForestUntil } from './helpers';

/**
 * アルデン道具屋 — the loop closing.
 *
 * The arithmetic is the world's and is unit-tested there. What is
 * checked here is that a player can actually reach a counter, spend
 * what a fight paid them, and still be holding it tomorrow — and that
 * the two refusals the economy is built on hold with a real thumb on a
 * real button.
 */

/**
 * IN THROUGH WHICHEVER FRONT DOOR THIS WORLD IS SHOWING.
 *
 * The title asks `world.hasProgress()`, and that question is about
 * events, arcana, accidents and the clock — NOT about a purse or a
 * bag. So a world that has been handed 4000 LUMI and a bag of herbs
 * still has "no progress" worth offering back, still opens on
 * 「はじめる」, and still has a prologue to sit through before there is
 * a HOME to stand in. That is correct behaviour and not something this
 * spec should be changing, so the helper simply knows both doors.
 *
 * The question about the opening theme is already answered for us by
 * the `page` fixture, on every goto and every reload.
 */
async function walkIn(page: Page) {
  const carryOn = page.getByTestId('continue-button');
  const anew = page.getByTestId('start-button');
  await expect(carryOn.or(anew).first()).toBeVisible({ timeout: 30_000 });
  if (await carryOn.isVisible().catch(() => false)) {
    await carryOn.click();
  } else {
    await anew.click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 30_000 });
}

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
  await walkIn(page);
}

/**
 * Writes a purse and a bag straight into the save, then reloads.
 *
 * Through the save rather than through a debug button because that is
 * the thing under test: what the shop spends has to be what the world
 * actually persisted, read back by the same `readX` migration a
 * returning player's save goes through.
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
  await walkIn(page);
}

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

async function intoTheShop(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_ITEM_SHOP').click();
  await expect(page.getByTestId('item-shop')).toBeVisible();
}

const HERB = 'FOREST_HERB';

test.describe('アルデン道具屋', () => {
  test('is a door off the village, and says what is in the purse', async ({ page }) => {
    await freshWorld(page);
    await give(page, 120, []);
    await intoTheShop(page);
    await expect(page.getByTestId('shop-lumi')).toHaveText('120');
    await page.getByTestId('shop-leave').click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
  });

  test('sells a herb, takes the LUMI, and remembers both', async ({ page }) => {
    await freshWorld(page);
    await give(page, 120, []);
    await intoTheShop(page);
    await page.getByTestId(`shop-buy-button-${HERB}`).click();
    await expect(page.getByTestId('shop-said')).toContainText('買った');
    await expect(page.getByTestId('shop-lumi')).toHaveText('104');
    expect(await saved(page, 'lumi')).toBe(104);
    expect(await saved(page, 'inventory')).toEqual([{ itemId: HERB, quantity: 1 }]);
  });

  /** LUMI不足 → transaction拒否 → ITEM増加なし. */
  test('will not sell to a purse that cannot pay, and takes nothing', async ({ page }) => {
    await freshWorld(page);
    await give(page, 3, []);
    await intoTheShop(page);
    const button = page.getByTestId(`shop-buy-button-${HERB}`);
    await expect(button, 'a price you cannot afford is visibly out of reach').toBeDisabled();
    expect(await saved(page, 'lumi')).toBe(3);
    expect(await saved(page, 'inventory')).toEqual([]);
  });

  test('buys back a herb and pays for it', async ({ page }) => {
    await freshWorld(page);
    await give(page, 0, [{ itemId: HERB, quantity: 2 }]);
    await intoTheShop(page);
    await page.getByTestId('shop-tab-sell').click();
    await page.getByTestId(`shop-sell-button-${HERB}`).click();
    await expect(page.getByTestId('shop-said')).toContainText('売った');
    await expect(page.getByTestId('shop-lumi')).toHaveText('8');
    expect(await saved(page, 'inventory')).toEqual([{ itemId: HERB, quantity: 1 }]);
  });

  /** ITEM不足 → the row is not on the board at all. */
  test('offers nothing to sell when there is nothing it would take', async ({ page }) => {
    await freshWorld(page);
    await give(page, 50, []);
    await intoTheShop(page);
    await page.getByTestId('shop-tab-sell').click();
    await expect(page.getByTestId('shop-nothing-to-sell')).toBeVisible();
    expect(await saved(page, 'lumi')).toBe(50);
  });

  /**
   * A shop that took a pretty acorn and paid nothing for it would be
   * taking it. It is worth nought, so it is not on the board.
   */
  test('will not take something it would pay nothing for', async ({ page }) => {
    await freshWorld(page);
    await give(page, 0, [{ itemId: 'ROUND_ACORN', quantity: 3 }]);
    await intoTheShop(page);
    await page.getByTestId('shop-tab-sell').click();
    await expect(page.getByTestId('shop-nothing-to-sell')).toBeVisible();
    await expect(page.getByTestId('shop-sell-ROUND_ACORN')).toHaveCount(0);
  });

  test('buys more than one, one press at a time', async ({ page }) => {
    await freshWorld(page);
    await give(page, 120, []);
    await intoTheShop(page);
    for (let i = 0; i < 3; i++) {
      await page.getByTestId(`shop-buy-button-${HERB}`).click();
      await expect(page.getByTestId('shop-lumi')).toHaveText(String(120 - 16 * (i + 1)));
    }
    expect(await saved(page, 'inventory')).toEqual([{ itemId: HERB, quantity: 3 }]);
  });

  for (const phone of PHONES) {
    test(`fits a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await freshWorld(page);
      await give(page, 120, [{ itemId: HERB, quantity: 2 }]);
      await intoTheShop(page);
      const view = page.viewportSize()!;
      for (const id of ['item-shop', 'shop-lumi', 'shop-leave', `shop-buy-button-${HERB}`]) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.x, `${id} is not off the left`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${id} is not off the right`).toBeLessThanOrEqual(view.width + 1);
      }
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(scrolls, 'no sideways scroll').toBe(false);
    });
  }
});

/**
 * THE LOOP, CLOSED, WITH NOTHING STUBBED.
 *
 * Walk into the forest, win, and spend it. What this proves that the
 * two halves cannot prove separately is that the LUMI and the herb a
 * fight pays out land in the SAME storage the counter reads from —
 * there is one purse and one bag in this game, not one per feature.
 *
 * The arithmetic is deliberately tight and deliberately not hard-coded
 * to a balance number: a moss rabbit pays less than a herb costs, so
 * the player has to sell what the fight dropped before they can buy
 * anything. That is the whole economy in one pass — earn, refuse,
 * sell, buy — and it reads off the screen rather than off a constant.
 */
test('a fight pays, and the counter takes what it paid', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  // OUT THROUGH THE VILLAGE, not through the prototype door beside it:
  // the developer sandbox ends at DEV_ADMIN and pays nothing, on
  // purpose. Only a fight the world actually staged has winnings.
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  const fighting = () =>
    page
      .getByTestId('bp-commands')
      .isVisible()
      .catch(() => false);
  // Only one ring stands in the forest at a time and it is placed at
  // random, so go round the places it could be until the walk arrives.
  for (let pass = 0; pass < 3 && !(await fighting()); pass++) {
    await walkTheForestUntil(page, fighting);
  }
  await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 40_000 });

  const result = page.getByTestId('battle-result');
  await swingUntil(page, 'bp-attack', () => result.isVisible().catch(() => false));
  await expect(result).toBeVisible({ timeout: 40_000 });

  const paid = Number((await page.getByTestId('result-lumi').innerText()).replace('+', ''));
  expect(paid, 'a fight is worth something').toBeGreaterThan(0);
  await expect(page.getByTestId(`result-item-${HERB}`), 'and it dropped a herb').toBeVisible();

  await page.getByTestId('result-done').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('location-ALDEN_ITEM_SHOP').click();
  await expect(page.getByTestId('item-shop')).toBeVisible();

  // What the fight paid is what the counter sees.
  await expect(page.getByTestId('shop-lumi')).toHaveText(String(paid));
  const buy = page.getByTestId(`shop-buy-button-${HERB}`);
  await expect(buy, 'one rabbit does not buy a herb').toBeDisabled();

  // So sell the one it dropped, and now it does.
  await page.getByTestId('shop-tab-sell').click();
  await page.getByTestId(`shop-sell-button-${HERB}`).click();
  await expect(page.getByTestId('shop-lumi')).toHaveText(String(paid + 8));
  await page.getByTestId('shop-tab-buy').click();
  await buy.click();
  await expect(page.getByTestId('shop-said')).toContainText('買った');
  await expect(page.getByTestId('shop-lumi')).toHaveText(String(paid + 8 - 16));
  expect(await saved(page, 'inventory')).toEqual([{ itemId: HERB, quantity: 1 }]);
});
