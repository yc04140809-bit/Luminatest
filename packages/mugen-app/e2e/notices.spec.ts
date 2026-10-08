import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { goTo, settled } from './roam';

/**
 * 共通通知キュー (2026-10-08): notices arriving together are shown one at a
 * time, the important first; one arriving while another is shown waits; never
 * two on screen. Said through the development handle on the queue, as the
 * game's own notices are (OnceNotice, the walk's pickups).
 */

type Notices = { push(n: Record<string, unknown>): void };
const say = (page: Page, list: Record<string, unknown>[]) =>
  page.evaluate((items) => {
    const q = (window as unknown as { __mugenNotices: Notices }).__mugenNotices;
    for (const n of items) q.push(n);
  }, list);

async function freshVillage(page: Page) {
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
}

/** Watches the screen, recording each notice as it appears and the most ever on screen at once. */
async function watch(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __seen: string[]; __most: number };
    w.__seen = [];
    w.__most = 0;
    const look = () => {
      const on = [...document.querySelectorAll('.once-notice, .walk-got')];
      w.__most = Math.max(w.__most, on.length);
      for (const el of on) if (w.__seen[w.__seen.length - 1] !== el.textContent) w.__seen.push(el.textContent ?? '');
    };
    new MutationObserver(look).observe(document.body, { subtree: true, childList: true, characterData: true });
  });
}
const seen = (page: Page) => page.evaluate(() => (window as unknown as { __seen: string[] }).__seen);
const most = (page: Page) => page.evaluate(() => (window as unknown as { __most: number }).__most);

const N = (message: string, priority: string, look = 'top', extra: Record<string, unknown> = {}) => ({
  type: 'test',
  message,
  priority,
  look,
  duration: 700,
  testId: 'test-notice',
  ...extra,
});

test('one notice: shown, then gone', async ({ page }) => {
  await freshVillage(page);
  await watch(page);
  await say(page, [N('ひとつ', 'NORMAL')]);
  await expect(page.locator('.once-notice')).toHaveText('ひとつ');
  await expect(page.locator('.once-notice')).toHaveCount(0, { timeout: 3000 });
});

test('two and three at once: one at a time, the important first, never on top of each other', async ({ page }) => {
  await freshVillage(page);
  await watch(page);
  await say(page, [N('薬草 ×1 を手に入れた', 'LOW', 'bottom'), N('新しい目的地が追加されました', 'HIGH')]);
  await expect.poll(() => seen(page), { timeout: 5000 }).toEqual(['新しい目的地が追加されました', '薬草 ×1 を手に入れた']);
  await expect(page.locator('.once-notice, .walk-got')).toHaveCount(0, { timeout: 3000 });
  await watch(page);
  await say(page, [N('アイテム', 'LOW', 'bottom'), N('AUTO', 'NORMAL'), N('目的地', 'HIGH')]);
  await expect.poll(() => seen(page), { timeout: 6000 }).toEqual(['目的地', 'AUTO', 'アイテム']);
  expect(await most(page)).toBe(1);
});

test('one said while another is shown waits for it — the first is not cut short', async ({ page }) => {
  await freshVillage(page);
  await watch(page);
  await say(page, [N('先', 'LOW', 'top', { duration: 1200 })]);
  await expect(page.locator('.once-notice')).toHaveText('先');
  await say(page, [N('後（重要）', 'HIGH')]);
  await page.waitForTimeout(400);
  await expect(page.locator('.once-notice')).toHaveText('先');
  await expect(page.locator('.once-notice')).toHaveText('後（重要）', { timeout: 3000 });
  expect(await seen(page)).toEqual(['先', '後（重要）']);
  expect(await most(page)).toBe(1);
});

test('the same find again before it shows is counted together', async ({ page }) => {
  await freshVillage(page);
  await watch(page);
  await page.evaluate(() => {
    const q = (window as unknown as { __mugenNotices: Notices }).__mugenNotices;
    q.push({ type: 'test', message: '先', priority: 'LOW', look: 'top', duration: 800 });
    for (let i = 0; i < 3; i++)
      q.push({
        type: 'pickup',
        message: '薬草 ×1 を手に入れた',
        priority: 'LOW',
        look: 'bottom',
        duration: 700,
        merge: { key: 'got:FOREST_HERB', count: 1, format: (n: number) => `薬草 ×${n} を手に入れた` },
      });
  });
  await expect.poll(() => seen(page), { timeout: 5000 }).toEqual(['先', '薬草 ×3 を手に入れた']);
});

test('the walk’s own pickup notice goes through the queue, and a screen change drops what was waiting', async ({ page }) => {
  await freshVillage(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await goTo(page, 'forest_pickup_002');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-got')).toHaveText('森の木の実 ×2 を手に入れた');
  // Something else queued behind it; leaving the forest drops both.
  await say(page, [N('残らない', 'LOW')]);
  await page.getByTestId('leave-forest').click();
  await page.waitForTimeout(3000);
  await expect(page.locator('.once-notice, .walk-got')).toHaveCount(0);
});
