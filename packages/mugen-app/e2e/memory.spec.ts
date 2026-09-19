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

/**
 * Meet him, beat him, spare him — and answer Kaos.
 *
 * The scene now ends with the one TIME SHIFT she ever offers.
 * 'STAY' declines it, which passes no time at all and is what every
 * test of ordinary time passage wants; 'GO' takes the three years.
 */
async function decideGald(
  page: Page,
  answer: 'SPARE' | 'KILL' | 'HELP' | 'CAPTURE' = 'SPARE',
  /** 'LOOK' takes the years and stays on the aftermath screen. */
  timeShift: 'STAY' | 'GO' | 'LOOK' = 'STAY',
) {
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
  await page.getByTestId(`choice-${answer}`).click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('time-shift-confirm').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  await expect(page.getByTestId('time-shift-confirm')).toBeVisible();
  if (timeShift === 'STAY') {
    await page.getByTestId('time-shift-stay').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    return;
  }
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 20_000 });
  // 'LOOK' leaves them standing in the aftermath, which is the only
  // place the words can be read.
  if (timeShift === 'LOOK') return;
  await page.getByTestId('time-shift-return').click();
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

  await decideGald(page, 'SPARE', 'STAY');

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
  await decideGald(page, 'SPARE', 'STAY');

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
  // DECLINED THE SHIFT ON PURPOSE. This is the ordinary-time route:
  // no TIME SHIFT anywhere in it, the world getting on with his life
  // one night at a time. It stays because the game must not require
  // the shift to reach his future.
  await decideGald(page, 'SPARE', 'STAY');

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
  await decideGald(page, 'SPARE', 'STAY');

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

test('taking the three years reaches the same life, without the ninety nights', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  // THE STORY ROUTE. Kaos offers it once, at the end of the scene in
  // which his life was decided, and this is the player saying yes.
  await decideGald(page, 'SPARE', 'GO');

  // THREE YEARS, IN THE WORLD AND NOT ONLY ON SCREEN.
  await expect(page.getByTestId('world-clock')).toHaveText(/4年目/);

  // AND STILL NOTHING IS GIVEN AWAY. The bakery exists now, but they
  // have not been to it, so his life is not theirs to read yet.
  await page.getByTestId('memory-button').click();
  // TWO, and the second is the shift itself: the player plainly knows
  // that time passed, so `WORLD_TIME_SHIFTED` is always theirs. What
  // they still do not know is what he did with those years.
  await expect(page.getByTestId('memory-count')).toHaveText('2 件');
  await expect(page.getByTestId('memory-WORLD_TIME_SHIFTED')).toBeVisible();
  await expect(page.getByTestId('memory-GALD_BECOMES_BAKER')).toHaveCount(0);
  await expect(page.getByTestId('memory-GALD_LEAVES_BANDITS')).toHaveCount(0);
  await page.getByTestId('memory-back').click();

  // The place is open, and going to it is what tells them.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('places-button').click();
  await page.getByTestId('future-site-ALDEN_BAKERY').click();
  await expect(page.getByTestId('future-site-seen')).toBeVisible();
  await page.getByTestId('future-site-done').click();
  await page.getByTestId('back-to-village').click();

  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-GALD_BECOMES_BAKER')).toBeVisible();
  await expect(page.getByTestId('memory-PLAYER_REUNITED_WITH_GALD')).toBeVisible();
});

test('she offers it once, and never again once time has moved', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE', 'GO');
  const day = await page.getByTestId('world-clock').textContent();

  // A RESTART MUST NOT REPLAY IT. The guard is the world's own
  // WORLD_TIME_SHIFTED, so it survives being closed and opened.
  await page.reload();
  await page.getByTestId('continue-button').click();
  if (await page.getByTestId('back-to-village').isVisible().catch(() => false)) {
    await page.getByTestId('back-to-village').click();
  }
  await expect(page.getByTestId('time-shift-confirm')).toHaveCount(0);
  await expect(page.getByTestId('world-clock')).toHaveText(day!);
});

test('declining costs nothing: not a day passes', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  const before = await page.getByTestId('world-clock').textContent();
  await decideGald(page, 'SPARE', 'STAY');
  // HER OFFER IS AN OFFER. Saying no leaves the world exactly where
  // it was — the fight took no time, and neither did refusing.
  await expect(page.getByTestId('world-clock')).toHaveText(before!);
});

test('the line about him moving is not said over his grave', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  // KILL. He is buried thirty days later and somebody tends the stones
  // three hundred after that — his story continues, but he does not.
  await decideGald(page, 'KILL', 'LOOK');

  // The route-neutral words are still said: time passed, and other
  // people went on living. That is true over a grave.
  await expect(page.getByTestId('time-shift-years')).toHaveText('――3年後。');
  // HE IS NOT SAID TO BE OUT THERE.
  await expect(page.getByTestId('time-shift-guidance')).toHaveCount(0);
  await expect(page.getByTestId('time-shift-done')).not.toContainText('どこかで動いてる');
});

test('and it IS said where he is alive', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE', 'LOOK');
  // The same beat, on a route where he lives, keeps the line — so the
  // KILL case above is a deliberate omission and not a broken screen.
  await expect(page.getByTestId('time-shift-guidance')).toBeVisible();
  await expect(page.getByTestId('time-shift-done')).toContainText('どこかで動いてる');
});
