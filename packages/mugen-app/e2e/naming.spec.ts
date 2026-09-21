import { test, expect, type Page } from '@playwright/test';

/**
 * NAMING — asked once, on the way out of the opening.
 *
 * The three things worth a browser: that it is asked before the
 * village and not after, that the answer survives a restart, and that
 * 「つづきから」 never asks again. The last one is not arranged by a
 * flag — the naming step sits inside the prologue, and CONTINUE goes
 * straight to HOME — so it is exactly the sort of claim that has to be
 * driven rather than argued.
 */

async function freshApp(page: Page) {
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

async function throughTheOpening(page: Page) {
  await page.getByTestId('start-button').click();
  const next = page.getByTestId('opening-next');
  for (let i = 0; i < 3; i++) await next.click();
}

async function openStatus(page: Page) {
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
}

test('asks after the opening and before the village, then keeps the name', async ({ page }) => {
  await freshApp(page);
  await throughTheOpening(page);

  // Before the village, not after: the clock is not up yet.
  await expect(page.getByTestId('naming-screen')).toBeVisible();
  await expect(page.getByTestId('world-clock')).toHaveCount(0);

  await page.getByTestId('naming-input').fill('レイ');
  await page.getByTestId('naming-confirm').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await openStatus(page);
  await expect(page.getByTestId('status-name-text')).toHaveText('レイ');
});

test('will not take a name that is only space, in either width', async ({ page }) => {
  await freshApp(page);
  await throughTheOpening(page);

  const input = page.getByTestId('naming-input');
  const confirm = page.getByTestId('naming-confirm');
  for (const blank of ['   ', '　　']) {
    await input.fill(blank);
    await expect(confirm).toBeDisabled();
  }
  // And it says why a too-long one is refused rather than cutting it.
  await input.fill('あ'.repeat(11));
  await expect(confirm).toBeDisabled();
  await expect(page.getByTestId('naming-count')).toContainText('11 / 10');

  // Trimmed, not rejected, when there is something in the middle.
  await input.fill('  レイ  ');
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await openStatus(page);
  // EXACTLY, so the trimming is what is being tested and not a
  // substring that would pass either way.
  await expect(page.getByTestId('status-name-text')).toHaveText('レイ');
});

test('lets them keep the default, and records that as chosen', async ({ page }) => {
  await freshApp(page);
  await throughTheOpening(page);

  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await openStatus(page);
  await expect(page.getByTestId('status-name-text')).toHaveText('主人公');
});

test('survives a restart, and CONTINUE never asks again', async ({ page }) => {
  await freshApp(page);
  await throughTheOpening(page);
  await page.getByTestId('naming-input').fill('リナ');
  await page.getByTestId('naming-confirm').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  // Closing the game with nothing done but the naming, which is the
  // case that would otherwise lose the name: without naming counting
  // as progress there is no 「つづきから」 at all, and the only way
  // back in would ask the question again.
  await page.reload();
  await page.getByTestId('continue-button').click();
  // Straight to the village. Never asked twice.
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await expect(page.getByTestId('naming-screen')).toHaveCount(0);

  await openStatus(page);
  await expect(page.getByTestId('status-name-text')).toHaveText('リナ');
});
