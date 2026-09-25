import { test, expect, type Page } from '@playwright/test';

/**
 * THE ARTIFACT'S BATTLE SCREEN, DRAWN BY THE APP — Phase 1, at rest.
 *
 * Reached through the development-only `?preview=battle`, because it
 * is not connected to the game yet. What is checked is what a player
 * would see: the field, both sides where the Artifact puts them, every
 * picture actually drawn, every reading and every control on the
 * screen — at the three phones the Artifact itself is judged on.
 */

const PHONES = [
  { width: 800, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
];

async function open(page: Page, query = '') {
  await page.goto(`/?preview=battle${query}`);
  await expect(page.getByTestId('battle-preview')).toBeVisible();
  await expect(page.getByTestId('bp-attack')).toBeVisible();
}

/** Every picture on the screen is loaded and has a size. */
async function everyPictureDrawn(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLImageElement>('.bp-screen img')].filter(
          (img) => !img.complete || img.naturalWidth === 0,
        ).length,
      ),
    )
    .toBe(0);
}

for (const size of PHONES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('lays out the field as the Artifact does, nothing off the screen', async ({ page }) => {
      await open(page);
      await everyPictureDrawn(page);

      // No scrolling: the field is the whole screen and no more.
      const scroll = await page.evaluate(() => ({
        w: document.scrollingElement!.scrollWidth,
        h: document.scrollingElement!.scrollHeight,
      }));
      expect(scroll.w).toBeLessThanOrEqual(size.width);
      expect(scroll.h).toBeLessThanOrEqual(size.height);

      // THE ENEMY LEFT, THE PARTY RIGHT.
      const enemy = (await page.getByTestId('bp-enemy-art').boundingBox())!;
      const hero = (await page.getByTestId('bp-hero-art').boundingBox())!;
      const kaos = (await page.getByTestId('bp-kaos-art').boundingBox())!;
      expect(enemy.x + enemy.width / 2).toBeLessThan(size.width / 2);
      expect(hero.x + hero.width / 2).toBeGreaterThan(size.width / 2);
      expect(kaos.x + kaos.width / 2).toBeGreaterThan(hero.x + hero.width / 2);

      // Every reading and control is on the screen.
      for (const id of [
        'bx-world-memory',
        'bx-turn-order',
        'bx-place',
        'bp-message',
        'bp-enemy-hp',
        'bx-party',
        'bp-attack',
        'bp-skill',
        'bp-item',
        'bp-defend',
        'bp-arcana',
        'bp-auto',
        'bp-speed',
        'bp-escape',
      ]) {
        const box = await page.getByTestId(id).first().boundingBox();
        expect(box, id).not.toBeNull();
        expect(box!.x, id).toBeGreaterThanOrEqual(-1);
        expect(box!.y, id).toBeGreaterThanOrEqual(-1);
        expect(box!.x + box!.width, id).toBeLessThanOrEqual(size.width + 1);
        expect(box!.y + box!.height, id).toBeLessThanOrEqual(size.height + 1);
      }
    });
  });
}

test('draws the core\'s own opening state, not numbers of its own', async ({ page }) => {
  await open(page);
  // モスラビット at full health, and the line the core opened the fight with.
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('モスラビット');
  await expect(page.getByTestId('bp-enemy-read')).toHaveText(/124\s*\/\s*124/);
  await expect(page.getByTestId('bp-player-hp')).toContainText('100');
  await expect(page.getByTestId('bp-message-lead')).toHaveText('モスラビット');
  // Locked, and said: no arcana page is finished.
  await expect(page.getByTestId('bp-arcana')).toBeDisabled();
  await expect(page.getByTestId('bp-arcana-locked')).toHaveText('アルカナ 準備中');
  // No magic command until she has woken.
  await expect(page.getByTestId('bp-magic')).toHaveCount(0);
});

test('shows her magic once she can cast, with the core\'s MP', async ({ page }) => {
  await open(page, '&magic=1');
  await expect(page.getByTestId('bp-magic')).toBeVisible();
  await expect(page.getByTestId('bp-mp')).toHaveText('MP 48');
});

test('draws Gald at arm\'s length, without a way out', async ({ page }) => {
  await open(page, '&enemy=gald');
  await everyPictureDrawn(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('盗賊 ガルド');
  await expect(page.getByTestId('bp-escape')).toHaveCount(0);
});

test('is not connected: a command changes nothing, the chips only change themselves', async ({
  page,
}) => {
  await open(page);
  await expect(page.getByTestId('battle-preview')).toHaveAttribute('data-connected', 'no');
  const before = await page.getByTestId('bp-enemy-read').textContent();
  await page.getByTestId('bp-attack').click();
  await page.waitForTimeout(300);
  await expect(page.getByTestId('bp-enemy-read')).toHaveText(before!);

  await page.getByTestId('bp-speed').click();
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '2');
  await page.getByTestId('bp-speed').click();
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '1');
  await page.getByTestId('bp-auto').click();
  await expect(page.getByTestId('bp-auto')).toHaveAttribute('aria-pressed', 'true');
});
