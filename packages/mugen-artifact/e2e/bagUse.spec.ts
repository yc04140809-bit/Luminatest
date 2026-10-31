import { test, expect, type Page } from './fixtures';
import { RING_TAPS, enterDevAdmin, ontoTheMap, readWorldStateValue, swingUntil } from './helpers';

/**
 * 買う → 持つ → 見る → 使う, out of a fight.
 *
 * The round's success condition, walked end to end in a real browser:
 * a herb bought at the counter is drunk in the bag, the wound closes,
 * the count comes down, and both halves are still true after the tab
 * has been backgrounded and come back.
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

/** Straight through the developer's own door: a bag and a wound. */
async function armed(page: Page, { herbs = 1, waters = 0, hurt = false, drain = false } = {}) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  await page.getByTestId('force-enemy-ATTACK').click();
  for (let i = 0; i < herbs; i++) await page.getByTestId('dev-give-FOREST_HERB').click();
  for (let i = 0; i < waters; i++) await page.getByTestId('dev-give-MANA_WATER').click();
  if (hurt) await page.getByTestId('dev-hurt-party').click();
  if (drain) await page.getByTestId('dev-drain-party').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();
}

const HERB = 'FOREST_HERB';
const WATER = 'MANA_WATER';
/** Somebody's own row, now that the bag has one each. */
const hpOf = async (page: Page, who = 'hero') =>
  Number(
    ((await page.getByTestId(`bag-condition-${who}`).textContent()) ?? '').match(/HP (\d+)/)?.[1],
  );
const mpOf = async (page: Page, who = 'kaos') =>
  Number(
    ((await page.getByTestId(`bag-condition-${who}`).textContent()) ?? '').match(/MP (\d+)/)?.[1],
  );

test.describe('using a herb out of a fight', () => {
  test('closes the wound, spends one, and says so', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await armed(page, { herbs: 2, hurt: true });
    await page.getByTestId('bag-button').click();

    const before = await hpOf(page);
    await expect(page.getByTestId(`bag-count-${HERB}`)).toHaveText('×2');
    await page.getByTestId(`bag-use-button-${HERB}`).click();

    await expect(page.getByTestId('bag-said')).toContainText('回復');
    await expect(page.getByTestId(`bag-count-${HERB}`)).toHaveText('×1');
    expect(await hpOf(page), 'the wound closed').toBeGreaterThan(before);
  });

  test('is refused at full health, and costs nothing', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await armed(page, { herbs: 1 });
    await page.getByTestId('bag-button').click();

    const button = page.getByTestId(`bag-use-button-${HERB}`);
    await expect(button, 'no wound, no herb').toBeDisabled();
    await expect(button).toContainText('傷はない');
    await expect(page.getByTestId(`bag-count-${HERB}`)).toHaveText('×1');
  });

  test('never heals past the top', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await armed(page, { herbs: 1, hurt: true });
    await page.getByTestId('bag-button').click();
    await page.getByTestId(`bag-use-button-${HERB}`).click();
    await expect(page.getByTestId('bag-said')).toBeVisible();
    const text = (await page.getByTestId('bag-condition-hero').textContent()) ?? '';
    const [now, max] = [...text.matchAll(/(\d+) \/ (\d+)/g)][0].slice(1).map(Number);
    expect(now).toBeLessThanOrEqual(max);
  });
});

test.describe('using a flask out of a fight', () => {
  test('fills the other bar', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await armed(page, { herbs: 0, waters: 1, drain: true });
    await page.getByTestId('bag-button').click();
    const before = await mpOf(page);
    await page.getByTestId(`bag-use-button-${WATER}`).click();
    await expect(page.getByTestId('bag-said')).toContainText('MP');
    expect(await mpOf(page)).toBeGreaterThan(before);
    await expect(page.getByTestId(`bag-${WATER}`), 'and the row is gone').toHaveCount(0);
  });

  test('is refused when the magic is already there', async ({ page }) => {
    test.setTimeout(240_000);
    await freshWorld(page);
    await armed(page, { herbs: 0, waters: 1 });
    await page.getByTestId('bag-button').click();
    const button = page.getByTestId(`bag-use-button-${WATER}`);
    await expect(button).toBeDisabled();
    await expect(button).toContainText('魔力は満ちている');
  });
});

