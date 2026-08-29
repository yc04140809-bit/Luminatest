import { test, expect, type Page } from '@playwright/test';
import { readMemoryEvents, readWorldStateValue, walkToEncounterMarker } from './helpers';

// PHASE D.5 acceptance: the dev admin panel drives the real game systems.

async function goHome(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openAdmin(page: Page) {
  await page.getByTestId('dev-admin-entry').click();
  await expect(page.getByTestId('dev-lock-screen')).toBeVisible();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
}

test('lock rejects a wrong code and accepts 0909', async ({ page }) => {
  await goHome(page);
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('1234');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-lock-error')).toBeVisible();
  await expect(page.getByTestId('dev-admin-screen')).toHaveCount(0);

  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
});

test('completion scenario: reset world -> SPARE preset -> +3 days -> +3 years -> reset scenario -> replay', async ({
  page,
}) => {
  await goHome(page);
  await openAdmin(page);

  // RESET WORLD (with confirmation).
  await page.getByTestId('reset-world-button').click();
  await page.getByTestId('confirm-reset-world').click();
  await expect(page.getByTestId('dev-status')).toHaveText('完了: RESET WORLD');
  await expect(page.getByTestId('dev-clock')).toContainText('1年目 1日目（通算 1日目）');
  await expect(page.getByTestId('dev-gald')).toContainText('age: 27');
  await expect(page.getByTestId('dev-gald')).toContainText('occupation: BANDIT');
  await expect(page.getByTestId('dev-choice')).toContainText('NONE');

  // SPARE preset.
  await page.getByTestId('preset-SPARE').click();
  await expect(page.getByTestId('dev-choice')).toContainText('SPARE');
  await expect(page.getByTestId('dev-event-PLAYER_SPARED_GALD')).toBeVisible();

  // +3 DAYS -> GALD_LEAVES_BANDITS in the timeline, with causedBy.
  await page.getByTestId('time-plus-3d').click();
  await expect(page.getByTestId('dev-clock')).toContainText('1年目 4日目');
  await expect(page.getByTestId('dev-event-GALD_LEAVES_BANDITS')).toBeVisible();
  await expect(page.getByTestId('dev-event-GALD_LEAVES_BANDITS')).toContainText(
    'causedBy: PLAYER_SPARED_GALD',
  );
  await expect(page.getByTestId('dev-gald')).toContainText('occupation: NONE');

  // +3 YEARS -> age 30, once holds.
  await page.getByTestId('time-plus-3y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目 4日目');
  await expect(page.getByTestId('dev-gald')).toContainText('age: 30');
  let events = await readMemoryEvents(page);
  expect(events.filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);
  expect(events.filter((e) => e.type === 'WORLD_TIME_SHIFTED')).toHaveLength(1);

  // RESET SCENARIO: Gald resets, clock and world history survive.
  await page.getByTestId('reset-scenario-button').click();
  await page.getByTestId('confirm-reset-scenario').click();
  await expect(page.getByTestId('dev-status')).toHaveText('完了: RESET SCENARIO');
  await expect(page.getByTestId('dev-choice')).toContainText('NONE');
  await expect(page.getByTestId('dev-gald')).toContainText('age: 27');
  await expect(page.getByTestId('dev-gald')).toContainText('occupation: BANDIT');
  await expect(page.getByTestId('dev-clock')).toContainText('4年目 4日目');
  await expect(page.getByTestId('dev-event-WORLD_TIME_SHIFTED')).toBeVisible();
  events = await readMemoryEvents(page);
  expect(events.map((e) => e.type)).toEqual(['WORLD_TIME_SHIFTED']);

  // The scenario is replayable in the actual game: the forest encounter
  // is armed again.
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await walkToEncounterMarker(page);
  await expect(page.getByTestId('gald-encounter')).toBeVisible({ timeout: 15_000 });
});

test('KILL preset: dead Gald does not age through +3 YEARS', async ({ page }) => {
  await goHome(page);
  await openAdmin(page);
  await page.getByTestId('preset-KILL').click();
  await expect(page.getByTestId('dev-gald')).toContainText('alive: false');
  await page.getByTestId('time-plus-3y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await expect(page.getByTestId('dev-gald')).toContainText('age: 27');
  const gald = (await readWorldStateValue(page, 'character_GALD')) as { age: number };
  expect(gald.age).toBe(27);
});

test('SPARE_3Y preset builds canon, and it matches the game after a reload', async ({ page }) => {
  await goHome(page);
  await openAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目 4日目');
  await expect(page.getByTestId('dev-gald')).toContainText('age: 30');

  // Reload the whole app: the game (HOME clock, WORLD MEMORY) agrees with
  // what the admin showed.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('gald-state')).toContainText('age: 30');
  await expect(page.getByTestId('memory-event-GALD_LEAVES_BANDITS')).toBeVisible();
});
