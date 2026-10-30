import { test, expect, type Page } from '@playwright/test';

/**
 * 「また、ここで。」 BEFORE THE TITLE (2026-10-30 タスクC, src/ui/themeIntro.tsx).
 *
 * Every launch: on black the name, 『また、ここで。』 and SKIP (there from the first time); in a browser
 * 「タップで開始」 first. The song whole, then — or at SKIP — the title and its own piece, and the two pieces
 * never sounding at once. Every element that sounds is watched from before the page loads.
 */
test.use({ storageState: { cookies: [], origins: [] } });

async function listen(page: Page) {
  await page.addInitScript(() => {
    const all: HTMLAudioElement[] = [];
    const w = window as unknown as { __all: HTMLAudioElement[]; __both: boolean };
    w.__all = all;
    w.__both = false;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this instanceof HTMLAudioElement && !all.includes(this)) all.push(this);
      return play.call(this);
    };
    // Every frame: were the song and the title's piece ever both sounding?
    const tick = () => {
      const on = all.filter((a) => !a.paused && a.volume > 0).map((a) => a.src);
      if (on.some((s) => /opening/.test(s)) && on.some((s) => /title-main/.test(s))) w.__both = true;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return {
    sounding: () =>
      page.evaluate(() =>
        (window as unknown as { __all: HTMLAudioElement[] }).__all
          .filter((a) => !a.paused && a.volume > 0)
          .map((a) => (/opening/.test(a.src) ? 'THEME' : /title-main/.test(a.src) ? 'TITLE_MAIN' : a.src)),
      ),
    both: () => page.evaluate(() => (window as unknown as { __both: boolean }).__both),
  };
}

test('every launch begins on black: the name, 『また、ここで。』, SKIP from the first — and 「タップで開始」, nothing sounding yet', async ({ page }) => {
  const ear = await listen(page);
  await page.goto('/');
  const intro = page.getByTestId('theme-intro');
  await expect(intro).toBeVisible();
  await expect(intro.locator('.ti-logo')).toHaveText('MUGEN ZERO');
  await expect(page.getByTestId('theme-intro-song')).toHaveText('『また、ここで。』');
  await expect(page.getByTestId('theme-intro-skip')).toBeVisible();
  await expect(page.getByTestId('theme-intro-tap')).toHaveText('タップで開始');
  expect(await intro.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(0, 0, 0)');
  // Not the title, and nothing playing until it is touched.
  await expect(page.getByTestId('start-button')).toHaveCount(0);
  await page.waitForTimeout(800);
  expect(await ear.sounding()).toEqual([]);
});

test('tapped: the song alone; SKIP — it fades, then the title and its own piece; never the two together', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/');
  await page.getByTestId('theme-intro').click();
  await expect(page.getByTestId('theme-intro')).toHaveAttribute('data-phase', 'PLAYING');
  await expect(page.getByTestId('theme-intro-tap')).toHaveCount(0);
  await expect.poll(() => ear.sounding()).toEqual(['THEME']);
  // A while of it: still the song alone (the title's piece is held back the whole time).
  await page.waitForTimeout(1500);
  expect(await ear.sounding()).toEqual(['THEME']);
  await expect(page.getByTestId('theme-intro-skip')).toBeVisible();
  await page.getByTestId('theme-intro-skip').click();
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 3_000 });
  await expect(page.getByTestId('theme-intro')).toHaveCount(0);
  await expect.poll(() => ear.sounding(), { timeout: 5_000 }).toEqual(['TITLE_MAIN']);
  expect(await ear.both()).toBe(false);
});

test('the song played to its end goes on to the title by itself — and the next launch begins with it again', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/');
  await page.getByTestId('theme-intro').click();
  await expect.poll(() => ear.sounding()).toEqual(['THEME']);
  // Played once, never looped: its end is its end. (The whole song is four minutes; its end is sent.)
  const looped = await page.evaluate(() => {
    const song = (window as unknown as { __all: HTMLAudioElement[] }).__all.find((a) => /opening/.test(a.src))!;
    const loop = song.loop;
    song.pause();
    song.dispatchEvent(new Event('ended'));
    return loop;
  });
  expect(looped).toBe(false);
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 3_000 });
  await expect.poll(() => ear.sounding(), { timeout: 5_000 }).toEqual(['TITLE_MAIN']);
  expect(await ear.both()).toBe(false);
  // Every launch, not only the first.
  await page.reload();
  await expect(page.getByTestId('theme-intro')).toBeVisible();
  await expect(page.getByTestId('theme-intro-skip')).toBeVisible();
});

test('SKIP before the tap: straight to the title, and the title’s piece starts', async ({ page }) => {
  const ear = await listen(page);
  await page.goto('/');
  await page.getByTestId('theme-intro-skip').click();
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect.poll(() => ear.sounding(), { timeout: 5_000 }).toEqual(['TITLE_MAIN']);
  expect(await ear.both()).toBe(false);
});
