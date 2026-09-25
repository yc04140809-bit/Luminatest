import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * THE SAME GAME, DRIVEN WITH A FINGER.
 *
 * Every other spec clicks. A mouse click reaches a 20px target
 * perfectly and never scrolls a panel, so it cannot see the two faults
 * that actually hurt on a handset: a control too small to hit, and a
 * list whose later rows can be seen but not reached.
 *
 * THIS IS STILL NOT A DEVICE. Touch emulation gets the event model,
 * the pointer type and the metrics; it does not get the real WebView,
 * the real fonts, the hardware back button, or a thumb. Those are the
 * items in the report that stay marked unverified.
 */
test.use({
  hasTouch: true,
  isMobile: true,
  // A common Android landscape, and the scale factor that goes with it.
  viewport: { width: 762, height: 321 },
  deviceScaleFactor: 2.625,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36',
});

/**
 * What a control must be to be hit with a thumb.
 *
 * 44px is the usual guidance and the buttons meet it; a row in a list
 * is allowed to be smaller because it is one of a stack and missing it
 * hits its neighbour rather than nothing. 34px is where that stops
 * being true — and the list rows were 28px until this file measured
 * them.
 */
const MIN_TAP = 34;

async function tappable(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, `${testId} must be laid out`).not.toBeNull();
  expect(box!.height, `${testId} is ${Math.round(box!.height)}px tall`).toBeGreaterThanOrEqual(
    MIN_TAP,
  );
  return box!;
}

async function intoTheVillageByTouch(page: Page) {
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
  expect(await page.evaluate(() => 'ontouchstart' in window)).toBe(true);

  await page.getByTestId('start-button').tap();
  await throughTheOpening(page, { tap: true });

  await tappable(page, 'naming-confirm');
  await tappable(page, 'naming-default');
  await page.getByTestId('naming-input').tap();
  await page.getByTestId('naming-input').fill('ケイオス師匠');
  await page.getByTestId('naming-confirm').tap();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('the whole equipment flow works with a finger', async ({ page }) => {
  await intoTheVillageByTouch(page);

  // A second sword, by the route a shop will use. Dev builds only.
  await page.evaluate(async () => {
    const w = (window as unknown as { __mugenWorld?: { grantEquipment(id: string): Promise<boolean> } })
      .__mugenWorld;
    await w?.grantEquipment('weapon/training_long_sword');
  });

  await page.getByTestId('status-button').tap();
  await expect(page.getByTestId('status-screen')).toBeVisible();
  await tappable(page, 'status-to-equipment');
  await tappable(page, 'status-back');
  await page.getByTestId('status-to-equipment').tap();
  await expect(page.getByTestId('equipment-screen')).toBeVisible();

  await tappable(page, 'equip-slot-WEAPON');
  await page.getByTestId('equip-slot-WEAPON').tap();
  await expect(page.getByTestId('equip-picker')).toBeVisible();

  for (const id of [
    'equip-remove',
    'equip-choice-weapon/worn_long_sword',
    'equip-choice-weapon/training_long_sword',
  ]) {
    await tappable(page, id);
  }

  /**
   * THE LIST MUST BE REACHABLE, NOT MERELY PRESENT. With three rows in
   * a 115px panel it overflows, and a panel that overflows without
   * scrolling is a list whose last entry cannot be chosen — which is
   * exactly what shipped before a screenshot caught it.
   */
  const list = page.locator('.eq-pick');
  const overflows = await list.evaluate((e) => e.scrollHeight > e.clientHeight + 1);
  if (overflows) {
    await list.evaluate((e) => e.scrollTo(0, 9999));
    expect(await list.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  }

  await page.getByTestId('equip-choice-weapon/training_long_sword').tap();
  await expect(page.getByTestId('equip-weapon-name')).toHaveText('訓練用の長剣');

  await page.getByTestId('equip-to-status').tap();
  await expect(page.getByTestId('status-equipped')).toHaveText('訓練用の長剣');

  // Nothing on any of these screens makes the page itself scroll.
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
  ).toBe(0);
});
