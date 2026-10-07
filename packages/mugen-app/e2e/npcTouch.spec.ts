import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * NPCタッチ反応システム PHASE 1 (2026-10-07): ミレイ, behind the counter at
 * the tool shop. Her picture is the file as delivered, whole; a tap draws
 * one short line and a face, held a moment and then back; taps in a row
 * shift her mood; nothing about touching her is saved.
 */

const FACES = ['NORMAL', 'HAPPY', 'AMAZED', 'SAD', 'ANGRY', 'EMBARRASSED', 'EXASPERATED'];
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

test('ミレイ: her picture as delivered — transparent, whole, at its own shape — and her greeting', async ({ page }) => {
  await intoTheShop(page);
  const img = page.getByTestId('shop-keeper-image');
  const facts = await img.evaluate((i: HTMLImageElement) => {
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
      face: alpha(Math.round(i.naturalWidth * 0.5), Math.round(i.naturalHeight * 0.2)),
      fit: s.objectFit,
      position: s.objectPosition,
    };
  });
  expect(facts.natural).toEqual([1086, 1448]);
  expect(facts.corner).toBe(0);
  expect(facts.face).toBeGreaterThan(240);
  expect(facts.fit).toBe('contain');
  expect(facts.position).toBe('50% 100%');
  await expect(img).toHaveAttribute('data-face', 'NORMAL');
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
  // Only her ordinary face is drawn so far: any face shows it.
  await expect(page.getByTestId('shop-keeper-image')).toHaveAttribute('data-face', 'NORMAL');
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
  test(`${w}×${h}: she is whole on screen, standing at the bottom, and the shop beside her all reachable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await intoTheShop(page);
    // Where `contain` actually draws her inside her box (her own shape, never stretched).
    const b = await page.getByTestId('shop-keeper-image').evaluate((i: HTMLImageElement) => {
      const r = i.getBoundingClientRect();
      const scale = Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight);
      const dw = i.naturalWidth * scale;
      const dh = i.naturalHeight * scale;
      return { x: r.left + (r.width - dw) / 2, y: r.bottom - dh, width: dw, height: dh };
    });
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(w * 0.45);
    // Standing on the bottom edge: her counter is the bottom of the screen.
    expect(Math.abs(b.y + b.height - h)).toBeLessThanOrEqual(2);
    expect(b.height).toBeGreaterThan(h * 0.6);
    for (const id of ['shop-tab-buy', 'shop-tab-sell', 'shop-leave', 'shop-greeting']) {
      await expect(page.getByTestId(id), id).toBeInViewport();
    }
    const leave = (await page.getByTestId('shop-leave').boundingBox())!;
    expect(leave.x).toBeGreaterThan(b.x + b.width);
  });
}
