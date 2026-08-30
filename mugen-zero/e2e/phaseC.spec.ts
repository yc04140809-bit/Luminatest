import { test, expect } from '@playwright/test';
import {
  playToLifeChoice,
  readMemoryEvents,
  readWorldStateValue,
  advanceDays,
} from './helpers';

// PHASE C acceptance: a past fact (PLAYER_SPARED_GALD) plus elapsed time
// causes a future event (GALD_LEAVES_BANDITS) with traceable causality.

async function spareGaldAndReturnHome(page: import('@playwright/test').Page) {
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

test('SPARE + 3 elapsed days causes GALD_LEAVES_BANDITS exactly once, and it survives a reload', async ({
  page,
}) => {
  await spareGaldAndReturnHome(page);
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 1日目');

  // Two days pass: not yet.
  await advanceDays(page, 2);
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 3日目');
  let events = await readMemoryEvents(page);
  expect(events.map((e) => e.type)).toEqual(['PLAYER_SPARED_GALD']);

  // Third day: the world remembers, and Gald acts on it.
  await advanceDays(page, 1);
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 4日目');
  events = await readMemoryEvents(page);
  const leaves = events.filter((e) => e.type === 'GALD_LEAVES_BANDITS');
  expect(leaves).toHaveLength(1);
  expect((leaves[0] as { causedBy?: string[] }).causedBy).toEqual(['PLAYER_SPARED_GALD']);

  // CHARACTER STATE (current) updated atomically with the event.
  const gald = (await readWorldStateValue(page, 'character_GALD')) as {
    occupation: string;
    location: string;
  };
  expect(gald.occupation).toBe('NONE');
  expect(gald.location).toBe('UNKNOWN');

  // Full truth (causal chain, current state) lives in the DEV ADMIN viewer;
  // the player-facing WORLD MEMORY hides Gald's unwitnessed life.
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('memory-event-PLAYER_SPARED_GALD')).toBeVisible();
  await expect(page.getByTestId('memory-event-GALD_LEAVES_BANDITS')).toHaveCount(0);
  await page.getByTestId('world-memory-back').click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-event-GALD_LEAVES_BANDITS')).toContainText(
    'causedBy: PLAYER_SPARED_GALD',
  );
  await expect(page.getByTestId('dev-gald')).toContainText('occupation: NONE');
  await page.getByTestId('dev-admin-back').click();

  // once: more days never duplicate it.
  await advanceDays(page, 3);
  events = await readMemoryEvents(page);
  expect(events.filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);

  // Reload: everything restored — history, clock, and Gald's current state.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 7日目');
  events = await readMemoryEvents(page);
  expect(events.map((e) => e.type).sort()).toEqual(['GALD_LEAVES_BANDITS', 'PLAYER_SPARED_GALD']);
  const galdAfter = (await readWorldStateValue(page, 'character_GALD')) as { occupation: string };
  expect(galdAfter.occupation).toBe('NONE');
});

test('negative: KILL + many days never causes GALD_LEAVES_BANDITS', async ({ page }) => {
  await playToLifeChoice(page);
  await page.getByTestId('choice-KILL').click();
  const result = page.getByTestId('choice-result-dialogue');
  await expect(result).toBeVisible();
  await result.click();
  await result.click();
  await page.getByTestId('choice-recorded-screen').waitFor();
  await page.getByTestId('return-home-button').click();

  await advanceDays(page, 5);
  const events = await readMemoryEvents(page);
  expect(events.map((e) => e.type)).toEqual(['PLAYER_KILLED_GALD']);
});

test('RESET WORLD clears memory, clock and character state', async ({ page }) => {
  await spareGaldAndReturnHome(page);
  await advanceDays(page, 3);
  expect((await readMemoryEvents(page)).length).toBe(2);

  await page.reload();
  await page.getByTestId('reset-button').click();
  await page.getByTestId('confirm-reset-button').click();
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 10_000 });

  expect(await readMemoryEvents(page)).toHaveLength(0);
  expect(await readWorldStateValue(page, 'world_clock')).toBeUndefined();
  expect(await readWorldStateValue(page, 'character_GALD')).toBeUndefined();

  // A brand-new run starts from the defaults again.
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 1日目');
});
