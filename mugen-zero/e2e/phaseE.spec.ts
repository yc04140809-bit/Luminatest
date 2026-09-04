import { test, expect, type Page } from './fixtures';
import { playToLifeChoice, readMemoryEvents, advanceDays } from './helpers';

// PHASE E acceptance: the spared bandit's life continues off-screen, the
// player discovers the new bakery through ordinary exploration — never a
// notification — and the reunion is recorded only when it actually happens.

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

async function timeShift3y(page: Page) {
  await page.getByTestId('time-shift-button').click();
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('time-shift-return').click();
}

test('the first reunion: spare, let life move on, discover the bakery, 「……見るな。」', async ({
  page,
}) => {
  await spareGaldAndReturnHome(page);
  await advanceDays(page, 3); // GALD_LEAVES_BANDITS fires off-screen

  // No bakery yet — and no spoilers anywhere.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('location-ALDEN_BAKERY')).toHaveCount(0);
  await page.locator('.screen-footer .btn').click(); // もどる

  await timeShift3y(page);
  await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');

  // Still no announcement: the player-facing memory shows nothing about
  // the bakery or Gald's new life.
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('memory-event-GALD_BECOMES_BAKER')).toHaveCount(0);
  await expect(page.getByTestId('memory-event-GALD_LEAVES_BANDITS')).toHaveCount(0);
  await page.getByTestId('world-memory-back').click();

  // Ordinary exploration: something new stands where the empty shop was.
  await page.getByTestId('explore-button').click();
  const bakeryCard = page.getByTestId('location-ALDEN_BAKERY');
  await expect(bakeryCard).toBeVisible();
  await expect(bakeryCard).toContainText('？？？');
  await expect(bakeryCard).not.toContainText('パン屋');
  await expect(bakeryCard).not.toContainText('ガルド');

  // Enter. The discovery is the player's.
  await bakeryCard.click();
  const scene = page.getByTestId('bakery-first-visit');
  await expect(scene).toBeVisible();
  await expect(page.getByText('焼きたてのパンの匂いがする。')).toBeVisible();
  await scene.click(); // 男がパンを運んでくる
  await scene.click(); // いらっしゃ――
  await scene.click(); // 動きが止まる
  await scene.click(); // …………
  await scene.click();
  await expect(page.getByText('……見るな。')).toBeVisible();
  await scene.click(); // ガルド？
  await scene.click(); // その名前を、店で呼ぶな。
  await scene.click();

  // Kaos gets one quiet line — after the discovery, never before.
  await expect(page.getByTestId('bakery-reunion-done')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('「……続き、あったでしょ？」')).toBeVisible();

  // The reunion is now world truth, caused by the bakery.
  let events = await readMemoryEvents(page);
  const reunions = events.filter((e) => e.type === 'PLAYER_REUNITED_WITH_GALD');
  expect(reunions).toHaveLength(1);
  expect((reunions[0] as { causedBy?: string[] }).causedBy).toEqual(['GALD_BECOMES_BAKER']);
  expect(reunions[0].location).toBe('ALDEN_BAKERY');
  expect(reunions[0].actors).toEqual(['PLAYER', 'GALD']);

  await page.getByTestId('bakery-leave').click();

  // The first reunion closes with Kaos, then back into the world.
  const ending = page.getByTestId('ending-kaos');
  await expect(ending).toBeVisible();
  for (let i = 0; i < 4; i++) await ending.click();
  await expect(page.getByTestId('ending-screen')).toBeVisible();
  await page.getByTestId('ending-keep-playing').click();

  // Discovered: the card now reads パン屋.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('location-ALDEN_BAKERY')).toContainText('パン屋');

  // Revisit: an ordinary shop, no replayed reunion.
  await page.getByTestId('location-ALDEN_BAKERY').click();
  const revisit = page.getByTestId('bakery-revisit');
  await expect(revisit).toBeVisible();
  await expect(page.getByText('今日は何だ。')).toBeVisible();
  await expect(page.getByText('……見るな。')).toHaveCount(0);
  await revisit.click();
  await page.getByTestId('bakery-leave').click();

  events = await readMemoryEvents(page);
  expect(events.filter((e) => e.type === 'PLAYER_REUNITED_WITH_GALD')).toHaveLength(1);

  // After the reunion the player's memory view finally shows his story.
  await page.locator('.screen-footer .btn').click(); // もどる to HOME
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('memory-event-GALD_BECOMES_BAKER')).toBeVisible();
  await expect(page.getByTestId('memory-event-PLAYER_REUNITED_WITH_GALD')).toBeVisible();
  // The player sees the cause in words; the event id lives in the DB
  // (asserted above) and in the dev admin.
  await expect(page.getByTestId('caused-by-PLAYER_REUNITED_WITH_GALD')).toContainText(
    '男は、パン屋として生き始めた',
  );
});

test('KILL world: three years later there is no bakery and no living Gald', async ({ page }) => {
  // Build the state fast through the dev admin (official APIs underneath).
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId('preset-KILL').click();
  await expect(page.getByTestId('dev-gald')).toContainText('alive: false');
  await page.getByTestId('time-plus-3y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await expect(page.getByTestId('dev-gald')).toContainText('age: 27');
  await page.getByTestId('dev-admin-back').click();

  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('location-ALDEN_BAKERY')).toHaveCount(0);

  // The KILL route has a future of its own — but it is a grave, and the
  // SPARE chain never runs in this world.
  const events = await readMemoryEvents(page);
  const types = events.map((e) => e.type);
  expect(types).not.toContain('GALD_LEAVES_BANDITS');
  expect(types).not.toContain('GALD_ARRIVES_IN_ALDEN');
  expect(types).not.toContain('GALD_BECOMES_BAKER');
  expect(types).toContain('GALD_IS_BURIED');
});
