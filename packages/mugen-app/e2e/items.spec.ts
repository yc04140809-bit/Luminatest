import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { goTo, settled, things } from './roam';

/**
 * 探索アイテム＋道具屋基盤 (2026-10-07):
 *
 *   探索 → 発見 → 拾う → 持ち物に入る → 使う／売る
 *
 * A pickup is taken once in a world and stays taken across a restart; the
 * bag shows it on its shelf; the shop buys and sells, and never takes the
 * ancient fragment.
 */

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  addLumi(n: number): Promise<number>;
  spendLumi(n: number): Promise<boolean>;
  getLumi(): number;
  addItem(id: string, n?: number): Promise<number>;
  getItemCount(id: string): number;
  getTakenPickups(): readonly string[];
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

/** The rows kept, straight from the phone's save. */
async function savedRows(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = indexedDB.open('mugen-zero-app');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const all = req.result.transaction('world_state', 'readonly').objectStore('world_state').getAll();
          all.onsuccess = () => {
            const out: Record<string, unknown> = {};
            for (const row of all.result as { key: string; value: unknown }[]) out[row.key] = row.value;
            req.result.close();
            resolve(out);
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );
}

const held = (rows: Record<string, unknown>, id: string) =>
  ((rows.inventory as { itemId: string; quantity: number }[] | undefined) ?? []).find((r) => r.itemId === id)?.quantity ?? 0;

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
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Closed and opened again, and back to the village from wherever it resumes. */
async function restart(page: Page) {
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId('world-clock').isVisible().catch(() => false)) break;
    for (const id of ['future-vision-done', 'future-vision-next', 'back-to-village']) {
      const b = page.getByTestId(id);
      if (await b.isVisible().catch(() => false)) {
        await b.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(200);
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);
}

async function outOfTheForest(page: Page) {
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

const pickupIds = async (page: Page) => (await things(page)).filter((t) => t.kind === 'pickup').map((t) => t.id);

async function takePickup(page: Page, id: string) {
  await goTo(page, id);
  const look = page.getByTestId('walk-look');
  await expect(look).toHaveAttribute('data-kind', 'pickup');
  await expect(look).toHaveAttribute('data-point', id);
  await look.click();
}

test.describe.configure({ timeout: 180_000 });

test('the forest: a pickup is taken once — into the bag, noticed, gone on the next visit and after a restart', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await intoTheForest(page);
  // Three, each a faint glint; none in notice where they walk in.
  expect(await pickupIds(page)).toEqual(['forest_pickup_001', 'forest_pickup_002', 'forest_pickup_003']);
  await expect(page.locator('.roam-sign.g-pickup')).toHaveCount(3);
  expect(((await page.getByTestId('walk-scene').getAttribute('data-noticed')) ?? '').includes('pickup')).toBe(false);
  await expect(page.locator('[data-testid^="walk-marker-forest_pickup"]')).toHaveCount(0);

  // 木の根元: two nuts.
  await takePickup(page, 'forest_pickup_002');
  await expect(page.getByTestId('walk-got')).toHaveText('森の木の実 ×2 を手に入れた');
  await expect(page.getByTestId('walk-got')).toHaveAttribute('data-special', 'no');
  await expect(page.getByTestId('walk-caption')).toHaveText('木の根元に、固い木の実がいくつも落ちていた。');
  // Saved at once: the nuts, and the mark.
  await expect.poll(async () => held(await savedRows(page), 'FOREST_NUT')).toBe(2);
  expect((await savedRows(page)).explorationPickups).toEqual(['forest_pickup_002']);
  // Gone from the floor, and its 調べる with it.
  expect(await pickupIds(page)).toEqual(['forest_pickup_001', 'forest_pickup_003']);
  await expect(page.getByTestId('walk-pickup-forest_pickup_002')).toHaveCount(0);
  await expect(page.getByTestId('walk-look')).toHaveCount(0);
  // The notice goes by itself.
  await expect(page.getByTestId('walk-got')).toHaveCount(0, { timeout: 6000 });

  // Out and in again: still gone, still two.
  await outOfTheForest(page);
  await intoTheForest(page);
  expect(await pickupIds(page)).toEqual(['forest_pickup_001', 'forest_pickup_003']);
  await outOfTheForest(page);

  // After a restart: still gone, still two.
  await restart(page);
  await intoTheForest(page);
  expect(await pickupIds(page)).toEqual(['forest_pickup_001', 'forest_pickup_003']);
  expect(await world<number>(page, `(w) => w.getItemCount('FOREST_NUT')`)).toBe(2);
  await outOfTheForest(page);

  // In the bag, on the 素材 shelf, with its count and its words.
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-group-MATERIAL').getByTestId('bag-row-FOREST_NUT')).toBeVisible();
  await expect(page.getByTestId('bag-count-FOREST_NUT')).toHaveText('×2');
  await expect(page.getByTestId('bag-desc-FOREST_NUT')).toHaveText('森で拾った固い木の実。煎れば食べられるかもしれない。');
  expect(errors).toEqual([]);
});

