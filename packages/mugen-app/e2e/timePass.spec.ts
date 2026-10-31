import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * 時が流れる (2026-10-31 タスクH, src/ui/timePass): a rest is dark, a clock whose hands run round while the sky
 * moves on, the date turning over, then the village on the new day — about 1.6s. A tap is the end of it at once.
 * Three nights in a row are three clocks, each whole. The rest of the suite rests without it (a dev cookie);
 * here the clock is kept.
 */
test.use({
  storageState: {
    cookies: [{ name: 'mugen_dev_theme_intro', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }],
    origins: [],
  },
});

async function freshVillage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
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
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

const dayOf = async (page: Page) => Number((await page.getByTestId('world-clock').innerText()).match(/(\d+)日目/)![1]);

/** What the clock showed, frame by frame, from the tap on 休息する until it was gone. */
async function watchARest(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __tp: { t: number; step: string | null; day: string | null; opacity: number; top: string | null; text: string; behind: string }[] };
    w.__tp = [];
    const t0 = performance.now();
    const look = () => {
      const el = document.querySelector<HTMLElement>('[data-testid="time-pass"]');
      const date = el?.querySelector<HTMLElement>('[data-testid="time-pass-date"]');
      // What is uppermost at the middle and at the corners: the clock's, or the screen behind it.
      const points = [
        [innerWidth / 2, innerHeight / 2],
        [8, 8],
        [innerWidth - 8, innerHeight - 8],
      ];
      const over = el && points.every(([x, y]) => el.contains(document.elementFromPoint(x, y)));
      w.__tp.push({
        t: performance.now() - t0,
        step: el?.dataset.step ?? null,
        day: date?.dataset.day ?? null,
        opacity: el ? Number(getComputedStyle(el).opacity) : 0,
        top: el ? (over ? 'CLOCK' : 'BEHIND') : null,
        text: el?.innerText.replace(/\s+/g, '') ?? '',
        behind: document.querySelector('[data-testid="world-clock"]')?.textContent ?? '',
      });
      if (performance.now() - t0 < 4000) requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}
const seen = (page: Page) =>
  page.evaluate(() => (window as unknown as { __tp: { t: number; step: string | null; day: string | null; opacity: number; top: string | null; text: string; behind: string }[] }).__tp);

test('休息: dark, the clock, the date turning over, then the village on the new day — about 1.6s, nothing else on it', async ({ page }) => {
  await freshVillage(page);
  const before = await dayOf(page);
  const rest = await placeButton(page, 'rest-button');
  await watchARest(page);
  await rest.click();
  await expect(page.getByTestId('time-pass')).toBeVisible();
  await expect(page.getByTestId('time-pass')).toBeHidden({ timeout: 4000 });
  await page.waitForTimeout(1500);
  const frames = await seen(page);
  const on = frames.filter((f) => f.step !== null);
  // About 1.6s from first to last (the night kept well within it on a dev server).
  const span = on.at(-1)!.t - on[0].t;
  expect(span).toBeGreaterThan(1350);
  expect(span).toBeLessThan(2300);
  // The day before until the hands stop, then the next; never anything but the date on it.
  expect(on[0].day).toBe(String(before));
  expect(on.at(-1)!.day).toBe(String(before + 1));
  expect(new Set(on.map((f) => f.step))).toEqual(new Set(['0', '1']));
  for (const f of on) expect(f.text).toMatch(/^\d+年目\d+日目$/);
  // The village behind is not seen moving on first: still the day before while it can be seen going dark.
  const dark = on.slice(0, on.findIndex((f) => f.opacity >= 1));
  expect(dark.length).toBeGreaterThan(0);
  for (const f of dark) expect(f.behind).toContain(`${before}日目`);
  // Over the whole screen while it is up (the corners too).
  expect(on.filter((f) => f.top === 'CLOCK').length).toBeGreaterThan(on.length * 0.8);
  // Dark coming in, light going out.
  expect(on[0].opacity).toBeLessThan(0.6);
  expect(Math.max(...on.map((f) => f.opacity))).toBe(1);
  // And the village, on the new day.
  expect(await dayOf(page)).toBe(before + 1);
  await expect(page.getByTestId('village-screen')).toBeVisible();
});

test('a tap is the end of it at once: the new date, and the village', async ({ page }) => {
  await freshVillage(page);
  const before = await dayOf(page);
  await (await placeButton(page, 'rest-button')).click();
  const clock = page.getByTestId('time-pass');
  await expect(clock).toBeVisible();
  await page.waitForTimeout(400);
  const tapped = Date.now();
  await page.mouse.click(422, 195);
  await expect(clock).toBeHidden({ timeout: 1000 });
  expect(Date.now() - tapped).toBeLessThan(700);
  expect(await dayOf(page)).toBe(before + 1);
  // The tap went no further than the clock: the village as it was, and 休息する there to be used again.
  await expect(page.getByTestId('village-screen')).toBeVisible();
  await expect(page.getByTestId('rest-button')).toBeEnabled();
  // A tap while it is still going dark: the same — the night kept, and the village on the new day.
  await page.getByTestId('rest-button').click();
  await expect(clock).toBeVisible();
  await page.mouse.click(422, 195);
  await expect(clock).toBeHidden({ timeout: 1500 });
  expect(await dayOf(page)).toBe(before + 2);
  await expect(page.getByTestId('rest-button')).toBeEnabled();
});

test('three nights in a row: three clocks, each whole, and three days on', async ({ page }) => {
  await freshVillage(page);
  const before = await dayOf(page);
  for (let n = 1; n <= 3; n++) {
    const rest = await placeButton(page, 'rest-button');
    await expect(rest).toBeEnabled();
    await rest.click();
    const clock = page.getByTestId('time-pass');
    await expect(clock).toBeVisible();
    await expect(page.getByTestId('time-pass-date')).toHaveAttribute('data-day', String(before + n), { timeout: 2000 });
    await expect(clock).toBeHidden({ timeout: 4000 });
    expect(await dayOf(page)).toBe(before + n);
    await expect(page.locator('[data-testid="time-pass"]')).toHaveCount(0);
  }
});
