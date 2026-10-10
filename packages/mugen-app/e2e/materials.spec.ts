import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { goTo, settled } from './roam';

/**
 * 探索素材 → 村施設連携 Phase 1 (2026-10-10):
 *
 *   森で拾う → 持ち物で「パンの材料にもなりそうだ」→ パン屋の主人が反応（世界で 1 回）
 *   → 道具屋で売る／売れない古代の破片 → 酒場で交換
 *
 * A hint in the bag, never the answer when it is picked up; the baker's word
 * on what is carried once each, kept across a restart; the shop, the swaps
 * and the bread as they were.
 */

type DevWorld = {
  addItem(id: string, n?: number): Promise<number>;
  getItemCount(id: string): number;
  isRead(id: string): boolean;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

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

async function restart(page: Page) {
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId('world-clock').isVisible().catch(() => false)) break;
    const back = page.getByTestId('back-to-village');
    if (await back.isVisible().catch(() => false)) await back.click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function ownerTalk(page: Page): Promise<string[]> {
  await page.getByTestId('bakery-who-owner').click();
  await page.getByTestId('bakery-talk').click();
  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    seen.push((await page.getByTestId('bakery-line').textContent()) ?? '');
    const next = page.getByTestId('bakery-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  return seen;
}

test.describe.configure({ timeout: 180_000 });

test('picked up in the forest: no answer given there; in the bag, a hint — then the baker’s word on it, once', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await goTo(page, 'forest_pickup_002');
  const look = page.getByTestId('walk-look');
  await expect(look).toHaveAttribute('data-point', 'forest_pickup_002');
  await look.click();
  // The find is said as it always was — nothing about where it might be used.
  await expect(page.getByTestId('walk-got')).toHaveText('森の木の実 ×2 を手に入れた');
  expect(await world<number>(page, `(w) => w.getItemCount('FOREST_NUT')`)).toBe(2);
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();

  // The bag: the author's words, and under them a hint.
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-desc-FOREST_NUT')).toHaveText('森で拾った固い木の実。煎れば食べられるかもしれない。');
  await expect(page.getByTestId('bag-hint-FOREST_NUT')).toHaveText('パンの材料にもなりそうだ。');
  await page.getByTestId('bag-back').click();

  // The baker: his word on it, once.
  await page.getByTestId('bakery-button').click();
  expect(await ownerTalk(page)).toEqual(['「お、それは森の木の実だな。」', '「パンにも使えるぞ。うちの木の実パンも、それと同じ実だ。」']);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('talk:BAKERY_OWNER_NUT')`)).toBe(true);
  // Next time, his hint as before.
  expect(await ownerTalk(page)).toEqual(['「木の実なら、グリーンウッドの森で見つかる。」']);
  // And Lina is Lina: her first talk, untouched by what is carried.
  await page.getByTestId('bakery-who-lina').click();
  await page.getByTestId('bakery-talk').click();
  await expect(page.getByTestId('bakery-line')).toHaveText('「いらっしゃい！」');
  expect(errors).toEqual([]);
});

test('something holding magic: the baker says so once — not again after a restart; the nut and the magic each once', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.addItem('MANA_HERB', 1)`);
  await world(page, `(w) => w.addItem('FOREST_NUT', 1)`);
  await page.getByTestId('bakery-button').click();
  // Both carried: the nut first, then the magic, then his hints.
  expect((await ownerTalk(page))[0]).toBe('「お、それは森の木の実だな。」');
  expect(await ownerTalk(page)).toEqual(['「……魔力を含んだ素材を持ってるな。」', '「そういうのは、普通の生地じゃ扱いにくい。」']);
  await restart(page);
  await page.getByTestId('bakery-button').click();
  const after = await ownerTalk(page);
  expect(after).toHaveLength(1);
  expect(after[0]).not.toMatch(/木の実だな|魔力を含んだ素材を持って/);
});

test('the hints in the bag, and the ancient fragment: kept, a hint, never sold — the rest sell, and a swap still takes them', async ({ page }) => {
  await freshVillage(page);
  for (const id of ['IRON_ORE', 'OLD_COIN', 'MANA_SHARD', 'ANCIENT_SHARD']) await world(page, `(w) => w.addItem('${id}', 2)`);
  await page.getByTestId('bag-button').click();
  for (const [id, hint] of [
    ['IRON_ORE', '加工に使えそうな鉱石。'],
    ['OLD_COIN', '集めている者がいるかもしれない。'],
    ['MANA_SHARD', '微かな魔力を残している。何かに使えないだろうか。'],
    ['ANCIENT_SHARD', '用途不明。古代遺跡と関係がありそうだ。'],
  ] as const) {
    await page.getByTestId(`bag-hint-${id}`).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(`bag-hint-${id}`)).toHaveText(hint);
  }
  // A herb's use is plain: no hint.
  await page.getByTestId('bag-back').click();

  // The shop: the ore sells; the fragment does not.
  await page.getByTestId('shop-button').click();
  await page.getByTestId('shop-tab-sell').click();
  await expect(page.getByTestId('shop-sell-refused-ANCIENT_SHARD')).toHaveText('売れない');
  await expect(page.getByTestId('shop-sell-ANCIENT_SHARD')).toHaveCount(0);
  await page.getByTestId('shop-sell-IRON_ORE').click();
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_ORE')`)).toBe(1);
  await page.getByTestId('shop-leave').click();

  // The tavern, night 1: ore for a coin — and the fragment is never asked for.
  await world(page, `(w) => w.addItem('IRON_ORE', 1)`);
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-guest-talk').click();
  for (let i = 0; i < 6; i++) {
    const next = page.getByTestId('tavern-next');
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  await expect(page.getByTestId('tavern-trade')).not.toContainText('古代の破片');
  await page.getByTestId('tavern-trade-do').click();
  await expect(page.getByTestId('tavern-trade-say')).toHaveText('「助かるよ。」');
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_ORE')`)).toBe(0);
  expect(await world<number>(page, `(w) => w.getItemCount('OLD_COIN')`)).toBe(3);
  expect(await world<number>(page, `(w) => w.getItemCount('ANCIENT_SHARD')`)).toBe(2);
});

test('640×300: the bag’s hints and the baker’s word are read on screen', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await freshVillage(page);
  await world(page, `(w) => w.addItem('FOREST_NUT', 2)`);
  await page.getByTestId('bag-button').click();
  const hint = page.getByTestId('bag-hint-FOREST_NUT');
  await hint.scrollIntoViewIfNeeded();
  await expect(hint).toBeInViewport();
  await expect(page.getByTestId('bag-back')).toBeInViewport();
  await page.getByTestId('bag-back').click();
  await page.getByTestId('bakery-button').click();
  await page.getByTestId('bakery-who-owner').click();
  await page.getByTestId('bakery-talk').click();
  await expect(page.getByTestId('bakery-line')).toBeInViewport();
  await expect(page.getByTestId('bakery-next')).toBeInViewport();
});
