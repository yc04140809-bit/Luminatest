import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * アルデン村メニュー整理＋パーティ表示簡素化 (2026-10-10).
 *
 *   村 → 店舗（月灯りの酒場・パン屋・アルデン道具屋）→ 村
 *   村 → アルデン地方（行き先だけ：森・遺跡…・村へ）
 *
 * The shop is a door off the village like the tavern and the bakery; the
 * region map is for going out and has no shop on it. The square shows the
 * two of them as Lv., HP and MP — no EXP. On a low phone the way out and
 * the three shops are on screen without scrolling; the rest can scroll.
 */

async function freshVillage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
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
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function music(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const a = (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio;
    return a?.bgmState().current ?? null;
  });
}

test('the shops from the square: 道具屋 in and back, パン屋, 月灯りの酒場 — all doors of the village', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  const captions = await page.locator('.pp-menu .pp-caption').allTextContents();
  expect(captions).toEqual(['店舗', '村のこと', '記録', 'パーティ']);
  const shops = page.locator('.pp-group').first().locator('.pp-item');
  expect(await shops.allTextContents()).toEqual(['月灯りの酒場', 'パン屋', 'アルデン道具屋']);

  // 道具屋: ミレイ's shop, as it always was — and back to the square.
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();
  await expect(page.getByTestId('shop-greeting')).toContainText('ミレイ「');
  await expect(page.getByTestId('shop-tab-buy')).toBeVisible();
  await expect(page.getByTestId('shop-tab-sell')).toBeVisible();
  expect(await music(page)).toBe('ALDEN_VILLAGE');
  await page.getByTestId('shop-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('shop-screen')).toHaveCount(0);

  await page.getByTestId('bakery-button').click();
  await expect(page.getByTestId('bakery-screen')).toBeVisible();
  await page.getByTestId('bakery-leave').click();
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-screen')).toBeVisible();
  await page.getByTestId('tavern-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the region map is for going out: no shop on it, the forest still there, and back to the village', async ({ page }) => {
  await freshVillage(page);
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.getByTestId('shop-button')).toHaveCount(0);
  await expect(page.locator('.pp-menu')).not.toContainText('道具屋');
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  // And on the square, the shop once — not twice.
  await expect(page.getByTestId('shop-button')).toHaveCount(1);
});

test('the two of them on the square: Lv., HP and MP — no EXP', async ({ page }) => {
  await freshVillage(page);
  const panel = page.getByTestId('status-panel');
  await expect(panel).not.toContainText('EXP');
  await expect(page.getByTestId('status-hero-exp')).toHaveCount(0);
  await expect(page.getByTestId('status-kaos-exp')).toHaveCount(0);
  for (const id of ['hero', 'kaos']) {
    await expect(page.getByTestId(`status-${id}-level`)).toHaveText(/^Lv\.\d+$/);
    await expect(page.getByTestId(`party-${id}`)).toHaveText(/^HP \d+\/\d+　MP \d+\/\d+$/);
  }
  await expect(page.getByTestId('status-kaos')).toContainText('ケイオス');
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: the way out and the three shops on screen; everything else within a scroll; nothing off the side`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    for (const id of ['explore-button', 'tavern-button', 'bakery-button', 'shop-button', 'rumor-button']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 1);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w + 1);
    }
    for (const id of ['rest-button', 'memory-button', 'archive-button', 'status-button', 'bag-button']) {
      const el = page.getByTestId(id);
      await el.scrollIntoViewIfNeeded();
      const b = (await el.boundingBox())!;
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 1);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w + 1);
    }
    // Every door's name on one line: no taller than 月灯りの酒場's.
    const one = (await page.getByTestId('tavern-button').boundingBox())!.height;
    for (const id of ['shop-button', 'bakery-button', 'memory-button', 'archive-button']) {
      expect((await page.getByTestId(id).boundingBox())!.height, id).toBeLessThanOrEqual(one + 1);
    }
    // Each of them on one line.
    for (const id of ['status-hero', 'status-kaos']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.height, id).toBeLessThan(26);
    }
    // And the shop is reachable from here at this size.
    await page.getByTestId('shop-button').click();
    await expect(page.getByTestId('shop-leave')).toBeInViewport();
  });
}
