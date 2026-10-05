import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * グリーンウッドの森, WALKED — the App's exploration template, first place.
 *
 * Right to left, stop to stop: the party walking its own frames, the
 * painting sliding behind it with the nearer layers sliding faster,
 * things along the way to look at, short lines noticed, something alive
 * in the place — and the forest's own two doors, to a fight and to the
 * man in the road, exactly where they were. Walking, stopping and
 * looking write nothing.
 *
 * Seen only on a device: how the motion FEELS (smoothness, the step's
 * rhythm), sound once forest SE exist, and the parallax by eye.
 */

async function freshApp(page: Page) {
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
}

async function intoTheVillage(page: Page) {
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toBeVisible();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-walking', 'no');
}

const scene = (page: Page) => page.getByTestId('walk-scene');

async function heroX(page: Page) {
  const b = (await page.getByTestId('walk-hero').boundingBox())!;
  return b.x + b.width / 2;
}

async function shiftOf(page: Page, selector: string) {
  return page.evaluate(
    (sel) => new DOMMatrixReadOnly(getComputedStyle(document.querySelector(sel)!).transform).m41,
    selector,
  );
}

/** One step to the left, sampling the hero's frame while he walks. */
async function stepLeft(page: Page) {
  const frames = new Set<string>();
  await page.getByTestId('walk-forward').click();
  for (let i = 0; i < 40; i++) {
    frames.add((await page.getByTestId('walk-hero').getAttribute('data-frame')) ?? '');
    if ((await scene(page).getAttribute('data-walking')) === 'no') break;
    await page.waitForTimeout(60);
  }
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  return frames;
}

