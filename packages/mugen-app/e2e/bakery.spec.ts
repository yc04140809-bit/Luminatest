import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * パン屋 — THE APP'S BAKERY, as it is today.
 *
 *   アルデン村 → パン屋 → 背景・主人・リナ → 会話 → 店を出る → アルデン村
 *
 * The tavern's arrangement with two people: three picture layers under
 * the words, both people whole on every phone size and clear of the
 * words, the village's music carried on unbroken, and nothing in the
 * save changed by any of it.
 *
 * Android's back button is native-only (`useAndroidBackButton`) and
 * cannot be pressed from a browser; it takes the same path as the
 * tavern's and is checked on a device.
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

async function music(page: Page) {
  return page.evaluate(() => {
    const a = (window as unknown as {
      __mugenAudio?: { bgmState(): { current: string | null; sounding: boolean } };
    }).__mugenAudio;
    return a?.bgmState() ?? { current: null, sounding: false };
  });
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

const LAYERS = ['bakery-room', 'bakery-owner', 'bakery-lina'] as const;

async function loaded(page: Page) {
  for (const id of LAYERS) {
    await expect
      .poll(() => page.getByTestId(id).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
}

/**
 * Where a person is actually drawn on screen: the picture's own
 * non-transparent pixels, read from the file, placed where `contain`
 * puts the picture. The transparent margin around a cut-out is not the
 * person, so it is not what must stay clear of the words.
 */
async function person(page: Page, id: string) {
  return page.getByTestId(id).evaluate((img: HTMLImageElement) => {
    const r = img.getBoundingClientRect();
    const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const ox = r.left + (r.width - dw) / 2;
    const oy = r.bottom - dh;
    const c = document.createElement('canvas');
    const k = 4; // read at quarter size: plenty to find an outline
    c.width = Math.ceil(img.naturalWidth / k);
    c.height = Math.ceil(img.naturalHeight / k);
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, c.width, c.height);
    const a = g.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, x1 = -1, y0 = c.height, y1 = -1;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (a[(y * c.width + x) * 4 + 3] >= 128) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    const s = (k * dw) / img.naturalWidth;
    return {
      fit: getComputedStyle(img).objectFit,
      natural: [img.naturalWidth, img.naturalHeight],
      boxRatio: r.width / r.height,
      left: ox + x0 * s,
      right: ox + (x1 + 1) * s,
      top: oy + y0 * s,
      bottom: oy + (y1 + 1) * s,
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });
}

test('village → bakery → the shop, the owner and Lina, a talk → back to the village, and the save untouched', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshApp(page);
  await intoTheVillage(page);
  await expect.poll(async () => (await music(page)).current).toBe('ALDEN_VILLAGE');
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);

  await page.getByTestId('bakery-button').click();
  await expect(page.getByTestId('bakery-screen')).toBeVisible();
  await expect(page.getByTestId('bakery-screen').locator('h1')).toHaveText('パン屋');
  // Today's shop, said plainly: nothing here hints at Gald's future.
  await expect(page.getByTestId('bakery-description')).toHaveText('リナの父が営むパン屋。焼きたてのパンの匂いがする。');
  await expect(page.getByTestId('bakery-screen')).not.toContainText('賑やか');
  await loaded(page);

  // Four layers, in order: the shop, her father, Lina in front of him, the words.
  const z = await page.evaluate(() =>
    ['bakery-room', 'bakery-owner', 'bakery-lina', 'bakery-words'].map((id) =>
      Number(getComputedStyle(document.querySelector(`[data-testid="${id}"]`)!).zIndex),
    ),
  );
  expect(z).toEqual([...z].sort((a, b) => a - b));
  expect(new Set(z).size).toBe(4);

  // The village's music, still the same piece: walking in is not a change of scene.
  expect((await music(page)).current).toBe('ALDEN_VILLAGE');

  // The talk, as the content wrote it, and back to the shop.
  await page.getByTestId('bakery-talk').click();
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    seen.push((await page.getByTestId('bakery-line').textContent()) ?? '');
    const next = page.getByTestId('bakery-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  expect(seen).toEqual([
    '「いらっしゃい。焼きたてなら、ちょうど今できたところだ。」',
    '「こんにちは！ 私、リナ。ここはお父さんのお店なの。」',
    '「まだまだ手伝いってところだがな。」',
    '「もう、ちゃんと働いてるもん！」',
  ]);
  await expect(page.getByTestId('bakery-talk')).toBeVisible();

  // 店を出る: the village, as it was.
  await page.getByTestId('bakery-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('bakery-screen')).toHaveCount(0);
  expect((await music(page)).current).toBe('ALDEN_VILLAGE');

  // NOTHING WAS RECORDED.
  await page.waitForTimeout(500);
  expect(await everythingSaved(page)).toEqual(before);
  await page.getByTestId('memory-button').click();
  await expect(page.getByTestId('memory-empty')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: the shop fills the screen; both people whole, their own shape, clear of the words`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshApp(page);
    await intoTheVillage(page);
    await page.getByTestId('bakery-button').click();
    await loaded(page);

    // The shop covers the whole screen.
    const room = (await page.getByTestId('bakery-room').boundingBox())!;
    expect(room).toEqual({ x: 0, y: 0, width: w, height: h });

    for (const [id, natural] of [
      ['bakery-owner', [1086, 1448]],
      ['bakery-lina', [1254, 1254]],
    ] as const) {
      const p = await person(page, id);
      // The file as delivered, drawn at its own shape.
      expect(p.natural, id).toEqual(natural);
      expect(p.fit, id).toBe('contain');
      expect(Math.abs(p.boxRatio - natural[0] / natural[1]), id).toBeLessThan(0.01);
      // Head and feet on screen, a little floor under them.
      expect(p.top, id).toBeGreaterThanOrEqual(0);
      expect(p.bottom, id).toBeLessThan(h);
      expect(h - p.bottom, id).toBeLessThanOrEqual(h * 0.06);
      expect(p.left, id).toBeGreaterThanOrEqual(0);
      expect(p.right, id).toBeLessThanOrEqual(w);
      // The words are never drawn over a person.
      const words = (await page.getByTestId('bakery-words').boundingBox())!;
      expect(words.x + words.width, id).toBeLessThanOrEqual(p.left + 1);
    }
    // She is the shorter of the two, and stands to his side, not on top of him.
    const owner = await person(page, 'bakery-owner');
    const lina = await person(page, 'bakery-lina');
    expect(lina.bottom - lina.top).toBeLessThan(owner.bottom - owner.top);
    expect(lina.left).toBeLessThan(owner.left);

    for (const id of ['bakery-talk', 'bakery-leave']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(h);
    }
  });
}
