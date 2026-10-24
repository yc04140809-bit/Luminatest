import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { goTo, settled, things } from './roam';
import { placeButton } from './village';

/**
 * 襲撃前の日々 (作者指示 2026-10-11): 待たされ感・探索動機・噂導線 —
 *
 *   ✉ アルデン通信   an unread rumour brought to the square on coming back (or
 *                   waking), NEW; 読む opens it there; reading moves nothing.
 *   ケイオスの誘い    when nothing else is said on coming back, now and then one
 *                   word from her (DEV: only when `__mugenNudgeRoll` says so),
 *                   once a day at most, no NEW.
 *   再出現           the forest's herbs, nuts and iron grow back two days on.
 *   簡単な加工        Grave's three handworks at the tavern; the charm once, +1.
 *
 * And ハイタッチ (作者指示 2026-10-11): a first thing got, a golden find first
 * seen, a first handwork — the two of them high-five over the screen for a
 * moment, then gone.
 */

type DevWorld = {
  addItem(id: string, n?: number): Promise<number>;
  getItemCount(id: string): number;
  isRead(id: string): boolean;
  markRead(ids: string[]): Promise<boolean>;
  getIncidentPoint(): number;
  getPartyStats(): { attackMin: number; attackMax: number };
  isPickupTaken(id: string): boolean;
  advanceDays(n: number): Promise<unknown>;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const celebrated = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mugenCelebrations?: { kind: string; title: string; subtitle: string }[] }).__mugenCelebrations ?? []);

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

