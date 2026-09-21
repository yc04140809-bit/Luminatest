import { test, expect, type Page } from '@playwright/test';

/**
 * THE STATUS SCREEN, IN A BROWSER.
 *
 * What is asserted here is mostly what is NOT on it. The screen shows
 * LEVEL, HP, MP, an attack range, a kind of weapon and a way of
 * fighting — and 防御力, 魔力, 素早さ and an equipped weapon's name do
 * not exist in this build, so they are absent rather than shown as
 * 「0」, 「—」 or 「未実装」. A placeholder is a number nobody chose, and
 * a screen that prints one is lying to the player.
 *
 * The other half is the roster: who appears comes from `activeParty()`,
 * never from a list written on the screen. Levi, Aria and Gald have
 * weapons in canon and are not in the party — nothing here invents
 * them, and no route puts Gald in it.
 */

async function intoTheVillage(page: Page) {
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
  const next = page.getByTestId('opening-next');
  for (let i = 0; i < 3; i++) await next.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openStatus(page: Page) {
  await intoTheVillage(page);
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
}

test('shows what the world knows, for whoever is actually in the party', async ({ page }) => {
  await openStatus(page);

  await expect(page.getByTestId('status-name')).toHaveText('あなた');
  await expect(page.getByTestId('status-level')).toHaveText('1');
  // Straight out of `levelCurve`: nothing on this screen works it out.
  await expect(page.getByTestId('status-next')).toHaveText('16');
  await expect(page.getByTestId('status-hp')).toHaveText('100 / 100');
  await expect(page.getByTestId('status-mp')).toHaveText('48 / 48');
  await expect(page.getByTestId('status-attack-range')).toHaveText('8〜12');
  await expect(page.getByTestId('status-weapon')).toHaveText('長剣');
  await expect(page.getByTestId('status-style')).toHaveText('剣術');
});

test('says nothing about stats and equipment this build does not have', async ({ page }) => {
  await openStatus(page);

  const screen = page.getByTestId('status-screen');
  for (const absent of ['防御力', '魔力', '素早さ', '装備', '未実装']) {
    await expect(screen, `${absent} must not appear at all`).not.toContainText(absent);
  }
  // Not even as an empty row: there is no row.
  await expect(screen).not.toContainText('—');
});

test('switches between the two people who are here, and invents nobody else', async ({ page }) => {
  await openStatus(page);

  await expect(page.getByTestId('status-tab-hero')).toBeVisible();
  await expect(page.getByTestId('status-tab-kaos')).toBeVisible();
  // Canon weapons, no profile, no party seat — and Gald above all.
  for (const absent of ['levi', 'aria', 'gald']) {
    await expect(page.getByTestId(`status-tab-${absent}`)).toHaveCount(0);
  }

  await page.getByTestId('status-tab-kaos').click();
  await expect(page.getByTestId('status-name')).toHaveText('ケイオス');
  // 魔法 is a STYLE. She has not been given a weapon, so the weapon
  // line says how she fights rather than naming a staff or a grimoire
  // that nobody decided she carries.
  await expect(page.getByTestId('status-weapon')).toHaveText('魔法');
  await expect(page.getByTestId('status-style')).toHaveText('魔法特化');
});

/**
 * THE FIGURE'S OWN AREA: 32% of the width, 82% of the height, pinned
 * to the right and to the floor, and clipped. The UI never draws into
 * it and the picture never escapes it — that separation is what lets
 * the art and the screen be replaced one without the other, so it is
 * worth a test rather than a comment.
 */
const artArea = (page: Page) =>
  page.locator('.status-portrait').evaluate((e) => {
    const r = e.getBoundingClientRect();
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(window.innerWidth - r.right),
      bottom: Math.round(window.innerHeight - r.bottom),
      overflow: getComputedStyle(e).overflow,
    };
  });

