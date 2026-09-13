import { test, expect, type Page } from './fixtures';
import { keepTheSong } from './fixtures';

/**
 * BEFORE THE TITLE: the song, or straight on.
 *
 * The first screen anybody sees, and the first thing anybody TOUCHES —
 * which is the other half of what it is for. A phone makes no sound
 * until the player has done something, and every workaround for that
 * is worse than simply having the first screen be a thing to do.
 *
 * Every other spec in this suite is carried past this screen by the
 * shared fixture; this one asks to be left on it.
 */
const REGISTER = `
  window.__bgm = [];
  const RealAudio = window.Audio;
  window.Audio = function (src) {
    const el = new RealAudio(src);
    el.__src = src; el.__started = false; el.__stopped = false;
    const play = el.play.bind(el);
    el.play = () => { el.__started = true; return play().catch(() => {}); };
    const pause = el.pause.bind(el);
    el.pause = () => { el.__stopped = true; return pause(); };
    window.__bgm.push(el);
    return el;
  };
  window.Audio.prototype = RealAudio.prototype;
`;

async function sounding(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    ((window as unknown as { __bgm: Record<string, unknown>[] }).__bgm ?? [])
      .filter((a) => a.__started && !a.__stopped && Number(a.volume) > 0)
      .map((a) => String(a.__src ?? '').split('/').pop()!.replace(/-[\w-]{8}\.mp3$/, '.mp3')),
  );
}

test.beforeEach(async ({ page }) => {
  await keepTheSong(page);
  await page.addInitScript(REGISTER);
});

test('it is the first screen, and it is silent', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('theme-choice')).toBeVisible();
  // Nothing has sounded, because nothing has been touched. That is the
  // whole reason this screen is here.
  expect(await sounding(page)).toEqual([]);
  // And the title is behind it, not in front of it.
  await expect(page.getByTestId('start-button')).toHaveCount(0);
});

test('both answers are thumb-sized and both lead to the title', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await page.goto('/');
  for (const id of ['theme-choice-listen', 'theme-choice-skip']) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(b.height, `${id} is thumb-sized`).toBeGreaterThanOrEqual(44);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(801);
    expect(b.y + b.height).toBeLessThanOrEqual(361);
  }
  await page.getByTestId('theme-choice-skip').click();
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 10_000 });
});

/**
 * スキップ: 「Opening Themeを再生せず、Title Screenへ即遷移」. Not
 * started, and nothing left sounding behind it — which is the half
 * that is worth a test, because "it was never started" and "it was
 * started and then stopped" look the same from the title.
 */
test('SKIP plays nothing at all, and leaves nothing playing', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('theme-choice-skip').click();
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1600); // past the beat of quiet, had there been one
  expect(await sounding(page)).toEqual([]);
});

/**
 * 聴く: the song plays, the screen says so, and the game's own SKIP is
 * there to leave it early — one control, laid over every screen, not a
 * second one of its own.
 */
test('LISTEN plays the theme, and offers a way out of it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('theme-choice-listen').click();

  await expect(page.getByTestId('theme-choice-now')).toBeVisible({ timeout: 5_000 });
  expect(await sounding(page)).toEqual(['opening.mp3']);
  // Still the choice screen: the title comes after the song.
  await expect(page.getByTestId('start-button')).toHaveCount(0);

  const skip = page.getByTestId('opening-skip');
  await expect(skip).toBeVisible({ timeout: 5_000 });
  await skip.click();

  // And that is the way to the title — with the song gone, not merely
  // quieter, and with the title left silent behind it.
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1200);
  expect(await sounding(page)).toEqual([]);
});

/** One song. A second tap on 聴く is not a second copy of it. */
test('tapping LISTEN twice is tapping it once', async ({ page }) => {
  await page.goto('/');
  const listen = page.getByTestId('theme-choice-listen');
  await listen.click();
  await listen.click({ timeout: 1_000 }).catch(() => {});
  await page.waitForTimeout(600);
  expect(await sounding(page)).toEqual(['opening.mp3']);
});