test('the ruins: 「古代の破片」を見つけた — found a little apart, kept, and never for sale', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('SPARE')`);
  // Through the look ahead (the route opens after it), then the master's story told.
  await restart(page);
  expect(await world<boolean>(page, `(w) => w.advanceSekiryugaArc('RUMOR')`)).toBe(true);
  expect(await world<boolean>(page, `(w) => w.advanceSekiryugaArc('TOLD')`)).toBe(true);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('ruins-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await settled(page);
  expect(await pickupIds(page)).toEqual(['ruins_pickup_001', 'ruins_pickup_002', 'ruins_pickup_003', 'ruins_pickup_004']);

  await takePickup(page, 'ruins_pickup_004');
  await expect(page.getByTestId('walk-got')).toHaveText('「古代の破片」を見つけた。');
  await expect(page.getByTestId('walk-got')).toHaveAttribute('data-special', 'yes');
  await expect(page.getByTestId('walk-caption')).toHaveAttribute('data-grade', 'RARE');
  await expect.poll(async () => held(await savedRows(page), 'ANCIENT_SHARD')).toBe(1);

  await takePickup(page, 'ruins_pickup_001');
  await expect(page.getByTestId('walk-got')).toHaveText('古びた硬貨 ×2 を手に入れた');
  await expect.poll(async () => held(await savedRows(page), 'OLD_COIN')).toBe(2);
  expect(await world<readonly string[]>(page, `(w) => [...w.getTakenPickups()]`)).toEqual([
    'ruins_pickup_004',
    'ruins_pickup_001',
  ]);

  // In the bag: the fragment on its own shelf.
  await page.getByTestId('leave-ruins').click();
  await page.getByTestId('back-to-village').click();
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-group-KEY').getByTestId('bag-row-ANCIENT_SHARD')).toBeVisible();
  await expect(page.getByTestId('bag-group-MATERIAL').getByTestId('bag-row-OLD_COIN')).toBeVisible();
  await page.getByTestId('bag-back').click();

  // At the shop: the coin sells, the fragment does not.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  await page.getByTestId('shop-tab-sell').click();
  await expect(page.getByTestId('shop-sell-refused-ANCIENT_SHARD')).toHaveText('売れない');
  await expect(page.getByTestId('shop-sell-ANCIENT_SHARD')).toHaveCount(0);
  const lumi = await world<number>(page, `(w) => w.getLumi()`);
  await expect(page.getByTestId('shop-sell-price-OLD_COIN')).toHaveText('売値 15 LUMI');
  await page.getByTestId('shop-sell-OLD_COIN').click();
  await expect(page.getByTestId('shop-message')).toHaveText('古びた硬貨を売った。（+15 LUMI）');
  await expect(page.getByTestId('shop-sell-held-OLD_COIN')).toHaveText('所持 1');
  await expect(page.getByTestId('shop-lumi')).toHaveText(`LUMI ${lumi + 15}`);

  // After a restart: one coin, the LUMI, the fragment, the pickups taken.
  await restart(page);
  const rows = await savedRows(page);
  expect(held(rows, 'OLD_COIN')).toBe(1);
  expect(held(rows, 'ANCIENT_SHARD')).toBe(1);
  expect(rows.lumi).toBe(lumi + 15);
  expect(rows.explorationPickups).toEqual(['ruins_pickup_004', 'ruins_pickup_001']);
});

test('the shop: 買う — LUMI down, one more held; too little LUMI says so; kept across a restart', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.spendLumi(w.getLumi())`);
  await world(page, `(w) => w.addLumi(50)`);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  // A placeholder keeper, by role only.
  await expect(page.getByTestId('shop-greeting')).toContainText('店主「');
  await expect(page.getByTestId('shop-keeper-area')).toHaveAttribute('data-keeper', 'SHOPKEEPER_PLACEHOLDER');
  // The board: 薬草, 上薬草, 魔力草, 魔力水.
  for (const [id, price] of [
    ['FOREST_HERB', 16],
    ['FINE_HERB', 40],
    ['MANA_HERB', 18],
    ['MANA_WATER', 24],
  ] as const) {
    await expect(page.getByTestId(`shop-price-${id}`)).toHaveText(`${price} LUMI`);
  }
  await expect(page.getByTestId('shop-row-OLD_ARROWHEAD')).toHaveCount(0);

  await page.getByTestId('shop-buy-FINE_HERB').click();
  await expect(page.getByTestId('shop-message')).toHaveText('上薬草を買った。');
  await expect(page.getByTestId('shop-held-FINE_HERB')).toHaveText('所持 1');
  await expect(page.getByTestId('shop-lumi')).toHaveText('LUMI 10');
  // Ten left: nothing here can be had, and each row says why.
  for (const id of ['FOREST_HERB', 'FINE_HERB', 'MANA_HERB', 'MANA_WATER']) {
    await expect(page.getByTestId(`shop-buy-${id}`)).toBeDisabled();
    await expect(page.getByTestId(`shop-why-${id}`)).toHaveText('LUMIが足りない');
  }

  await restart(page);
  const rows = await savedRows(page);
  expect(held(rows, 'FINE_HERB')).toBe(1);
  expect(rows.lumi).toBe(10);
  // And it is a thing to use: on the 回復 shelf, usable while hurt.
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-group-RECOVERY').getByTestId('bag-row-FINE_HERB')).toBeVisible();
});

