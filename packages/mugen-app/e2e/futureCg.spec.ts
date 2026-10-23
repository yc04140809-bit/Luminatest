import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

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
  // SPARE (見逃す) is ROUTE D since 2026-10-20: outside the village, no
  // picture yet and no place — its own test is below.
  { choice: 'SPARE', file: '', site: '' },
  // The bakery route (TIGS2027 STEP ①): the look ahead shows him at the bakery.
  { choice: 'HELP', file: 'gald-baker', site: 'GREENWOOD_WAYSTATION' },
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
  await pastTheIntro(page);
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

test('TIME SHIFT, SPARE: no picture is borrowed — her, 「3年後」, and only that he left', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshVillage(page);
  await answerAndContinue(page, 'SPARE');
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'SEE');
  await expect(page.getByTestId('future-vision-cg')).toHaveCount(0);
  await expect(page.getByTestId('future-vision-years')).toBeVisible();
  // The list says he left the bandits; what he did with nobody watching is not narrated.
  await expect(page.getByTestId('vision-GALD_LEAVES_BANDITS')).toBeVisible();
  await expect(page.locator('[data-testid^="vision-"][data-testid*="MERCHANT"]')).toHaveCount(0);
  await expect(page.getByTestId('vision-GALD_BECOMES_BAKER')).toHaveCount(0);
  await page.getByTestId('future-vision-next').click();
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const { choice, file } of ROUTES.filter((r) => r.choice !== 'SPARE')) {
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
    // The bakery route is the picture and her line — no list of what happened.
    await expect(page.getByTestId('future-vision-list')).toHaveCount(choice === 'HELP' ? 0 : 1);
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

// HELP's place (the waystation) belonged to the road, which since the bakery
// route (OFF-SCREEN LIFE PoC, 2026-10-17) gives way once he has saved リナ:
// its look ahead shows the bakery (above, TIGS2027 STEP ①), and no place
// opens. What happens instead is offScreenLife.spec.ts; the test below holds it.
for (const { choice, file, site } of ROUTES.filter((r) => r.site && r.choice !== 'HELP')) {
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
    // A look ahead with a picture and a list (SPARE's has no picture since ROUTE D).
    await answerAndContinue(page, 'CAPTURE');
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
    for (const id of ['future-vision-years', 'vision-GALD_WORKS_FOR_ALDEN', 'future-vision-one']) {
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

test('the place, HELP: no place opens — the road gave way to the bakery route, off screen', async ({ page }) => {
  test.slow();
  await freshVillage(page);
  await answerAndContinue(page, 'HELP');
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  // Long past the day the road's place used to open (day 124).
  const after = await page.evaluate(async () => {
    const w = (window as unknown as { __mugenWorld: DevWorld }).__mugenWorld;
    for (let i = 0; i < 130; i++) await w.advanceDay();
    return { sites: w.getOpenFutureSites().length, events: w.getEvents().map((e) => e.type) };
  });
  expect(after.sites).toBe(0);
  expect(after.events).toContain('GALD_TAKES_BAKERY_WORK');
  expect(after.events).not.toContain('GALD_WALKS_THE_ROAD');
  // And the region map has no place to list.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('forest-button')).toBeVisible();
  await expect(page.getByTestId('places-button')).toHaveCount(0);
});

// TIGS2027 STEP ①: the bakery route's three years, on the exhibition tablet
// (10〜11", landscape) and on the phone sizes — the picture whole, 「3年後」 and
// her line readable beside it, no list, つづける on screen.
for (const [w, h] of [
  [1280, 800],
  [1340, 800],
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: HELP's three years — the bakery picture, the years, her line, and nothing listed`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshVillage(page);
    await answerAndContinue(page, 'HELP');
    await page.getByTestId('future-vision-next').click();
    const cg = await drawn(page, 'future-vision-cg');
    expect(cg.src).toContain('gald-baker');
    expectWhole(cg);
    await expect(page.getByTestId('future-vision-list')).toHaveCount(0);
    await expect(page.locator('[data-testid^="vision-"]')).toHaveCount(0);
    await expect(page.getByTestId('future-vision-years')).toHaveText('――3年後。');
    const next = (await page.getByTestId('future-vision-next').boundingBox())!;
    expect(next.y + next.height).toBeLessThanOrEqual(h);
    for (const id of ['future-vision-years', 'future-vision-one']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.x, id).toBeGreaterThanOrEqual(cg.right - 1);
      expect(b.y + b.height, id).toBeLessThanOrEqual(next.y + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(h);
  });
}
