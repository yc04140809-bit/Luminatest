import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * 低画面UI (実装メイン⑥, 2026-10-08): on a short phone held sideways
 * (640×300 and the like) the words a fight is read by are 10px or more,
 * the party's health stays inside its round frame, and nothing a player
 * taps has moved or shrunk. At every size, a health plate that would
 * cover the fighter it belongs to stands beside it instead (a big one,
 * セキリュウガ); one that does not (モスラビット) stays under its feet.
 */

const SHORT = [
  { width: 640, height: 300 },
  { width: 720, height: 360 },
  { width: 800, height: 360 },
];
type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const boxOf = (page: Page, id: string) => page.getByTestId(id).first().boundingBox().then((b) => b!);
const fontPx = (page: Page, id: string) =>
  page.getByTestId(id).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

async function open(page: Page, enemy: string) {
  await page.goto(`/?preview=battle&debug=0&enemy=${enemy}`);
  await expect(page.getByTestId('battle-preview')).toBeVisible();
  await expect(page.getByTestId('bp-attack')).toBeVisible();
  // The plate is placed off the drawn fighters, once they are drawn.
  await page.waitForTimeout(600);
}

/** The plate, with the BOSS badge stood over it when there is one. */
async function plateBox(page: Page): Promise<Box> {
  const plate = await boxOf(page, 'bp-enemy-hp');
  const tag = page.getByTestId('bp-boss-tag');
  if (!(await tag.isVisible())) return plate;
  const t = (await tag.boundingBox())!;
  const top = Math.min(plate.y, t.y);
  return { x: plate.x, y: top, width: plate.width, height: plate.y + plate.height - top };
}

for (const size of SHORT) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('a big fighter (セキリュウガ): its plate beside it, clear of its lower body, of the party and of the commands', async ({
      page,
    }) => {
      await open(page, 'sekiryuga');
      const plate = await plateBox(page);
      const art = await boxOf(page, 'bp-enemy-art');
      // Not drawn any smaller for it: still the height it is at the size above.
      expect(art.height).toBeGreaterThan(size.height * 0.35);
      const lowerBody = { x: art.x, y: art.y + art.height * 0.5, width: art.width, height: art.height * 0.5 };
      expect(overlaps(plate, lowerBody)).toBe(false);
      await expect(page.getByTestId('bp-enemy-hp')).toHaveAttribute('data-place', 'beside');
      for (const id of ['bp-hero-art', 'bp-kaos-art']) expect(overlaps(plate, await boxOf(page, id)), id).toBe(false);
      expect(plate.y + plate.height).toBeLessThanOrEqual((await boxOf(page, 'bp-commands')).y);
      const locked = page.getByTestId('bp-arcana-locked');
      if (await locked.isVisible()) expect(overlaps(plate, (await locked.boundingBox())!)).toBe(false);
      // The whole name, not cut short.
      const cut = await page
        .getByTestId('bp-enemy-name')
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      expect(cut).toBe(false);
    });

    test('the words read in a fight are 10px or more and on the screen; the commands keep their size', async ({ page }) => {
      await open(page, 'sekiryuga');
      for (const id of ['bp-enemy-name', 'bp-enemy-read', 'bp-player-hp', 'bp-message-lead', 'bp-boss-tag']) {
        expect(await fontPx(page, id), id).toBeGreaterThanOrEqual(10);
      }
      const orderLabel = await page
        .getByTestId('bx-turn-order')
        .locator('.bx-panel-label')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(orderLabel).toBeGreaterThanOrEqual(10);
      for (const id of ['bp-attack', 'bp-skill', 'bp-item', 'bp-defend']) {
        const jp = await page
          .getByTestId(id)
          .locator('.bp-cmd-jp')
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(jp, id).toBeGreaterThanOrEqual(10);
        // A thumb's worth, as before.
        const b = await boxOf(page, id);
        expect(b.height, id).toBeGreaterThanOrEqual(44);
      }
      for (const id of [
        'bp-enemy-name',
        'bp-enemy-read',
        'bx-turn-order',
        'bp-message',
        'bp-commands',
        'bp-auto',
        'bp-speed',
        'bp-escape',
        'bx-party',
      ]) {
        await expect(page.getByTestId(id).first(), id).toBeVisible();
        const b = await boxOf(page, id);
        expect(b.x, id).toBeGreaterThanOrEqual(-1);
        expect(b.y, id).toBeGreaterThanOrEqual(-1);
        expect(b.x + b.width, id).toBeLessThanOrEqual(size.width + 1);
        expect(b.y + b.height, id).toBeLessThanOrEqual(size.height + 1);
      }
      // The party's health inside its round frame (the hero's, whose numbers are widest).
      const face = (await page.locator('.bx-member').first().locator('.bx-face').boundingBox())!;
      const read = await boxOf(page, 'bp-player-hp');
      expect(read.x).toBeGreaterThanOrEqual(face.x - 0.5);
      expect(read.x + read.width).toBeLessThanOrEqual(face.x + face.width + 0.5);
      // The turn order keeps every face it showed.
      expect(await page.getByTestId('bx-turn-order').locator('.bx-turn').count()).toBeGreaterThanOrEqual(5);
    });
  });
}

