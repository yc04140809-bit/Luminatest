import { test, expect, type Page } from './fixtures';
import { RING_TAPS, enterDevAdmin, ontoTheMap, readWorldStateValue, swingUntil } from './helpers';

/**
 * 持ち物 — and the two things in it that a turn can be spent on.
 *
 * The loop this round closes: a player can see what they are carrying
 * without walking to a shop counter, they can read what an item did
 * before the creature answers it, and the bag holds two things that
 * are not the same decision.
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

/** Writes a bag and a purse straight into the save, then walks back in. */
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
  await page.getByTestId('continue-button').click({ timeout: 20_000 });
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
}

async function armAForestFight(page: Page, { alwaysAttacks = false } = {}) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  if (alwaysAttacks) await page.getByTestId('force-enemy-ATTACK').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();
}

async function walkIntoAFight(page: Page) {
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
const WATER = 'MANA_WATER';
const numberIn = (text: string | null) => Number((text ?? '').match(/(\d+)/)?.[1] ?? Number.NaN);

test.describe('the bag', () => {
  test('says everything about a thing at once', async ({ page }) => {
    await freshWorld(page);
    await give(page, 0, [
      { itemId: HERB, quantity: 3 },
      { itemId: 'OLD_ARROWHEAD', quantity: 1 },
      { itemId: 'ROUND_ACORN', quantity: 2 },
    ]);
    await page.getByTestId('bag-button').click();
    await expect(page.getByTestId('bag-list')).toBeVisible();

    // Name, count, category, what it does, what it is worth.
    await expect(page.getByTestId(`bag-count-${HERB}`)).toHaveText('×3');
    await expect(page.getByTestId(`bag-category-${HERB}`)).toHaveText('消耗品');
    await expect(page.getByTestId(`bag-use-${HERB}`)).toContainText('HP');
    await expect(page.getByTestId(`bag-sell-${HERB}`)).toContainText('LUMI');
    await expect(page.getByTestId(`bag-${HERB}`)).toContainText('薬草');

    // Material: no use, but a price.
    await expect(page.getByTestId('bag-use-OLD_ARROWHEAD')).toHaveText('使えない');
    await expect(page.getByTestId('bag-category-OLD_ARROWHEAD')).toHaveText('素材');
    await expect(page.getByTestId('bag-sell-OLD_ARROWHEAD')).toContainText('LUMI');

    // Worth nothing to anybody, and says so rather than showing 0 LUMI.
    await expect(page.getByTestId('bag-sell-ROUND_ACORN')).toHaveText('売れない');
  });

  test('is honest when there is nothing in it', async ({ page }) => {
    await freshWorld(page);
    await page.getByTestId('bag-button').click();
    await expect(page.getByTestId('bag-empty')).toBeVisible();
    await expect(page.getByTestId('bag-list')).toHaveCount(0);
  });

  test('changes nothing — it is for looking at', async ({ page }) => {
    await freshWorld(page);
    await give(page, 50, [{ itemId: HERB, quantity: 2 }]);
    await page.getByTestId('bag-button').click();
    // LOOKING IS NOT DOING. There is a 使う on a herb now, and the
    // thing under test is that walking in and back out again — reading
    // the list, pressing nothing — leaves the save exactly as it was.
    await expect(page.getByTestId(`bag-use-button-${HERB}`)).toBeVisible();
    await page.getByRole('button', { name: 'もどる' }).click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    expect(await readWorldStateValue(page, 'inventory')).toEqual([
      { itemId: HERB, quantity: 2 },
    ]);
    expect(await readWorldStateValue(page, 'lumi')).toBe(50);
  });

  test('shows what a fight spent, next time it is opened', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page, { alwaysAttacks: true });
    await give(page, 0, [{ itemId: HERB, quantity: 2 }]);
    await walkIntoAFight(page);

    const hp = page.getByTestId('bp-player-hp');
    const full = numberIn(await hp.textContent());
    await swingUntil(page, 'bp-attack', async () => {
      const now = numberIn(await hp.textContent().catch(() => null));
      return Number.isFinite(now) && now <= full - 10;
    });
    await page.getByTestId('bp-item').click();
    await page.getByTestId(`bp-item-${HERB}`).click();
    await expect
      .poll(() => readWorldStateValue(page, 'inventory'), { timeout: 20_000 })
      .toEqual([{ itemId: HERB, quantity: 1 }]);
  });
});

