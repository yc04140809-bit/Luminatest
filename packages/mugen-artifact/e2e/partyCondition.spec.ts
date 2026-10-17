import { test, expect, type Page } from './fixtures';
import { RING_TAPS, enterDevAdmin, ontoTheMap, readWorldStateValue, swingUntil } from './helpers';

/**
 * A WOUND THAT IS A FACT ABOUT A PERSON.
 *
 * The line this round completes, walked in a real browser: a fight
 * costs something, HOME says so without opening anything, the next
 * fight starts from it, a herb closes it, and all of it is still true
 * after the tab has been backgrounded and after the game has been shut
 * and opened again.
 */

async function freshWorld(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
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
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/**
 * A forest fight, ready to walk into.
 *
 * THE PRESET IS A RESET, so everything this hands out — a wound, a
 * herb — is handed out AFTER it. Setting up first and presetting
 * second wipes the setup, which is exactly how two of these tests
 * first failed.
 */
async function armAForestFight(
  page: Page,
  { herbs = 0, hurt = false, oneBlow = false } = {},
) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('battle-ui-PROTOTYPE').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('force-chaos-NONE').click();
  await page.getByTestId('force-enemy-ATTACK').click();
  // A CREATURE ALREADY ON ITS LAST LEGS, for the tests that need to
  // measure one thing without a dozen more turns of the fight adding
  // to it. `force-enemy-none` does NOT make a creature harmless — it
  // only stops FORCING what it does, and the dice still swing — so
  // the way to keep a fight short is to make it nearly over.
  if (oneBlow) await page.getByTestId('battle-start-finishable').click();
  for (let i = 0; i < herbs; i++) await page.getByTestId('dev-give-FOREST_HERB').click();
  if (hurt) await page.getByTestId('dev-hurt-party').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('home-memory')).toBeVisible();
}

async function walkIntoAFight(page: Page) {
  await ontoTheMap(page);
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2000);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const fighting = () =>
    page
      .getByTestId('bp-commands')
      .isVisible()
      .catch(() => false);
  for (let pass = 0; pass < 3 && !(await fighting()); pass++) {
    for (const at of RING_TAPS) {
      if (await fighting()) break;
      await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
      for (let i = 0; i < 14; i++) {
        await page.waitForTimeout(180);
        if (await fighting()) break;
      }
    }
  }
  await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 40_000 });
}

/** Wins the fight and walks back out to the forest path. */
async function winAndLeave(page: Page) {
  const result = page.getByTestId('battle-result');
  await swingUntil(page, 'bp-attack', () => result.isVisible().catch(() => false));
  await expect(result).toBeVisible({ timeout: 40_000 });
  await page.getByTestId('result-done').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
}

const numbersIn = (text: string) =>
  [...text.matchAll(/(\d+)\/(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
const homeHero = async (page: Page) =>
  numbersIn((await page.getByTestId('home-party-hero').textContent()) ?? '');
const battleHp = async (page: Page) =>
  Number(((await page.getByTestId('bp-player-hp').textContent()) ?? '').match(/(\d+)/)?.[1]);

test('a fight costs something, and HOME says so without opening anything', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);

  // Whole to begin with, and both of them are named.
  await expect(page.getByTestId('home-party-hero')).toContainText('あなた');
  await expect(page.getByTestId('home-party-kaos')).toContainText('ケイオス');
  const [[fullHp, maxHp]] = await homeHero(page);
  expect(fullHp).toBe(maxHp);

  await armAForestFight(page);
  await walkIntoAFight(page);
  await winAndLeave(page);
  await page.getByTestId('leave-forest').click();
  await page.getByRole('button', { name: 'もどる' }).click();

  const [[hurt, stillMax]] = await homeHero(page);
  expect(hurt, 'the creature got some blows in, and they lasted').toBeLessThan(stillMax);

  // AND THE NEXT FIGHT STARTS THERE. This is the half that makes the
  // other half mean anything.
  await walkIntoAFight(page);
  expect(await battleHp(page), 'no free heal between fights').toBe(hurt);
});

test('the wound survives being backgrounded, and being shut down entirely', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  await armAForestFight(page);
  await walkIntoAFight(page);
  await winAndLeave(page);
  await page.getByTestId('leave-forest').click();
  await page.getByRole('button', { name: 'もどる' }).click();
  const [[hurt]] = await homeHero(page);

  // Backgrounded, and back.
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await homeHero(page))[0][0]).toBe(hurt);

  // Shut down entirely, and opened again on 「つづきから」.
  await page.reload();
  await page.getByTestId('continue-button').click({ timeout: 20_000 });
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
  expect((await homeHero(page))[0][0], 'still exactly as hurt').toBe(hurt);

  const saved = (await readWorldStateValue(page, 'party_condition')) as Record<
    string,
    { hp: number; mp: number }
  >;
  expect(saved.hero.hp, 'and the save says the same').toBe(hurt);
  expect(saved.kaos, 'kept per character, never one shared number').toBeTruthy();
});