const EVERY = [...SHORT, { width: 844, height: 390 }, { width: 915, height: 412 }];
/** Where the plate's frame begins in its picture (BattleStage PLATE_INK_TOP). */
const INK_TOP = 0.24;

for (const size of EVERY) {
  test.describe(`${size.width}x${size.height}: where the plate hangs`, () => {
    test.use({ viewport: size });

    test('セキリュウガ: neither its plate nor its BOSS badge on its drawing; clear of the party, the commands and the edge', async ({
      page,
    }) => {
      await open(page, 'sekiryuga');
      const art = await boxOf(page, 'bp-enemy-art');
      const plate = await boxOf(page, 'bp-enemy-hp');
      const frame = { x: plate.x, y: plate.y + plate.height * INK_TOP, width: plate.width, height: plate.height * (1 - INK_TOP) };
      const tag = await boxOf(page, 'bp-boss-tag');
      const inset = (b: Box) => ({ x: b.x + 1, y: b.y + 1, width: b.width - 2, height: b.height - 2 });
      expect(overlaps(inset(frame), art), 'frame').toBe(false);
      expect(overlaps(inset(tag), art), 'badge').toBe(false);
      for (const id of ['bp-hero-art', 'bp-kaos-art', 'bp-commands', 'bx-party']) {
        expect(overlaps(inset(frame), await boxOf(page, id)), id).toBe(false);
      }
      expect(plate.x + plate.width).toBeLessThanOrEqual(size.width + 1);
    });

    test('モスラビット: its plate under its feet, not moved', async ({ page }) => {
      await open(page, 'rabbit');
      await expect(page.getByTestId('bp-enemy-hp')).toHaveAttribute('data-place', 'under');
    });
  });
}

test.describe('844x390 (the usual size)', () => {
  test.use({ viewport: { width: 844, height: 390 } });
  test('the words keep the sizes they were made at', async ({ page }) => {
    await open(page, 'sekiryuga');
    expect(await fontPx(page, 'bp-enemy-name')).toBe(9);
  });
});

test.describe('640x300: a notice', () => {
  test.use({ viewport: { width: 640, height: 300 } });
  test('is on the screen, readable', async ({ page }) => {
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
    for (const look of ['top', 'bottom']) {
      await page.evaluate(
        (l) =>
          (window as unknown as { __mugenNotices: { push(n: Record<string, unknown>): void } }).__mugenNotices.push({
            type: 'test',
            message: '薬草 ×3 を手に入れた',
            priority: 'NORMAL',
            look: l,
            testId: `low-notice-${l}`,
          }),
        look,
      );
      const n = page.getByTestId(`low-notice-${look}`);
      await expect(n).toBeVisible();
      const b = (await n.boundingBox())!;
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(640);
      expect(b.y + b.height).toBeLessThanOrEqual(300);
      expect(await n.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(10);
      await expect(n).toBeHidden({ timeout: 5000 });
    }
  });
});
