import { test, expect, type Page } from '@playwright/test';

/**
 * SCREEN SHAKE (作者「臨場感強化：汎用 SCREEN SHAKE」2026-10-17; src/ui/fx/screenShake.ts).
 *
 * Every shake goes through the Web Animations API, so this records each call
 * to `animate` (who was moved, how far, how long) from before the page loads,
 * and then asks: did the moments that should jolt, jolt — with the weight
 * they should? Did only the world move (the field and its painting, a scene's
 * picture), never the HUD or the words? And is everything back in place after?
 *
 * The suite runs with less motion (playwright.config `reducedMotion`), which
 * turns every shake off — the last test holds that. The others ask for motion.
 */

type Shake = { who: string; ms: number; xs: number[] };

async function recordShakes(page: Page) {
  await page.addInitScript(() => {
    const log: { who: string; ms: number; xs: number[] }[] = [];
    (window as unknown as { __shakes: typeof log }).__shakes = log;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const list = Array.isArray(frames) ? frames : [];
      if (list.some((f) => f && typeof f === 'object' && 'translate' in f)) {
        const el = this as HTMLElement;
        log.push({
          who: el.dataset.shakeLayer ?? el.dataset.testid ?? el.className,
          ms: typeof options === 'object' ? Number(options?.duration ?? 0) : Number(options ?? 0),
          xs: list.map((f) => Number.parseFloat(String((f as { translate?: string }).translate ?? '0'))),
        });
      }
      return animate.call(this, frames, options);
    };
  });
}
const shakes = (page: Page) => page.evaluate(() => (window as unknown as { __shakes: Shake[] }).__shakes.slice());
const clear = (page: Page) => page.evaluate(() => void ((window as unknown as { __shakes: Shake[] }).__shakes.length = 0));
/** Whether nothing is left moved: no `translate` on the element once its shake is over. */
const atRest = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const s = getComputedStyle(el);
    return (s.translate === 'none' || s.translate === '0px') && el.getAnimations().length === 0;
  });

const turnOf = async (page: Page, id: string) => {
  await expect(page.getByTestId('pb-screen')).toHaveAttribute('data-actor', id, { timeout: 15_000 });
  await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no');
};

/** Reads the finale until this line is up. */
async function readUntil(page: Page, scene: string, text: string) {
  for (let i = 0; i < 80; i++) {
    const on = page.getByTestId('finale-scene');
    if ((await on.getAttribute('data-scene')) === scene && (await page.getByTestId('finale-line').textContent())?.includes(text)) return;
    const key = `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`;
    await page.getByTestId('finale-next').click();
    await expect.poll(async () => `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`).not.toBe(key);
  }
  throw new Error(`never reached ${scene}: ${text}`);
}

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('BREAK: the field and its painting jolt (medium, after a hit-stop) — the HUD holds still — and all is back after', async ({ page }) => {
    test.setTimeout(60_000);
    await recordShakes(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&hurt=1&footing=4');
    // To Grave's turn the quickest way: each member defends.
    for (let i = 0; i < 6; i++) {
      await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
      if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === 'grave') break;
      await page.getByTestId('pb-cmd-defend').click();
    }
    await turnOf(page, 'grave');
    await clear(page);
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-goudan').click();
    await expect(page.getByTestId('pb-screen')).toHaveAttribute('data-broken', 'yes');
    await expect(page.getByTestId('pb-break-flash')).toBeVisible();
    await expect.poll(async () => (await shakes(page)).length).toBeGreaterThanOrEqual(4);
    const got = await shakes(page);
    // The field and the painting — medium (200ms), and nothing else on screen.
    expect(new Set(got.map((s) => s.who))).toEqual(new Set(['field', 'backdrop']));
    for (const s of got) {
      expect(s.ms).toBe(200);
      expect(Math.max(...s.xs.map(Math.abs))).toBeLessThanOrEqual(10);
      expect(s.xs[s.xs.length - 1]).toBe(0);
    }
    // 重撃・豪断 that breaks it (作者 2026-10-17 グレイヴ専用演出): the 重撃's own jolt as it falls, then
    // the BREAK's — two, both medium; the 豪断's large jolt gives way to the BREAK's.
    await expect.poll(async () => (await shakes(page)).filter((s) => s.who === 'field').length).toBe(2);
    await page.waitForTimeout(500);
    expect(await atRest(page, '.pb-field')).toBe(true);
    expect(await atRest(page, '.pb-bg')).toBe(true);
    for (const hud of ['.pb-top', '.pb-enemy-plate', '.pb-commands']) expect(await atRest(page, hud), hud).toBe(true);
  });

  test('AUTO at ×2: whatever jolts, nothing is left out of place, the fight is won', async ({ page }) => {
    test.setTimeout(120_000);
    await recordShakes(page);
    await page.goto('/?preview=party&hurt=1');
    await page.getByTestId('pb-speed').click();
    await page.getByTestId('pb-auto').click();
    await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 100_000 });
    const got = await shakes(page);
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((s) => s.who === 'field' || s.who === 'backdrop')).toBe(true);
    await page.waitForTimeout(500);
    expect(await atRest(page, '.pb-field')).toBe(true);
    expect(await atRest(page, '.pb-bg')).toBe(true);
  });

  test('ヴァルシール wakes by degrees: small, medium, small (the eye, the music held back), medium, then large — only the picture moves', async ({ page }) => {
    test.setTimeout(120_000);
    await recordShakes(page);
    await page.setViewportSize({ width: 640, height: 300 });
    await page.goto('/?preview=finale&from=NONE');
    await expect(page.getByTestId('finale-scene')).toBeVisible();
    await clear(page);
    const at = async (text: string) => {
      await readUntil(page, 'RUINS_SEAL', text);
      await expect.poll(async () => (await shakes(page)).length).toBeGreaterThan(0);
      const got = await shakes(page);
      await clear(page);
      expect(got.every((s) => s.who === 'backdrop'), `${text} ${JSON.stringify(got)}`).toBe(true);
      return got[0].ms;
    };
    expect(await at('装置が、赤く光った。')).toBe(140);
    expect(await at('地の底から、振動が突き上げてくる。')).toBe(200);
    expect(await at('亀裂の奥で、巨大な目が灯った。')).toBe(140);
    expect(await at('石と金の前脚が')).toBe(200);
    expect(await at('完全起動')).toBe(300);
    // The words never moved; the picture is back where its frame puts it.
    await page.waitForTimeout(500);
    expect(await atRest(page, '.finale-box')).toBe(true);
    expect(await atRest(page, '.finale-stage')).toBe(true);
  });

  test('the shell breaking: a crack (small), then it shatters (large)', async ({ page }) => {
    test.setTimeout(60_000);
    await recordShakes(page);
    await page.goto('/?preview=finale&from=FORM1_WON');
    await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'SHELL_BREAK');
    await clear(page);
    await readUntil(page, 'SHELL_BREAK', '外殻に、ひびが走る。');
    await expect.poll(async () => (await shakes(page)).map((s) => s.ms)).toEqual([140]);
    await clear(page);
    await readUntil(page, 'SHELL_BREAK', '外殻が砕け散る。');
    await expect.poll(async () => (await shakes(page)).map((s) => s.ms)).toEqual([300]);
  });
});

test('less motion asked for (as the suite runs): BREAK and the waking jolt nothing', async ({ page }) => {
  test.setTimeout(60_000);
  await recordShakes(page);
  await page.goto('/?preview=finale&from=FORM1_WON');
  await readUntil(page, 'SHELL_BREAK', '外殻が砕け散る。');
  await page.waitForTimeout(400);
  expect(await shakes(page)).toEqual([]);
});
