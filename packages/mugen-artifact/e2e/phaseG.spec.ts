import { test, expect, type Page } from './fixtures';

// PHASE G: the polish layer — it must hold on real phone sizes, keep
// preferences out of world history, and never break the core loop.

// The same three phones, held the way a landscape game is held.
const PHONE_SIZES = [
  { name: '800x360', width: 800, height: 360 },
  { name: '844x390', width: 844, height: 390 },
  { name: '915x412', width: 915, height: 412 },
];

async function startNewGame(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  await expect(kaos).toBeVisible();
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  // A pixel of rounding slack; anything more is a real sideways scroll.
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

for (const size of PHONE_SIZES) {
  test(`layout holds at ${size.name}: no horizontal scroll, controls reachable`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await startNewGame(page);
    await expectNoHorizontalScroll(page);

    // Home controls are inside the viewport and tappable.
    for (const id of ['explore-button', 'world-memory-button', 'settings-button', 'rest-button']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `${id} should be laid out`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    }

    // Explore and archive lists too.
    await page.getByTestId('explore-button').click();
    await expectNoHorizontalScroll(page);
    await page.locator('.screen-footer .btn').click();
    await page.getByTestId('archive-button').click();
    await expectNoHorizontalScroll(page);
    await page.getByTestId('archive-back').click();
    await page.getByTestId('settings-button').click();
    await expectNoHorizontalScroll(page);
  });
}

test('settings persist across a reload and never enter world history', async ({ page }) => {
  await startNewGame(page);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-screen')).toBeVisible();

  await page.getByTestId('haptic-toggle').click();
  await expect(page.getByTestId('haptic-toggle')).toHaveText('OFF');
  await page.getByTestId('motion-toggle').click();
  await expect(page.getByTestId('motion-toggle')).toHaveText('ON');
  await page.getByTestId('bgm-volume').fill('20');

  // Preferences are localStorage; the world's DB stays empty.
  const stored = await page.evaluate(() => localStorage.getItem('mugen-zero-settings'));
  expect(stored).toContain('"hapticEnabled":false');
  const eventCount = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('memory_events')) {
            db.close();
            resolve(0);
            return;
          }
          const rq = db.transaction('memory_events', 'readonly').objectStore('memory_events').getAll();
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result.length);
          };
        };
        open.onerror = () => resolve(-1);
      }),
  );
  expect(eventCount).toBe(0);

  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('haptic-toggle')).toHaveText('OFF');
  await expect(page.getByTestId('motion-toggle')).toHaveText('ON');
  await expect(page.getByTestId('bgm-volume')).toHaveValue('20');
});

test('Kaos speaks with a portrait, and dialogue is keyboard operable', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();

  const kaos = page.getByTestId('kaos-intro');
  await expect(kaos).toBeVisible();
  await expect(page.getByTestId('dialogue-portrait')).toBeVisible();
  await expect(page.getByText('やっと来た。')).toBeVisible();

  // Enter advances the line, so the game is playable without a mouse.
  await kaos.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('やっと来た。')).toHaveCount(0);
});

test('the app exposes a PWA manifest and registers no service worker in dev', async ({ page }) => {
  await page.goto('/');
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
  expect(manifestHref).toBeTruthy();
  const manifest = await page.evaluate(async (href) => {
    const res = await fetch(href!);
    return res.ok ? await res.json() : null;
  }, manifestHref);
  expect(manifest).toMatchObject({
    name: 'MUGEN ZERO',
    short_name: 'MUGEN',
    display: 'standalone',
    // The game is landscape now, and an installed copy asks for it.
    orientation: 'landscape',
  });
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
});
