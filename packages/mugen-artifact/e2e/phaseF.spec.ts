import { test, expect, type Page } from './fixtures';
import {
  advanceDays,
  devTimeShift,
  enterDevAdmin,
  intoTheVillage,
  playToLifeChoice,
} from './helpers';

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

// Since 2026-10-20 見逃す is ROUTE D (作者): it leaves nowhere to find him, so
// on that route the archive never grows past what the player saw — and the
// discovery that connects a record is played on 捕らえる (the workyard).
test('SPARE (ROUTE D): the archive never spoils the life that went on without the player — not even 3 years on', async ({
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

  // +3 years: outside the village in truth, the merchants helped — still not a word of it.
  await devTimeShift(page);
  await openGaldRecord(page);
  const detailText = await page.getByTestId('archive-detail').innerText();
  expect(detailText).not.toContain('パン');
  expect(detailText).not.toContain('アルデンへ');
  expect(detailText).not.toContain('森を去った');
  expect(detailText).not.toContain('商会');
  await expect(page.getByTestId('archive-unknown')).toBeVisible();
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(2);
  await closeArchive(page);
});

test('the archive reveals Gald\'s life only through the player\'s own discovery (捕らえる: the workyard)', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await enterDevAdmin(page);
  await page.getByTestId('preset-CAPTURE_3Y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await page.getByTestId('dev-admin-back').click();

  // Three years on in truth — and the archive knows only what the player saw.
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-chapter-GALD_CH_FIRST_ENCOUNTER')).toContainText('捕らえた男');
  await expect(page.getByTestId('archive-chapter-GALD_CH_TRIAL')).toHaveCount(0);
  await expect(page.getByTestId('archive-unknown')).toBeVisible();
  await closeArchive(page);

  // The discovery itself: ??? place -> reunion.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_WORKYARD').click();
  const scene = page.getByTestId('workyard-first-visit');
  const done = page.getByTestId('workyard-reunion-done');
  await expect(scene).toBeVisible();
  for (let i = 0; i < 30 && !(await done.isVisible().catch(() => false)); i++) {
    if (await scene.isVisible().catch(() => false)) await scene.click();
  }
  await expect(done).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('workyard-leave').click();
  const ending = page.getByTestId('ending-kaos');
  await expect(ending).toBeVisible();
  for (let i = 0; i < 4; i++) await ending.click();
  await page.getByTestId('ending-keep-playing').click(); // -> HOME

  // Now the life connects into one record, dated from the true history.
  await openGaldRecord(page);
  await expect(page.getByTestId('archive-detail')).toContainText('ガルド の人生');
  await expect(page.getByTestId('archive-chapter-GALD_CH_TRIAL')).toContainText('1年目');
  await expect(page.getByTestId('archive-chapter-GALD_CH_REUNION')).toContainText('4年目');
  await expect(page.getByTestId('archive-unknown')).toHaveCount(0);
  const cards = page.getByTestId('archive-detail').locator('.location-card');
  await expect(cards).toHaveCount(5);
  const record = await cards.allInnerTexts();
  await closeArchive(page);

  // Reopening shows the identical record (no duplication).
  await openGaldRecord(page);
  expect(await page.getByTestId('archive-detail').locator('.location-card').allInnerTexts()).toEqual(record);
  await closeArchive(page);

  // And a full page reload restores it unchanged.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await intoTheVillage(page);
  await openGaldRecord(page);
  expect(await page.getByTestId('archive-detail').locator('.location-card').allInnerTexts()).toEqual(record);
});

async function goHomeAndOpenAdmin(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await enterDevAdmin(page);
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
}

test('KILL: an ended life — a ??? card, and no bakery chapters, even 3 years on', async ({ page }) => {
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
  // His life ended — and the world's continuation is still unfound, so the
  // record reads exactly like every other undiscovered route.
  await expect(page.getByTestId('archive-unknown')).toBeVisible();
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(2);
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
  await expect(page.getByTestId('dev-archive-GALD_CH_LEFT_FOREST')).toContainText('[UNKNOWN]');
  await expect(page.getByTestId('dev-archive-GALD_CH_LEFT_FOREST')).toContainText(
    'source: GALD_LEAVES_BANDITS',
  );
  // ROUTE D: no bakery chapter exists in this world's truth at all.
  await expect(page.getByTestId('dev-archive-GALD_CH_NEW_WORK')).toHaveCount(0);
  await expect(page.getByTestId('dev-archive-unknown-state')).toContainText(
    'player view: 1 known chapter(s)',
  );
});
