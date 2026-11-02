import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 設定 (作者 2026-11-02): the sound as the player sets it, kept across a restart; タイトルに戻る from the village,
 * asked once; and the admin's reset — the lock number, then asked twice — that leaves a new game and keeps the
 * device's settings. In the crystal card, inside the screen at the smallest phone size.
 */
/** The buses as they come out (MASTER folded in) — null until the game has opened its world. */
const volumes = (page: Page) =>
  page.evaluate(() => (window as unknown as { __mugenAudio?: { volumes(): Record<string, number> } }).__mugenAudio?.volumes() ?? null);

async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    localStorage.clear();
  });
  await page.reload();
}

async function intoTheVillage(page: Page) {
  await fresh(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('from the title: the four levels and 全ミュート, heard at once and kept after a restart', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings')).toBeVisible();
  // As the game has always played until now.
  for (const [bus, v] of [['master', '100'], ['bgm', '35'], ['sfx', '80'], ['voice', '80']] as const)
    await expect(page.getByTestId(`settings-${bus}-value`)).toHaveText(v);
  await page.getByTestId('settings-voice').fill('50');
  await page.getByTestId('settings-master').fill('80');
  await expect(page.getByTestId('settings-voice-value')).toHaveText('50');
  await expect.poll(async () => (await volumes(page))?.voice).toBeCloseTo(0.4, 3);
  // 全ミュート: all silent, the levels kept.
  await page.getByTestId('settings-mute').click();
  await expect(page.getByTestId('settings-mute')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => volumes(page)).toEqual({ master: 0, bgm: 0, sfx: 0, voice: 0 });
  await page.getByTestId('settings-close').click();
  await expect(page.getByTestId('settings')).toHaveCount(0);
  // Kept: after a restart, the same — and heard so before the settings are opened again.
  await page.reload();
  await expect.poll(async () => (await volumes(page))?.master).toBe(0);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-voice-value')).toHaveText('50');
  await expect(page.getByTestId('settings-master-value')).toHaveText('80');
  await expect(page.getByTestId('settings-mute')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('settings-mute').click();
  await expect.poll(async () => (await volumes(page))?.voice).toBeCloseTo(0.4, 3);
  // No タイトルに戻る on the title itself.
  await expect(page.getByTestId('settings-title')).toHaveCount(0);
});

test('from the village: タイトルに戻る asks once — やめる stays, 戻る goes to the title with the save kept', async ({ page }) => {
  test.setTimeout(120_000);
  await intoTheVillage(page);
  await page.getByTestId('settings-button').click();
  await page.getByTestId('settings-title').click();
  await expect(page.getByTestId('settings-confirm-title')).toBeVisible();
  await page.getByTestId('settings-confirm-no').click();
  await expect(page.getByTestId('settings-title')).toBeVisible();
  await page.getByTestId('settings-title').click();
  await page.getByTestId('settings-confirm-yes').click();
  await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

test('管理者: a wrong number opens nothing; the right one opens データリセット — asked twice, then a new game, settings kept', async ({ page }) => {
  test.setTimeout(120_000);
  await intoTheVillage(page);
  await page.getByTestId('settings-button').click();
  await page.getByTestId('settings-voice').fill('30');
  await expect(page.getByTestId('settings-reset')).toHaveCount(0);
  await page.getByTestId('settings-admin').click();
  await page.getByTestId('settings-admin-code').fill('1234567');
  await page.getByTestId('settings-admin-unlock').click();
  await expect(page.getByTestId('settings-admin-wrong')).toBeVisible();
  await expect(page.getByTestId('settings-reset')).toHaveCount(0);
  await page.getByTestId('settings-admin-code').fill('4148999');
  await page.getByTestId('settings-admin-unlock').click();
  await expect(page.getByTestId('settings-admin-tools')).toBeVisible();
  // Asked twice: the first やめる keeps everything.
  await page.getByTestId('settings-reset').click();
  await expect(page.getByTestId('settings-confirm-reset_1')).toBeVisible();
  await page.getByTestId('settings-confirm-no').click();
  // Closed, it is locked again.
  await page.getByTestId('settings-close').click();
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-reset')).toHaveCount(0);
  await page.getByTestId('settings-admin').click();
  await page.getByTestId('settings-admin-code').fill('4148999');
  await page.getByTestId('settings-admin-unlock').click();
  await page.getByTestId('settings-reset').click();
  await page.getByTestId('settings-confirm-yes').click();
  await expect(page.getByTestId('settings-confirm-reset_2')).toBeVisible();
  await page.getByTestId('settings-confirm-yes').click();
  // A new game: はじめる, not つづきから — and the device's settings as they were.
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('continue-button')).toHaveCount(0);
  await page.getByTestId('settings-button').click();
  await expect(page.getByTestId('settings-voice-value')).toHaveText('30');
});

for (const size of [
  { width: 844, height: 390 },
  { width: 640, height: 300 },
]) {
  test(`${size.width}×${size.height}: the card inside the screen, every row reachable; the village's gear clear of the objective`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(size);
    await intoTheVillage(page);
    const gear = await page.getByTestId('settings-button').boundingBox();
    const objective = await page.getByTestId('next-objective').boundingBox();
    expect(gear && objective).toBeTruthy();
    // Not over the objective's box.
    expect(gear!.x + gear!.width <= objective!.x || gear!.y >= objective!.y + objective!.height || gear!.y + gear!.height <= objective!.y).toBe(true);
    expect(gear!.height).toBeGreaterThanOrEqual(24);
    await page.screenshot({ path: `test-results/settings-village-${size.width}.png` });
    await page.getByTestId('settings-button').click();
    const card = await page.locator('.settings-card').boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.y).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(size.width);
    expect(card!.y + card!.height).toBeLessThanOrEqual(size.height);
    for (const id of ['settings-master', 'settings-voice', 'settings-mute', 'settings-title', 'settings-close', 'settings-admin']) {
      await page.getByTestId(id).scrollIntoViewIfNeeded();
      await expect(page.getByTestId(id)).toBeInViewport();
    }
    await page.screenshot({ path: `test-results/settings-${size.width}.png` });
  });
}
