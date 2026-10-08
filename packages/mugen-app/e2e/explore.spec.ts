import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { marksClear } from './walk';
import { dist, goTo, hero, inNoticeOf, kaos, openFloor, scale, settled, things, touch } from './roam';

/**
 * グリーンウッドの森, WALKED ABOUT IN — the same walk as the ruins.
 *
 * A touch on the clearing's floor walks the party there, across and back
 * into the picture or forward out of it, smaller the farther back. The
 * forest's own things (the puddle, the fresh footprints while there is
 * somebody to have made them, the log, the old tree) show their 「！」
 * only up close and lose it for good once read; small finds keep turning
 * up after them. The forest's two doors — the man in the road, and the
 * undergrowth — are exactly where they were, and walking, stopping and
 * looking write nothing.
 *
 * Seen only on a device: how the walk FEELS, and sound once forest SE exist.
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
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toBeVisible();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-mode', 'roam');
  await settled(page);
  await expect.poll(async () => (await things(page)).some((t) => t.kind === 'find')).toBe(true);
}

async function look(page: Page) {
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).not.toBeEmpty();
}

const scene = (page: Page) => page.getByTestId('walk-scene');

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


test('the forest is walked about in like the ruins: forward and back into the picture, smaller the farther back, Kaos alongside', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await expect(page.getByTestId('walk-hint')).toHaveText('地面をタップして歩く');
  const front = await openFloor(page, 0.76, [0.8, 0.88, 0.7, 0.45]);
  await touch(page, front);
  const atFront = await hero(page);
  const frontScale = await scale(page);
  // Measured once his standing picture has loaded (a frame not yet loaded measures 0).
  const tall = async () => {
    await expect.poll(async () => (await page.getByTestId('walk-hero').boundingBox())?.height ?? 0).toBeGreaterThan(0);
    return (await page.getByTestId('walk-hero').boundingBox())!.height;
  };
  const frontBox = { height: await tall() };
  const back = await openFloor(page, 0.58, [0.8, 0.88, 0.7, 0.6]);
  await touch(page, back);
  const atBack = await hero(page);
  expect(atBack.y).toBeLessThan(atFront.y - 0.1);
  const backScale = await scale(page);
  expect(backScale).toBeLessThan(frontScale);
  expect(backScale).toBeGreaterThanOrEqual(0.78);
  expect(backScale).toBeLessThanOrEqual(0.88);
  expect(await tall()).toBeLessThan(frontBox.height * 0.93);
  expect(dist(await kaos(page), atBack)).toBeLessThan(0.08);
  expect(Math.abs((await scale(page, 'kaos')) - backScale)).toBeLessThan(0.08);
  // The trees, the water and the sky are not floor.
  await touch(page, { x: 0.6, y: 0.2 });
  expect((await hero(page)).y).toBeGreaterThan(0.55);
  expect(errors).toEqual([]);
});

test('「！」 only up close, 調べる beside it, the line, and then the 「！」 is gone for good', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  const mark = page.getByTestId('walk-marker-PUDDLE');
  for (const id of ['PUDDLE', 'FRESH_FOOTPRINTS', 'FALLEN_LOG', 'OLD_TREE']) await expect(page.getByTestId(`walk-marker-${id}`)).toHaveCount(0);
  const puddle = (await things(page)).find((t) => t.id === 'PUDDLE')!;
  await touch(page, await inNoticeOf(page, 'PUDDLE'));
  await expect(mark).toHaveAttribute('data-state', 'near');
  await expect(page.locator('[data-testid="walk-look"][data-point="PUDDLE"]')).toHaveCount(0);
  await goTo(page, 'PUDDLE');
  await expect(mark).toHaveAttribute('data-state', 'here');
  await look(page);
  await expect(page.getByTestId('walk-caption')).toHaveText('水たまりに、木漏れ日が揺れている。');
  await expect(mark).toHaveCount(0);
  await touch(page, await openFloor(page, 0.62, [0.3, 0.45, 0.85]));
  await touch(page, puddle.stand);
  await expect(mark).toHaveCount(0);
  await expect(page.locator('[data-testid="walk-look"][data-point="PUDDLE"]')).toHaveCount(0);
});

test('all four of the forest’s own things say their lines; after them, small finds keep turning up somewhere else', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  const said: Record<string, string> = {};
  for (const id of ['PUDDLE', 'FRESH_FOOTPRINTS', 'FALLEN_LOG', 'OLD_TREE']) {
    await goTo(page, id);
    await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', id);
    await look(page);
    said[id] = (await page.getByTestId('walk-caption').evaluate((e) => (e as HTMLElement).innerText)) ?? '';
  }
  expect(said).toEqual({
    PUDDLE: '水たまりに、木漏れ日が揺れている。',
    FRESH_FOOTPRINTS: '湿った土に、まだ新しい足跡が残っている。\n一人分だ。村とは逆方向へ続いている。',
    FALLEN_LOG: '丸太の苔が、誰かに踏まれて剥げている。',
    OLD_TREE: '木の根元に、小さな足跡が残っている。',
  });
  const read: string[] = [];
  const spots: string[] = [];
  const route = [
    { x: 0.8, y: 0.66 },
    { x: 0.3, y: 0.66 },
    { x: 0.55, y: 0.62 },
  ];
  for (let round = 0, r = 0; read.length < 3 && round < 16; round++) {
    const f = (await things(page)).find((t) => t.kind === 'find');
    expect((await things(page)).filter((t) => t.kind === 'find').length).toBeLessThanOrEqual(2);
    if (!f) {
      await touch(page, route[r++ % route.length]);
      await page.waitForTimeout(1000);
      continue;
    }
    await goTo(page, f.id);
    await look(page);
    read.push(f.id);
    spots.push(`${f.mark.x},${f.mark.y}`);
    await expect(page.getByTestId(`walk-marker-${f.id}`)).toHaveCount(0);
  }
  expect(read.length).toBe(3);
  expect(new Set(read).size).toBe(3);
  for (let i = 1; i < spots.length; i++) expect(spots[i]).not.toBe(spots[i - 1]);
});

test('the forest’s doors are where they were: the undergrowth is a fight, the man in the road is the story', async ({
  page,
}) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await expect(page.getByTestId('walk-figure-GALD')).toHaveCount(1);
  await touch(page, { x: 0.4, y: 0.66 });
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();

  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await touch(page, { x: 0.3, y: 0.64 });
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
});

test('walking, stopping and looking write nothing; the save and WORLD MEMORY are as they were, and survive a restart', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);
  for (const id of ['PUDDLE', 'FRESH_FOOTPRINTS', 'FALLEN_LOG']) {
    await goTo(page, id);
    await look(page);
  }
  const f = (await things(page)).find((t) => t.kind === 'find');
  if (f) {
    await goTo(page, f.id);
    await look(page);
  }
  await touch(page, { x: 0.8, y: 0.66 });
  await touch(page, { x: 0.25, y: 0.66 });
  await touch(page, { x: 0.8, y: 0.66 });
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

test('after the four answers: the man is gone from the road, the footprints with him, and the log has been left alone', async ({ page }) => {
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
  expect((await things(page)).map((t) => t.id)).not.toContain('FRESH_FOOTPRINTS');
  await goTo(page, 'FALLEN_LOG');
  await look(page);
  await expect(page.getByTestId('walk-caption')).toHaveText('剥げていた苔が、また丸太を覆いはじめている。');
});

test('fresh footprints, before the four answers: one person, away from the village — nobody named, nothing given', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);
  await goTo(page, 'FRESH_FOOTPRINTS');
  await expect(page.getByTestId('walk-look')).toHaveAttribute('data-point', 'FRESH_FOOTPRINTS');
  await expect(page.getByTestId('walk-look')).toHaveAttribute('aria-label', '調べる：新しい足跡');
  await page.getByTestId('walk-look').click();
  const caption = page.getByTestId('walk-caption');
  expect(await caption.evaluate((e) => (e as HTMLElement).innerText)).toBe(
    '湿った土に、まだ新しい足跡が残っている。\n一人分だ。村とは逆方向へ続いている。',
  );
  await expect(caption).not.toContainText(/ガルド|盗賊/);
  await page.waitForTimeout(300);
  expect(await everythingSaved(page)).toEqual(before);
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
});

test.describe('in motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('they really walk in, and step by step into the picture, shrinking a little at a time', async ({ page }) => {
    await freshApp(page);
    await intoTheVillage(page);
    await page.getByTestId('explore-button').click();
    await page.getByTestId('forest-button').click();
    await expect(scene(page)).toHaveAttribute('data-walking', 'yes');
    await settled(page);
    await touch(page, { x: 0.45, y: 0.58 }, false);
    const seen: number[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push(await scale(page));
      if ((await scene(page).getAttribute('data-walking')) === 'no') break;
      await page.waitForTimeout(60);
    }
    expect(new Set(seen.map((x) => x.toFixed(2))).size).toBeGreaterThan(3);
    for (let i = 1; i < seen.length; i++) expect(seen[i - 1] - seen[i]).toBeLessThan(0.03);
    expect(((await scene(page).getAttribute('data-ambient')) ?? '').length).toBeGreaterThan(0);
  });

  test('now and then a quiet moment — once, gone, and never in the way', async ({ page }) => {
    await freshApp(page);
    await intoTheVillage(page);
    await intoTheForest(page);
    await expect(scene(page)).toHaveAttribute('data-moment', /LEAF_PASS|LIGHT_SHIFT|BIRD_SHADOW/, { timeout: 20_000 });
    expect(await page.getByTestId('walk-moment').evaluate((e) => getComputedStyle(e).pointerEvents)).toBe('none');
  });
});

test('for a player who asked for less motion: no drifting touches, and a touch is a step taken at once', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await freshApp(page);
  await intoTheVillage(page);
  await intoTheForest(page);
  await expect(page.locator('.amb')).toHaveCount(0);
  await goTo(page, 'PUDDLE');
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
  test(`${w}×${h}: front, back and beside each thing — the party, the words, the doors, 調べる and every 「！」 on screen and clear`, async ({
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
    const check = async () => {
      const hb = await inside('walk-hero');
      await inside('walk-kaos');
      await inside('leave-forest');
      const doors = [await inside('gald-button'), await inside('encounter-button')];
      if (await page.getByTestId('walk-caption').isVisible()) await inside('walk-caption');
      if (await page.getByTestId('walk-look').isVisible()) {
        const lk = await inside('walk-look');
        for (const d of doors) expect(d.x + d.width, 'doors clear of 調べる').toBeLessThanOrEqual(lk.x);
      }
      // Nobody ever stands behind the doors.
      for (const d of doors) {
        const across = hb.x < d.x + d.width && d.x < hb.x + hb.width;
        if (across) expect(hb.y + hb.height, 'party above the doors').toBeLessThanOrEqual(d.y + 2);
      }
      await marksClear(page, ['walk-caption', 'leave-forest', 'gald-button', 'encounter-button', 'walk-look']);
    };
    // As low as the floor goes, at the doors' end of the clearing.
    await touch(page, { x: 0.2, y: 0.95 });
    await check();
    for (const id of ['PUDDLE', 'FRESH_FOOTPRINTS', 'FALLEN_LOG', 'OLD_TREE']) {
      await goTo(page, id);
      await check();
      await look(page);
      await check();
    }
  });
}
