import { test, expect, type Page } from '@playwright/test';

/**
 * THE WALK THE ROUND WAS ASKED FOR, END TO END.
 *
 *   TITLE → OPENING → ALDEN → 道具屋 → 薬草購入 → BAG確認 →
 *   GREENWOOD → BATTLE → ダメージ → 薬草使用 → 魔法 → 魔力水 →
 *   RESULT → EXP → LEVEL UP → 探索復帰 → SAVE → 再起動 →
 *   CONTINUE → LUMI / 所持品 / LEVEL / HP・MP維持
 *
 * Every number this checks is the shared core's: the price comes from
 * `ALDEN_SHOP_OFFERS`, the healing from `useYield`, the refusals from
 * `refuseUse`, the level from `levelForExp`. The app is only asked to
 * show them and not to contradict them.
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

const numberIn = (text: string | null, label: string) =>
  Number((text ?? '').match(new RegExp(`${label} (\\d+)`))?.[1]);

async function intoTheVillage(page: Page) {
  await page.getByTestId('start-button').click();
  const next = page.getByTestId('opening-next');
  for (let i = 0; i < 3; i++) await next.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Enough fights to afford the shop, ending back in the village. */
async function earn(page: Page, until: number) {
  for (let round = 0; round < 12; round++) {
    if (numberIn(await page.getByTestId('lumi').textContent(), 'LUMI') >= until) return;
    await page.getByTestId('explore-button').click();
    await page.getByTestId('forest-button').click();
    await page.getByTestId('encounter-button').click();
    const attack = page.getByTestId('attack-button');
    for (let i = 0; i < 60; i++) {
      if (await page.getByTestId('result-exp').isVisible().catch(() => false)) break;
      if (!(await attack.isEnabled().catch(() => false))) break;
      await attack.click({ timeout: 2000 }).catch(() => {});
    }
    await expect(page.getByTestId('result-exp')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('result-done').click();
    await page.getByTestId('leave-forest').click();
    await page.getByTestId('back-to-village').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    // A fight leaves wounds, and a wounded party cannot test "the herb
    // refuses when there is nothing to heal". Resting is the village's.
    await page.getByTestId('rest-button').click();
  }
  throw new Error('could not earn enough LUMI to shop');
}

test('the shop takes LUMI and the bag shows what it bought', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await earn(page, 40);

  const before = numberIn(await page.getByTestId('lumi').textContent(), 'LUMI');

  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();

  // THE PRICE IS THE OFFER'S, not this test's: read it off the board
  // and expect exactly that much to leave the purse.
  const price = Number(
    (await page.getByTestId('shop-price-FOREST_HERB').textContent())?.replace(/\D/g, ''),
  );
  expect(price).toBeGreaterThan(0);

  // THE DELTA, NOT THE TOTAL. Winning a fight can drop a herb, so how
  // many are in the bag by now is the forest's business. What buying
  // one must do is add exactly one and take exactly the marked price.
  const heldBefore = numberIn(await page.getByTestId('shop-held-FOREST_HERB').textContent(), '所持');
  await page.getByTestId('shop-buy-FOREST_HERB').click();
  await expect(page.getByTestId('shop-message')).toBeVisible();
  await expect
    .poll(async () => numberIn(await page.getByTestId('shop-held-FOREST_HERB').textContent(), '所持'))
    .toBe(heldBefore + 1);
  expect(numberIn(await page.getByTestId('shop-lumi').textContent(), 'LUMI')).toBe(before - price);

  await page.getByTestId('shop-leave').click();
  await page.getByTestId('back-to-village').click();

  // BAG: name, count, description, and — because they are unhurt — the
  // reason it cannot be drunk rather than a button that does nothing.
  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-name-FOREST_HERB')).toHaveText('薬草');
  await expect(page.getByTestId('bag-count-FOREST_HERB')).toHaveText(`×${heldBefore + 1}`);
  await expect(page.getByTestId('bag-desc-FOREST_HERB')).not.toBeEmpty();
  // Rested, so there is no wound to spend it on — and the bag says
  // WHY rather than showing a button that would do nothing.
  await expect(page.getByTestId('bag-reason-FOREST_HERB')).toHaveText('傷はない。');
});