test('the sell list: what is held, and nothing below nought', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.addItem('IRON_ORE', 1)`);
  await world(page, `(w) => w.addItem('MANA_SHARD', 1)`);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  await page.getByTestId('shop-tab-sell').click();
  const lumi = await world<number>(page, `(w) => w.getLumi()`);
  await page.getByTestId('shop-sell-IRON_ORE').click();
  await expect(page.getByTestId('shop-message')).toHaveText('鉄鉱石を売った。（+10 LUMI）');
  // Sold out of it: the row goes (no 「×0」).
  await expect(page.getByTestId('shop-sell-row-IRON_ORE')).toHaveCount(0);
  await page.getByTestId('shop-sell-MANA_SHARD').click();
  await expect(page.getByTestId('shop-message')).toHaveText('魔力の欠片を売った。（+30 LUMI）');
  await expect(page.getByTestId('shop-lumi')).toHaveText(`LUMI ${lumi + 40}`);
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_ORE')`)).toBe(0);
  await restart(page);
  const rows = await savedRows(page);
  expect(held(rows, 'IRON_ORE')).toBe(0);
  expect(held(rows, 'MANA_SHARD')).toBe(0);
  expect(rows.lumi).toBe(lumi + 40);
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: every pickup in the forest and the ruins can be walked to and looked into — none under a button`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await world(page, `(w) => w.recordGaldLifeChoice('SPARE')`);
    await restart(page);
    await world(page, `(w) => w.advanceSekiryugaArc('RUMOR')`);
    await world(page, `(w) => w.advanceSekiryugaArc('TOLD')`);
    for (const [door, place, leave, ids] of [
      ['forest-button', 'GREENWOOD_FOREST', 'leave-forest', ['forest_pickup_001', 'forest_pickup_002', 'forest_pickup_003']],
      ['ruins-button', 'ANCIENT_RUINS', 'leave-ruins', ['ruins_pickup_001', 'ruins_pickup_002', 'ruins_pickup_003', 'ruins_pickup_004']],
    ] as const) {
      await page.getByTestId('explore-button').click();
      await page.getByTestId(door).click();
      await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', place);
      await settled(page);
      for (const id of ids) {
        await goTo(page, id);
        const look = page.getByTestId('walk-look');
        await expect(look, id).toHaveAttribute('data-point', id);
        await expect(look).toBeInViewport();
        await expect(page.getByTestId(`walk-marker-${id}`)).toBeInViewport();
      }
      await page.getByTestId(leave).click();
      await page.getByTestId('back-to-village').click();
    }
    // Looked at, never taken: nothing written.
    expect((await savedRows(page)).explorationPickups).toBeUndefined();
  });
}
