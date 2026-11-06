import { test, expect } from '@playwright/test';
import { throughTheOpening } from './opening';

/**
 * エラー時の受け皿 (A3, src/ui/common/CrashScreen.tsx): a screen that breaks while drawn is never a blank page.
 * It says so, that the record is kept, and goes back to the title — without 「また、ここで。」 again — where
 * 「つづきから」 takes the game up where it was. (A debug build breaks a screen on request; a release has no way.)
 */
test.use({ storageState: { cookies: [{ name: 'mugen_dev_time_pass', value: 'off', domain: '127.0.0.1', path: '/', expires: -1, httpOnly: false, secure: false, sameSite: 'Lax' }], origins: [] } });

test('a broken screen: said so, kept, back to the title past the intro, and on from 「つづきから」', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    localStorage.removeItem('mugen-last-error');
  });
  await page.reload();
  // This launch's 「また、ここで。」, skipped.
  await page.getByTestId('theme-intro-skip').click();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const day = await page.getByTestId('world-clock').textContent();

  await page.evaluate(() => window.dispatchEvent(new Event('mugen-dev-crash')));
  await expect(page.getByTestId('crash-screen')).toBeVisible();
  await expect(page.getByTestId('crash-screen')).toContainText('問題が起きました');
  await expect(page.getByTestId('crash-screen')).toContainText('ここまでの記録は残っています。');
  await expect(page.getByTestId('crash-code')).toHaveText('DEV: a screen broken on request');
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
  // Kept on the device for a report.
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('mugen-last-error') ?? 'null'));
  expect(kept.message).toBe('DEV: a screen broken on request');
  expect(kept.stack.length).toBeGreaterThan(0);

  await page.getByTestId('crash-resume').click();
  // The title at once: the intro was heard this launch.
  await expect(page.getByTestId('continue-button')).toBeVisible();
  await expect(page.getByTestId('theme-intro')).toHaveCount(0);
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toHaveText(day ?? '');

  // Only once: a launch after that plays 「また、ここで。」 as ever.
  await page.reload();
  await expect(page.getByTestId('theme-intro')).toBeVisible();
});

test('the crash screen on a phone held sideways: all of it on screen, the button within reach', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/');
  await page.getByTestId('theme-intro-skip').click();
  await expect(page.getByTestId('start-button')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('mugen-dev-crash')));
  const b = (await page.getByTestId('crash-resume').boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(300);
  expect(b.height).toBeGreaterThanOrEqual(30);
  const card = (await page.locator('.crash-card').boundingBox())!;
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(300);
});

test('B3: an error nothing caught — the game going on — is kept as the last error; a harmless one is not', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('mugen-last-error'));
  await page.getByTestId('theme-intro-skip').click();
  await expect(page.getByTestId('start-button')).toBeVisible();
  const kept = () => page.evaluate(() => JSON.parse(localStorage.getItem('mugen-last-error') ?? 'null') as { message: string; kind: string } | null);
  // A sound not allowed yet: the browser's own word, not kept.
  await page.evaluate(() => {
    setTimeout(() => void Promise.reject(new DOMException('play() failed', 'NotAllowedError')));
  });
  await page.waitForTimeout(300);
  expect(await kept()).toBeNull();
  // Something that finishes later and fails: kept, and the screen as it was.
  await page.evaluate(() => {
    setTimeout(() => void Promise.reject(new Error('DEV: a promise nothing caught')));
  });
  await expect.poll(async () => (await kept())?.message).toBe('DEV: a promise nothing caught');
  expect((await kept())?.kind).toBe('PROMISE');
  // An error thrown in what a button does: kept too.
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error('DEV: thrown and not caught');
    });
  });
  await expect.poll(async () => (await kept())?.message).toBe('DEV: thrown and not caught');
  expect((await kept())?.kind).toBe('ERROR');
  await expect(page.getByTestId('crash-screen')).toHaveCount(0);
  await expect(page.getByTestId('start-button')).toBeVisible();
});
