import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

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
  await throughTheOpening(page);
  // Naming sits between the opening and the village now. Taking the
  // default keeps every test in this file about what it was about.
  await page.getByTestId('naming-default').click();
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
  /** 'LOOK' stops inside the vision, where its words can be read. */
  vision: 'CLOSE' | 'LOOK' = 'CLOSE',
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
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  // The scene ends in the one look ahead. There is no longer anything
  // to accept or decline — the decision was the four answers, and this
  // is Kaos showing where it goes.
  await expect(page.getByTestId('future-vision')).toBeVisible();
  // She asks, she shows, she brings them back. 'LOOK' stops on the
  // middle beat, where the three years themselves are on screen.
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'SEE');
  if (vision === 'LOOK') return;
  await page.getByTestId('future-vision-next').click();
  await page.getByTestId('future-vision-done').click();
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

  await decideGald(page, 'SPARE');

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
  await decideGald(page, 'SPARE');

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
  await decideGald(page, 'SPARE');

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
  await decideGald(page, 'SPARE');

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

test('the look ahead costs the world nothing', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  const before = await page.getByTestId('world-clock').textContent();
  await decideGald(page, 'SPARE');

  // NOT A DAY PASSED. She showed them three years; the world stayed
  // where it was, which is the whole of the new design.
  await expect(page.getByTestId('world-clock')).toHaveText(before!);

  // AND NOTHING SHE SHOWED WAS WRITTEN DOWN. Their own decision is the
  // only thing the world remembers — no shift, and none of his future.
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-count')).toHaveText('1 件');
  await expect(page.getByTestId('memory-PLAYER_SPARED_GALD')).toBeVisible();
  await expect(page.getByTestId('memory-WORLD_TIME_SHIFTED')).toHaveCount(0);
  await expect(page.getByTestId('memory-GALD_BECOMES_BAKER')).toHaveCount(0);
  await expect(page.getByTestId('memory-GALD_LEAVES_BANDITS')).toHaveCount(0);
  await page.getByTestId('memory-back').click();

  // The bakery is still years away, because those years did not happen.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('places-button')).toHaveCount(0);
});

test('what she shows is the route the player chose', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE', 'LOOK');
  // His life on THIS route, in the words WORLD MEMORY would use if it
  // ever did happen.
  await expect(page.getByTestId('vision-GALD_LEAVES_BANDITS')).toBeVisible();
  await expect(page.getByTestId('vision-GALD_BECOMES_BAKER')).toBeVisible();
  await expect(page.getByTestId('future-vision-list')).toContainText('パン屋として生き始めた');
  // And not another route's.
  await expect(page.getByTestId('vision-GALD_IS_BURIED')).toHaveCount(0);
});

test('an unfinished look is owed again after a restart', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  // Stop INSIDE the vision and close the app — the case that used to
  // lose the scene entirely.
  await decideGald(page, 'SPARE', 'LOOK');
  await page.reload();
  await page.getByTestId('continue-button').click();

  // It comes back — from its first beat, since it was never finished
  // — and the four answers are NOT asked again.
  await expect(page.getByTestId('future-vision')).toBeVisible();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'ASK');
  await expect(page.getByTestId('life-choice-screen')).toHaveCount(0);

  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

test('and once finished it never returns', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE');
  const day = await page.getByTestId('world-clock').textContent();

  await page.reload();
  await page.getByTestId('continue-button').click();
  if (await page.getByTestId('back-to-village').isVisible().catch(() => false)) {
    await page.getByTestId('back-to-village').click();
  }
  await expect(page.getByTestId('future-vision')).toHaveCount(0);
  await expect(page.getByTestId('world-clock')).toHaveText(day!);
});

test('the line about him moving is not said over his grave', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  // KILL. His story continues — somebody tends the stones — but he
  // does not.
  await decideGald(page, 'KILL', 'LOOK');

  await expect(page.getByTestId('future-vision-years')).toHaveText('――3年後。');
  // What she shows is the grave and the flowers left on it.
  await expect(page.getByTestId('vision-GALD_IS_BURIED')).toBeVisible();
  await expect(page.getByTestId('vision-GALD_GRAVE_TENDED')).toBeVisible();
  // AND NOTHING SAYS HE IS STILL OUT THERE. Not a living occupation,
  // not a reunion, not a word about him moving.
  const shown = page.getByTestId('future-vision');
  for (const alive of ['パン屋', '救護所', '作業場', '動いてる', '再会']) {
    await expect(shown, alive).not.toContainText(alive);
  }
  await expect(page.getByTestId('vision-GALD_BECOMES_BAKER')).toHaveCount(0);
});

test('and it IS said where he is alive', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE', 'LOOK');
  // The same beat on a route where he lives shows a life being lived,
  // so the KILL case above is a difference in his future and not a
  // broken screen.
  await expect(page.getByTestId('vision-GALD_BECOMES_BAKER')).toBeVisible();
  await expect(page.getByTestId('future-vision')).toContainText('パン屋');
  await expect(page.getByTestId('vision-GALD_IS_BURIED')).toHaveCount(0);
});

test('she says it is one future, and will not say why it cannot be retaken', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE', 'LOOK');
  // ONE future, not the future.
  await expect(page.getByTestId('future-vision-one')).toContainText('ひとつの未来');

  await page.getByTestId('future-vision-next').click();
  const back = page.getByTestId('future-vision-return');
  await expect(back).toContainText('あなたが決めた直後に戻してあげたよ');
  await expect(back).toContainText('それぞれの3年間があるから');
  await expect(back).toContainText('やり直せないよ');
  // The reason is hers, and this scene does not give it away.
  await expect(back).toContainText('またいずれ知ることになる');
});

test('no ordinary screen can reach a TIME SHIFT', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await decideGald(page, 'SPARE');

  // The village, the map and the forest, after the one look is spent.
  await expect(page.getByTestId('time-shift-button')).toHaveCount(0);
  await expect(page.getByTestId('future-vision')).toHaveCount(0);
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('time-shift-button')).toHaveCount(0);
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('time-shift-button')).toHaveCount(0);
  // And he is not on the path again either.
  await expect(page.getByTestId('gald-button')).toHaveCount(0);
});
