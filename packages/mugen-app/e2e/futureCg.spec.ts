import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * GALD'S FUTURES, IN PICTURES — in the App as in the Artifact.
 *
 *   TIME SHIFT   ONE picture: the future of the answer the player gave,
 *                and no other. No list, no choosing, once.
 *   The place    its own picture, once the player has walked in.
 *
 * Each route is set through the development handle on the world
 * (`__mugenWorld`, DEV builds only — the same door the equipment test
 * uses) rather than by fighting Gald four times: what is under test is
 * which picture each route shows, and the fight to the four answers is
 * covered by `gald.spec.ts` and `regression.spec.ts`.
 */

type Route = 'SPARE' | 'HELP' | 'CAPTURE' | 'KILL';
const ROUTES: { choice: Route; file: string; site: string }[] = [
  { choice: 'SPARE', file: 'gald-baker', site: 'ALDEN_BAKERY' },
  { choice: 'HELP', file: 'gald-healer', site: 'GREENWOOD_WAYSTATION' },
  { choice: 'CAPTURE', file: 'gald-worker', site: 'ALDEN_WORKYARD' },
  { choice: 'KILL', file: 'event-gald-grave', site: 'GREENWOOD_GRAVE' },
];

async function freshVillage(page: Page) {
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
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceDay(): Promise<unknown>;
  getOpenFutureSites(): unknown[];
  getKnownEvents(): { type: string }[];
  getEvents(): { type: string }[];
};

/** The answer, given to the world directly; then つづきから, where the owed look is shown. */
async function answerAndContinue(page: Page, choice: Route) {
  await page.evaluate(async (c) => {
    await (window as unknown as { __mugenWorld: DevWorld }).__mugenWorld.recordGaldLifeChoice(c);
  }, choice);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'ASK');
}