/** Out to the map and straight back in: a coming back. */
async function outAndBack(page: Page) {
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Every rumour read in 噂話 (so no news is waiting). */
async function readAllRumours(page: Page) {
  await page.getByTestId('rumor-button').click();
  for (let i = 0; i < 40; i++) {
    const row = page.locator('[data-testid^="rumor-"][data-new="yes"]').first();
    if ((await row.count()) === 0) break;
    // By its own id: once read it stops matching the query above, a moment after the click.
    const id = await row.getAttribute('data-testid');
    if (!id) break;
    await page.getByTestId(id).click();
    await expect(page.getByTestId(id)).toHaveAttribute('data-new', 'no');
  }
  await page.getByTestId('rumor-leave').click();
}

test.describe.configure({ timeout: 180_000 });

test('✉ アルデン通信: brought on coming back, NEW; 読む opens it there and it is read in 噂話 too — and no point moves; the next time, the next one', async ({
  page,
}) => {
  await freshVillage(page);
  // Not on the square at the start of a day without coming back.
  await expect(page.getByTestId('alden-news')).toHaveCount(0);
  await outAndBack(page);
  const card = page.getByTestId('alden-news');
  await expect(card).toBeVisible();
  await expect(page.getByTestId('alden-news-new')).toBeVisible();
  const id = (await card.getAttribute('data-rumor'))!;
  const point = await world<number>(page, `(w) => w.getIncidentPoint()`);
  await page.getByTestId('alden-news-read').click();
  await expect(page.getByTestId('alden-news-text')).toBeVisible();
  await expect(page.getByTestId('alden-news-new')).toHaveCount(0);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('rumor:${id}')`)).toBe(true);
  // 「噂を読むだけでは世界は進まない」.
  expect(await world<number>(page, `(w) => w.getIncidentPoint()`)).toBe(point);
  await page.getByTestId('alden-news-close').click();
  await expect(card).toHaveCount(0);
  // 噂話 keeps it, read.
  await page.getByTestId('rumor-button').click();
  await expect(page.getByTestId(`rumor-${id}`)).toHaveAttribute('data-new', 'no');
  await page.getByTestId('rumor-leave').click();
  // The next coming back: another (each is brought once — ignored or not).
  await outAndBack(page);
  const next = (await card.getAttribute('data-rumor'))!;
  expect(next).not.toBe(id);
  await page.getByTestId('alden-news-later').click();
  await expect(card).toHaveCount(0);
  await outAndBack(page);
  await expect(card).not.toHaveAttribute('data-rumor', next);
  // Every door of the square still there and working.
  await (await placeButton(page, 'shop-button')).click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();
});

test('the forest grows back: the herbs two days on — and Kaos says so on coming back (once a day, no NEW)', async ({
  page,
}) => {
  await freshVillage(page);
  await readAllRumours(page);
  await page.evaluate(() => ((window as unknown as { __mugenNudgeRoll?: number }).__mugenNudgeRoll = 0));
  // Into the forest: the herbs taken.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await goTo(page, 'forest_pickup_001');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-got')).toContainText(/薬草|魔力草/);
  await expect.poll(() => world<boolean>(page, `(w) => w.isPickupTaken('forest_pickup_001')`)).toBe(true);
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  // Nothing grown back yet; the purse empty — her word is that (状況別の会話, 2026-10-11), and that is the day's.
  await expect(page.getByTestId('kaos-nudge')).toHaveAttribute('data-nudge', 'POOR_1');
  while (await page.getByTestId('kaos-nudge').isVisible().catch(() => false)) await page.getByTestId('kaos-nudge-next').click();

  // Two nights on.
  await world(page, `(w) => w.advanceDays(2)`);
  await outAndBack(page);
  const nudge = page.getByTestId('kaos-nudge');
  await expect(nudge).toHaveAttribute('data-nudge', /^FOREST_/);
  await expect(page.getByTestId('talk-stage')).toBeVisible();
  // A word in passing: no NEW.
  await expect(nudge.getByText('NEW')).toHaveCount(0);
  while (await nudge.isVisible().catch(() => false)) await page.getByTestId('kaos-nudge-next').click();
  await expect(nudge).toHaveCount(0);
  // Once a day at most.
  await outAndBack(page);
  await expect(nudge).toHaveCount(0);

  // The herbs are there again.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  expect((await things(page)).some((t) => t.id === 'forest_pickup_001')).toBe(true);
  await goTo(page, 'forest_pickup_001');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-got')).toContainText(/薬草|魔力草/);
  await expect.poll(() => world<boolean>(page, `(w) => w.isPickupTaken('forest_pickup_001')`)).toBe(true);
});

test("Grave's handwork: three things, as the bag allows; the charm once, +1 on his swing — and the first of each, the two of them high-five", async ({
  page,
}) => {
  await freshVillage(page);
  await world(page, `(w) => w.markRead(['talk:GRAVE_MEETING'])`);
  await world(page, `(w) => w.addItem('IRON_ORE', 3)`);
  await world(page, `(w) => w.addItem('FOREST_HERB', 6)`);
  const attack = await world<number>(page, `(w) => w.getPartyStats().attackMin`);
  await (await placeButton(page, 'tavern-button')).click();
  await page.getByTestId('tavern-talk').click();
  await page.getByTestId('tavern-craft-open').click();
  await expect(page.getByTestId('tavern-craft-say')).toContainText('本職の鍛冶屋の真似事はできねぇが');
  // Short of mana herbs: that one cannot be asked.
  await expect(page.getByTestId('craft-CRAFT_MANA_DROP-do')).toBeDisabled();
  await expect(page.getByTestId('craft-CRAFT_MANA_DROP-needs')).toContainText('魔力草 ×2（所持 0）');

  await page.getByTestId('craft-CRAFT_IRON_CHARM-do').click();
  await expect(page.getByTestId('tavern-craft-say')).toContainText('素人仕事だが');
  const pop = page.getByTestId('celebrate-popup');
  await expect(pop).toBeVisible();
  await expect(pop).toHaveAttribute('data-kind', 'CRAFT');
  await expect(page.getByTestId('celebrate-title')).toHaveText('クラフト成功！');
  await expect(page.getByTestId('celebrate-sub')).toHaveText('鉄の腕輪を作成した');
  await expect(page.getByTestId('celebrate-art')).toBeVisible();
  // It takes no touch, and is gone in a second or two.
  await expect(pop).toHaveCSS('pointer-events', 'none');
  await expect(pop).toHaveCount(0, { timeout: 2500 });
  await expect(page.getByTestId('craft-CRAFT_IRON_CHARM-do')).toHaveText('作成済み');
  await expect(page.getByTestId('craft-CRAFT_IRON_CHARM-do')).toBeDisabled();
  expect(await world<number>(page, `(w) => w.getItemCount('IRON_CHARM')`)).toBe(1);
  expect(await world<number>(page, `(w) => w.getPartyStats().attackMin`)).toBe(attack + 1);

  // Herbs: twice, the first a moment and the second not.
  await page.getByTestId('craft-CRAFT_HERB_BUNDLE-do').click();
  await expect(pop).toHaveAttribute('data-kind', 'CRAFT');
  await expect(page.getByTestId('celebrate-sub')).toHaveText('上薬草を作成した');
  await expect(pop).toHaveCount(0, { timeout: 2500 });
  await expect(page.getByTestId('craft-CRAFT_HERB_BUNDLE-do')).toBeEnabled();
  await page.getByTestId('craft-CRAFT_HERB_BUNDLE-do').click();
  await expect(page.getByTestId('craft-CRAFT_HERB_BUNDLE-needs')).toContainText('（所持 0）');
  await page.waitForTimeout(700);
  await expect(pop).toHaveCount(0);
  expect(await world<number>(page, `(w) => w.getItemCount('FINE_HERB')`)).toBe(2);
  // Each moment asked for once: the two firsts (a first item at the same moment is folded in).
  expect((await celebrated(page)).filter((c) => c.kind === 'CRAFT').map((c) => c.subtitle)).toEqual(['鉄の腕輪を作成した', '上薬草を作成した']);
  await page.getByTestId('tavern-panel-close').click();
  await page.getByTestId('tavern-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

for (const size of [
  { width: 844, height: 390 },
  { width: 640, height: 300 },
]) {
  test(`ハイタッチ at ${size.width}×${size.height}: the first herb — a little above the middle, whole on the screen, clear of the way out; not again for the second; a golden find first seen`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await freshVillage(page);
    await page.evaluate(() => ((window as unknown as { __mugenFindGrade?: string }).__mugenFindGrade = 'RARE'));
    await page.getByTestId('explore-button').click();
    await page.getByTestId('forest-button').click();
    await settled(page);
    await goTo(page, 'forest_pickup_001');
    await page.getByTestId('walk-look').click();
    const pop = page.getByTestId('celebrate-popup');
    await expect(pop).toHaveAttribute('data-kind', 'FIRST_ITEM');
    await expect(page.getByTestId('celebrate-title')).toHaveText('初めて手に入れた！');
    await expect(page.getByTestId('celebrate-sub')).toHaveText(/^(薬草|魔力草)を入手$/);
    await expect(page.getByTestId('celebrate-art')).toBeVisible();
    // Wait out its pop-in, then measure.
    await page.waitForTimeout(300);
    const box = (await pop.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    expect(box.y + box.height).toBeLessThanOrEqual(size.height);
    // Centred, and its middle above the screen's.
    expect(Math.abs(box.x + box.width / 2 - size.width / 2)).toBeLessThan(4);
    expect(box.y + box.height / 2).toBeLessThan(size.height / 2);
    // The way out still answers through it.
    await expect(page.getByTestId('leave-forest')).toBeEnabled();
    await expect(pop).toHaveCount(0, { timeout: 2500 });
    expect((await celebrated(page)).map((c) => c.kind)).toEqual(['FIRST_ITEM']);

    // A golden find: seen the first time is 「新しい発見！」.
    await expect.poll(async () => (await things(page)).some((t) => t.kind === 'find' && t.grade === 'RARE'), { timeout: 20_000 }).toBe(true);
    const golden = (await things(page)).find((t) => t.kind === 'find' && t.grade === 'RARE')!;
    await goTo(page, golden.id);
    await page.getByTestId('walk-look').click();
    await expect(pop).toHaveAttribute('data-kind', 'DISCOVERY');
    await expect(page.getByTestId('celebrate-title')).toHaveText('新しい発見！');
    await expect(pop).toHaveCount(0, { timeout: 2500 });
    // Leaving takes anything left with it.
    await page.getByTestId('leave-forest').click();
    await expect(pop).toHaveCount(0);
  });
}
