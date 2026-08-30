import { test, expect, type Page } from '@playwright/test';
import { playToLifeChoice, advanceDays } from './helpers';

// PHASE F acceptance: the LIFE ARCHIVE grows only with the player's own
// discoveries; the world's head start is never spoiled.

async function spareGaldAndReturnHome(page: Page) {
  await playToLifeChoice(page);
  await page.getByTestId('choice-SPARE').click();
  const result = page.getByTestId('choice-result-dialogue');
  await expect(result).toBeVisible();
  await result.click();
  await result.click();
  await result.click();
  await page.getByTestId('choice-recorded-screen').waitFor();
  await page.getByTestId('return-home-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openGaldRecord(page: Page) {
  await page.getByTestId('archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail')).toBeVisible();
}

async function closeArchive(page: Page) {
  await page.getByTestId('archive-detail-back').click();
  await page.getByTestId('archive-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('the archive reveals Gald\'s life only through the player\'s own discovery', async ({
  page,
}) => {
  await spareGaldAndReturnHome(page);

  // Right after SPARE: one known chapter + the unspoiled ??? card.
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-chapter-GALD_CH_FIRST_ENCOUNTER')).toContainText(
    '森の盗賊',
  );
  await expect(page.getByTestId('archive-chapter-GALD_CH_FIRST_ENCOUNTER')).toContainText(
    '1年目 1日目',
  );
  await expect(page.getByTestId('archive-unknown')).toContainText('まだ知らない人生がある。');
  await expect(page.getByTestId('archive-chapter-GALD_CH_LEFT_FOREST')).toHaveCount(0);
  await closeArchive(page);

  // Truth moves on (leaves fires) — the archive must not.
  await advanceDays(page, 3);
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-chapter-GALD_CH_LEFT_FOREST')).toHaveCount(0);
  await closeArchive(page);

  // +3 years: baker in truth — still not a word of it in the archive.
  await page.getByTestId('time-shift-button').click();
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('time-shift-return').click();

  await openGaldRecord(page);
  const detailText = await page.getByTestId('archive-detail').innerText();
  expect(detailText).not.toContain('パン');
  expect(detailText).not.toContain('アルデンへ');
  expect(detailText).not.toContain('森を去った');
  await expect(page.getByTestId('archive-unknown')).toBeVisible();
  await closeArchive(page);

  // The discovery itself: ??? shop -> reunion.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_BAKERY').click();
  const scene = page.getByTestId('bakery-first-visit');
  await expect(scene).toBeVisible();
  for (let i = 0; i < 8; i++) await scene.click();
  await expect(page.getByTestId('bakery-reunion-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('bakery-leave').click();
  await page.locator('.screen-footer .btn').click(); // explore -> HOME

  // Now the life connects into one record, dated from the true history.
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-detail')).toContainText('ガルド — LIFE RECORD');
  await expect(page.getByTestId('archive-chapter-GALD_CH_LEFT_FOREST')).toContainText('1年目 4日目');
  await expect(page.getByTestId('archive-chapter-GALD_CH_ARRIVED')).toContainText('1年目 34日目');
  await expect(page.getByTestId('archive-chapter-GALD_CH_NEW_WORK')).toContainText('1年目 94日目');
  await expect(page.getByTestId('archive-chapter-GALD_CH_REUNION')).toContainText('……見るな。');
  await expect(page.getByTestId('archive-chapter-GALD_CH_REUNION')).toContainText('4年目 4日目');
  await expect(page.getByTestId('archive-unknown')).toHaveCount(0);
  await closeArchive(page);

  // Reopening shows the identical record (no duplication).
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
  await closeArchive(page);

  // And a full page reload restores it unchanged.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
  await expect(page.getByTestId('archive-chapter-GALD_CH_NEW_WORK')).toContainText('1年目 94日目');
});

async function goHomeAndOpenAdmin(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
}

test('KILL: an ended life — no ??? card, no bakery chapters, even 3 years on', async ({ page }) => {
  await goHomeAndOpenAdmin(page);
  await page.getByTestId('preset-KILL').click();
  await page.getByTestId('time-plus-3y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await page.getByTestId('dev-admin-back').click();

  await page.getByTestId('archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  const text = await page.getByTestId('archive-detail').innerText();
  expect(text).toContain('森で終わった命');
  expect(text).not.toContain('パン');
  await expect(page.getByTestId('archive-unknown')).toHaveCount(0);
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(1);
});

for (const [preset, title] of [
  ['HELP', '手を差し伸べた'],
  ['CAPTURE', '捕らえた男'],
] as const) {
  test(`${preset}: own chapter, no SPARE life leaks in`, async ({ page }) => {
    await goHomeAndOpenAdmin(page);
    await page.getByTestId(`preset-${preset}`).click();
    await page.getByTestId('time-plus-3y').click();
    await expect(page.getByTestId('dev-clock')).toContainText('4年目');
    await page.getByTestId('dev-admin-back').click();

    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    const text = await page.getByTestId('archive-detail').innerText();
    expect(text).toContain(title);
    expect(text).not.toContain('見逃した');
    expect(text).not.toContain('パン');
    await expect(page.getByTestId('archive-unknown')).toBeVisible();
  });
}

test('dev admin shows the truth chapters with KNOWN/UNKNOWN state', async ({ page }) => {
  await goHomeAndOpenAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await expect(page.getByTestId('dev-archive-GALD_CH_FIRST_ENCOUNTER')).toContainText('[KNOWN]');
  await expect(page.getByTestId('dev-archive-GALD_CH_NEW_WORK')).toContainText('[UNKNOWN]');
  await expect(page.getByTestId('dev-archive-GALD_CH_NEW_WORK')).toContainText(
    'source: GALD_BECOMES_BAKER',
  );
  await expect(page.getByTestId('dev-archive-unknown-state')).toContainText(
    'player view: 1 known chapter(s)',
  );
});