test('gives a cut-out master the floor: 32% x 82%, bottom right', async ({ page }) => {
  await openStatus(page);
  await expect(page.getByTestId('status-screen')).toHaveAttribute('data-art', 'PORTRAIT');

  const area = await artArea(page);
  expect(area.w).toBe(Math.round(844 * 0.32));
  expect(area.h).toBe(Math.round(390 * 0.82));
  expect(area.right).toBe(0);
  expect(area.bottom).toBe(0);
  expect(area.overflow).toBe('hidden');
});

/**
 * A FINISHED RECTANGLE IS A PICTURE. Its background is painted in, so
 * it takes the full height and a width cut to its own shape — which is
 * what makes it fill the area with nothing letterboxed and nothing
 * cropped. Get the width wrong and either bars appear beside it or the
 * character loses her head, so the drawn rectangle is measured here
 * rather than the element box.
 */
test('frames a finished visual whole: full height, nothing cropped', async ({ page }) => {
  await openStatus(page);
  await page.getByTestId('status-tab-kaos').click();
  await expect(page.getByTestId('status-screen')).toHaveAttribute('data-art', 'VISUAL');

  const area = await artArea(page);
  expect(area.h).toBe(390);
  expect(area.right).toBe(0);
  expect(area.bottom).toBe(0);
  expect(area.overflow).toBe('hidden');

  const img = page.locator('.status-portrait img');
  await expect.poll(async () => img.evaluate((e: HTMLImageElement) => e.naturalWidth))
    .toBeGreaterThan(0);
  const fill = await img.evaluate((e: HTMLImageElement) => {
    const box = e.getBoundingClientRect();
    const ratio = e.naturalWidth / e.naturalHeight;
    const drawnH = Math.min(box.height, box.width / ratio);
    return { gapX: box.width - drawnH * ratio, gapY: box.height - drawnH };
  });
  expect(fill.gapX).toBeLessThan(2);
  expect(fill.gapY).toBeLessThan(2);
});

test('draws each portrait whole, and gives the screen back', async ({ page }) => {
  await openStatus(page);

  /** Loaded, and drawn at its own shape inside the area. */
  const portraitIsWhole = async () => {
    const img = page.locator('.status-portrait img');
    await expect(img).toBeVisible();
    await expect
      .poll(async () => img.evaluate((e: HTMLImageElement) => e.naturalWidth))
      .toBeGreaterThan(0);
    const fit = await img.evaluate((e: HTMLImageElement) => {
      const box = e.getBoundingClientRect();
      const style = getComputedStyle(e);
      // The element fills the area; `contain` decides what is actually
      // painted inside it. That painted rect is what must keep the
      // picture's shape — a landscape phone must never crop a face off.
      const ratio = e.naturalWidth / e.naturalHeight;
      const drawnH = Math.min(box.height, box.width / ratio);
      const drawnW = drawnH * ratio;
      return {
        fit: style.objectFit,
        position: style.objectPosition,
        skew: Math.abs(drawnW / drawnH - ratio),
        // Standing on the floor of the area, so switching characters
        // does not make the ground move.
        onTheFloor: Math.abs(window.innerHeight - box.bottom) < 1,
        inside:
          drawnW <= box.width + 1 &&
          box.right <= window.innerWidth + 1 &&
          box.bottom <= window.innerHeight + 1,
      };
    });
    expect(fit.fit).toBe('contain');
    expect(fit.position).toBe('50% 100%');
    expect(fit.skew).toBeLessThan(0.02);
    expect(fit.onTheFloor).toBe(true);
    expect(fit.inside).toBe(true);
  };

  await portraitIsWhole();
  await page.getByTestId('status-tab-kaos').click();
  await portraitIsWhole();

  // The picture is positioned over the whole screen; it must never
  // swallow the tap that leaves it.
  await page.getByTestId('status-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

test('never makes the landscape screen scroll', async ({ page }) => {
  await openStatus(page);
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow).toEqual({ x: 0, y: 0 });
});
