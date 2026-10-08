import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 月灯りの酒場 — THE APP'S TAVERN.
 *
 *   アルデン村 → 酒場へ入る → 背景 → マスター → 会話 → もどる
 *
 * Three layers (room, master, words), the tavern's own music, the
 * master whole on every phone size — and the save changed by one thing
 * only: his first meeting, marked once in readMarks (`talk:GRAVE_MEETING`,
 * 2026-10-07), so he introduces himself once in a save.
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

/** What the player asked to hear, and whether it is actually sounding. */
async function music(page: Page) {
  return page.evaluate(() => {
    const a = (window as unknown as {
      __mugenAudio?: { bgmState(): { current: string | null; sounding: boolean } };
    }).__mugenAudio;
    return a?.bgmState() ?? { current: null, sounding: false };
  });
}

/** Every row of every store, and localStorage — the whole of what is kept. */
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

type Saved = Awaited<ReturnType<typeof everythingSaved>>;
const isReadMarks = (row: unknown) => (row as { key?: unknown })?.key === 'readMarks';

/** The readMarks row's value, wherever it is kept; undefined when there is none. */
function readMarksOf(saved: Saved): unknown {
  for (const db of Object.values(saved.idb))
    for (const rows of Object.values(db)) {
      const row = rows.find(isReadMarks);
      if (row) return (row as { value: unknown }).value;
    }
  return undefined;
}

/** Everything kept, but the readMarks row. */
function withoutReadMarks(saved: Saved): Saved {
  const idb: Saved['idb'] = {};
  for (const [name, db] of Object.entries(saved.idb)) {
    idb[name] = {};
    for (const [store, rows] of Object.entries(db)) idb[name][store] = rows.filter((r) => !isReadMarks(r));
  }
  return { ...saved, idb };
}

/** Reads a talk to its end; returns every line shown, in order. */
async function readTalk(page: Page): Promise<string[]> {
  const seen: string[] = [];
  await page.getByTestId('tavern-talk').click();
  for (let i = 0; i < 20; i++) {
    seen.push((await page.getByTestId('tavern-line').textContent()) ?? '');
    const next = page.getByTestId('tavern-next');
    const done = (await next.textContent()) === 'もどる';
    await next.click();
    if (done) break;
  }
  await expect(page.getByTestId('tavern-talk')).toBeVisible();
  return seen;
}

test('village → tavern → the room, the master, a talk → back to the village, and the save changed only by his meeting', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshApp(page);
  await intoTheVillage(page);
  await expect.poll(async () => (await music(page)).current).toBe('ALDEN_VILLAGE');
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);

  // 酒場へ入る.
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-screen')).toBeVisible();
  await expect(page.getByTestId('tavern-screen').locator('h1')).toHaveText('月灯りの酒場');

  // The room and the master, each its own picture, both actually loaded.
  for (const id of ['tavern-room', 'tavern-master']) {
    await expect(page.getByTestId(id)).toBeVisible();
    await expect
      .poll(() => page.getByTestId(id).evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }
  // Three layers, in order: room, master, words.
  const z = await page.evaluate(() =>
    ['tavern-room', 'tavern-master', 'tavern-words'].map((id) =>
      Number(getComputedStyle(document.querySelector(`[data-testid="${id}"]`)!).zIndex),
    ),
  );
  expect(z[0]).toBeLessThan(z[1]);
  expect(z[1]).toBeLessThan(z[2]);

  // The tavern's own music.
  await expect.poll(async () => (await music(page)).current).toBe('TAVERN');

  // 会話: the first time, his first meeting as the content wrote it.
  const meeting = await readTalk(page);
  expect(meeting[0]).toBe('扉を押すと、煮込みと安い酒の匂いがした。');
  expect(meeting).toContain('「グレイヴだ。ここの主人をやってる。」');
  // He is described as he is drawn here: a hand on his hip, laughing.
  expect(meeting).toEqual(
    expect.arrayContaining(['カウンターの奥に、大柄な男が立っている。', '片手を腰に当て、豪快な笑みを浮かべていた。']),
  );
  expect(meeting.join('')).not.toContain('腕を組んだ');
  // And after that, his ordinary greeting.
  const greeting = await readTalk(page);
  expect(greeting[0]).toBe('「また来たな。そこ空いてるぞ。」');

  // もどる: the village, as it was, with its music back.
  await page.getByTestId('tavern-leave').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('tavern-screen')).toHaveCount(0);
  await expect.poll(async () => (await music(page)).current).toBe('ALDEN_VILLAGE');

  // ONE THING WAS RECORDED — his meeting, in readMarks — and nothing else:
  // every other store, row and localStorage key, row for row.
  await page.waitForTimeout(500);
  const after = await everythingSaved(page);
  expect(readMarksOf(after)).toEqual(['talk:GRAVE_MEETING']);
  expect(readMarksOf(before)).toBeUndefined();
  expect(withoutReadMarks(after)).toEqual(withoutReadMarks(before));
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
  test(`${w}×${h}: the master is whole — head and boots on screen, his own shape, a little floor under him`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: w, height: h });
    await freshApp(page);
    await intoTheVillage(page);
    await page.getByTestId('tavern-button').click();
    const master = page.getByTestId('tavern-master');
    await expect
      .poll(() => master.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);

    const m = await master.evaluate((img: HTMLImageElement) => {
      const r = img.getBoundingClientRect();
      const s = getComputedStyle(img);
      // Where `contain` actually draws the picture inside its box.
      const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const drawnW = img.naturalWidth * scale;
      const drawnH = img.naturalHeight * scale;
      return {
        fit: s.objectFit,
        natural: [img.naturalWidth, img.naturalHeight],
        top: r.bottom - drawnH,
        bottom: r.bottom,
        left: r.left + (r.width - drawnW) / 2,
        right: r.left + (r.width + drawnW) / 2,
        position: s.objectPosition,
        vw: window.innerWidth,
        vh: window.innerHeight,
      };
    });
    // The file as delivered, drawn at its own shape.
    expect(m.natural).toEqual([971, 1619]);
    expect(m.fit).toBe('contain');
    // Head and boots on screen; a little floor under him.
    expect(m.top).toBeGreaterThanOrEqual(0);
    expect(m.bottom).toBeLessThan(m.vh);
    expect(m.vh - m.bottom).toBeLessThanOrEqual(m.vh * 0.06);
    expect(m.left).toBeGreaterThanOrEqual(0);
    expect(m.right).toBeLessThanOrEqual(m.vw);
    // Centred across his box, standing on its bottom edge.
    expect(m.position).toBe('50% 100%');

    // And the words are all on screen, never under him.
    const words = (await page.getByTestId('tavern-words').boundingBox())!;
    expect(words.y).toBeGreaterThanOrEqual(0);
    expect(words.y + words.height).toBeLessThanOrEqual(h);
    expect(words.x + words.width).toBeLessThanOrEqual(m.left + 1);
    for (const id of ['tavern-talk', 'tavern-leave']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(h);
    }
  });
}

