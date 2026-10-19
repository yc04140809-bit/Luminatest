import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { fightUntil } from './battle';
import { placeButton } from './village';

/**
 * THE BAKERY ROUTE, PLAYED THROUGH (TIGS2027 STEP ①, 2026-10-19).
 *
 * The real path, in one piece: はじめから → the village → the forest →
 * Gald's fight → 「治療する」 → Kaos shows the three years once (the bakery
 * picture, 「3年後」, her line — nothing listed, no numbers, nothing debug) →
 * back to the moment of choosing → the nights, and the chain living on
 * where the player is not. Then the author's DEBUG view of it, and the
 * play's stopwatch, which only the DEBUG view shows.
 */

type DevWorld = {
  getEvents(): { type: string; worldDay: number }[];
  getKnownEvents(): { type: string }[];
  getClock(): { worldYear: number; worldDay: number };
  hasSeenExperience(id: string): boolean;
};
const dev = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

const ROUTE = [
  'GALD_SAVES_LINA',
  'RIZEL_TENDS_GALD',
  'GALD_TELLS_OF_ELNA',
  'RIZEL_OFFERS_TO_SEE_ELNA',
  'VILLAGE_HEARS_OF_GALD',
  'RIZEL_SPEAKS_FOR_GALD',
  'BAKER_OFFERS_WORK',
  'GALD_TAKES_BAKERY_WORK',
  'LINA_WRITES_TO_ELNA',
];

/** Nothing of the author's tools on a play screen. */
async function noDebugOnScreen(page: Page) {
  await expect(page.locator('[data-testid^="debug-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="chain-"]')).toHaveCount(0);
  // No inner names or numbers either.
  const text = (await page.locator('body').innerText()) ?? '';
  expect(text).not.toMatch(/GALD_|RIZEL_|BLOOM|SEED|GROWING|DORMANT|\d\.\d\d/);
}

async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    try {
      window.localStorage.clear();
    } catch {
      /* none */
    }
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

test('はじめから to the three years and back: the bakery route, once, and then lived', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 844, height: 390 });
  await freshApp(page);

  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await noDebugOnScreen(page);

  // The forest, Gald, his fight.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });

  // 1. The answer, written and locked.
  await page.getByTestId('choice-HELP').click();
  await expect(page.getByTestId('choice-result')).toHaveAttribute('data-choice', 'HELP');
  expect(await dev<string[]>(page, `(w) => w.getEvents().map((e) => e.type)`)).toEqual(['PLAYER_HELPED_GALD']);
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }

  // 7. Kaos shows it, once: the picture, the years, her line.
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'ASK');
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'SEE');
  const cg = page.getByTestId('future-vision-cg');
  await expect.poll(() => cg.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  expect(decodeURIComponent(await cg.evaluate((i: HTMLImageElement) => i.currentSrc || i.src))).toContain('gald-baker');
  await expect(page.getByTestId('future-vision-years')).toHaveText('――3年後。');
  await expect(page.getByTestId('future-vision-list')).toHaveCount(0);
  await noDebugOnScreen(page);
  // Looking wrote nothing.
  expect(await dev<string[]>(page, `(w) => w.getEvents().map((e) => e.type)`)).toEqual(['PLAYER_HELPED_GALD']);

  // 8. Back to the moment they chose.
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'BACK');
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect(await dev<{ worldYear: number; worldDay: number }>(page, `(w) => w.getClock()`)).toEqual({ worldYear: 1, worldDay: 1 });
  expect(await dev<boolean>(page, `(w) => w.hasSeenExperience('evt_kaos_future_vision')`)).toBe(true);
  // Nowhere to open it again.
  await expect(page.getByTestId('time-shift-button')).toHaveCount(0);
  await noDebugOnScreen(page);

  // The play's stopwatch has all four marks, in order (nobody sees it in play).
  const times = await page.evaluate(() => JSON.parse(window.localStorage.getItem('mugen.playClock') ?? '{}'));
  expect(times.START).toBeLessThanOrEqual(times.CHOICE);
  expect(times.CHOICE).toBeLessThanOrEqual(times.VISION);
  expect(times.VISION).toBeLessThanOrEqual(times.BACK);

  // 3. The nights: their lives go on, and the player is told nothing.
  for (let n = 0; n < 5; n++) {
    const button = await placeButton(page, 'rest-button');
    const day = await page.getByTestId('world-clock').textContent();
    await button.click();
    await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
    await expect(button).toBeEnabled({ timeout: 10_000 });
  }
  const lived = await dev<string[]>(page, `(w) => w.getEvents().map((e) => e.type)`);
  expect(lived.filter((t) => ROUTE.includes(t))).toEqual(ROUTE);
  expect(await dev<string[]>(page, `(w) => w.getKnownEvents().map((e) => e.type)`)).toEqual(['PLAYER_HELPED_GALD']);

  // 2. A reload keeps it all; the vision is not owed again.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('future-vision')).toHaveCount(0);
  // The save hands back one day's events in its own order; what holds is
  // that every step is there, once, each still caused by the one before.
  const reopened = await dev<{ type: string; causedBy?: string[] }[]>(
    page,
    `(w) => w.getEvents().map((e) => ({ type: e.type, causedBy: e.causedBy }))`,
  );
  const steps = reopened.filter((e) => ROUTE.includes(e.type));
  expect(steps.map((e) => e.type).sort()).toEqual([...ROUTE].sort());
  for (const e of steps) {
    const i = ROUTE.indexOf(e.type);
    expect(e.causedBy, e.type).toEqual([i === 0 ? 'PLAYER_HELPED_GALD' : ROUTE[i - 1]]);
  }
  expect(errors).toEqual([]);

  // The author's view (DEBUG builds): the chain as lived, and the stopwatch.
  await page.goto('/?tool=chain');
  await expect(page.getByTestId('chain-panel')).toBeVisible();
  await expect(page.getByTestId('chain-panel-choice')).toHaveText('HELP');
  for (const code of [
    'GARDO_SAVED_LINA',
    'RIZEL_VIEW_CHANGED',
    'ELNA_CONTEXT_DISCOVERED',
    'RIZEL_HELP_OPPORTUNITY',
    'VILLAGE_VIEW_CHANGED',
    'GUARD_RELATION_CHANGED',
    'BAKERY_OPPORTUNITY',
    'GARDO_BAKERY_BLOOM',
  ]) {
    await expect(page.getByTestId(`chain-truth-${code}`)).toBeVisible();
  }
  await expect(page.getByTestId('chain-panel-times')).toContainText(/TIME SHIFT まで \d+:\d\d/);
});

test('the DEBUG chain view, before the nights: what the next step waits for, and the three years ahead', async ({ page }) => {
  await freshApp(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await page.evaluate(async () => {
    await (window as unknown as { __mugenWorld: { recordGaldLifeChoice(c: string): Promise<unknown> } }).__mugenWorld.recordGaldLifeChoice('HELP');
  });
  await page.goto('/?tool=chain');
  await expect(page.getByTestId('chain-panel')).toBeVisible();
  await expect(page.getByTestId('chain-next')).toContainText('GALD_SAVES_LINA');
  await expect(page.getByTestId('chain-next')).toContainText('GALD_REDEMPTION');
  await expect(page.getByTestId('chain-future-GARDO_BAKERY_BLOOM')).toBeVisible();
  await expect(page.getByTestId('chain-panel-future-gald')).toHaveText('ALDEN_VILLAGE / BAKERY_HAND');
  // Reading it wrote nothing.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
});
