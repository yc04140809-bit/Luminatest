import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * THE STATUS SCREEN, built to the author's two reference images.
 *
 * Three things are worth a browser rather than a comment.
 *
 * WHAT IS NOT ON IT. 防御力, 魔力, 素早さ and an equipped weapon's name
 * do not exist in this build, so they are absent — not 「0」, not 「—」,
 * not 「未実装」. A placeholder is a number nobody chose.
 *
 * WHAT DOES NOT PRETEND TO WORK. ストーリー, プロフィール and スキン are
 * named because the reference names them. None may be a button, carry a
 * handler, or look pressable: a door that opens onto nothing is worse
 * than no door. (装備 and, since 2026-10-07, スキル are built.)
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
  await pastTheIntro(page);
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

test('shows the six numbers for each of them — HP, MP, 攻撃力 the battle’s, 防御力・魔力・素早さ their own (作者指示 2026-10-11)', async ({ page }) => {
  await openStatus(page);
  const six = async () => ({
    hp: await page.getByTestId('status-hp').textContent(),
    mp: await page.getByTestId('status-mp').textContent(),
    attack: await page.getByTestId('status-attack-range').textContent(),
    defense: await page.getByTestId('status-defense').textContent(),
    magic: await page.getByTestId('status-magic').textContent(),
    speed: await page.getByTestId('status-speed').textContent(),
  });
  // HP and MP as they were (作者判断: unchanged for now); his 攻撃力 the battle's.
  expect(await six()).toEqual({ hp: '100 / 100', mp: '48 / 48', attack: '8〜12', defense: '12', magic: '8', speed: '10' });
  await page.getByTestId('status-tab-kaos').click();
  await expect(page.getByTestId('status-name-text')).toHaveText('ケイオス');
  // Hers: a low swing, low defence, far more magic, quicker.
  expect(await six()).toEqual({ hp: '100 / 100', mp: '48 / 48', attack: '4〜6', defense: '7', magic: '20', speed: '14' });
  // Labels in order, and no placeholder anywhere a value lives.
  expect(await page.locator('.st-rows dt').allInnerTexts()).toEqual(['HP', 'MP', '攻撃力', '防御力', '魔力', '素早さ']);
  const values = await page.locator('.st-rows dd, .st-mark b, .st-level b').allInnerTexts();
  for (const v of values) {
    expect(v.trim()).not.toBe('—');
    expect(v.trim()).not.toBe('0');
    expect(v).not.toContain('未実装');
  }
  await expect(page.getByTestId('status-screen')).not.toContainText('未実装');
});

