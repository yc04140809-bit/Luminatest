import { test, expect, type Page } from '@playwright/test';

// PHASE C + D: the world talks about itself from more than one mouth,
// carries a couple of questions it does not answer, and has small things
// in it that are only themselves.

async function newWorld(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function usePreset(page: Page, preset: string) {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(`preset-${preset}`).click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/**
 * Taps a scene to its end and returns everything it said.
 *
 * Stops as soon as the scene stops advancing, rather than tapping a fixed
 * number of times: a blind loop against a screen that is not moving eats
 * the whole test budget waiting on clicks that cannot land.
 */
async function playScene(page: Page, testId: string, maxClicks = 24): Promise<string> {
  const scene = page.getByTestId(testId);
  await expect(scene).toBeVisible();
  let text = '';
  let stalled = 0;
  for (let i = 0; i < maxClicks; i++) {
    if ((await scene.count()) === 0) break;
    const before = await scene.innerText().catch(() => '');
    text += `\n${before}`;
    await scene.click({ timeout: 1500 }).catch(() => {});
    const after = await scene.innerText().catch(() => '');
    if (after === before && ++stalled >= 2) break;
    if (after !== before) stalled = 0;
  }
  return text;
}

/**
 * Visits a place until it says something containing `needle`, and returns
 * everything it said along the way.
 *
 * Bounded on purpose. Which events exist, in what order, and for which
 * route is settled exhaustively in the unit tests; what this file has to
 * prove is that a player can actually reach them by tapping.
 */
async function seekAt(
  page: Page,
  spot: string,
  needle: string,
  maxVisits = 6,
): Promise<{ found: boolean; text: string }> {
  let text = '';
  for (let i = 0; i < maxVisits; i++) {
    await page.getByTestId(`location-${spot}`).click();
    // Wait for the place to actually open before deciding whether it had
    // anything to say — asking too early sees neither, and then waits out
    // the whole test for a button that is behind a scene.
    await page
      .locator(`[data-testid="talk-${spot}"], [data-testid="talk-${spot}-done"]`)
      .first()
      .waitFor({ timeout: 15_000 });
    if ((await page.getByTestId(`talk-${spot}`).count()) > 0) {
      text += await playScene(page, `talk-${spot}`);
    }
    await page.getByTestId(`talk-${spot}-leave`).click();
    if (text.includes(needle)) return { found: true, text };
    if ((await page.getByTestId(`new-mark-${spot}`).count()) === 0) break;
  }
  return { found: false, text };
}

test('the same news reaches the player from more than one mouth', async ({ page }) => {
  test.slow();
  await newWorld(page);
  await usePreset(page, 'SPARE_3Y');
  await page.getByTestId('explore-button').click();

  // The barman gossips about it...
  const tavern = await seekAt(page, 'MOONLIGHT_TAVERN', '一人減った');
  expect(tavern.found, 'the tavern should carry the rumour').toBe(true);

  // ...and the village has only noticed that the forest went quiet.
  const village = await seekAt(page, 'ALDEN_VILLAGE', '森が静かじゃない');
  expect(village.found, 'the village should notice the change too').toBe(true);

  // Neither of them answers the question.
  for (const text of [tavern.text, village.text]) {
    expect(text).not.toContain('パン');
    expect(text).not.toContain('ガルド');
  }
});

test('a rumour follows the route the world actually took', async ({ page }) => {
  test.slow();
  await newWorld(page);
  await usePreset(page, 'HELP_3Y');
  await page.getByTestId('explore-button').click();
  const village = await seekAt(page, 'ALDEN_VILLAGE', '街道で助けてもらった');
  expect(village.found, 'the HELP village rumour should be reachable').toBe(true);
  // The SPARE village rumour belongs to a different world.
  expect(village.text).not.toContain('森が静かじゃない');
});

test('the world carries two questions it does not answer', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();

  // Nothing shown yet: both seeds are planted, neither is known.
  await page.locator('.screen-footer .btn').click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText('[SEED]');
  await expect(page.getByTestId('dev-seed-ALDEN_UNSIGNED_LETTER')).toContainText('[SEED]');
  await page.getByTestId('dev-admin-back').click();

  // Meet the sword.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await playScene(page, 'talk-MOONLIGHT_TAVERN'); // introductions
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
  const sword = await playScene(page, 'talk-MOONLIGHT_TAVERN', 1).catch(() => '');
  if (!sword) {
    await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  }
  const swordText = await playScene(page, 'talk-MOONLIGHT_TAVERN');
  expect(swordText).toContain('両手剣');
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

  await page.locator('.screen-footer .btn').click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  // Shown, and still unanswered — never RESOLVED in this build.
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText('[HINTED]');
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText(
    'playerKnown: true',
  );
});

test('a letter nobody signed, belonging to nobody', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  const village = await seekAt(page, 'ALDEN_VILLAGE', 'まだ、間に合います');
  expect(village.found, 'the letter should be findable in the village').toBe(true);
  // It is not about Gald, and it explains nothing.
  expect(village.text).not.toContain('ガルド');

  await page.locator('.screen-footer .btn').click();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-seed-ALDEN_UNSIGNED_LETTER')).toContainText('[HINTED]');
});

test('the village has more than one feeling in it, and not every beat is a clue', async ({
  page,
}) => {
  test.slow();
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  // Meet Grave first — one village beat waits on that.
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await playScene(page, 'talk-MOONLIGHT_TAVERN');
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

  // Warmth and humour, in one village, without a quest log.
  const kaos = await seekAt(page, 'ALDEN_VILLAGE', '冒険じゃない');
  expect(kaos.found, 'Kaos should turn up doing nothing').toBe(true);
  const cat = await seekAt(page, 'ALDEN_VILLAGE', 'なついてる');
  expect(cat.found, "the villager's cat should turn up").toBe(true);
  // And the world is not an endless list of clues: the ✦ goes out.
  await expect(page.getByTestId('new-mark-ALDEN_VILLAGE')).toHaveCount(0);
});

test('what the player has met, and when, survives a reload', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_VILLAGE').click();
  const first = await playScene(page, 'talk-ALDEN_VILLAGE');
  await page.getByTestId('talk-ALDEN_VILLAGE-leave').click();

  await page.reload();
  await page.getByTestId('continue-button').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_VILLAGE').click();
  const second = await playScene(page, 'talk-ALDEN_VILLAGE');
  expect(second).not.toBe(first);
});
