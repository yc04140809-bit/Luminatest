import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * THE STATUS SCREEN, built to the author's two reference images.
 *
 * Three things are worth a browser rather than a comment.
 *
 * WHAT IS NOT ON IT. 防御力, 魔力, 素早さ and an equipped weapon's name
 * do not exist in this build, so they are absent — not 「0」, not 「—」,
 * not 「未実装」. A placeholder is a number nobody chose.
 *
 * WHAT DOES NOT PRETEND TO WORK. スキル, 装備, ストーリー, プロフィール
 * and スキン are named because the reference names them. None may be a
 * button, carry a handler, or look pressable: a door that opens onto
 * nothing is worse than no door.
 *
 * WHERE THE PICTURE IS. It has an area of its own that the UI never
 * writes into, it keeps its own shape, and nothing is cropped off it.
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
  await throughTheOpening(page);
  // Naming now sits between the opening and the village. Taking the
  // default, so what this file asserts stays about the status screen.
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openStatus(page: Page) {
  await intoTheVillage(page);
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
}

/** Waits for whichever picture this character has to actually decode. */
async function pictureReady(page: Page) {
  const img = page.locator('.st-visual img');
  await expect(img).toBeVisible();
  await expect
    .poll(async () => img.evaluate((e: HTMLImageElement) => e.naturalWidth), { timeout: 15_000 })
    .toBeGreaterThan(0);
  return img;
}

test('shows what the world knows, for whoever is actually in the party', async ({ page }) => {
  await openStatus(page);

  // 主人公 is the default name, taken in the helper above — not a
  // label written into the roster.
  await expect(page.getByTestId('status-name-text')).toHaveText('主人公');
  await expect(page.getByTestId('status-level')).toHaveText('1');
  // Straight out of `levelCurve`: nothing on this screen works it out.
  await expect(page.getByTestId('status-next')).toHaveText('16');
  await expect(page.getByTestId('status-hp')).toHaveText('100 / 100');
  await expect(page.getByTestId('status-mp')).toHaveText('48 / 48');
  await expect(page.getByTestId('status-attack-range')).toHaveText('8〜12');
  await expect(page.getByTestId('status-weapon')).toHaveText('長剣');
  await expect(page.getByTestId('status-style')).toHaveText('近接攻撃 / オールラウンダー');
});

test('says nothing about stats and equipment this build does not have', async ({ page }) => {
  await openStatus(page);

  const screen = page.getByTestId('status-screen');
  for (const absent of ['防御力', '魔力', '素早さ', '未実装']) {
    await expect(screen, `${absent} must not appear at all`).not.toContainText(absent);
  }
  // Not even as an empty row. Checked where VALUES live rather than
  // across the screen, because the author's own prose contains an
  // em dash and that is writing, not a placeholder.
  const values = await page
    .locator('.st-rows dd, .st-mark b, .st-level b')
    .allInnerTexts();
  expect(values.length).toBeGreaterThan(0);
  for (const v of values) {
    expect(v.trim()).not.toBe('—');
    expect(v.trim()).not.toBe('0');
    expect(v).not.toContain('未実装');
  }
});

test('names the screens that do not exist without offering them', async ({ page }) => {
  await openStatus(page);

  // 装備 IS a screen now, so it is no longer in this list — it gained
  // its frame and its handler at the same moment, which is the rule
  // this file exists to hold. It is covered by `equipment.spec.ts`.
  for (const label of ['スキル', 'ストーリー']) {
    const item = page.getByTestId(`status-menu-soon-${label}`);
    await expect(item).toBeVisible();
    // A span, not a button, and nothing a screen reader will call
    // operable either.
    await expect(item).toHaveJSProperty('tagName', 'SPAN');
    await expect(item).toHaveAttribute('aria-disabled', 'true');
  }
  for (const label of ['プロフィール', 'スキン']) {
    const item = page.getByTestId(`status-detail-soon-${label}`);
    await expect(item).toBeVisible();
    await expect(item).toHaveJSProperty('tagName', 'SPAN');
    await expect(item).toHaveAttribute('aria-disabled', 'true');
  }
  // 装備 is in the menu and NOT repeated below: the reference puts it
  // in both places, and two entries for one unbuilt screen is worse.
  await expect(page.getByTestId('status-detail-soon-装備')).toHaveCount(0);
  // 装備 is a real control and says so.
  const equip = page.getByTestId('status-to-equipment');
  await expect(equip).toHaveJSProperty('tagName', 'BUTTON');
  await expect(equip).toBeEnabled();

  // And it is the ONLY one the menu has gained: the controls on this
  // screen are the two tabs, 装備, and the way out.
  const buttons = await page.locator('.status-screen button').allInnerTexts();
  expect(new Set(buttons.map((b) => b.trim()))).toEqual(
    new Set(['主人公', 'ケイオス', '装備', 'もどる']),
  );
});