/** Where an <img> is drawn, and whether it is the whole picture at its own shape. */
async function drawn(page: Page, testId: string) {
  const img = page.getByTestId(testId);
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  return img.evaluate((i: HTMLImageElement) => {
    const r = i.getBoundingClientRect();
    return {
      src: decodeURIComponent(i.currentSrc || i.src),
      fit: getComputedStyle(i).objectFit,
      ratio: r.width / r.height,
      naturalRatio: i.naturalWidth / i.naturalHeight,
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
}

function expectWhole(d: Awaited<ReturnType<typeof drawn>>) {
  expect(d.fit).toBe('contain');
  expect(Math.abs(d.ratio - d.naturalRatio) / d.naturalRatio).toBeLessThan(0.01);
  expect(d.left).toBeGreaterThanOrEqual(0);
  expect(d.top).toBeGreaterThanOrEqual(0);
  expect(d.right).toBeLessThanOrEqual(d.vw);
  expect(d.bottom).toBeLessThanOrEqual(d.vh);
}

for (const { choice, file } of ROUTES) {
  test(`TIME SHIFT, ${choice}: one picture — ${file} — and no other, and WORLD MEMORY untouched`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await freshVillage(page);
    await answerAndContinue(page, choice);
    const known = await page.evaluate(() =>
      (window as unknown as { __mugenWorld: DevWorld }).__mugenWorld.getKnownEvents().map((e) => e.type),
    );

    // She asks — her, not a picture yet.
    await expect(page.getByTestId('future-vision-cg')).toHaveCount(0);
    await page.getByTestId('future-vision-next').click();

    // She shows: exactly one picture, the chosen route's.
    await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'SEE');
    await expect(page.getByTestId('future-vision-cg')).toHaveCount(1);
    const cg = await drawn(page, 'future-vision-cg');
    expect(cg.src).toContain(file);
    expectWhole(cg);
    expect(await page.locator('img[data-testid$="-cg"]').count()).toBe(1);
    // The words beside it are on screen and clear of it.
    for (const id of ['future-vision-years', 'future-vision-one', 'future-vision-next']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.x, id).toBeGreaterThanOrEqual(cg.right - 1);
      expect(b.y + b.height, id).toBeLessThanOrEqual(cg.vh);
    }

    // She brings them back; the picture goes with the vision.
    await page.getByTestId('future-vision-next').click();
    await expect(page.getByTestId('future-vision-cg')).toHaveCount(0);
    await page.getByTestId('future-vision-done').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();

    // WORLD MEMORY is what it was: the look wrote nothing the player knows.
    expect(
      await page.evaluate(() =>
        (window as unknown as { __mugenWorld: DevWorld }).__mugenWorld.getKnownEvents().map((e) => e.type),
      ),
    ).toEqual(known);

    // AND IT IS NOT A FEATURE: never again, and nowhere to open it from.
    await expect(page.getByTestId('time-shift-button')).toHaveCount(0);
    await page.reload();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();
    await expect(page.getByTestId('future-vision')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const { choice, file, site } of ROUTES) {
  test(`the place, ${choice}: ${site} shows ${file} once the player is inside`, async ({ page }) => {
    test.slow();
    await freshVillage(page);
    await answerAndContinue(page, choice);
    for (let i = 0; i < 4; i++) {
      if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
      await page.getByTestId('future-vision-next').click();
    }
    await page.getByTestId('future-vision-done').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();

    // The world gets on with his life, off screen, until the place exists.
    await page.evaluate(async () => {
      const w = (window as unknown as { __mugenWorld: DevWorld }).__mugenWorld;
      for (let i = 0; i < 2000 && w.getOpenFutureSites().length === 0; i++) await w.advanceDay();
    });

    await page.getByTestId('explore-button').click();
    await page.getByTestId('places-button').click();
    // On the list it is still 「？？？」, and there is no picture.
    await expect(page.getByTestId(`future-site-${site}`)).toHaveText('？？？');
    // The bakery's card is the App's own line — the shared content (the
    // Artifact's) calls it a new shop in an empty unit, and is unchanged.
    if (site === 'ALDEN_BAKERY') {
      await expect(page.getByTestId(`future-site-about-${site}`)).toHaveText(
        'リナの父が営むパン屋。近ごろ、店の奥が少し賑やかになったらしい。',
      );
    }
    await expect(page.getByTestId('future-site-cg')).toHaveCount(0);

    await page.getByTestId(`future-site-${site}`).click();
    await expect(page.getByTestId('future-site-seen')).toHaveAttribute('data-site', site);
    const cg = await drawn(page, 'future-site-cg');
    expect(cg.src).toContain(file);
    expectWhole(cg);
    const words = (await page.getByTestId('future-site-description').boundingBox())!;
    expect(words.x).toBeGreaterThanOrEqual(cg.right - 1);
    await expect(page.getByTestId('future-site-description')).toBeVisible();

    await page.getByTestId('future-site-done').click();
    await expect(page.getByTestId('places-button')).toBeVisible();
  });
}

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: the look ahead's picture is whole, つづける on screen, the words readable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await answerAndContinue(page, 'SPARE');
    await page.getByTestId('future-vision-next').click();
    const cg = await drawn(page, 'future-vision-cg');
    expectWhole(cg);
    // Not shrunk to make room: the picture keeps the screen's height.
    expect(cg.bottom - cg.top).toBeGreaterThanOrEqual(h * 0.88);

    // つづける is on screen as it stands — nothing scrolled — and the page
    // itself does not scroll.
    const next = (await page.getByTestId('future-vision-next').boundingBox())!;
    expect(next.y).toBeGreaterThanOrEqual(0);
    expect(next.y + next.height).toBeLessThanOrEqual(h);
    expect(next.x).toBeGreaterThanOrEqual(cg.right - 1);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(h);

    // Every line can be read: where it is, or scrolled to inside its own
    // column — and scrolling it never moves the button.
    for (const id of ['future-vision-years', 'vision-GALD_BECOMES_BAKER', 'future-vision-one']) {
      await page.getByTestId(id).scrollIntoViewIfNeeded();
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.x, id).toBeGreaterThanOrEqual(cg.right - 1);
      expect(b.y, id).toBeGreaterThanOrEqual(0);
      expect(b.y + b.height, id).toBeLessThanOrEqual(next.y + 1);
    }
    expect(await page.getByTestId('future-vision-next').boundingBox()).toEqual(next);
    await page.getByTestId('future-vision-next').click();
    await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'BACK');
  });
}
