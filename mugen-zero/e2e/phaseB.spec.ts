import { test, expect } from '@playwright/test';
import { playToLifeChoice, readMemoryEvents, readSchemaVersion, walkToEncounterMarker } from './helpers';

// PHASE B acceptance: each life choice becomes a distinct canonical
// MEMORY_EVENT persisted in IndexedDB before the game advances.

const CHOICES: Array<[string, string]> = [
  ['KILL', 'PLAYER_KILLED_GALD'],
  ['SPARE', 'PLAYER_SPARED_GALD'],
  ['HELP', 'PLAYER_HELPED_GALD'],
  ['CAPTURE', 'PLAYER_CAPTURED_GALD'],
];

for (const [choice, eventType] of CHOICES) {
  test(`life choice ${choice} is persisted to IndexedDB as ${eventType}`, async ({ page }) => {
    await playToLifeChoice(page);
    await page.getByTestId(`choice-${choice}`).click();

    // The aftermath screen only appears after the save committed.
    await expect(page.getByTestId('choice-result-dialogue')).toBeVisible();

    const events = await readMemoryEvents(page);
    expect(events).toHaveLength(1);
    const event = events[0];
    expect(event.type).toBe(eventType);
    expect(event.id).toBe('evt_gald_first_encounter_life_choice');
    expect(event.worldYear).toBe(1);
    expect(event.worldDay).toBe(1);
    expect(event.location).toBe('GREENWOOD_FOREST');
    expect(event.actors).toEqual(['PLAYER', 'GALD']);
    expect(event.importance).toBe('MAJOR');
    expect(Date.parse(event.createdAt)).not.toBeNaN();

    expect(await readSchemaVersion(page)).toBe(2);
  });
}

test('SPARE survives a page reload; world stays exclusive; reset clears it', async ({ page }) => {
  await playToLifeChoice(page);
  await page.getByTestId('choice-SPARE').click();
  await expect(page.getByTestId('choice-result-dialogue')).toBeVisible();

  // --- Reload: the world remembers. ---
  await page.reload();
  await expect(page.getByTestId('continue-button')).toBeVisible();
  await page.getByTestId('continue-button').click();

  // WORLD MEMORY screen renders the persisted truth.
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('memory-event-PLAYER_SPARED_GALD')).toBeVisible();
  await page.getByTestId('world-memory-back').click();

  // --- Exclusivity: the first encounter can never happen again. ---
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await walkToEncounterMarker(page);
  await page.waitForTimeout(4_000); // enough time to walk to the old spot
  await expect(page.getByTestId('gald-encounter')).toHaveCount(0);

  let events = await readMemoryEvents(page);
  expect(events).toHaveLength(1);
  expect(events[0].type).toBe('PLAYER_SPARED_GALD');

  // --- RESET WORLD: back to a blank world, with confirmation. ---
  await page.reload();
  await page.getByTestId('reset-button').click();
  await page.getByTestId('cancel-reset-button').click(); // confirmation can be declined
  await page.getByTestId('reset-button').click();
  await page.getByTestId('confirm-reset-button').click();

  // Reset reloads the page into a fresh world.
  await expect(page.getByTestId('start-button')).toBeVisible({ timeout: 10_000 });
  events = await readMemoryEvents(page);
  expect(events).toHaveLength(0);
});
