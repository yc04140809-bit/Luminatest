import { test, expect } from '@playwright/test';
import {
  playToLifeChoice,
  readMemoryEvents,
  readWorldStateValue,
  advanceDays,
} from './helpers';

// PHASE D acceptance: REST advances real time, TIME SHIFT skips years with
// player confirmation, ages the living, and never swallows mid-span events.

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

test('full Phase D arc: SPARE -> REST fires the event -> cancel keeps the world -> TIME SHIFT +3y ages Gald', async ({
  page,
}) => {
  await spareGaldAndReturnHome(page);

  // REST x3: GALD_LEAVES_BANDITS fires on the way.
  await advanceDays(page, 3);
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 4日目');
  let events = await readMemoryEvents(page);
  expect(events.filter((e) => e.type === 'GALD_LEAVES_BANDITS')).toHaveLength(1);

  // "まだ残る" changes nothing.
  await page.getByTestId('time-shift-button').click();
  await expect(page.getByTestId('time-shift-confirm')).toBeVisible();
  await page.getByTestId('time-shift-stay').click();
  await expect(page.getByTestId('world-clock')).toHaveText('1年目 4日目');
  events = await readMemoryEvents(page);
  expect(events.filter((e) => e.type === 'WORLD_TIME_SHIFTED')).toHaveLength(0);
  const galdBefore = (await readWorldStateValue(page, 'character_GALD')) as { age: number };
  expect(galdBefore.age).toBe(27);

  // "旅立つ": +3 years, exactly once even if tapped twice.
  await page.getByTestId('time-shift-button').click();
  const go = page.getByTestId('time-shift-go');
  await go.click();
  // Double-tap must be inert: the button is either disabled or already gone.
  await go.click({ force: true, timeout: 300 }).catch(() => {});
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('time-shift-return').click();

  await expect(page.getByTestId('world-clock')).toHaveText('4年目 4日目');
  events = await readMemoryEvents(page);
  const shifts = events.filter((e) => e.type === 'WORLD_TIME_SHIFTED');
  expect(shifts).toHaveLength(1);
  expect((shifts[0] as { yearsElapsed?: number }).yearsElapsed).toBe(3);
  expect((shifts[0] as { from?: object }).from).toEqual({ worldYear: 1, worldDay: 4 });
  expect((shifts[0] as { to?: object }).to).toEqual({ worldYear: 4, worldDay: 4 });

  const gald = (await readWorldStateValue(page, 'character_GALD')) as {
    age: number;
    occupation: string;
  };
  expect(gald.age).toBe(30);
  expect(gald.occupation).toBe('BAKER'); // the chained life continued off-screen

  // The player-facing viewer shows the shift (witnessed), never the
  // undiscovered life; the aged state is checked via DB above.
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('memory-event-WORLD_TIME_SHIFTED')).toBeVisible();
  await expect(page.getByTestId('memory-event-GALD_BECOMES_BAKER')).toHaveCount(0);
});

test('TIME SHIFT right after SPARE does not swallow GALD_LEAVES_BANDITS', async ({ page }) => {
  await spareGaldAndReturnHome(page);

  await page.getByTestId('time-shift-button').click();
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('time-shift-return').click();
  await expect(page.getByTestId('world-clock')).toHaveText('4年目 1日目');

  const events = await readMemoryEvents(page);
  const leaves = events.filter((e) => e.type === 'GALD_LEAVES_BANDITS');
  expect(leaves).toHaveLength(1);
  // Recorded on the day it actually became due inside the skipped span.
  expect(leaves[0].worldYear).toBe(1);
  expect(leaves[0].worldDay).toBe(4);
  expect((leaves[0] as { causedBy?: string[] }).causedBy).toEqual(['PLAYER_SPARED_GALD']);

  const gald = (await readWorldStateValue(page, 'character_GALD')) as {
    age: number;
    occupation: string;
    location: string;
  };
  expect(gald).toMatchObject({ age: 30, occupation: 'BAKER', location: 'ALDEN_VILLAGE' });
});