test('switches between the two people who are here, and invents nobody else', async ({ page }) => {
  await openStatus(page);

  await expect(page.getByTestId('status-tab-hero')).toBeVisible();
  await expect(page.getByTestId('status-tab-kaos')).toBeVisible();
  for (const absent of ['levi', 'aria', 'gald']) {
    await expect(page.getByTestId(`status-tab-${absent}`)).toHaveCount(0);
  }

  const before = await (await pictureReady(page)).getAttribute('src');
  await page.getByTestId('status-tab-kaos').click();
  await expect(page.getByTestId('status-name-text')).toHaveText('ケイオス');
  // 魔法 is a STYLE. She has not been given a weapon, so the weapon
  // line says how she fights rather than naming a staff or a grimoire
  // that nobody decided she carries.
  await expect(page.getByTestId('status-weapon')).toHaveText('魔法');
  await expect(page.getByTestId('status-style')).toHaveText('魔法特化');
  // The middle and the right change together: they are one person.
  await expect
    .poll(async () => (await pictureReady(page)).getAttribute('src'))
    .not.toBe(before);
});

test('lays the three columns out to the ratios the spec gives', async ({ page }) => {
  await openStatus(page);

  const w = 844;
  const cols = await page.evaluate(() => {
    const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    return {
      menu: box('.st-menu').width,
      info: box('.st-info').width,
      visual: box('.st-visual').width,
      visualRight: window.innerWidth - box('.st-visual').right,
      visualHeight: box('.st-visual').height,
      infoRight: box('.st-info').right,
      visualLeft: box('.st-visual').left,
    };
  });
  expect(cols.menu / w).toBeGreaterThanOrEqual(0.16);
  expect(cols.menu / w).toBeLessThanOrEqual(0.2);
  expect(cols.info / w).toBeGreaterThanOrEqual(0.39);
  expect(cols.info / w).toBeLessThanOrEqual(0.44);
  expect(cols.visual / w).toBeGreaterThanOrEqual(0.36);
  expect(cols.visual / w).toBeLessThanOrEqual(0.43);
  expect(cols.visualRight).toBe(0);
  expect(cols.visualHeight).toBe(390);
  // NO TEXT OVER HER FACE OR HER WINGS. The middle column stops
  // before the picture's area starts, rather than being trusted to.
  expect(cols.infoRight).toBeLessThanOrEqual(cols.visualLeft + 1);
});

test('shows the picture whole, at its own shape, never stretched', async ({ page }) => {
  await openStatus(page);

  const check = async (whose: string) => {
    const img = await pictureReady(page);
    const fit = await img.evaluate((e: HTMLImageElement) => {
      const box = e.getBoundingClientRect();
      const style = getComputedStyle(e);
      // The element fills its area; `contain` decides what is painted
      // inside it. That painted rect is what must keep the picture's
      // shape — a forced fit crops a face or distorts a wing.
      const ratio = e.naturalWidth / e.naturalHeight;
      const drawnH = Math.min(box.height, box.width / ratio);
      return {
        fit: style.objectFit,
        drawnW: drawnH * ratio,
        drawnH,
        boxW: box.width,
        boxH: box.height,
        inside: box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1,
      };
    });
    expect(fit.fit, whose).toBe('contain');
    // Nothing cut off any edge: the drawn rect fits inside the area.
    expect(fit.drawnW, whose).toBeLessThanOrEqual(fit.boxW + 1);
    expect(fit.drawnH, whose).toBeLessThanOrEqual(fit.boxH + 1);
    // And it reaches one pair of edges, so it is not shrunk for no reason.
    expect(
      Math.abs(fit.drawnH - fit.boxH) < 1 || Math.abs(fit.drawnW - fit.boxW) < 1,
      whose,
    ).toBe(true);
    expect(fit.inside, whose).toBe(true);
  };

  await check('hero');
  await page.getByTestId('status-tab-kaos').click();
  await check('kaos');
});

test('gives the screen back, and never scrolls', async ({ page }) => {
  await openStatus(page);

  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
  expect(overflow).toEqual({ x: 0, y: 0 });

  // The picture covers the right of the screen; it must never eat the
  // tap that leaves.
  const back = page.getByTestId('status-back');
  const size = await back.evaluate((e) => {
    const b = e.getBoundingClientRect();
    return { w: b.width, h: b.height };
  });
  expect(size.h).toBeGreaterThanOrEqual(40);
  expect(size.w).toBeGreaterThanOrEqual(100);
  await back.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});
