import { test, expect, type Page } from './fixtures';
import {
  advanceDays,
  devTimeShift,
  enterDevAdmin,
  playToLifeChoice,
  readMemoryEvents,
} from './helpers';

// PHASE E acceptance: the spared bandit's life continues off-screen and is
// never announced (since 2026-10-20 it leaves nowhere in the village to find
// him — ROUTE D); a reunion is recorded only when it actually happens.

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

async function timeShift3y(page: Page) {
  await devTimeShift(page);
}

// Since 2026-10-20 見逃す is ROUTE D (作者): 「見逃した世界では、ガルドは村には残らない」.
// His life still goes on off-screen and is still never announced — but there
// is no bakery to discover and no reunion to record. (The reunion itself is
// played on the routes that leave a place: e2e/fourFutures.spec.ts.)
test('SPARE (ROUTE D): his life moves on off-screen, never announced — and nowhere in the village to find him', async ({
  page,
}) => {
  await spareGaldAndReturnHome(page);
  await advanceDays(page, 3); // GALD_LEAVES_BANDITS fires off-screen

  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('location-ALDEN_BAKERY')).toHaveCount(0);
  await page.locator('.screen-footer .btn').click(); // もどる

  await timeShift3y(page);
  await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');

  // No announcement: the player-facing memory shows nothing of his life.
  await page.getByTestId('world-memory-button').click();
  for (const type of ['GALD_LEAVES_BANDITS', 'GALD_SAVES_MERCHANTS', 'MERCHANTS_LEARN_OF_ELNA', 'GALD_BECOMES_BAKER']) {
    await expect(page.getByTestId(`memory-event-${type}`)).toHaveCount(0);
  }
  await page.getByTestId('world-memory-back').click();

  // Ordinary exploration finds nothing of his: no bakery, no place of any route.
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
  for (const site of ['ALDEN_BAKERY', 'GREENWOOD_WAYSTATION', 'ALDEN_WORKYARD', 'GREENWOOD_GRAVE']) {
    await expect(page.getByTestId(`location-${site}`)).toHaveCount(0);
  }

  // World truth: ROUTE D happened, caused by the choice; the retired chain and a reunion never did.
  const events = await readMemoryEvents(page);
  const types = events.map((e) => e.type);
  for (const type of ['GALD_LEAVES_BANDITS', 'GALD_SAVES_MERCHANTS', 'MERCHANTS_LEARN_OF_ELNA']) {
    expect(types.filter((t) => t === type)).toHaveLength(1);
  }
  expect((events.find((e) => e.type === 'GALD_LEAVES_BANDITS') as { causedBy?: string[] }).causedBy).toEqual([
    'PLAYER_SPARED_GALD',
  ]);
  for (const type of ['GALD_ARRIVES_IN_ALDEN', 'GALD_BECOMES_BAKER', 'PLAYER_REUNITED_WITH_GALD']) {
    expect(types).not.toContain(type);
  }
});

test('KILL world: three years later there is no bakery and no living Gald', async ({ page }) => {
  // Build the state fast through the dev admin (official APIs underneath).
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await enterDevAdmin(page);
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