test('a herb used in a fight is still healed when the fight is over', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  // WOUNDED BEFORE THE FIGHT, and a creature that cannot add to it.
  // The thing under test is the herb surviving the battle boundary,
  // so nothing else may touch the number in between — swinging a
  // dozen times at a creature that hits back would eat the healing
  // and the test would fail for the wrong reason.
  await armAForestFight(page, { herbs: 1, hurt: true, oneBlow: true });
  const [[hurt]] = await homeHero(page);
  await walkIntoAFight(page);
  expect(await battleHp(page), 'walked in carrying it').toBe(hurt);

  await page.getByTestId('bp-item').click();
  await page.getByTestId('bp-item-FOREST_HERB').click();
  await expect.poll(() => battleHp(page), { timeout: 20_000 }).toBeGreaterThan(hurt);
  const healed = await battleHp(page);

  await winAndLeave(page);
  await page.getByTestId('leave-forest').click();
  await page.getByRole('button', { name: 'もどる' }).click();

  // WHAT THE HERB DID IS STILL DONE. A fight that healed in its own
  // state and handed back the unhealed number would be the one bug
  // this test exists for.
  //
  // Compared against the WOUND rather than against the healed number:
  // the creature still gets its turn after the herb and one more
  // before it falls, and a blow is worth at most seven against thirty
  // of healing. Asserting the exact figure would be asserting the
  // dice.
  const [[after]] = await homeHero(page);
  expect(after, 'the healing came out of the fight with them').toBeGreaterThan(hurt);
  // AND NO CEILING IS ASSERTED HERE, because winning is also a level:
  // the bar grows and the gap is carried up with it, so the number at
  // HOME can legitimately be higher than the one the fight ended on.
  // That is two rules meeting, and both of them have their own tests.
  expect(healed).toBeGreaterThan(hurt);
});

test('a night’s rest puts everybody back, for nothing', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  await armAForestFight(page);
  await walkIntoAFight(page);
  await winAndLeave(page);
  await page.getByTestId('leave-forest').click();
  await page.getByRole('button', { name: 'もどる' }).click();
  const [[hurt, max]] = await homeHero(page);
  expect(hurt).toBeLessThan(max);

  await page.getByTestId('rest-button').click();
  await expect
    .poll(async () => (await homeHero(page))[0][0], { timeout: 20_000 })
    .toBe(max);
});

test('levelling gives a longer bar with the same gap in it', async ({ page }) => {
  test.setTimeout(300_000);
  await freshWorld(page);
  // HURT AFTER THE PRESET, because the preset is a reset: setting up
  // first and presetting second wipes the setup.
  await armAForestFight(page, { hurt: true, oneBlow: true });
  const [[hurt, max]] = await homeHero(page);
  const gap = max - hurt;
  expect(gap).toBeGreaterThan(0);

  await walkIntoAFight(page);
  await winAndLeave(page);
  await page.getByTestId('leave-forest').click();
  await page.getByRole('button', { name: 'もどる' }).click();

  const [[nowHp, nowMax]] = await homeHero(page);
  expect(nowMax, 'the first victory is a level, so the bar grew').toBeGreaterThan(max);
  // NOT AN EXACT GAP. The creature swings on its way down and how
  // hard is the dice's business, so the gap here is the wound plus
  // whatever the fight added. What this proves is the thing that
  // could actually regress: a level did NOT quietly fill the bar. The
  // arithmetic itself — 70 of 100 becoming 78 of 108, to the number —
  // is unit-tested three ways, on the rule, through grantExp and
  // through a fight's winnings.
  expect(nowHp, 'levelling did not silently heal anybody').toBeLessThan(nowMax);
  expect(nowMax - nowHp, 'and the wound is still at least the wound').toBeGreaterThanOrEqual(gap);
});
