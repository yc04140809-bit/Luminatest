import { test, expect, type Locator, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { enemyHp, readyToAct } from './battle';

/**
 * A CHOICE IS MADE IN FRONT OF EVERYTHING.
 *
 * The spell, skill and item panels are drawn over the people on the
 * field, the enemy's plate and the command row; the fight behind them is
 * veiled, not hidden; nothing under the veil can be pressed; and every
 * row of every panel — name, cost, its 「やめる」 — is what a finger on it
 * touches, scrolling to it if the phone is too short to show them all.
 */

const PHONES = [
  { width: 667, height: 375 },
  { width: 740, height: 360 },
  { width: 800, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
];

const PANELS = [
  { name: '魔法', query: '&magic=1', open: 'bp-magic', panel: 'magic-tray', rows: 3 },
  { name: 'アイテム', query: '&bag=1', open: 'bp-item', panel: 'bp-item-tray', rows: 1 },
  { name: 'スキル', query: '', open: 'bp-skill', panel: 'bp-skill-tray', rows: 0 },
];

/** What a finger at this point of the element would touch. */
async function touched(page: Page, target: Locator, fx: number) {
  const box = (await target.boundingBox())!;
  return page.evaluate(
    ({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return {
        testId: hit?.closest('[data-testid]')?.getAttribute('data-testid') ?? null,
        inPicker: !!hit?.closest('.bp-picker-panel'),
      };
    },
    { x: box.x + box.width * fx, y: box.y + box.height / 2 },
  );
}

/** The whole of every row, and its way back, is on top and reachable. */
async function everyRowOnTop(page: Page, panel: Locator, least: number) {
  const buttons = panel.locator('button');
  const n = await buttons.count();
  expect(n, 'its rows and its way back').toBeGreaterThanOrEqual(least + 1);
  for (let i = 0; i < n; i++) {
    const button = buttons.nth(i);
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height);
    expect(box.height, 'a thumb can press it').toBeGreaterThanOrEqual(44);
    // Left end (the name), middle, right end (the MP or the count).
    for (const fx of [0.08, 0.5, 0.92]) {
      const hit = await touched(page, button, fx);
      expect(hit.inPicker, `row ${i} at ${fx} is the panel's`).toBe(true);
    }
  }
}

for (const size of PHONES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    for (const p of PANELS) {
      test(`${p.name}: in front of the party, the enemy and the commands`, async ({ page }) => {
        await page.goto(`/?preview=battle${p.query}`);
        await expect(page.getByTestId('bp-attack')).toBeVisible();
        await page.getByTestId(p.open).click();
        const panel = page.getByTestId(p.panel);
        await expect(panel).toBeVisible();
        await expect(page.getByTestId('bp-picker')).toBeVisible();

        await everyRowOnTop(page, panel, p.rows);

        // The fight is still drawn behind it...
        await expect(page.getByTestId('bp-hero-art')).toBeVisible();
        await expect(page.getByTestId('bp-enemy-art')).toBeVisible();
        await expect(page.getByTestId('bp-battle-bg')).toBeVisible();
        // ...and nothing under the veil can be pressed.
        for (const id of ['bp-attack', 'bp-defend', 'bp-speed']) {
          expect((await touched(page, page.getByTestId(id), 0.5)).testId, `${id} is covered`).toBe(
            'bp-picker-veil',
          );
        }

        // A press on the veil is "back".
        await page.mouse.click(3, size.height / 2);
        await expect(page.getByTestId('bp-picker')).toHaveCount(0);
        await expect(page.getByTestId(p.panel)).toHaveCount(0);

        // And its own やめる is too.
        await page.getByTestId(p.open).click();
        await panel.locator('button').last().click();
        await expect(page.getByTestId('bp-picker')).toHaveCount(0);
      });
    }
  });
}

test('in a real fight, a press where 攻撃 is while the bag is open closes the bag and takes no turn', async ({
  page,
}) => {
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
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);

  const [before] = await enemyHp(page);
  const attack = (await page.getByTestId('bp-attack').boundingBox())!;
  await page.getByTestId('bp-item').click();
  await expect(page.getByTestId('bp-item-tray')).toBeVisible();
  await page.mouse.click(attack.x + attack.width / 2, attack.y + attack.height / 2);
  // The bag is closed, and no turn was taken: no swing, no number, the
  // creature's health as it was.
  await expect(page.getByTestId('bp-picker')).toHaveCount(0);
  await page.waitForTimeout(900);
  expect(await page.locator('.bp-hit').count()).toBe(0);
  expect((await enemyHp(page))[0]).toBe(before);
  await readyToAct(page);
});