test('the pages along the foot: ステータス, プロフィール, 装備, スキル are doors; ストーリー and スキン are named, never offered', async ({ page }) => {
  await openStatus(page);
  for (const label of ['ストーリー', 'スキン']) {
    const item = page.getByTestId(label === 'ストーリー' ? `status-menu-soon-${label}` : `status-detail-soon-${label}`);
    await expect(item).toBeVisible();
    // A span, not a button, and nothing a screen reader will call operable.
    await expect(item).toHaveJSProperty('tagName', 'SPAN');
    await expect(item).toHaveAttribute('aria-disabled', 'true');
  }
  const equip = page.getByTestId('status-to-equipment');
  await expect(equip).toHaveJSProperty('tagName', 'BUTTON');
  await expect(equip).toBeEnabled();
  // The page open is marked, not offered; the controls are the tabs, the pages and the way out.
  await expect(page.getByTestId('status-to-status')).toHaveAttribute('aria-current', 'page');
  const buttons = await page.locator('.status-screen button').allInnerTexts();
  expect(new Set(buttons.map((b) => b.replace(/\s*NEW$/, '').trim()))).toEqual(
    new Set(['主人公', 'ケイオス', 'プロフィール', '装備', 'スキル', 'もどる']),
  );
  // プロフィール: who they are, in their words — and back to the numbers.
  await page.getByTestId('status-to-profile').click();
  await expect(page.getByTestId('status-profile')).toContainText('それでも、俺は進む。');
  await expect(page.getByTestId('status-profile')).toContainText('確かな剣技と、揺るがない意志で戦う。');
  await expect(page.getByTestId('status-hp')).toHaveCount(0);
  await page.getByTestId('status-to-status').click();
  await expect(page.getByTestId('status-hp')).toHaveText('100 / 100');
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

test('two columns and a foot: who they are on the left, the picture on the right, the pages under both — nothing over her', async ({ page }) => {
  await openStatus(page);
  for (const [w, h] of [[844, 390], [640, 300], [915, 412]]) {
    await page.setViewportSize({ width: w, height: h });
    const at = `${w}x${h}`;
    const cols = await page.evaluate(() => {
      const box = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return {
        info: box('.st-info'),
        visual: box('.st-visual'),
        foot: box('.st-foot'),
        menu: document.querySelector('.st-menu') !== null,
      };
    });
    expect(cols.menu, at).toBe(false);
    expect(cols.visual.width / w, at).toBeGreaterThanOrEqual(0.4);
    expect(cols.visual.width / w, at).toBeLessThanOrEqual(0.47);
    expect(Math.round(w - cols.visual.right), at).toBe(0);
    expect(Math.round(cols.visual.height), at).toBe(h);
    // NO TEXT OVER HER: the column stops before the picture starts.
    expect(cols.info.right, at).toBeLessThanOrEqual(cols.visual.left + 1);
    // The foot under the column, never over it, at the very bottom.
    expect(cols.foot.top, at).toBeGreaterThanOrEqual(cols.info.bottom - 1);
    expect(Math.round(cols.foot.bottom), at).toBe(h);
  }
});

test('shows the picture large, at its own shape, never stretched — the head at the top, the face not small', async ({ page }) => {
  await openStatus(page);

  const check = async (whose: string) => {
    const img = page.getByTestId(`status-portrait-${whose}`);
    await expect(img).toBeVisible();
    await expect
      .poll(async () => img.evaluate((e: HTMLImageElement) => e.naturalWidth), { timeout: 15_000 })
      .toBeGreaterThan(0);
    const fit = await img.evaluate((e: HTMLImageElement) => {
      const box = e.getBoundingClientRect();
      const area = e.parentElement!.getBoundingClientRect();
      return {
        natural: e.naturalWidth / e.naturalHeight,
        drawn: box.width / box.height,
        top: box.top - area.top,
        tall: box.height / area.height,
        centre: box.left + box.width / 2 - (area.left + area.width / 2),
      };
    });
    // Its own shape, never stretched.
    expect(Math.abs(fit.drawn - fit.natural), whose).toBeLessThan(0.01);
    // Large: taller than the screen, the head at the top, centred in its area.
    expect(Math.abs(fit.top), whose).toBeLessThan(1);
    expect(fit.tall, whose).toBeGreaterThanOrEqual(1.3);
    expect(Math.abs(fit.centre), whose).toBeLessThan(2);
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

test('scrolls the middle column to its last line, on any height, and nothing else moves', async ({ page }) => {
  await openStatus(page);

  const measure = () =>
    page.evaluate(() => {
      const scroll = document.querySelector('[data-testid="status-scroll"]') as HTMLElement;
      scroll.scrollTop = scroll.scrollHeight;
      const box = (e: Element) => e.getBoundingClientRect();
      const last = scroll.lastElementChild!;
      return {
        scrolls: scroll.scrollHeight > scroll.clientHeight,
        atBottom: Math.abs(scroll.scrollTop + scroll.clientHeight - scroll.scrollHeight) <= 1,
        lastBottom: box(last).bottom,
        scrollBottom: box(scroll).bottom,
        footTop: box(document.querySelector('.st-foot')!).top,
        footBottom: box(document.querySelector('.st-foot')!).bottom,
        visualTop: box(document.querySelector('.st-visual')!).top,
        page: document.documentElement.scrollHeight - window.innerHeight,
      };
    });

  // A short handset: the column has more than it can show at once.
  for (const who of ['hero', 'kaos']) {
    if (who === 'kaos') await page.getByTestId('status-tab-kaos').click();
    // Android landscape sizes in CSS pixels (Pixel 7, Pixel 5, a common 360-tall
    // handset, a narrow one) and a very short floor.
    for (const [width, height] of [[915, 412], [851, 393], [844, 390], [800, 360], [640, 360], [640, 300]]) {
      await page.setViewportSize({ width, height });
      const m = await measure();
      const at = `${who} ${width}x${height}`;
      expect(m.atBottom, at).toBe(true);
      // The last line is reachable, and is not under the foot.
      expect(m.lastBottom, at).toBeLessThanOrEqual(m.scrollBottom);
      expect(m.lastBottom, at).toBeLessThanOrEqual(m.footTop);
      // The foot stays at the bottom, the picture and the menu at the top,
      // and the page itself never scrolls — only the column does.
      expect(m.footBottom, at).toBe(height);
      expect(m.visualTop, at).toBe(0);
      expect(m.page, at).toBe(0);
    }
  }
  // On the shortest floor her column has more than it can show at once: it scrolls.
  await page.setViewportSize({ width: 640, height: 300 });
  expect((await measure()).scrolls).toBe(true);
  // Everything that was below 装備 on the handset is in the column.
  await expect(page.getByTestId('status-scroll')).toContainText('武器種');
  await expect(page.getByTestId('status-scroll')).toContainText('戦闘スタイル');
});

test('the middle column scrolls with the wheel (a finger), down to what was hidden below 装備', async ({ page }) => {
  await openStatus(page);
  await page.getByTestId('status-tab-kaos').click();
  await page.setViewportSize({ width: 800, height: 360 });
  const scroll = page.getByTestId('status-scroll');
  const box = (await scroll.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => scroll.evaluate((s) => Math.round(s.scrollTop + s.clientHeight - s.scrollHeight))).toBeGreaterThanOrEqual(-1);
  // The last items, and above the foot.
  for (const id of ['status-weapon', 'status-style']) await expect(page.getByTestId(id)).toBeInViewport();
  const footTop = await page.locator('.st-foot').evaluate((e) => e.getBoundingClientRect().top);
  const styleBottom = await page.getByTestId('status-style').evaluate((e) => e.getBoundingClientRect().bottom);
  expect(styleBottom).toBeLessThanOrEqual(footTop);
  // The page itself did not move: the foot and the picture are where they were.
  expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
});

// ---------------- スキル (2026-10-07) ----------------

test('スキル: 《瞬断》 with what it does, from the skill’s own numbers; 未習得 for somebody who knows none', async ({
  page,
}) => {
  await openStatus(page);
  const menu = page.getByTestId('status-to-skills');
  await expect(menu).toHaveJSProperty('tagName', 'BUTTON');
  await menu.click();
  // His: 瞬断, closed until tapped.
  const row = page.getByTestId('status-skill-shundan');
  await expect(row).toContainText('瞬断');
  await expect(page.getByTestId('status-skill-shundan-detail')).toHaveCount(0);
  await row.click();
  await expect(page.getByTestId('status-skill-shundan-power')).toHaveText('威力：通常攻撃の2倍');
  await expect(page.getByTestId('status-skill-shundan-reuse')).toHaveText('再使用：3ターンに1回');
  await expect(page.getByTestId('status-skills-none')).toHaveCount(0);
  // Hers: none.
  await page.getByTestId('status-tab-kaos').click();
  await expect(page.getByTestId('status-skills-none')).toHaveText('未習得');
  await expect(page.getByTestId('status-skill-shundan')).toHaveCount(0);
  // Back to the status itself.
  await page.getByTestId('status-to-status').click();
  await expect(page.getByTestId('status-level')).toBeVisible();
});

test('スキル: NEW until the skill itself is looked at — opening the list clears nothing, and it stays read', async ({
  page,
}) => {
  await openStatus(page);
  const marks = () =>
    page.evaluate(() => (window as unknown as { __mugenWorld: { isRead(id: string): boolean } }).__mugenWorld.isRead('skill:shundan'));
  await expect(page.getByTestId('status-skills-new')).toBeVisible();
  // Opening the list: still NEW, on the menu and on the row.
  await page.getByTestId('status-to-skills').click();
  await expect(page.getByTestId('status-skills-new')).toBeVisible();
  await expect(page.getByTestId('status-skill-shundan-new')).toBeVisible();
  await page.waitForTimeout(300);
  expect(await marks()).toBe(false);
  // Looking at it: read.
  await page.getByTestId('status-skill-shundan').click();
  await expect(page.getByTestId('status-skill-shundan-new')).toHaveCount(0);
  await expect(page.getByTestId('status-skills-new')).toHaveCount(0);
  await expect.poll(marks).toBe(true);
  // And still read after a restart (the same mark the fight's skill tray reads).
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-skills-new')).toHaveCount(0);
});
