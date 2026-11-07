import { test, expect, type Page } from '@playwright/test';

/**
 * UI 素材の受け皿 (2026-10-16): every shared part, every state, short and long Japanese,
 * narrow and wide (?preview=kit) — no word is ever cut: each piece of text fits its own box
 * (no overflow), and its box lies inside its part.
 */
async function noneCut(page: Page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-kit-text]'))) {
      // Not shown at this size (e.g. the five's small English line on a low screen): nothing to cut.
      if (getComputedStyle(el).display === 'none') continue;
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) bad.push(`overflow: ${el.textContent}`);
      const part = el.closest('.kit');
      if (!part) continue;
      const a = el.getBoundingClientRect();
      const b = part.getBoundingClientRect();
      if (a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1) bad.push(`outside its part: ${el.textContent}`);
      for (let p: HTMLElement | null = el; p && p !== part.parentElement; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (p !== el && cs.textOverflow === 'ellipsis') bad.push(`ellipsis: ${el.textContent}`);
      }
    }
    return bad;
  });
}

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: every part, every state, short and long words — none cut`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?preview=kit');
    await expect(page.getByTestId('kit-preview')).toBeVisible();
    // Every part is there, at every width.
    for (const part of ['menuButton', 'placeLabel', 'listRow', 'backButton', 'confirmButton', 'talkPanel', 'objective', 'panel']) {
      await expect(page.getByTestId(`kit-sample-${part}-96-1`)).toBeVisible();
    }
    expect(await noneCut(page)).toEqual([]);
    // A long name grows its part (two lines or more), never cut.
    const longOne = page.getByTestId('kit-sample-menuButton-96-1').locator('.kit').first();
    const shortOne = page.getByTestId('kit-sample-menuButton-96-0').locator('.kit').first();
    expect((await longOne.boundingBox())!.height).toBeGreaterThan((await shortOne.boundingBox())!.height);
    // States are drawn: disabled is not pressable; selected is marked.
    await expect(page.getByTestId('kit-sample-listRow-160-0').locator('.kit').nth(2)).toBeDisabled();
    await expect(page.getByTestId('kit-sample-listRow-160-0').locator('.kit').nth(1)).toHaveAttribute('data-selected', 'yes');
  });
}

test('the village uses the parts: none of its words cut at 640×300', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(((await indexedDB.databases?.()) ?? []).map((d) => new Promise((r) => { if (!d.name) return r(null); const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => r(null); })));
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('opening-debug-skip').click();
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('village-screen')).toBeVisible();
  await page.getByTestId('spot-tavern').click();
  await expect(page.locator('[data-kit="menuButton"]')).toHaveCount(5);
  await expect(page.locator('[data-kit="placeLabel"]')).toHaveCount(10);
  expect(await noneCut(page)).toEqual([]);
});

/** Every piece of text inside a part lies inside it (measured on the words themselves), and none is ellipsised. */
async function wordsInsideParts(page: Page, scope: string) {
  return page.evaluate((sel) => {
    const bad: string[] = [];
    for (const part of Array.from(document.querySelectorAll<HTMLElement>(`${sel} .kit`))) {
      if (getComputedStyle(part).display === 'none') continue;
      const b = part.getBoundingClientRect();
      const walker = document.createTreeWalker(part, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? '').trim();
        if (!text) continue;
        const r = document.createRange();
        r.selectNodeContents(n);
        const a = r.getBoundingClientRect();
        if (a.width === 0) continue;
        if (a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1) bad.push(`outside its part: ${text}`);
        if (getComputedStyle(n.parentElement!).textOverflow === 'ellipsis') bad.push(`ellipsis: ${text}`);
      }
    }
    return bad;
  }, scope);
}

test('the status screen uses the crystal parts: none of its words cut, on every page, at 844×390 and 640×300', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(((await indexedDB.databases?.()) ?? []).map((d) => new Promise((r) => { if (!d.name) return r(null); const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => r(null); })));
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('opening-debug-skip').click();
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('village-screen')).toBeVisible();
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
  // The parts are the delivered ones: the frame round her, the panel, the rows, the buttons.
  await expect(page.locator('.status-screen .crystal-frame')).toHaveCount(1);
  await expect(page.locator('.status-screen [data-kit="panel"]')).toHaveCount(1);
  await expect(page.locator('.status-screen [data-kit="listRow"]').first()).toBeVisible();
  for (const [w, h] of [[844, 390], [640, 300]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const to of ['status-to-status', 'status-to-profile', 'status-to-skills']) {
      await page.getByTestId(to).click();
      expect(await wordsInsideParts(page, '.status-screen'), `${w}×${h} ${to}`).toEqual([]);
    }
    await page.getByTestId('status-tab-kaos').click();
    await page.getByTestId('status-to-status').click();
    expect(await wordsInsideParts(page, '.status-screen'), `${w}×${h} kaos`).toEqual([]);
    await page.getByTestId('status-tab-hero').click();
  }
});
