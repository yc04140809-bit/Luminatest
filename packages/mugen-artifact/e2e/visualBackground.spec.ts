import { test, expect, type Page } from './fixtures';
import { PHONES, playToLifeChoice, viewportOf, walkToEncounterMarker } from './helpers';

// VISUAL BACKGROUND UPDATE: every screen that gained art must show it,
// must stay readable, and must never let the art eat a tap.

/** The CSS url() actually painted behind a screen. */
async function backdropUrl(page: Page, testId: string): Promise<string> {
  return page
    .getByTestId(testId)
    .locator('.screen-backdrop-art')
    .evaluate((el) => getComputedStyle(el).backgroundImage);
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test('TITLE wears the Kaos key visual and still takes a tap', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('title-backdrop')).toBeVisible();
  expect(await backdropUrl(page, 'title-backdrop')).toContain('title-kaos-keyvisual');

  // Decoration only: it must not intercept the button underneath.
  const events = await page
    .getByTestId('title-backdrop')
    .evaluate((el) => getComputedStyle(el).pointerEvents);
  expect(events).toBe('none');
  expect(await horizontalOverflow(page)).toBe(0);

  await page.getByTestId('start-button').click();
  await expect(page.getByTestId('prologue-monologue')).toBeVisible();
});

test('HOME is the village, and the art never blocks the menu', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  expect(await backdropUrl(page, 'home-backdrop')).toContain('location-alden-village');
  expect(await horizontalOverflow(page)).toBe(0);

  // Every HOME control still reachable with the backdrop in place.
  await page.getByTestId('world-memory-button').click();
  await expect(page.getByTestId('world-memory-list')).toBeVisible();
});

test('the battle happens where the encounter did — the same forest', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();

  // Through the shared helper, which waits for the scene to finish
  // booting before tapping. A tap at the frame the canvas appears is a
  // tap Phaser has not started listening for yet.
  await walkToEncounterMarker(page);

  const encounter = page.getByTestId('gald-encounter');
  await expect(encounter).toBeVisible({ timeout: 20_000 });
  const encounterArt = await backdropUrl(page, 'dialogue-backdrop');
  expect(encounterArt).toContain('location-greenwood-forest');

  await encounter.click();
  await encounter.click();
  await expect(page.getByTestId('battle-prototype')).toBeVisible();

  // The point of the whole change: the fight inherits the place.
  //
  // NOT THE SAME FILE any more, and that is the improvement rather than
  // a regression. The encounter is the forest's portrait; the fight
  // stands on the forest's walkable GROUND — `field-greenwood`, the
  // same picture the player was walking on a moment ago — so the fight
  // breaks out where they were standing instead of cutting to a still
  // of the same wood. Both are the greenwood and neither is anywhere
  // else, which is what "inherits the place" was always claiming.
  const battleArt = await page
    .getByTestId('battle-prototype')
    .locator('.bp-bg')
    .getAttribute('src');
  expect(battleArt).toContain('field-greenwood');
  expect(encounterArt).toContain('greenwood');
  expect(await horizontalOverflow(page)).toBe(0);

  // And the commands still work with art behind them — read off the
  // HEALTH rather than off the message. The plate shows ONE line now
  // where the old screen showed the last two, so by the time anything
  // can be asserted the bandit has already answered and 「…のダメージ。」
  // has scrolled off it. What the tap is being checked for is that it
  // reached the fight, and the bar is where the fight says so.
  const read = page.getByTestId('bp-enemy-read');
  const full = await read.textContent();
  await page.getByTestId('bp-attack').click();
  await expect(read).not.toHaveText(full ?? '');
});

for (const phone of PHONES) {
  test(`no sideways scroll at ${phone.name}, title through battle`, async ({ page }) => {
    await page.setViewportSize(viewportOf(phone));
    await playToLifeChoice(page);
    expect(await horizontalOverflow(page)).toBe(0);
    await expect(page.getByTestId('life-choice-screen')).toBeVisible();
  });
}
