import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * アルデン村の縮図 (作者「アルデン村メニュー画面 改修指示書」2026-10-16; was the list
 * of place names of 2026-10-10).
 *
 *   left, a third    the two of them, what is happening, the place chosen
 *   right            the village from above: its places as labels, who is in each
 *   below the right  ステータス・噂話・持ち物・世界記憶・人生記録 (no クエスト, no セーブ; short, one line each — 2026-10-17)
 *
 * Every door is still there: a shop's, and 休息する at the inn-tavern, once its
 * place is tapped; the roads out open the region map, which is for going out.
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

const labelOf = (page: Page, id: string) =>
  page.getByTestId(id).locator('.kit-text').textContent();

test('the village from above: its places by name — three houses, two roads out, no sea; the five below, no クエスト or セーブ', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await expect(page.getByTestId('village-screen')).toBeVisible();
  await expect(page.getByTestId('village-picture')).toBeVisible();
  for (const [id, label] of [
    ['spot-church', '教会'],
    ['spot-shop', '道具屋'],
    ['spot-bakery', 'パン屋'],
    ['spot-tavern', '宿酒場'],
    ['spot-plaza', '中央広場'],
    ['spot-house_01', '民家'],
    ['spot-house_02', '民家'],
    ['spot-house_03', '民家'],
    ['explore-button', '森への道\u00a0→'],
    ['spot-road_ruins', '遺跡への道\u00a0→'],
  ] as const) {
    expect(await labelOf(page, id), id).toBe(label);
  }
  await expect(page.locator('.vg-spot.vg-k-house')).toHaveCount(3);
  await expect(page.getByTestId('village-screen')).not.toContainText('海');
  // The five, in order; nothing else down there.
  expect(await page.locator('.vg-menu .kit-text').allTextContents()).toEqual(['ステータス', '噂話', '持ち物', '世界記憶', '人生記録']);
  await expect(page.getByTestId('village-screen')).not.toContainText('クエスト');
  await expect(page.getByTestId('village-screen')).not.toContainText('セーブ');
  // 次の目的, top right.
  await expect(page.getByTestId('next-objective')).toContainText('次の目的');
  await expect(page.getByTestId('next-objective-text')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

test('who is where, worked out: リナ and her father at the bakery, ミレイ at the shop, the master and tonight’s stranger at the inn — nobody else placed', async ({ page }) => {
  await freshVillage(page);
  await expect(page.getByTestId('spot-bakery-people')).toHaveText(/リナ.*主人/);
  await expect(page.getByTestId('spot-shop-people')).toHaveText('ミレイ');
  await expect(page.getByTestId('spot-tavern-people')).toContainText('マスター');
  // Nowhere else anybody (リゼル, バルド: no settled place yet).
  for (const id of ['church', 'plaza', 'house_01', 'house_02', 'house_03']) await expect(page.getByTestId(`spot-${id}-people`)).toHaveCount(0);
  await expect(page.getByTestId('village-map')).not.toContainText('リゼル');
  await expect(page.getByTestId('village-map')).not.toContainText('バルド');
  // Met (his first meeting read), he is グレイヴ.
  await page.evaluate(() => (window as unknown as { __mugenWorld: { markRead(ids: string[]): Promise<unknown> } }).__mugenWorld.markRead(['talk:GRAVE_MEETING']));
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('spot-tavern-people')).toContainText('グレイヴ');
});

test('a place tapped: on the left, who is there and its doors — the shops in and back, the inn’s rest; tapped again, gone', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await expect(page.getByTestId('place-card')).toHaveCount(0);
  // A fresh village: the master and リナ not met yet — not the everyday talk, so marked; nothing waits at the tool shop.
  await expect(page.getByTestId('tavern-new')).toBeVisible();
  await expect(page.getByTestId('bakery-new')).toBeVisible();
  await expect(page.getByTestId('shop-new')).toHaveCount(0);

  await page.getByTestId('spot-shop').click();
  await expect(page.getByTestId('spot-shop')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('place-card')).toHaveAttribute('data-spot', 'shop');
  await expect(page.getByTestId('place-people')).toHaveText('ミレイ');
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();
  await expect(page.getByTestId('shop-keeper-area').locator('h1')).toHaveText('アルデン道具屋');
  expect(await music(page)).toBe('ALDEN_VILLAGE');
  await page.getByTestId('shop-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await (await placeButton(page, 'bakery-button')).click();
  await expect(page.getByTestId('bakery-screen')).toBeVisible();
  await page.getByTestId('bakery-leave').click();

  // The inn-tavern: in, and a night's rest.
  await page.getByTestId('spot-tavern').click();
  await expect(page.getByTestId('place-card')).toHaveAttribute('data-spot', 'tavern');
  await expect(page.getByTestId('tavern-button')).toBeVisible();
  const day = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(page.getByTestId('rest-button')).toBeEnabled();

  // A place with nothing to do: who is there (nobody known), no door.
  await page.getByTestId('spot-church').click();
  await expect(page.getByTestId('place-card')).toHaveAttribute('data-spot', 'church');
  await expect(page.getByTestId('place-nobody')).toBeVisible();
  await expect(page.locator('.vg-door')).toHaveCount(0);
  // Tapped again: the card is gone.
  await page.getByTestId('spot-church').click();
  await expect(page.getByTestId('place-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the roads out: 森への道 opens the region map (the forest, and back); 遺跡への道 dark until the ruins are open, then to the same map', async ({ page }) => {
  await freshVillage(page);
  // Not yet: dark, and no way through.
  await expect(page.getByTestId('spot-road_ruins')).toHaveAttribute('data-shut', 'yes');
  await page.getByTestId('spot-road_ruins').click();
  await expect(page.getByTestId('place-card')).toHaveAttribute('data-spot', 'road_ruins');
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.getByTestId('shop-button')).toHaveCount(0);
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  // The master has told what was sealed there: the road lit, marked, and to the map with the ruins on it.
  await page.evaluate(async () => {
    const w = (window as unknown as { __mugenWorld: { recordGaldLifeChoice(c: string): Promise<unknown>; markExperienceSeen(id: string): Promise<unknown>; advanceSekiryugaArc(s: string): Promise<boolean> } }).__mugenWorld;
    await w.recordGaldLifeChoice('SPARE');
  });
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  for (const s of ['RUMOR', 'TOLD']) {
    await page.evaluate((st) => (window as unknown as { __mugenWorld: { advanceSekiryugaArc(s: string): Promise<boolean> } }).__mugenWorld.advanceSekiryugaArc(st), s);
  }
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('spot-road_ruins')).not.toHaveAttribute('data-shut', 'yes');
  await expect(page.getByTestId('explore-new')).toBeVisible();
  await expect(page.getByTestId('next-objective-text')).toHaveText('遺跡への道を調べよう');
  await page.getByTestId('spot-road_ruins').click();
  await expect(page.getByTestId('ruins-button')).toBeVisible();
});

test('the two of them on the left: Lv., HP and MP — no EXP', async ({ page }) => {
  await freshVillage(page);
  const panel = page.getByTestId('status-panel');
  await expect(panel).not.toContainText('EXP');
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
  test(`${w}×${h}: the village a good part of the screen; every label and the five on screen and readable; nothing off the side`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    const map = (await page.getByTestId('village-map').boundingBox())!;
    const side = (await page.locator('.vg-side').boundingBox())!;
    // The village takes most of the width (about two thirds).
    expect(map.width).toBeGreaterThan(w * 0.5);
    expect(side.width).toBeLessThan(w * 0.45);
    const onScreen = async (id: string) => {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 1);
      expect(b.x, id).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w + 1);
      return b;
    };
    for (const id of ['spot-church', 'spot-shop', 'spot-bakery', 'spot-tavern', 'spot-plaza', 'spot-house_01', 'spot-house_02', 'spot-house_03', 'explore-button', 'spot-road_ruins', 'next-objective']) {
      const b = await onScreen(id);
      expect(b.height, id).toBeGreaterThanOrEqual(16);
    }
    for (const id of ['status-button', 'rumor-button', 'bag-button', 'memory-button', 'archive-button']) {
      const b = await onScreen(id);
      expect(b.height, id).toBeGreaterThanOrEqual(36);
    }
    // The labels are read, not squinted at.
    const size = await page.getByTestId('spot-tavern').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(12);
    // No page scroll sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w + 1);
    // A shop reachable from here at this size.
    await page.getByTestId('spot-shop').click();
    await onScreen('shop-button');
    await page.getByTestId('shop-button').click();
    await expect(page.getByTestId('shop-leave')).toBeInViewport();
  });
}

