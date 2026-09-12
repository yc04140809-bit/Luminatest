import { test, expect, type Page } from './fixtures';
import { PHONES, RING_TAPS, enterDevAdmin, viewportOf } from './helpers';

/**
 * The exploration loop: see a ring, walk to it, find out what it was,
 * see the next one.
 *
 * The ring stands on one of several hand-placed spots, chosen at random,
 * so these tests walk the spots in turn rather than assuming where it
 * is — which is also the honest test: the player does the same.
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
 * Settles Gald's story through the DEV preset so the forest is in its
 * repeatable mode, and forces what the next arrival will be.
 */
async function settleAndForce(
  page: Page,
  force: 'EVENT' | 'ITEM' | 'BATTLE' | null,
  story?: 'on' | 'off',
) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId(force ? `force-encounter-${force}` : 'force-encounter-none').click();
  if (story) await page.getByTestId(story === 'on' ? 'force-story-on' : 'force-story-off').click();
  await page.getByTestId('dev-admin-back').click();
}

async function intoForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForTimeout(1500);
}

/** Walks the ring spots in turn until something happens, or gives up. */
/**
 * Walk the forest until something is found, or say that nothing was.
 *
 * ROUND THE SPOTS TWICE. Only one ring stands in the forest at a time,
 * so this taps each place it could be in turn and waits to see whether
 * the walk arrived. Two seconds a spot is plenty of time to cross the
 * clearing on an idle machine and not always enough on a loaded one —
 * and a walk that ran out of time at the right spot then had the player
 * walk AWAY from the ring to try the next one, which is how a forest
 * with something in it reported having nothing.
 *
 * A second pass costs nothing when the first one works and is the
 * difference between flaky and not when it does not. `walkIntoAFight`
 * in battlePrototype.spec.ts has gone round twice for the same reason
 * since it was written.
 */
async function walkUntil(page: Page, arrived: () => Promise<boolean>): Promise<boolean> {
  const box = await page.locator('.phaser-wrap canvas').boundingBox();
  if (!box) throw new Error('canvas bounding box unavailable');
  for (let pass = 0; pass < 2; pass++) {
    for (const at of RING_TAPS) {
      await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(180);
        if (await arrived()) return true;
      }
    }
  }
  return false;
}

const visible = (page: Page, id: string) => () =>
  page
    .getByTestId(id)
    .isVisible()
    .catch(() => false);

test.describe('exploration loop', () => {
  test('arriving at a ring finds something to pick up, and the loop goes round again', async ({
    page,
  }) => {
    await freshWorld(page);
    await settleAndForce(page, 'ITEM');
    await intoForest(page);

    expect(await walkUntil(page, visible(page, 'forest-item')), 'an arrival happened').toBe(true);
    const card = page.getByTestId('forest-item');
    await expect(card).toBeVisible();
    await expect(page.getByTestId('found-item-name')).not.toBeEmpty();
    // The forest stays on screen behind the card: this is a find in a
    // place, not a screen of its own.
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible();

    await page.getByTestId('take-item').click();
    await expect(card).toBeHidden();

    // The find was kept, outside WORLD MEMORY.
    const kept = await page.evaluate(() => localStorage.getItem('mugen-zero-discoveries'));
    expect(kept).toContain('itemId');

    // And there is a new ring somewhere else to walk to.
    expect(await walkUntil(page, visible(page, 'forest-item')), 'a second arrival').toBe(true);
  });

  test('arriving can be a moment in the forest, played over the forest', async ({ page }) => {
    await freshWorld(page);
    await settleAndForce(page, 'EVENT');
    await intoForest(page);

    expect(await walkUntil(page, visible(page, 'forest-event'))).toBe(true);
    const scene = page.getByTestId('forest-event');
    await expect(scene).toBeVisible();
    // No second backdrop: the world behind the words is the real one.
    await expect(page.getByTestId('dialogue-backdrop')).toHaveCount(0);
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible();

    for (let i = 0; i < 8 && (await scene.isVisible().catch(() => false)); i++) {
      await scene.click();
      await page.waitForTimeout(120);
    }
    await expect(scene).toBeHidden();
  });

  test('arriving can be a fight, and winning puts them back on the path', async ({ page }) => {
    await freshWorld(page);
    // Story roll off: this test is about the ordinary victory, which is
    // what almost every fight in the forest is. The rare one that turns
    // out to be somebody has its own spec.
    await settleAndForce(page, 'BATTLE', 'off');
    await intoForest(page);

    // Nothing is pinned here on purpose: this is the route a player
    // actually gets, which is currently the battle UI preview.
    expect(await walkUntil(page, visible(page, 'battle-prototype'))).toBe(true);
    // The forest's own creature, not the story's one bandit.
    await expect(page.getByTestId('bp-enemy-hp')).toContainText('モスラビット');
    await expect(page.getByTestId('gald-portrait-ready')).toHaveCount(0);

    // Kaos sometimes helps as a fight starts, and while she is speaking
    // the commands are not there to press. Nothing is pinned here on
    // purpose — a real player gets that moment about a third of the
    // time — so wait for the fight to become a fight either way.
    await expect(page.getByTestId('bp-commands')).toBeVisible({
      timeout: 10_000,
    });

    const attack = page.getByTestId('bp-attack');
    for (let i = 0; i < 40; i++) {
      if (
        await page
          .getByTestId('bp-normal-end')
          .isVisible()
          .catch(() => false)
      )
        break;
      if (await attack.isVisible().catch(() => false)) await attack.click();
      await page.waitForTimeout(140);
    }
    await expect(page.getByTestId('bp-normal-end')).toBeVisible();
    await page.getByTestId('bp-normal-end').click();

    // Back in the forest, not back at the village, and not at the door.
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('leave-forest')).toBeVisible();
  });

  test('hammering the screen on arrival still only produces one result', async ({ page }) => {
    await freshWorld(page);
    await settleAndForce(page, 'ITEM');
    await intoForest(page);

    const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
    const card = page.getByTestId('forest-item');
    for (const at of RING_TAPS) {
      const to = {
        x: box.x + box.width * at.fx,
        y: box.y + box.height * at.fy,
      };
      for (let i = 0; i < 14; i++) {
        // An impatient player taps the place they want to be, over and
        // over, right through the arrival. The same place, so this is
        // hammering rather than steering him somewhere else.
        await page.mouse.click(to.x, to.y);
        await page.waitForTimeout(160);
        if (await card.isVisible().catch(() => false)) break;
      }
      if (await card.isVisible().catch(() => false)) break;
    }
    await expect(card).toBeVisible();
    // One card, not a stack of them; one find recorded, not several.
    await expect(page.getByTestId('found-item-name')).toHaveCount(1);
    await page.getByTestId('take-item').click();
    await expect(card).toBeHidden();
    const kept = await page.evaluate(
      () => JSON.parse(localStorage.getItem('mugen-zero-discoveries') ?? '[]').length,
    );
    expect(kept).toBe(1);
  });

  for (const phone of PHONES) {
    test(`the find card fits a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await freshWorld(page);
      await settleAndForce(page, 'ITEM');
      await intoForest(page);
      expect(await walkUntil(page, visible(page, 'forest-item'))).toBe(true);

      const card = page.locator('.find-card');
      const box = (await card.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(phone.width + 0.5);
      // The way to close it is a real target, not a hairline.
      const take = (await page.getByTestId('take-item').boundingBox())!;
      expect(take.height).toBeGreaterThanOrEqual(44);
      const scrolls = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(scrolls, 'no sideways scroll').toBe(false);
    });
  }
});