async function everythingSaved(page: Page) {
  return page.evaluate(async () => {
    const out: Record<string, Record<string, unknown[]>> = {};
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(info.name!);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      out[info.name] = {};
      for (const store of Array.from(db.objectStoreNames)) {
        out[info.name][store] = await new Promise<unknown[]>((resolve, reject) => {
          const req = db.transaction(store).objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      db.close();
    }
    return { idb: out, local: { ...localStorage } };
  });
}

// The suite runs with reduced motion asked for (playwright.config.ts); the
// walk honours that, so the test about motion asks for the ordinary kind.
test.describe('in motion', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('the party comes in from the right, walks left on its own frames, the layers sliding at their own depths', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await freshApp(page);
    await intoTheVillage(page);
    await page.getByTestId('explore-button').click();
    // Watched from inside the page, frame by frame: a test's own polling
    // backs off too far to see a walk that takes under a second.
    await page.evaluate(() => {
      const w = window as unknown as { __walkIn: number[] };
      w.__walkIn = [];
      const t0 = performance.now();
      const tick = () => {
        const hero = document.querySelector('[data-testid="walk-hero"]');
        const r = hero?.getBoundingClientRect();
        if (r && r.width > 0) w.__walkIn.push(r.x + r.width / 2);
        if (performance.now() - t0 < 4000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByTestId('forest-button').click();
    await expect(scene(page)).toBeVisible();

    // Walking IN from the right edge: from the moment he is there to be
    // seen until he stops, he only ever moves left.
    await expect
      .poll(() => page.getByTestId('walk-hero').count(), { intervals: [100], timeout: 15_000 })
      .toBe(1);
    await expect(scene(page)).toHaveAttribute('data-walking', 'no');
    const arrived = await heroX(page);
    const path = await page.evaluate(() => (window as unknown as { __walkIn: number[] }).__walkIn);
    expect(path.length, 'seen walking in').toBeGreaterThan(10);
    expect(path[0], 'came in from the right').toBeGreaterThan(arrived + 50);
    for (let i = 1; i < path.length; i++)
      expect(path[i], 'never back to the right').toBeLessThanOrEqual(path[i - 1] + 0.5);
    await expect(page.getByTestId('walk-kaos')).toBeVisible();
    await expect
      .poll(() => page.getByTestId('walk-painting').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
      .toBe(true);

    // Something noticed on arrival.
    await expect(page.getByTestId('walk-caption')).not.toBeEmpty();
    // Something alive in the place: at least one ambient touch, and the figure on the road.
    const ambient = ((await scene(page).getAttribute('data-ambient')) ?? '').split(',').filter(Boolean);
    expect(ambient.length).toBeGreaterThanOrEqual(1);
    await expect(page.locator('.amb')).not.toHaveCount(0);
    await expect(page.getByTestId('walk-figure-GALD')).toBeVisible();

    // One step left: he walks (frames change, not a still sliding), and the
    // world slides right behind him — the near leaves further than the painting.
    const paintBefore = await shiftOf(page, '.walk-painting');
    const nearBefore = await shiftOf(page, '.walk-near');
    const lightBefore = await shiftOf(page, '.walk-light');
    const frames = await stepLeft(page);
    expect(frames.size, 'more than one frame while walking').toBeGreaterThan(1);
    expect(await heroX(page)).toBeLessThan(arrived);
    const paintMoved = (await shiftOf(page, '.walk-painting')) - paintBefore;
    const nearMoved = (await shiftOf(page, '.walk-near')) - nearBefore;
    const lightMoved = (await shiftOf(page, '.walk-light')) - lightBefore;
    expect(paintMoved).toBeGreaterThan(0);
    expect(nearMoved).toBeGreaterThan(paintMoved);
    expect(lightMoved).toBeLessThan(paintMoved);
    expect(lightMoved).toBeGreaterThan(0);
    // Standing still, he stands still: the idle frame.
    expect(await page.getByTestId('walk-hero').getAttribute('data-frame')).toContain('left-idle');
    expect(errors).toEqual([]);
  });

  test('a thing ahead is noticed only when near: no glint mid-path, faint coming close, full beside it', async ({ page }) => {
    await freshApp(page);
    await intoTheVillage(page);
    await intoTheForest(page);
    await stepLeft(page); // to the puddle
    await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', 'PUDDLE');
    // Watched frame by frame on the way to the next thing.
    await page.evaluate(() => {
      const w = window as unknown as { __glint: string[] };
      w.__glint = [];
      const t0 = performance.now();
      const tick = () => {
        const g = document.querySelector('[data-testid="walk-point-FRESH_FOOTPRINTS"]') as HTMLElement | null;
        const p = document.querySelector('[data-testid="walk-point-PUDDLE"]') as HTMLElement | null;
        w.__glint.push(`${g?.dataset.strength ?? '-'}|${p?.dataset.strength ?? '-'}`);
        if (performance.now() - t0 < 3000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await stepLeft(page); // to the footprints
    await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', 'FRESH_FOOTPRINTS');
    const trail = await page.evaluate(() => (window as unknown as { __glint: string[] }).__glint);
    const prints = trail.map((x) => x.split('|')[0]).filter((x) => x !== '-').map(Number);
    // Somewhere between the two, nothing glints at all.
    expect(trail).toContain('-|-');
    // Coming close it is faint first, and only full on arrival.
    expect(prints.length).toBeGreaterThan(3);
    expect(Math.min(...prints)).toBeLessThan(0.6);
    expect(prints[prints.length - 1]).toBe(1);
    await expect(page.getByTestId('walk-point-FRESH_FOOTPRINTS')).toHaveAttribute('data-strength', '1.00');
  });

  test('now and then a quiet moment — a leaf, the light, a bird’s shadow — once, gone, and never in the way', async ({ page }) => {
    await freshApp(page);
    await intoTheVillage(page);
    await intoTheForest(page);
    // Not constant: nothing at first.
    await expect(scene(page)).toHaveAttribute('data-moment', '');
    // Then, within the first quiet stretch, one of the three.
    await expect(scene(page)).toHaveAttribute('data-moment', /LEAF_PASS|LIGHT_SHIFT|BIRD_SHADOW/, { timeout: 15_000 });
    const moment = page.getByTestId('walk-moment');
    await expect(moment).toHaveCount(1);
    expect(await moment.evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
    // While it plays, the walk and the doors answer as ever.
    await page.getByTestId('walk-forward').click();
    await expect(scene(page)).toHaveAttribute('data-walking', 'no');
    // And it goes.
    await expect(page.getByTestId('walk-moment')).toHaveCount(0, { timeout: 8_000 });
  });
});

test('stop to stop: a thing in reach, 調べる, a short line — at least two of them, then back the way they came', async ({
  page,
}) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  // Nothing in reach at the start: no 調べる.
  await expect(page.getByTestId('walk-look')).toHaveCount(0);
  await expect(page.getByTestId('walk-back')).toBeDisabled();

  const seen: string[] = [];
  for (let i = 0; i < 6 && !(await page.getByTestId('walk-forward').isDisabled()); i++) {
    await stepLeft(page);
    const look = page.getByTestId('walk-look');
    if (await look.isVisible()) {
      const point = (await look.getAttribute('data-point'))!;
      await expect(page.getByTestId(`walk-point-${point}`)).toBeVisible();
      await look.click();
      const line = (await page.getByTestId('walk-caption').textContent()) ?? '';
      expect(line.length).toBeGreaterThan(0);
      for (const l of line.split('\n')) expect(l.length, 'short, not explanation').toBeLessThanOrEqual(30);
      seen.push(point);
    }
  }
  expect(seen.length).toBeGreaterThanOrEqual(2);
  expect(seen).toEqual(expect.arrayContaining(['PUDDLE', 'FRESH_FOOTPRINTS', 'FALLEN_LOG']));
  // Before the four answers, the log has been trodden.
  // And back the way they came.
  const end = await heroX(page);
  await page.getByTestId('walk-back').click();
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  expect(await heroX(page)).toBeGreaterThan(end);
});

test('the forest’s doors are where they were: the undergrowth is a fight, the man in the road is the story', async ({
  page,
}) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await page.getByTestId('walk-forward').click();
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  // Mid-walk, the fight is still one press away.
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();

  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
});

test('walking, stopping and looking write nothing; the save and WORLD MEMORY are as they were, and survive a restart', async ({
  page,
}) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);

  for (let i = 0; i < 6 && !(await page.getByTestId('walk-forward').isDisabled()); i++) {
    await stepLeft(page);
    if (await page.getByTestId('walk-look').isVisible()) await page.getByTestId('walk-look').click();
  }
  await page.getByTestId('walk-back').click();
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  await page.waitForTimeout(500);
  expect(await everythingSaved(page)).toEqual(before);

  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-empty')).toBeVisible();
  await page.getByTestId('memory-back').click();

  await page.reload();
  await page.getByTestId('continue-button').click();
  if (
    await page
      .getByTestId('back-to-village')
      .isVisible()
      .catch(() => false)
  ) {
    await page.getByTestId('back-to-village').click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

test('after the four answers: the man is gone from the road, and the log has been left alone', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await page.evaluate(async () => {
    const w = (
      window as unknown as {
        __mugenWorld: {
          recordGaldLifeChoice(c: string): Promise<unknown>;
          markExperienceSeen(id: string): Promise<unknown>;
        };
      }
    ).__mugenWorld;
    await w.recordGaldLifeChoice('SPARE');
  });
  // The look ahead is owed now; past it, then into the forest.
  await page.reload();
  await page.getByTestId('continue-button').click();
  for (let i = 0; i < 4; i++) {
    if (
      await page
        .getByTestId('future-vision-done')
        .isVisible()
        .catch(() => false)
    )
      break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await intoTheForest(page);
  await expect(page.getByTestId('gald-button')).toHaveCount(0);
  await expect(page.getByTestId('walk-figure-GALD')).toHaveCount(0);
  const reached: string[] = [];
  for (let i = 0; i < 6; i++) {
    await stepLeft(page);
    const point = await page
      .getByTestId('walk-look')
      .getAttribute('data-point')
      .catch(() => null);
    if (point) reached.push(point);
    if (point === 'FALLEN_LOG') break;
  }
  // The fresh footprints are gone with him.
  expect(reached).not.toContain('FRESH_FOOTPRINTS');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).toHaveText('剥げていた苔が、また丸太を覆いはじめている。');
});

test('for a player who asked for less motion: no drifting touches, and a step is a step', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await expect(page.locator('.amb')).toHaveCount(0);
  await page.getByTestId('walk-forward').click();
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
  await expect(page.getByTestId('walk-look')).toBeVisible();
  await context.close();
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: at every stop the party, what is noticed, 調べる and the doors are all on screen and clear of each other`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshApp(page);
    await intoTheVillage(page);
    await intoTheForest(page);
    const inside = async (id: string) => {
      const b = await page.getByTestId(id).boundingBox();
      expect(b, id).not.toBeNull();
      expect(b!.x, id).toBeGreaterThanOrEqual(0);
      expect(b!.y, id).toBeGreaterThanOrEqual(0);
      expect(b!.x + b!.width, id).toBeLessThanOrEqual(w);
      expect(b!.y + b!.height, id).toBeLessThanOrEqual(h);
      return b!;
    };
    for (let stop = 0; stop < 6; stop++) {
      const hero = await inside('walk-hero');
      await inside('walk-kaos');
      await inside('walk-caption');
      await inside('leave-forest');
      await inside('walk-forward');
      const doors = [await inside('gald-button'), await inside('encounter-button')];
      if (await page.getByTestId('walk-look').isVisible()) {
        const look = await inside('walk-look');
        for (const d of doors) expect(d.x + d.width, 'doors clear of 調べる').toBeLessThanOrEqual(look.x);
      }
      // The party stands above the doors, never behind them.
      for (const d of doors) expect(hero.y + hero.height, 'party above the doors').toBeLessThanOrEqual(d.y + 2);
      if (await page.getByTestId('walk-forward').isDisabled()) break;
      await stepLeft(page);
    }
  });
}

test('fresh footprints, before the four answers: one person, away from the village — nobody named, nothing given', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);
  for (let i = 0; i < 6; i++) {
    await stepLeft(page);
    const point = await page
      .getByTestId('walk-look')
      .getAttribute('data-point')
      .catch(() => null);
    if (point === 'FRESH_FOOTPRINTS') break;
  }
  await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', 'FRESH_FOOTPRINTS');
  await expect(page.getByTestId('walk-look')).toHaveAttribute('aria-label', '調べる：新しい足跡');
  await page.getByTestId('walk-look').click();
  const caption = page.getByTestId('walk-caption');
  expect(await caption.evaluate((e) => (e as HTMLElement).innerText)).toBe(
    '湿った土に、まだ新しい足跡が残っている。\n一人分だ。村とは逆方向へ続いている。',
  );
  await expect(caption).not.toContainText(/ガルド|盗賊/);
  // Nothing found, nothing given, nothing written.
  await page.waitForTimeout(300);
  expect(await everythingSaved(page)).toEqual(before);
  // The man in the road is still where he was.
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
});