test('844×390: only the village scrolls — the panel, the five, its name and 次の目的 stay; a place scrolled to is tapped true', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await freshVillage(page);
  const scroller = page.getByTestId('village-scroll');
  const before = {
    objective: (await page.getByTestId('next-objective').boundingBox())!,
    side: (await page.locator('.vg-side').boundingBox())!,
    menu: (await page.getByTestId('status-button').boundingBox())!,
  };
  // There is more village than screen, and it is reached by scrolling the village only.
  expect(await scroller.evaluate((e) => e.scrollHeight - e.clientHeight)).toBeGreaterThan(0);
  await scroller.evaluate((e) => e.scrollTo(0, e.scrollHeight));
  await expect.poll(() => scroller.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
  expect((await page.getByTestId('next-objective').boundingBox())!.y).toBe(before.objective.y);
  expect((await page.locator('.vg-side').boundingBox())!.y).toBe(before.side.y);
  expect((await page.getByTestId('status-button').boundingBox())!.y).toBe(before.menu.y);
  // The lowest house, after scrolling: on screen, and its own card when tapped.
  const house = (await page.getByTestId('spot-house_03').boundingBox())!;
  expect(house.y + house.height).toBeLessThanOrEqual(before.menu.y);
  await page.getByTestId('spot-house_03').click();
  await expect(page.getByTestId('place-card')).toHaveAttribute('data-spot', 'house_03');
});
