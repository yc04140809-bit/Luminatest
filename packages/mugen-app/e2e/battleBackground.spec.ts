import { test, expect, type Locator, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { fightToResult } from './battle';

/**
 * THE GROUND A FIGHT IS FOUGHT ON.
 *
 * Six battle paintings, one of them — FOREST — given to the greenwood.
 * Checked in the game's real fight (still the plain screen, with the
 * painting behind it) and on the reproduced battle screen, where every
 * one of the six can be looked at through the development preview.
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

/** Loaded, at its own shape (covered, never stretched), and its file. */
async function painting(img: Locator): Promise<string> {
  await expect
    .poll(() => img.evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const fit = await img.evaluate((e) => getComputedStyle(e).objectFit);
  expect(fit, 'cropped to fit, not stretched').toBe('cover');
  const src = (await img.getAttribute('src')) ?? '';
  return decodeURIComponent(src).split('/').pop()!.replace(/\?.*$/, '');
}

/** The control is what a finger on it touches — nothing is over it. */
async function onTop(page: Page, control: Locator) {
  const box = (await control.boundingBox())!;
  const hit = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('data-testid') ?? null,
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(hit).toBe(await control.getAttribute('data-testid'));
}

test('the greenwood\'s fight is fought on FOREST, and it leaves with the fight', async ({ page }) => {
  await freshApp(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();

  // Not in the forest itself: that is the forest's own picture.
  await expect(page.getByTestId('bp-battle-bg')).toHaveCount(0);

  await page.getByTestId('encounter-button').click();
  const bg = page.getByTestId('bp-battle-bg');
  await expect(bg).toHaveAttribute('data-background', 'FOREST');
  expect(await painting(bg)).toMatch(/^forest.*\.png$/);
  // Behind the fight, never over it.
  await onTop(page, page.getByTestId('bp-attack'));
  await onTop(page, page.getByTestId('bp-defend'));

  // Won, and gone with the fight.
  await fightToResult(page);
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();
  await expect(page.getByTestId('bp-battle-bg')).toHaveCount(0);

  // And there again for the next one.
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('bp-battle-bg')).toHaveAttribute('data-background', 'FOREST');
  expect(await painting(page.getByTestId('bp-battle-bg'))).toMatch(/^forest.*\.png$/);
});

for (const key of ['FOREST', 'RUINS', 'SWAMP', 'CITY', 'BEACH', 'GRASSLAND']) {
  test(`the battle screen draws ${key} behind everything, whole and uncovered`, async ({ page }) => {
    await page.goto(`/?preview=battle&bg=${key}`);
    const bg = page.getByTestId('bp-battle-bg');
    await expect(bg).toHaveAttribute('data-background', key);
    expect(await painting(bg)).toMatch(new RegExp(`^${key.toLowerCase()}.*\\.png$`));
    // It fills the field and no more.
    const box = (await bg.boundingBox())!;
    const view = page.viewportSize()!;
    expect(box.x).toBeLessThanOrEqual(0);
    expect(box.y).toBeLessThanOrEqual(0);
    expect(box.x + box.width).toBeGreaterThanOrEqual(view.width);
    expect(box.y + box.height).toBeGreaterThanOrEqual(view.height);
    // Every control is over it.
    for (const id of ['bp-attack', 'bp-defend', 'bp-auto', 'bp-speed', 'bp-escape']) {
      await onTop(page, page.getByTestId(id));
    }
  });
}

test('the battle screen fights the greenwood on FOREST when nothing else is said', async ({ page }) => {
  await page.goto('/?preview=battle');
  await expect(page.getByTestId('bp-battle-bg')).toHaveAttribute('data-background', 'FOREST');
});
