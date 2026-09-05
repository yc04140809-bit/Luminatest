import { test, expect, type Page } from './fixtures';
import { advanceDays, enterDevAdmin, PHONES, readMemoryEvents, viewportOf } from './helpers';

/**
 * OPENING EXPERIENCE v0.1 — the title's theme, and the one control it has.
 *
 * There is no song in the slot yet, so what is proved here is mostly
 * what happens when there is nothing: no extra screen appears, nothing
 * is offered to skip, and the way into the game is the way it always
 * was. The DEV stand-in ("SKIP表示のリハーサル") puts the control on
 * screen without making a sound, so the control itself can be checked
 * on a phone-sized page.
 *
 * The rules it must not break: the opening obeys the existing BGM
 * volume, obeys its own ON/OFF, ends by exactly one route however it
 * ends, and writes nothing to the save.
 */

/** DEV stand-in: the song's length when there is no song. See openingRehearsal.ts. */
const REHEARSAL_MS = 6000;


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

/** Turn the DEV stand-in on the way a tester would, then come back to the title. */
async function rehearsalOn(page: Page) {
  await page.evaluate(() => localStorage.setItem('mugen-opening-rehearsal', 'ON'));
  await page.reload();
}

async function newGame(page: Page) {
  await page.getByTestId('start-button').click();
}

/**
 * Through the prologue to HOME, from a page already at the title, with
 * one day passed so that the world has something in it. Without that
 * there is no save, and the title offers はじめる rather than つづきから.
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
  test('adds no screen: はじめる still goes straight into the prologue', async ({ page }) => {
    await clean(page);
    await newGame(page);
    // No interstitial, no "press to continue", no title card of its own.
    await expect(page.getByTestId('prologue-monologue')).toBeVisible();
  });

  test('offers nothing to skip when there is no song', async ({ page }) => {
    await clean(page);
    await newGame(page);
    await expect(page.getByTestId('prologue-monologue')).toBeVisible();
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
  });

  test('shows SKIP only once the theme has begun, never on the title itself', async ({ page }) => {
    await clean(page);
    await rehearsalOn(page);
    // The title is before the first gesture: audio cannot have started,
    // so there is nothing to skip yet.
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
    await newGame(page);
    await expect(page.getByTestId('opening-skip')).toBeVisible();
  });

  test('SKIP takes the control away and leaves the game where it was', async ({ page }) => {
    await clean(page);
    await rehearsalOn(page);
    await newGame(page);
    const skip = page.getByTestId('opening-skip');
    await expect(skip).toBeVisible();
    await skip.click();
    await expect(skip).toHaveCount(0);
    // SKIP ends the music, not the scene: the player is still reading
    // the same page they were reading. Two exits into one, no double
    // transition.
    await expect(page.getByTestId('prologue-monologue')).toBeVisible();
  });

  test('the theme ending by itself takes the control away too', async ({ page }) => {
    await clean(page);
    await rehearsalOn(page);
    await newGame(page);
    await expect(page.getByTestId('opening-skip')).toBeVisible();
    await expect(page.getByTestId('opening-skip')).toHaveCount(0, {
      timeout: REHEARSAL_MS + 5_000,
    });
    await expect(page.getByTestId('prologue-monologue')).toBeVisible();
  });

  test('a second tap during the theme cannot start a second one', async ({ page }) => {
    await clean(page);
    await rehearsalOn(page);
    await newGame(page);
    await expect(page.getByTestId('opening-skip')).toHaveCount(1);
    await page.getByTestId('prologue-monologue').click();
    // Whatever else the player does, there is one theme and one control.
    await expect(page.getByTestId('opening-skip')).toHaveCount(1);
  });

  test('つづきから gets the theme as well', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    await rehearsalOn(page); // reload: a new run of the app, save intact
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('opening-skip')).toBeVisible();
    await expect(page.getByTestId('world-clock')).toBeVisible();
  });

  test('BGM turned off means no opening either', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    await page.getByTestId('settings-button').click();
    await page.getByTestId('bgm-volume').fill('0');
    await page.getByTestId('settings-back').click();
    await rehearsalOn(page);
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
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
    await rehearsalOn(page);
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
    // And it is still off next time the app is opened.
    await page.reload();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('opening-skip')).toHaveCount(0);
  });

  test('the theme writes nothing to the world', async ({ page }) => {
    await clean(page);
    await intoTheWorld(page);
    const before = await readMemoryEvents(page);
    await rehearsalOn(page);
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('opening-skip')).toBeVisible();
    await page.getByTestId('opening-skip').click();
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
      await rehearsalOn(page);
      await newGame(page);
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
