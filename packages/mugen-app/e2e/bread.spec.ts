import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * パン屋 MVP (2026-10-09):
 *
 *   パン屋 → [リナ] 買う → 持ち物「パン」→ 食べる → 休息で期限が減る → 期限切れ
 *
 * Lina sells; the owner hints; the two talks never mix and the shop opens on
 * Lina every time. A loaf bought is in the bag with its nights, LUMI down;
 * a short purse buys nothing and she says so. Eating heals, gives one lift
 * (a second replaces the first), spends one. A night's rest ages each loaf
 * and ends the lift; a stale loaf stays in the bag, 【期限切れ】, uneaten.
 * All of it is kept across a restart.
 */

type DevWorld = {
  addLumi(n: number): Promise<number>;
  spendLumi(n: number): Promise<boolean>;
  getLumi(): number;
  getItemCount(id: string): number;
  setBattleCondition(c: { hp: number; mp: number }): Promise<void>;
  getBattleCondition(): { hp: number; mp: number };
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

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

async function withLumi(page: Page, n: number) {
  await world(page, `(w) => w.spendLumi(w.getLumi())`);
  await world(page, `(w) => w.addLumi(${n})`);
}

async function readTalk(page: Page): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < 12; i++) {
    seen.push((await page.getByTestId('bakery-line').textContent()) ?? '');
    const next = page.getByTestId('bakery-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  return seen;
}

async function rest(page: Page) {
  const button = page.getByTestId('rest-button');
  const day = await page.getByTestId('world-clock').textContent();
  await button.click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(button).toBeEnabled({ timeout: 10_000 });
}

test('the switch: Lina by default, the owner, back to Lina — their talks never mixed, and Lina again on the way back in', async ({
  page,
}) => {
  await freshVillage(page);
  await page.getByTestId('bakery-button').click();
  await expect(page.getByTestId('bakery-who-lina')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('bakery-who-owner')).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByTestId('bakery-buy')).toBeVisible();

  // Lina, the first time: the author's lines, the hero's own name in them.
  await page.getByTestId('bakery-talk').click();
  const first = await readTalk(page);
  expect(first).toEqual([
    '「いらっしゃい！」',
    '「今日も焼きたてだよ！」',
    '「いい匂いだな。」',
    '「でしょ？」',
    '「ちゃんと旅にも持っていけるよ！」',
    '「ちゃんと？」',
    '「……ちゃんと！」',
    '「今ちょっと不安になったぞ。」',
  ]);

  // The owner: a hint about makings, and only his words.
  await page.getByTestId('bakery-who-owner').click();
  await expect(page.getByTestId('bakery-who-owner')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('bakery-buy')).toHaveCount(0);
  // Said as him, standing there — and Lina's tab as the shop.
  await expect(page.getByTestId('bakery-description')).toHaveText('パン屋の主人。素材や焼き方に詳しい。');
  await page.getByTestId('bakery-talk').click();
  await expect(page.locator('.bakery-words .speaker')).toHaveText('パン屋の主人');
  const owner = await readTalk(page);
  expect(owner).toEqual(['「木の実なら、グリーンウッドの森で見つかる。」']);

  // Back to Lina: one short line now — the first talk is not replayed.
  await page.getByTestId('bakery-who-lina').click();
  await expect(page.getByTestId('bakery-description')).toHaveText('リナの父が営むパン屋。焼きたてのパンの匂いがする。');
  await page.getByTestId('bakery-talk').click();
  await expect(page.locator('.bakery-words .speaker')).toHaveText('リナ');
  const again = await readTalk(page);
  expect(again).toHaveLength(1);
  expect(again[0]).not.toBe('「いらっしゃい！」');

  // Out and in again: Lina, without being asked; still not the first talk, after a restart too.
  await page.getByTestId('bakery-who-owner').click();
  await page.getByTestId('bakery-leave').click();
  await restart(page);
  await page.getByTestId('bakery-button').click();
  await expect(page.getByTestId('bakery-who-lina')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('bakery-talk').click();
  expect(await readTalk(page)).toHaveLength(1);
  // Nothing about Gald, anywhere in the shop.
  await expect(page.getByTestId('bakery-screen')).not.toContainText('ガルド');
});

test('buying: the four loaves, LUMI down, one more held, its nights — a short purse says so — kept across a restart', async ({
  page,
}) => {
  await freshVillage(page);
  await withLumi(page, 30);
  await page.getByTestId('bakery-button').click();
  await page.getByTestId('bakery-buy').click();
  await expect(page.getByTestId('bakery-lumi')).toHaveText('LUMI 30');
  for (const [id, price, effect, keeps] of [
    ['FRESH_BREAD', 18, 'HP+20／防御 +5%', 2],
    ['FOREST_NUT_BREAD', 22, 'HP+20／素早さ +5%', 2],
    ['MANA_BREAD', 26, 'HP+15／魔力 +5%', 2],
    ['TRAVELER_HARDTACK', 24, 'HP+20／最大HP +5%', 4],
  ] as const) {
    await expect(page.getByTestId(`bakery-price-${id}`)).toHaveText(`${price} LUMI`);
    await expect(page.getByTestId(`bakery-effect-${id}`)).toHaveText(effect);
    await expect(page.getByTestId(`bakery-keeps-${id}`)).toHaveText(`休息${keeps}回もつ`);
    await expect(page.getByTestId(`bakery-held-${id}`)).toHaveText('所持 0');
  }

  await page.getByTestId('bakery-buy-FRESH_BREAD').click();
  await expect(page.getByTestId('bakery-say')).toHaveText('リナ「まいどあり！」');
  await expect(page.getByTestId('bakery-held-FRESH_BREAD')).toHaveText('所持 1');
  await expect(page.getByTestId('bakery-lumi')).toHaveText('LUMI 12');

  // Twelve left: not enough for any of them, and she says so; nothing changes.
  await page.getByTestId('bakery-buy-MANA_BREAD').click();
  await expect(page.getByTestId('bakery-say')).toHaveText('リナ「あ……LUMIがちょっと足りないみたい。」');
  await expect(page.getByTestId('bakery-why-MANA_BREAD')).toHaveText('LUMIが足りない');
  await expect(page.getByTestId('bakery-held-MANA_BREAD')).toHaveText('所持 0');
  await expect(page.getByTestId('bakery-lumi')).toHaveText('LUMI 12');

  await restart(page);
  const rows = await savedRows(page);
  expect(held(rows, 'FRESH_BREAD')).toBe(1);
  expect(held(rows, 'MANA_BREAD')).toBe(0);
  expect(rows.lumi).toBe(12);
  expect(rows.breadFreshness).toEqual({ FRESH_BREAD: [2] });
});

test('eating: health back, the lift, one fewer — a second loaf replaces the lift — kept across a restart', async ({
  page,
}) => {
  await freshVillage(page);
  await withLumi(page, 100);
  await page.getByTestId('bakery-button').click();
  await page.getByTestId('bakery-buy').click();
  await page.getByTestId('bakery-buy-FRESH_BREAD').click();
  await expect(page.getByTestId('bakery-held-FRESH_BREAD')).toHaveText('所持 1');
  await page.getByTestId('bakery-buy-FRESH_BREAD').click();
  await expect(page.getByTestId('bakery-held-FRESH_BREAD')).toHaveText('所持 2');
  await page.getByTestId('bakery-buy-MANA_BREAD').click();
  await expect(page.getByTestId('bakery-held-MANA_BREAD')).toHaveText('所持 1');
  await page.getByTestId('bakery-buy-close').click();
  await page.getByTestId('bakery-leave').click();

  // Hurt a little, so the health has somewhere to go.
  const hp = await world<number>(page, `(w) => w.getBattleCondition().hp`);
  await world(page, `(w) => w.setBattleCondition({ hp: ${hp - 40}, mp: w.getBattleCondition().mp })`);

  await page.getByTestId('bag-button').click();
  const shelf = page.getByTestId('bag-group-BREAD');
  await expect(shelf).toBeVisible();
  await expect(shelf.getByTestId('bag-row-FRESH_BREAD')).toBeVisible();
  await expect(page.getByTestId('bag-fresh-FRESH_BREAD')).toHaveText('あと休息2回');
  await expect(page.getByTestId('bag-bread-buff')).toHaveText('パンの効果：なし');

  await page.getByTestId('bag-eat-FRESH_BREAD').click();
  await expect(page.getByTestId('bag-message')).toHaveText(
    '焼きたてパンを食べた。まだほんのり温かい。HPが20回復した。防御 +5%（次の休息まで）',
  );
  await expect(page.getByTestId('bag-count-FRESH_BREAD')).toHaveText('×1');
  await expect(page.getByTestId('bag-bread-buff')).toHaveText('パンの効果：防御 +5%（次の休息まで）');
  expect(await world<number>(page, `(w) => w.getBattleCondition().hp`)).toBe(hp - 20);

  // A second loaf: its lift in place of the first, never both.
  await page.getByTestId('bag-eat-MANA_BREAD').click();
  await expect(page.getByTestId('bag-bread-buff')).toHaveText('パンの効果：魔力 +5%（次の休息まで）');
  await expect(page.getByTestId('bag-row-MANA_BREAD')).toHaveCount(0);

  await restart(page);
  const rows = await savedRows(page);
  expect(held(rows, 'FRESH_BREAD')).toBe(1);
  expect(held(rows, 'MANA_BREAD')).toBe(0);
  expect(rows.breadBuff).toEqual({ itemId: 'MANA_BREAD', buffType: 'MAGIC', buffValue: 0.05 });
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-bread-buff')).toHaveText('パンの効果：魔力 +5%（次の休息まで）');
});

test('keeping: set when bought, one fewer each rest, stale at nought — kept but not eaten — and across a restart', async ({
  page,
}) => {
  await freshVillage(page);
  await withLumi(page, 100);
  await page.getByTestId('bakery-button').click();
  await page.getByTestId('bakery-buy').click();
  await page.getByTestId('bakery-buy-FRESH_BREAD').click();
  await expect(page.getByTestId('bakery-held-FRESH_BREAD')).toHaveText('所持 1');
  await page.getByTestId('bakery-buy-TRAVELER_HARDTACK').click();
  await expect(page.getByTestId('bakery-held-TRAVELER_HARDTACK')).toHaveText('所持 1');
  await page.getByTestId('bakery-buy-close').click();
  await page.getByTestId('bakery-leave').click();
  // A lift, to see the night end it.
  await page.getByTestId('bag-button').click();
  await page.getByTestId('bag-eat-TRAVELER_HARDTACK').click();
  await expect(page.getByTestId('bag-bread-buff')).toHaveText('パンの効果：最大HP +5%（次の休息まで）');
  await page.getByTestId('bag-back').click();

  await rest(page);
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-fresh-FRESH_BREAD')).toHaveText('あと休息1回');
  await expect(page.getByTestId('bag-bread-buff')).toHaveText('パンの効果：なし');
  await page.getByTestId('bag-back').click();

  await rest(page);
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-fresh-FRESH_BREAD')).toHaveText('【期限切れ】×1');
  await expect(page.getByTestId('bag-eat-FRESH_BREAD')).toHaveCount(0);
  await expect(page.getByTestId('bag-reason-FRESH_BREAD')).toHaveText('期限切れで食べられない。');
  await expect(page.getByTestId('bag-count-FRESH_BREAD')).toHaveText('×1');

  await restart(page);
  expect((await savedRows(page)).breadFreshness).toEqual({ FRESH_BREAD: [0] });
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-fresh-FRESH_BREAD')).toHaveText('【期限切れ】×1');
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: the switch, the four loaves and the way back all on screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await page.getByTestId('bakery-button').click();
    for (const id of ['bakery-who-lina', 'bakery-who-owner', 'bakery-talk', 'bakery-buy', 'bakery-leave']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(h);
    }
    await page.getByTestId('bakery-buy').click();
    const close = (await page.getByTestId('bakery-buy-close').boundingBox())!;
    expect(close.y + close.height).toBeLessThanOrEqual(h);
    expect(close.y).toBeGreaterThanOrEqual(0);
    for (const id of ['FRESH_BREAD', 'FOREST_NUT_BREAD', 'MANA_BREAD', 'TRAVELER_HARDTACK']) {
      await page.getByTestId(`bakery-buy-${id}`).scrollIntoViewIfNeeded();
      const b = (await page.getByTestId(`bakery-buy-${id}`).boundingBox())!;
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, id).toBeLessThanOrEqual(h);
    }
  });
}