test('walking out and in again opens on the room', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  await page.getByTestId('tavern-button').click();
  await page.getByTestId('tavern-talk').click();
  await expect(page.getByTestId('tavern-line')).toBeVisible();
  // Read to the end, out by the door, and in again.
  while (await page.getByTestId('tavern-next').isVisible().catch(() => false)) {
    await page.getByTestId('tavern-next').click();
  }
  await page.getByTestId('tavern-leave').click();
  await expect(page.getByTestId('explore-button')).toBeVisible();
  await page.getByTestId('tavern-button').click();
  await expect(page.getByTestId('tavern-description')).toHaveText('旅人と噂の集まる酒場。');
});

// ---------------- his meeting, once in a save (2026-10-07) ----------------

const FIRST_LINE = '扉を押すと、煮込みと安い酒の匂いがした。';
const GREETING = '「また来たな。そこ空いてるぞ。」';

async function firstLineOfTalk(page: Page) {
  await page.getByTestId('tavern-talk').click();
  return page.getByTestId('tavern-line').textContent();
}

test('his meeting happens once in a new save: not again on walking back in, not again after a restart', async ({
  page,
}) => {
  await freshApp(page);
  await intoTheVillage(page);
  await page.getByTestId('tavern-button').click();
  const meeting = await readTalk(page);
  expect(meeting[0]).toBe(FIRST_LINE);
  expect(meeting).toContain('「グレイヴだ。ここの主人をやってる。」');
  await page.getByTestId('tavern-leave').click();

  // In again: he does not introduce himself.
  await page.getByTestId('tavern-button').click();
  const again = await readTalk(page);
  expect(again[0]).toBe(GREETING);
  expect(again.join('')).not.toContain('グレイヴだ。ここの主人をやってる。');
  await page.getByTestId('tavern-leave').click();

  // The app closed and opened: still his greeting.
  await expect.poll(async () => readMarksOf(await everythingSaved(page))).toEqual(['talk:GRAVE_MEETING']);
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.getByTestId('tavern-button').click();
  const after = await readTalk(page);
  expect(after[0]).toBe(GREETING);
  expect(after.join('')).not.toContain('グレイヴだ。ここの主人をやってる。');
});

test('a save from before the mark (no readMarks row) opens, and meets him once', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await freshApp(page);
  await intoTheVillage(page);
  // A save from an earlier build: the row is not there at all.
  await page.waitForTimeout(300);
  expect(readMarksOf(await everythingSaved(page))).toBeUndefined();
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.getByTestId('tavern-button').click();
  const meeting = await readTalk(page);
  expect(meeting[0]).toBe(FIRST_LINE);
  await page.getByTestId('tavern-leave').click();
  await expect.poll(async () => readMarksOf(await everythingSaved(page))).toEqual(['talk:GRAVE_MEETING']);
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await page.getByTestId('tavern-button').click();
  expect(await firstLineOfTalk(page)).toBe(GREETING);
  expect(errors).toEqual([]);
});
