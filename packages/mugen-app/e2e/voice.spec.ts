import { test, expect, type Page } from '@playwright/test';

/**
 * THEIR VOICES (2026-10-30 タスクD, src/platform/voice.ts): a line is heard by its id when its file is there —
 * here the debug build's stand-in (`?voice=dummy`, src/dev/voiceDummy.ts) as ケイオス's 《双極臨界》 shout — and
 * a line with no file is silence and nothing else: no error, nothing waiting on it, the fight going on.
 *
 * Every `play()` of a media element is written down from before the page loads (what, and when), and every
 * error the page throws.
 */
async function listen(page: Page) {
  await page.addInitScript(() => {
    const heard: { src: string; volume: number; at: number }[] = [];
    (window as unknown as { __heard: typeof heard }).__heard = heard;
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this instanceof HTMLAudioElement) heard.push({ src: this.src, volume: this.volume, at: performance.now() });
      return play.call(this);
    };
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return {
    errors,
    voices: () =>
      page.evaluate(() =>
        (window as unknown as { __heard: { src: string; volume: number }[] }).__heard.filter((h) => /voice-dummy|kaos_|hero_/.test(h.src)),
      ),
  };
}

async function toHerTurn(page: Page) {
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === 'kaos') return;
    await page.getByTestId('pb-cmd-defend').click();
  }
  throw new Error("never kaos's turn");
}

async function herFinisher(page: Page) {
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-soukyoku_rinkai').click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
}

test('ケイオス’s 《双極臨界》 with a voice there: heard once, as her cut-in comes in, at the voice volume', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&collapse=1&voice=dummy');
  await toHerTurn(page);
  expect(await ear.voices()).toEqual([]);
  await herFinisher(page);
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await expect.poll(async () => (await ear.voices()).length, { timeout: 3_000 }).toBe(1);
  const [said] = await ear.voices();
  expect(said.src).toContain('voice-dummy');
  // The voice's own level (platform/audio.ts: 0.8 until a setting sets it), not the music's 0.35.
  expect(said.volume).toBeCloseTo(0.8, 2);
  // The move goes on and ends as ever, and nothing is said twice.
  await expect(page.getByTestId('pb-collapse')).toHaveCount(0, { timeout: 20_000 });
  expect(await ear.voices()).toHaveLength(1);
  expect(ear.errors).toEqual([]);
});

test('with no voice delivered: the same finisher is silent — no voice asked for, no error, the fight goes on', async ({ page }) => {
  test.setTimeout(60_000);
  const ear = await listen(page);
  await page.goto('/?preview=party&collapse=1');
  await toHerTurn(page);
  await herFinisher(page);
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await expect(page.getByTestId('pb-collapse')).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
  expect(await ear.voices()).toEqual([]);
  expect(ear.errors).toEqual([]);
});
