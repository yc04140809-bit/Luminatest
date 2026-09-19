import { test, expect, type Page } from '@playwright/test';

/**
 * WHAT THE PLAYER CAN SAY THEY KNOW, AND WHEN.
 *
 * The round's real subject is a filter, not a list. `getKnownEvents`
 * hides everything tagged with Gald and not with the player, so after
 * the four answers WORLD MEMORY holds exactly one line — their own
 * decision — while the world quietly gets on with the rest of his life
 * off screen. Going to the place their choice led to is the single
 * moment that changes, and these tests walk both sides of it.
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

async function intoTheVillage(page: Page) {
  await page.getByTestId('start-button').click();
  const next = page.getByTestId('opening-next');
  for (let i = 0; i < 3; i++) await next.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Meet him, beat him, and spare him — ending back in the village. */
async function spareGald(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('enemy-hp').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  const attack = page.getByTestId('attack-button');
  for (let i = 0; i < 200; i++) {
    if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
    if (await page.getByTestId('awakening-done').isVisible().catch(() => false)) {
      await page.getByTestId('awakening-done').click();
      continue;
    }
    if (!(await attack.isEnabled().catch(() => false))) break;
    await attack.click({ timeout: 2000 }).catch(() => {});
  }
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('choice-SPARE').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('world-clock').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Sleep until the world has had time to get on with it. */
async function restUntilDay(page: Page, day: number) {
  const rest = page.getByTestId('rest-button');
  const dayNow = async () =>
    Number((await page.getByTestId('world-clock').textContent())?.match(/(\d+)日目/)?.[1] ?? 0);
  for (let i = 0; i < 200 && (await dayNow()) < day; i++) {
    await rest.click();
    // The button shuts while the night passes, which is also what
    // makes this loop safe to run flat out.
    await expect(rest).toBeEnabled({ timeout: 10_000 });
  }
  expect(await dayNow()).toBeGreaterThanOrEqual(day);
}

test('a decision is remembered, with the fields a record needs', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);

  // Before anything happens there is nothing to know.
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-empty')).toBeVisible();
  await page.getByTestId('memory-back').click();

  await spareGald(page);

  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-count')).toHaveText('1 件');
  const row = page.getByTestId('memory-PLAYER_SPARED_GALD');
  await expect(row).toBeVisible();
  // The sentence is content's, not this screen's.
  await expect(page.getByTestId('memory-label-PLAYER_SPARED_GALD')).toHaveText('森の盗賊を見逃した');
  await expect(page.getByTestId('memory-when-PLAYER_SPARED_GALD')).toHaveText('1年目 1日目');
  await expect(page.getByTestId('memory-where-PLAYER_SPARED_GALD')).toHaveText('GREENWOOD_FOREST');
  await expect(page.getByTestId('memory-who-PLAYER_SPARED_GALD')).toHaveText('PLAYER, GALD');
  await expect(page.getByTestId('memory-weight-PLAYER_SPARED_GALD')).toHaveText('MAJOR');
});

test('the archive holds one chapter and admits there is more', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await spareGald(page);

  await page.getByTestId('archive-button').click();
  // HE IS STILL 「盗賊」 — a man they fought, not a man they know. The
  // NAME is the signal, and it lives on the entry rather than in the
  // chapters: a chapter titled 「森の盗賊」 would match either way, so
  // asserting on the detail body would pass for the wrong reason.
  await expect(page.getByTestId('archive-entry-GALD')).toContainText('盗賊');
  await expect(page.getByTestId('archive-entry-GALD')).toContainText('1章');
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail')).toBeVisible();
  // AND THE CARD THAT MUST NOT LEAK. The world has already decided
  // what becomes of him; this says only that the player has not seen it.
  await expect(page.getByTestId('archive-unknown')).toHaveText('まだ知らない人生がある。');
});

test('going to the place is what turns his life into something known', async ({ page }) => {
  test.slow();
  await freshApp(page);
  await intoTheVillage(page);
  await spareGald(page);

  // THE WORLD GETS ON WITH IT OFF SCREEN. He leaves the bandits on day
  // 4, reaches Alden on 34 and is baking by 94 — none of which the
  // player knows, because none of it happened in front of them.
  await restUntilDay(page, 94);

  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-count'), 'still only their own decision').toHaveText('1 件');
  await page.getByTestId('memory-back').click();

  // The map now has somewhere worth going.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('places-button').click();
  await page.getByTestId('future-site-ALDEN_BAKERY').click();
  await expect(page.getByTestId('future-site-seen')).toBeVisible();
  await page.getByTestId('future-site-done').click();
  await page.getByTestId('back-to-village').click();

  // And now the whole chain is his life as they know it.
  await page.getByTestId('memory-button').click();
  for (const type of [
    'PLAYER_SPARED_GALD',
    'GALD_LEAVES_BANDITS',
    'GALD_ARRIVES_IN_ALDEN',
    'GALD_BECOMES_BAKER',
    'PLAYER_REUNITED_WITH_GALD',
  ]) {
    await expect(page.getByTestId(`memory-${type}`), type).toBeVisible();
  }
  await expect(page.getByTestId('memory-label-GALD_BECOMES_BAKER')).toHaveText(
    '男は、パン屋として生き始めた',
  );
  await page.getByTestId('memory-back').click();

  // The archive fills in with him, and stops saying it does not know.
  await page.getByTestId('archive-button').click();
  // He has a name now, and five chapters instead of one.
  await expect(page.getByTestId('archive-entry-GALD')).toContainText('ガルド');
  await expect(page.getByTestId('archive-entry-GALD')).toContainText('5章');
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-unknown')).toHaveCount(0);

  // SURVIVES A RESTART, which is the whole reason it is a record.
  await page.reload();
  await page.getByTestId('continue-button').click();
  if (await page.getByTestId('back-to-village').isVisible().catch(() => false)) {
    await page.getByTestId('back-to-village').click();
  }
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-GALD_BECOMES_BAKER')).toBeVisible();
  await expect(page.getByTestId('memory-PLAYER_REUNITED_WITH_GALD')).toBeVisible();
});

test('nights counted through the UI are never lost or doubled', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await spareGald(page);

  /**
   * THE CLOCK IS THE ASSERTION.
   *
   * `advanceDay` reads the clock, works out tomorrow and commits, so
   * two of them in flight together used to come out one day older
   * instead of two — and on a day when a life event fell due the
   * second commit was refused outright. The world serialises them now,
   * and the App also shuts the button while a night passes, so this
   * walks the real UI as fast as it will go and checks the arithmetic
   * survives it.
   */
  const rest = page.getByTestId('rest-button');
  const dayNow = async () =>
    Number((await page.getByTestId('world-clock').textContent())?.match(/(\d+)日目/)?.[1] ?? 0);

  expect(await dayNow()).toBe(1);
  for (let i = 0; i < 10; i++) {
    await rest.click();
    await expect(rest).toBeEnabled({ timeout: 10_000 });
  }
  expect(await dayNow(), 'ten nights are ten days').toBe(11);

  // Day 4 fell inside that run, so he left the bandits during it —
  // once, and still not in front of the player.
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-count'), 'his leaving is not theirs to know').toHaveText(
    '1 件',
  );
  await expect(page.getByTestId('memory-GALD_LEAVES_BANDITS')).toHaveCount(0);
});
