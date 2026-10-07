import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * NPCタッチ反応システム PHASE 1 (2026-10-07): ミレイ, behind the counter at
 * the tool shop. Her picture is the file as delivered, whole; a tap draws
 * one short line and a face, held a moment and then back; taps in a row
 * shift her mood; nothing about touching her is saved.
 */

const FACES = ['NORMAL', 'HAPPY', 'AMAZED', 'SAD', 'ANGRY', 'EMBARRASSED', 'EXASPERATED', 'SMILE_EYES_CLOSED', 'JITO', 'SHY'];
/** The counter's top, in rows of its file (1672 wide) from the file's top. */
const COUNTER_TOP = 275;
const GREETING = 'ミレイ「いらっしゃい。今日は何を探してるの？」';

async function intoTheShop(page: Page) {
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
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('shop-button').click();
  await expect(page.getByTestId('shop-screen')).toBeVisible();
  await expect
    .poll(() => page.getByTestId('shop-keeper-image').evaluate((i: HTMLImageElement) => (i.complete ? i.naturalWidth : 0)))
    .toBe(1086);
}

async function savedRows(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = indexedDB.open('mugen-zero-app');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const all = req.result.transaction('world_state', 'readonly').objectStore('world_state').getAll();
          all.onsuccess = () => {
            const out: Record<string, unknown> = {};
            for (const row of all.result as { key: string; value: unknown }[]) out[row.key] = row.value;
            req.result.close();
            resolve(out);
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );
}

const her = (page: Page) => page.getByTestId('shop-keeper-touch');

test('the shop in three layers — the room, ミレイ, the counter in front — each as delivered, and her greeting', async ({
  page,
}) => {
  await intoTheShop(page);
  await expect.poll(() => page.getByTestId('shop-room').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  await expect
    .poll(() => page.getByTestId('shop-counter-art').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0))
    .toBe(true);
  const pictures = await page.evaluate(() => {
    const read = (id: string) => {
      const i = document.querySelector(`[data-testid="${id}"]`) as HTMLImageElement;
      const c = document.createElement('canvas');
      c.width = i.naturalWidth;
      c.height = i.naturalHeight;
      const g = c.getContext('2d')!;
      g.drawImage(i, 0, 0);
      const alpha = (x: number, y: number) => g.getImageData(x, y, 1, 1).data[3];
      const s = getComputedStyle(i);
      return {
        natural: [i.naturalWidth, i.naturalHeight],
        corner: alpha(2, 2),
        middle: alpha(Math.round(i.naturalWidth * 0.5), Math.round(i.naturalHeight * 0.5)),
        fit: s.objectFit,
        z: Number(getComputedStyle(i.closest('button') ?? i).zIndex),
      };
    };
    const z = (id: string) => Number(getComputedStyle(document.querySelector(`[data-testid="${id}"]`)!).zIndex);
    return {
      room: read('shop-room'),
      her: read('shop-keeper-image'),
      counter: { ...read('shop-counter-art'), z: z('shop-counter-art') },
    };
  });
  expect(pictures.room.natural).toEqual([1672, 941]);
  expect(pictures.room.fit).toBe('cover');
  expect(pictures.her.natural).toEqual([1086, 1448]);
  expect(pictures.her.corner).toBe(0);
  expect(pictures.her.middle).toBeGreaterThan(240);
  expect(pictures.her.fit).toBe('contain');
  expect(pictures.counter.natural).toEqual([1672, 941]);
  expect(pictures.counter.corner).toBe(0);
  expect(pictures.counter.middle).toBeGreaterThan(240);
  // The counter is in front of her.
  expect(pictures.counter.z).toBeGreaterThan(pictures.her.z);
  await expect(page.getByTestId('shop-keeper-image')).toHaveAttribute('data-face', 'NORMAL');
  await expect(her(page)).toHaveAttribute('data-expression', 'NORMAL');
  await expect(page.getByTestId('shop-greeting')).toHaveText(GREETING);
});