test.describe('what an item just did', () => {
  /**
   * THE BUG THIS ROUND EXISTS FOR. Using something writes three log
   * lines in one go — what was used, what it did, then the creature's
   * reply — and the plate shows the LAST one. So the message a player
   * pressed a button to cause was on screen for about a frame.
   */
  test('stays on the plate long enough to read', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page, { alwaysAttacks: true });
    await give(page, 0, [{ itemId: HERB, quantity: 2 }]);
    await walkIntoAFight(page);

    const hp = page.getByTestId('bp-player-hp');
    const full = numberIn(await hp.textContent());
    await swingUntil(page, 'bp-attack', async () => {
      const now = numberIn(await hp.textContent().catch(() => null));
      return Number.isFinite(now) && now <= full - 10;
    });

    await page.getByTestId('bp-item').click();
    await page.getByTestId(`bp-item-${HERB}`).click();

    const said = page.getByTestId('bp-said');
    await expect(said, 'what was used, and what it did').toBeVisible({ timeout: 10_000 });
    await expect(said).toContainText('薬草');
    await expect(page.getByTestId('bp-said-result')).toContainText('回復');

    // AND IT IS STILL THERE after the creature has answered, because
    // the plate holds until the fight moves on — which is the player's
    // own next move, not a timer racing them.
    await page.waitForTimeout(2500);
    await expect(said, 'not written over by the reply to it').toBeVisible();
    await expect(said).toContainText('薬草');

    // The player's next move is what clears it.
    await page.getByTestId('bp-attack').click();
    await expect(said).toHaveCount(0, { timeout: 10_000 });
  });

  test('does not stop the fight when AUTO and ×2 are on', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page, { alwaysAttacks: true });
    await give(page, 0, [{ itemId: HERB, quantity: 3 }]);
    await walkIntoAFight(page);

    await page.getByTestId('bp-auto').click();
    await page.getByTestId('bp-speed').click();

    const hp = page.getByTestId('bp-player-hp');
    const full = numberIn(await hp.textContent());
    await expect
      .poll(async () => numberIn(await hp.textContent().catch(() => null)), { timeout: 60_000 })
      .toBeLessThanOrEqual(full - 10);

    // A hand-played item in the middle of an unattended fight.
    await page.getByTestId('bp-item').click();
    await page.getByTestId(`bp-item-${HERB}`).click();

    // ONE herb, not two: the hold must not let AUTO fire the same turn
    // twice, and the tray's own count is what proves it.
    await expect
      .poll(() => readWorldStateValue(page, 'inventory'), { timeout: 20_000 })
      .toEqual([{ itemId: HERB, quantity: 2 }]);

    // And AUTO carries on afterwards rather than stopping on the plate.
    await expect(page.getByTestId('battle-result')).toBeVisible({ timeout: 120_000 });
  });
});

test.describe('two things to reach for', () => {
  test('are both in the tray, and each refuses on its own terms', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page, { alwaysAttacks: true });
    await give(page, 0, [
      { itemId: HERB, quantity: 1 },
      { itemId: WATER, quantity: 1 },
    ]);
    await walkIntoAFight(page);

    await page.getByTestId('bp-item').click();
    const herb = page.getByTestId(`bp-item-${HERB}`);
    const water = page.getByTestId(`bp-item-${WATER}`);
    await expect(herb).toBeVisible();
    await expect(water).toBeVisible();
    await expect(water).toContainText('魔力水');

    // WHOLE AND FULL: neither is worth spending, and each says why in
    // its own words — the row shows the REASON in place of the effect
    // when it is refused, which is the whole point of refusing with a
    // reason rather than with a grey button.
    await expect(herb).toBeDisabled();
    await expect(herb).toContainText('傷はない');
    await expect(water).toBeDisabled();
    await expect(water).toContainText('魔力は満ちている');
  });

  test('and the flask is what MP comes back from', async ({ page }) => {
    test.setTimeout(300_000);
    await freshWorld(page);
    await armAForestFight(page, { alwaysAttacks: true });
    await give(page, 0, [{ itemId: WATER, quantity: 2 }]);
    await walkIntoAFight(page);

    // MAGIC HAS TO BE SPENT BEFORE THERE IS ROOM FOR IT, which is the
    // refusal the test above covers. A full flask on a full pool is a
    // wasted flask, so the game will not let it happen — and that
    // means this test has to cast first.
    const mp = page.getByTestId('bp-mp');
    await expect(mp, 'she has already awakened in a SPARE+3Y world').toBeVisible({
      timeout: 20_000,
    });
    const full = numberIn(await mp.textContent());
    await page.getByTestId('bp-magic').click();
    await page.getByTestId('magic-starlight_bolt').click();
    await expect.poll(async () => numberIn(await mp.textContent())).toBeLessThan(full);
    const spent = numberIn(await mp.textContent());

    const row = page.getByTestId(`bp-item-${WATER}`);
    await page.getByTestId('bp-item').click();
    await expect(row, 'now there is room for it').toBeEnabled();
    await row.click();
    await expect.poll(async () => numberIn(await mp.textContent())).toBeGreaterThan(spent);
    await expect
      .poll(() => readWorldStateValue(page, 'inventory'), { timeout: 20_000 })
      .toEqual([{ itemId: WATER, quantity: 1 }]);
  });
});

test('the shop sells both, and the bag shows both', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  await give(page, 80, []);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_ITEM_SHOP').click();
  await page.getByTestId(`shop-buy-button-${HERB}`).click();
  await expect(page.getByTestId('shop-lumi')).toHaveText('64');
  await page.getByTestId(`shop-buy-button-${WATER}`).click();
  await expect(page.getByTestId('shop-lumi')).toHaveText('40');
  await page.getByTestId('shop-leave').click();
  await page.getByRole('button', { name: 'もどる' }).click();

  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId(`bag-count-${HERB}`)).toHaveText('×1');
  await expect(page.getByTestId(`bag-count-${WATER}`)).toHaveText('×1');
  await expect(page.getByTestId(`bag-use-${WATER}`)).toContainText('MP');
});
