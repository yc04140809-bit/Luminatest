import { test, expect, keepTheSong, type Page } from './fixtures';
import { advanceDays, enterDevAdmin, PHONES, readMemoryEvents, viewportOf } from './helpers';

/**
 * OPENING THEME — the song, and the rules that govern it.
 *
 * The screen the song is OFFERED on belongs to themeChoice.spec.ts.
 * What is proved here is everything around it: that the switches in
 * SETTINGS still decide whether there is a song at all, that the one
 * control it has behaves and fits a phone, that it writes nothing to
 * the world, and that DEV ADMIN can still rehearse it.
 *
 * THE THEME MOVED, AND THAT IS WHY THIS FILE READS DIFFERENTLY THAN IT
 * DID. It used to begin on はじめる, so every test here started by
 * tapping the title. There is a screen before the title now whose whole
 * subject is that song, and the rules below are the same rules asked of
 * the place the song actually lives.
 */

/** Left on the question about the song, which is the first screen. */
test.beforeEach(async ({ page }) => {
  await keepTheSong(page);
});

async function clean(page: Page) {
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
}

/** 「スキップ」: past the question, to the title. */
async function past(page: Page) {
  await page.getByTestId('theme-choice-skip').click();
}

/** 「テーマソングを聴く」: the song, for real. */
async function listen(page: Page) {
  await page.getByTestId('theme-choice-listen').click();
}

async function newGame(page: Page) {
  await past(page);
  await page.getByTestId('start-button').click();
}

/**
 * Through the prologue to HOME, from a page on the question, with one
 * day passed so that the world has something in it. Without that there
 * is no save, and the title offers はじめる rather than つづきから.
 */
async function intoTheWorld(page: Page) {
  await newGame(page);
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await advanceDays(page, 1);
}

test.describe('OPENING THEME', () => {
  test('adds no screen to the game itself: はじめる still goes straight into the prologue', async ({
    page,
  }) => {
    await clean(page);
    await newGame(page);
    // The question is before the title, not between the title and the
    // game. No interstitial, no "press to continue", no title card.
    await expect(page.getByTestId('prologue-monologue')).toBeVisible();
  });

  test('offers nothing to skip when the song was declined', async ({ page }) => {
    await clean(page);
    await newGame(page);
    await expect(page.getByTestId('prologue-monologue')).toBeVisible();
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
  });

  test('shows SKIP only once the theme has begun, never on the question itself', async ({
    page,
  }) => {
    await clean(page);
    // Before the first gesture: audio cannot have started, so there is
    // nothing to skip yet.
    await expect(page.getByTestId('theme-choice')).toBeVisible();
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
    await listen(page);
    await expect(page.getByTestId('opening-skip')).toBeVisible();
  });

  test('SKIP ends the song, and the title is what is behind it', async ({ page }) => {
    await clean(page);
    await listen(page);
    const skip = page.getByTestId('opening-skip');
    await expect(skip).toBeVisible();
    await skip.click();
    await expect(skip).toHaveCount(0);
    // One exit, whichever way the song ends: the control goes and the
    // title arrives. No double transition, no screen left behind.
    await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 10_000 });
  });

  test('a second tap during the theme cannot start a second one', async ({ page }) => {
    await clean(page);
    await listen(page);
    await expect(page.getByTestId('opening-skip')).toHaveCount(1);
    // Tapping the screen the song is playing over changes nothing:
    // there is one theme and one control.
    await page.getByTestId('theme-choice').click();
    await expect(page.getByTestId('opening-skip')).toHaveCount(1);
  });

  /**
   * 「BGM volume = 0 の場合、LISTENを押しても音を強制再生しない」.
   *
   * THE QUESTION IS STILL ASKED. Hiding it would be the game deciding
   * what a muted player meant; the switch that decides whether to ask
   * is the one in SETTINGS called オープニングテーマ, and nothing else
   * gets a vote. What a muted slider decides is what comes OUT — which
   * is nothing — and the screen goes on to the title rather than
   * waiting for a song that will never play.
   */
  test('BGM at zero: LISTEN plays nothing and forces nothing', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    await page.getByTestId('settings-button').click();
    await page.getByTestId('bgm-volume').fill('0');
    await page.getByTestId('settings-back').click();
    await page.reload();

    // Asked, because the opening switch is still ON.
    await expect(page.getByTestId('theme-choice')).toBeVisible({ timeout: 10_000 });
    await listen(page);
    // Nothing to skip, because nothing began — and no screen left
    // waiting for a song that will never end.
    await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);

    // AND THE SLIDER IS STILL WHERE THEY LEFT IT. A button asking for
    // the song is not permission to turn the music back up.
    await page.getByTestId('continue-button').click();
    await page.getByTestId('settings-button').click();
    await expect(page.getByTestId('bgm-volume')).toHaveValue('0');
  });

  /** MASTER is over the top of BGM, so zero there is silence too. */
  test('MASTER at zero: LISTEN plays nothing either', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    await page.getByTestId('settings-button').click();
    await page.getByTestId('master-volume').fill('0');
    await page.getByTestId('settings-back').click();
    await page.reload();

    await expect(page.getByTestId('theme-choice')).toBeVisible({ timeout: 10_000 });
    await listen(page);
    await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
  });

  test('the opening switch turns it off and the setting survives a reload', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    await page.getByTestId('settings-button').click();
    const toggle = page.getByTestId('opening-toggle');
    await expect(toggle).toHaveText('ON'); // the default
    await toggle.click();
    await expect(toggle).toHaveText('OFF');
    await page.getByTestId('settings-back').click();
    await page.reload();
    // OFF means the question is never asked: straight to the title.
    await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('theme-choice')).toHaveCount(0);
    // And it is still off next time the app is opened.
    await page.reload();
    await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('theme-choice')).toHaveCount(0);
  });

  test('the theme writes nothing to the world', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    const before = await readMemoryEvents(page);
    await page.reload(); // a new run of the app, save intact
    await listen(page);
    await expect(page.getByTestId('opening-skip')).toBeVisible();
    await page.getByTestId('opening-skip').click();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    const after = await readMemoryEvents(page);
    expect(after.map((e) => e.id).sort()).toEqual(before.map((e) => e.id).sort());
  });

  test('DEV ADMIN carries the preview switch', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    await enterDevAdmin(page);
    const rehearsal = page.getByTestId('opening-rehearsal');
    await expect(rehearsal).toContainText('OFF');
    await rehearsal.click();
    await expect(rehearsal).toContainText('ON');
    await expect(page.getByTestId('opening-forget-session')).toBeVisible();
  });

  for (const phone of PHONES) {
    test(`fits and is usable on a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await clean(page);
      await listen(page);
      const skip = page.getByTestId('opening-skip');
      await expect(skip).toBeVisible();

      // Inside the page, not off the side of it, and big enough to hit.
      const box = await skip.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width);
      expect(box!.height).toBeGreaterThanOrEqual(32);

      // The control must not push the page sideways.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      await skip.click();
      await expect(skip).toHaveCount(0);
    });
  }
});