test('a tap: one of her lines and a face, held a moment, then back to her ordinary face and greeting — and nothing saved', async ({
  page,
}) => {
  await intoTheShop(page);
  await page.waitForTimeout(300);
  const before = await savedRows(page);
  await her(page).click();
  const line = page.getByTestId('shop-touch-line');
  await expect(line).toBeVisible();
  const text = (await line.textContent()) ?? '';
  expect(text.startsWith('ミレイ「')).toBe(true);
  // The first tap is never the greeting she has already said.
  expect(text).not.toBe(GREETING);
  const face = (await line.getAttribute('data-expression'))!;
  expect(FACES).toContain(face);
  await expect(her(page)).toHaveAttribute('data-expression', face);
  // Every face has its own picture now: the one drawn is the one she makes.
  await expect(page.getByTestId('shop-keeper-image')).toHaveAttribute('data-face', face);
  await expect
    .poll(() => page.getByTestId('shop-keeper-image').evaluate((i: HTMLImageElement) => decodeURIComponent(i.src)))
    .toContain(`shop_mirei_${face.toLowerCase()}`);
  // Back: the face first, then the line.
  await expect(her(page)).toHaveAttribute('data-expression', 'NORMAL', { timeout: 4000 });
  await expect(line).toHaveCount(0, { timeout: 4000 });
  await expect(page.getByTestId('shop-greeting')).toHaveText(GREETING);
  // Touching her writes nothing.
  expect(await savedRows(page)).toEqual(before);
});

test('two taps at once count once; tapped seven times and more, never an everyday line', async ({ page }) => {
  await intoTheShop(page);
  await her(page).click();
  await her(page).click();
  await expect(her(page)).toHaveAttribute('data-taps', '1');
  for (let n = 2; n <= 10; n++) {
    await page.waitForTimeout(340);
    await her(page).click();
    await expect(her(page)).toHaveAttribute('data-taps', String(n));
    const kind = await page.getByTestId('shop-touch-line').getAttribute('data-kind');
    if (n >= 7) expect(kind, `tap ${n}`).not.toBe('NORMAL');
  }
});

for (const [w, h] of [
  [915, 412],
  [844, 390],
  [800, 360],
  [640, 360],
  [640, 300],
] as const) {
  test(`${w}×${h}: the counter across the bottom (its base off screen), her above it, centred, her head on screen, and the shop beside her all reachable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await intoTheShop(page);
    const box = async (id: string) => (await page.getByTestId(id).boundingBox())!;
    const c = await box('shop-counter-art');
    const m = await box('shop-keeper-image');
    // Each at its own shape.
    expect(c.width / c.height).toBeCloseTo(1672 / 941, 2);
    expect(m.width / m.height).toBeCloseTo(1086 / 1448, 2);
    // The counter covers the bottom: the screen's edge cuts it through its panels (row 760), its base below.
    expect(Math.abs(c.y + 760 * (c.width / 1672) - h)).toBeLessThanOrEqual(2);
    expect(c.x).toBeGreaterThanOrEqual(0);
    // At most half the screen, beside the safe-area gutter.
    expect(c.x + c.width).toBeLessThanOrEqual(w * 0.5 + 8);
    expect(m.y).toBeGreaterThanOrEqual(0);
    expect(m.x).toBeGreaterThanOrEqual(c.x);
    expect(m.x + m.width).toBeLessThanOrEqual(c.x + c.width);
    // The counter's top at her waist (腰上: 58% down her picture); drawn at its own scale across.
    const scale = c.width / 1672;
    expect(Math.abs(m.y + m.height * 0.58 - (c.y + COUNTER_TOP * scale))).toBeLessThanOrEqual(2);
    // Centred on it.
    expect(Math.abs(m.x + m.width / 2 - (c.x + c.width / 2))).toBeLessThanOrEqual(2);
    expect(m.height).toBeGreaterThan(h * 0.6);
    const b = c;
    for (const id of ['shop-tab-buy', 'shop-tab-sell', 'shop-leave', 'shop-greeting']) {
      await expect(page.getByTestId(id), id).toBeInViewport();
    }
    const leave = (await page.getByTestId('shop-leave').boundingBox())!;
    expect(leave.x).toBeGreaterThan(b.x + b.width);
  });
}
