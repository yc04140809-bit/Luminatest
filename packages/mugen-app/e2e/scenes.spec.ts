import { test, expect, type Locator, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { fightUntil } from './battle';

/**
 * THE PICTURES, PHASE 1 — the title's key visual, Kaos in the
 * prologue and the look ahead, Gald in the road and on his knee.
 *
 * For every one: it is the right FILE, it actually DECODED, it is
 * inside the screen, and it covers no word and no button. At the
 * App's own size and at a smaller phone, because a layout that only
 * works at the size it was written at is the bug the status screen
 * already had once.
 */

const SIZES = [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
];

async function fresh(page: Page) {
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

/** The picture's file name, decoded and really drawn. */
async function picture(img: Locator): Promise<string> {
  await expect(img).toBeVisible();
  await expect
    .poll(() => img.evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  const src = await img.getAttribute('src');
  return decodeURIComponent(src ?? '').split('/').pop()!.replace(/\?.*$/, '');
}

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Inside the screen, and clear of every word and button on it. */
async function staysOutOfTheWay(page: Page, img: Locator, size: { width: number; height: number }) {
  const art = (await img.boundingBox())!;
  expect(art.x).toBeGreaterThanOrEqual(-1);
  expect(art.y).toBeGreaterThanOrEqual(-1);
  expect(art.x + art.width).toBeLessThanOrEqual(size.width + 1);
  expect(art.y + art.height).toBeLessThanOrEqual(size.height + 1);
  const words = page.locator('.stage-words .line, .stage-words .speaker, .stage-words .place, .stage-words .btn, .logo, .sub, .title .btn');
  for (const el of await words.all()) {
    if (!(await el.isVisible())) continue;
    const box = (await el.boundingBox())!;
    expect(overlaps(art, box), `${await el.textContent()} is under the picture`).toBe(false);
    // And the words themselves are on the screen, not pushed off it.
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
  }
}

/** From his first line in the road to the four answers. */
async function beatGald(page: Page) {
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), {
    maxTurns: 80,
  });
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('the title carries the key visual, beside the name', async ({ page }) => {
      await fresh(page);
      const key = page.getByTestId('title-key-visual');
      expect(await picture(key)).toMatch(/^title-kaos-keyvisual.*\.webp$/);
      await staysOutOfTheWay(page, key, size);
      await expect(page.getByTestId('start-button')).toBeVisible();
    });

    test('the prologue is the world alone, then Kaos in front of the key visual', async ({ page }) => {
      await fresh(page);
      await page.getByTestId('start-button').click();

      // THE WORLD — the canon line, on black, with nobody drawn.
      const line = page.getByTestId('opening-line');
      await expect(line).toHaveText('あなたが忘れても、\n世界は覚えている。', { useInnerText: true });
      await expect(page.getByTestId('stage-figure')).toHaveCount(0);

      // HER — every one of her six lines with her standing there.
      await page.getByTestId('opening-next').click();
      const lines: string[] = [];
      for (let i = 0; i < 10; i++) {
        if (await page.getByTestId('naming-default').isVisible().catch(() => false)) break;
        const her = page.getByTestId('stage-figure');
        await expect(her).toHaveAttribute('data-who', 'kaos');
        expect(await picture(her)).toMatch(/^kaos-talk-default.*\.png$/);
        await staysOutOfTheWay(page, her, size);
        expect(await picture(page.getByTestId('stage-backdrop'))).toMatch(/^title-kaos-keyvisual/);
        await expect(page.locator('.stage-speaker')).toHaveText('ケイオス');
        lines.push((await line.textContent()) ?? '');
        await page.getByTestId('opening-next').click();
      }
      // The Artifact's words, all of them, in order — nothing written
      // for the App and nothing left out.
      expect(lines).toEqual([
        '「やっと来た。」',
        '「……え？ 誰かって？」',
        '「女神。」',
        '「…………たぶん。」',
        '「ひとつだけ覚えておいて。」',
        '「この世界で出会う人には、みんな続きがあるから。」',
      ]);
      // And then the hero is asked their name.
      await expect(page.getByTestId('naming-default')).toBeVisible();
    });

    test('Gald stands in the road, then kneels beside the four answers', async ({ page }) => {
      test.setTimeout(180_000);
      await fresh(page);
      await page.getByTestId('start-button').click();
      await throughTheOpening(page);
      await page.getByTestId('naming-default').click();
      await expect(page.getByTestId('world-clock')).toBeVisible();

      await page.getByTestId('explore-button').click();
      await page.getByTestId('forest-button').click();
      await page.getByTestId('gald-button').click();
      const him = page.getByTestId('stage-figure');
      await expect(him).toHaveAttribute('data-who', 'gald');
      expect(await picture(him)).toMatch(/^gald-ready.*\.png$/);
      await staysOutOfTheWay(page, him, size);
      expect(await picture(page.getByTestId('stage-backdrop'))).toMatch(/^location-greenwood-forest/);

      // Through the fight to the four answers.
      await beatGald(page);

      const kneeling = page.getByTestId('stage-figure');
      await expect(kneeling).toHaveAttribute('data-state', 'portrait');
      expect(await picture(kneeling)).toMatch(/^gald-defeated.*\.png$/);
      await staysOutOfTheWay(page, kneeling, size);
      for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
        const b = (await page.getByTestId(`choice-${id}`).boundingBox())!;
        expect(b.height, `${id} is a finger's height`).toBeGreaterThanOrEqual(38);
      }

      // Answer, and Kaos stands through the look ahead.
      await page.getByTestId('choice-SPARE').click();
      for (let i = 0; i < 10; i++) {
        if (await page.locator('[data-testid="future-vision"]').isVisible().catch(() => false)) break;
        const next = page.getByTestId('choice-result-next');
        if (await next.isVisible().catch(() => false)) await next.click();
        else await page.waitForTimeout(200);
      }
      await expect(page.getByTestId('future-vision')).toBeVisible();
      const her = page.getByTestId('stage-figure');
      await expect(her).toHaveAttribute('data-who', 'kaos');
      expect(await picture(her)).toMatch(/^kaos-talk-default.*\.png$/);
      await staysOutOfTheWay(page, her, size);
    });
  });
}