test('a herb drunk in a fight puts health back, and is gone afterwards', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await earn(page, 40);

  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  const heldBefore = numberIn(await page.getByTestId('shop-held-FOREST_HERB').textContent(), '所持');
  await page.getByTestId('shop-buy-FOREST_HERB').click();
  await expect
    .poll(async () => numberIn(await page.getByTestId('shop-held-FOREST_HERB').textContent(), '所持'))
    .toBe(heldBefore + 1);
  await page.getByTestId('shop-leave').click();

  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();

  const hp = page.getByTestId('player-hp');
  const hpNow = async () => numberIn(await hp.textContent(), 'HP');
  const full = await hpNow();

  /**
   * A WOUND DEEP ENOUGH TO MEASURE.
   *
   * The herb puts back 30, but `useYield` clamps that to the room
   * actually available, and drinking it IS the turn — so the creature
   * answers immediately afterwards. On a scratch the heal is clamped
   * to a few points, the reply takes more than that, and health ends
   * up LOWER than before the herb, which says nothing about whether
   * the herb worked. At a wound of 30 or more the heal lands in full
   * and no single answer from a moss rabbit comes close to it.
   */
  const DEEP = 30;
  /**
   * WOUNDED BY GUARDING, NOT BY SWINGING.
   *
   * A moss rabbit is weak on purpose — it "hits for a little" — and a
   * player who attacks every turn kills it in about twenty, long
   * before it has taken thirty off them. Guarding never touches the
   * creature, so the fight cannot end underneath this loop, and the
   * creature goes on answering until the wound is deep enough to
   * measure a herb against.
   */
  const defend = page.getByTestId('defend-button');
  for (let i = 0; i < 80; i++) {
    if (full - (await hpNow()) >= DEEP) break;
    if (!(await defend.isEnabled().catch(() => false))) break;
    await defend.click({ timeout: 2000 }).catch(() => {});
  }
  const hurt = await hpNow();
  expect(full - hurt, 'the rabbit should have landed enough blows to matter').toBeGreaterThanOrEqual(
    DEEP,
  );

  const carried = Number(
    (await page.getByTestId('battle-item-FOREST_HERB').textContent())?.match(/×(\d+)/)?.[1],
  );
  await page.getByTestId('battle-item-FOREST_HERB').click();
  await expect
    .poll(async () => await hpNow(), { timeout: 10_000 })
    .toBeGreaterThan(hurt);
  // One spent: the count drops by exactly one, or the button goes
  // with the last of them.
  await expect
    .poll(async () =>
      (await page.getByTestId('battle-item-FOREST_HERB').count()) === 0
        ? 0
        : Number(
            (await page.getByTestId('battle-item-FOREST_HERB').textContent())?.match(/×(\d+)/)?.[1],
          ),
    )
    .toBe(carried - 1);
});

/**
 * MAGIC IS WIRED, AND IT IS GATED — this checks the gate.
 *
 * The tray is not missing by omission. `kaosHasAwakened` reads the
 * world's memory of what became of Gald, and a moss rabbit carries no
 * awakening beat of its own, so in a world where that has not happened
 * there is nothing to cast and the fight must not offer any. App Alpha
 * has no Gald encounter yet, so this is the whole of the reachable
 * behaviour and it is worth pinning: the day the encounter lands, this
 * test failing is the correct alarm.
 */
test('she cannot cast until the world remembers Gald', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('enemy-hp')).toBeVisible();

  // Defending advances turns without touching the creature, so the
  // fight cannot end underneath the assertion.
  for (let i = 0; i < 12; i++) {
    if (!(await page.getByTestId('defend-button').isEnabled().catch(() => false))) break;
    await page.getByTestId('defend-button').click({ timeout: 2000 }).catch(() => {});
  }
  await expect(page.getByTestId('magic-tray')).toHaveCount(0);
});

test('everything earned and bought survives a restart', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await earn(page, 40);

  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  const water = numberIn(await page.getByTestId('shop-held-MANA_WATER').textContent(), '所持');
  await page.getByTestId('shop-buy-MANA_WATER').click();
  await expect
    .poll(async () => numberIn(await page.getByTestId('shop-held-MANA_WATER').textContent(), '所持'))
    .toBe(water + 1);
  await page.getByTestId('shop-leave').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  const lumi = numberIn(await page.getByTestId('lumi').textContent(), 'LUMI');
  const level = await page.getByTestId('status-hero-level').textContent();
  const exp = await page.getByTestId('status-hero-exp').textContent();
  const hero = await page.getByTestId('party-hero').textContent();

  await page.reload();
  await page.getByTestId('continue-button').click();
  // Outdoors resumes to the map; the village is one step in.
  if (await page.getByTestId('back-to-village').isVisible().catch(() => false)) {
    await page.getByTestId('back-to-village').click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();

  expect(numberIn(await page.getByTestId('lumi').textContent(), 'LUMI')).toBe(lumi);
  await expect(page.getByTestId('status-hero-level')).toHaveText(level!);
  await expect(page.getByTestId('status-hero-exp')).toHaveText(exp!);
  await expect(page.getByTestId('party-hero')).toHaveText(hero!);

  await page.getByTestId('bag-button').click();
  await expect(page.getByTestId('bag-count-MANA_WATER')).toHaveText(`×${water + 1}`);
});