test('an acorn has no button at all', async ({ page }) => {
  test.setTimeout(240_000);
  await freshWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('dev-give-ROUND_ACORN').click();
  await page.getByTestId('dev-hurt-party').click();
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-ROUND_ACORN')).toBeVisible();
  await expect(page.getByTestId('bag-use-ROUND_ACORN')).toHaveText('使えない');
  await expect(
    page.getByTestId('bag-use-button-ROUND_ACORN'),
    'a disabled 使う on an acorn is a promise the game will not keep',
  ).toHaveCount(0);
});

/**
 * THE WHOLE ROUND, in the order the brief asks for it.
 */
test('buy, carry, fight, heal in the bag, and still be holding it afterwards', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  await page.getByTestId('force-enemy-ATTACK').click();
  await page.getByTestId('dev-admin-back').click();

  // --- buy ---
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('world_state', 'readwrite');
          tx.objectStore('world_state').put({ key: 'lumi', value: 40 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
  await page.getByTestId('continue-button').click({ timeout: 20_000 });
  await ontoTheMap(page);
  await page.getByTestId('location-ALDEN_ITEM_SHOP').click();
  await page.getByTestId(`shop-buy-button-${HERB}`).click();
  await expect(page.getByTestId('shop-lumi')).toHaveText('24');
  await page.getByTestId('shop-leave').click();

  // --- fight, and be hurt by it ---
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
  const result = page.getByTestId('battle-result');
  await swingUntil(page, 'bp-attack', () => result.isVisible().catch(() => false));
  await expect(result).toBeVisible({ timeout: 40_000 });
  await page.getByTestId('result-done').click();

  // --- the wound came out of the fight with them ---
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('leave-forest').click();
  await page.getByRole('button', { name: 'もどる' }).click();
  await page.getByTestId('bag-button').click();
  const hurt = await hpOf(page);
  const text = (await page.getByTestId('bag-condition-hero').textContent()) ?? '';
  const max = Number(text.match(/HP (?:\d+) \/ (\d+)/)?.[1]);
  expect(hurt, 'a fight costs something, and it is still costing it out here').toBeLessThan(max);

  // --- heal it, out of a fight ---
  // TWO OF THEM, and not because the test bought two: a moss rabbit
  // drops one. That is the loop actually closing — the fight paid for
  // part of the cure for the wound it caused — so the count is read
  // rather than assumed.
  const carried = Number(
    ((await page.getByTestId(`bag-count-${HERB}`).textContent()) ?? '').replace('×', ''),
  );
  expect(carried).toBeGreaterThanOrEqual(1);
  await page.getByTestId(`bag-use-button-${HERB}`).click();
  await expect(page.getByTestId('bag-said')).toContainText('回復');
  const healed = await hpOf(page);
  expect(healed).toBeGreaterThan(hurt);
  if (carried === 1) {
    await expect(page.getByTestId(`bag-${HERB}`), 'the last one is gone').toHaveCount(0);
  } else {
    await expect(page.getByTestId(`bag-count-${HERB}`)).toHaveText(`×${carried - 1}`);
  }

  // --- backgrounded, and back ---
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.reload();
  await page.getByTestId('continue-button').click({ timeout: 20_000 });
  const bag = (await readWorldStateValue(page, 'inventory')) as { itemId: string; quantity: number }[];
  const left = bag.find((stack) => stack.itemId === HERB)?.quantity ?? 0;
  expect(left, 'the herb is still spent').toBe(carried - 1);
  const saved = (await readWorldStateValue(page, 'party_condition')) as Record<
    string,
    { hp: number }
  >;
  expect(saved.hero.hp, 'and the healing is still done').toBe(healed);
});
