import { test, expect, type Page } from '@playwright/test';

// PLAYTEST ROUND 2: the player should never be stuck wondering what to do
// next — without ever being told the answer.

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
 * Taps a scene through to its end, collecting what it said. The last tap
 * detaches the scene while it commits, so a click that loses its element
 * is the expected way for this to finish, not a failure.
 */
async function playScene(page: Page, testId: string, maxClicks = 20): Promise<string> {
  const scene = page.getByTestId(testId);
  await expect(scene).toBeVisible();
  let text = '';
  for (let i = 0; i < maxClicks; i++) {
    if ((await scene.count()) === 0) break;
    text += `\n${await scene.innerText().catch(() => '')}`;
    await scene.click({ timeout: 3000 }).catch(() => {});
  }
  return text;
}

test('the first TIME SHIFT points at the map, not at the answer', async ({ page }) => {
  await newWorld(page);
  await usePreset(page, 'SPARE');

  await page.getByTestId('time-shift-button').click();
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });

  const guidance = page.getByTestId('time-shift-guidance');
  await expect(guidance).toBeVisible();
  const text = await guidance.innerText();
  // It says the world moved. It does not say who, where, or what.
  expect(text).toContain('続き');
  expect(text).not.toContain('パン');
  expect(text).not.toContain('ガルド');
  expect(text).not.toContain('酒場');

  await page.getByTestId('time-shift-explore').click();
  await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
});

test('the guidance is for the first shift only', async ({ page }) => {
  await newWorld(page);
  await usePreset(page, 'SPARE_3Y'); // already shifted once
  await page.getByTestId('time-shift-button').click();
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('time-shift-guidance')).toHaveCount(0);
  await expect(page.getByTestId('time-shift-return')).toBeVisible();
});

test('✦ marks where something is waiting, and clears once it is met', async ({ page }) => {
  await newWorld(page);
  await usePreset(page, 'SPARE_3Y');
  await page.getByTestId('explore-button').click();

  // The bakery is on the map and marked, still unnamed.
  const bakery = page.getByTestId('location-ALDEN_BAKERY');
  await expect(bakery).toContainText('？？？');
  await expect(page.getByTestId('new-mark-ALDEN_BAKERY')).toBeVisible();
  // So is the tavern, which now has a rumour in it.
  await expect(page.getByTestId('new-mark-MOONLIGHT_TAVERN')).toBeVisible();

  // Walk into the tavern and work through what it has.
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await playScene(page, 'talk-MOONLIGHT_TAVERN');
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
  await expect(page.getByTestId('location-MOONLIGHT_TAVERN')).toBeVisible();
  // Still marked: there is more in there.
  await expect(page.getByTestId('new-mark-MOONLIGHT_TAVERN')).toBeVisible();

  for (let i = 0; i < 4; i++) {
    if ((await page.getByTestId('new-mark-MOONLIGHT_TAVERN').count()) === 0) break;
    await page.getByTestId('location-MOONLIGHT_TAVERN').click();
    await playScene(page, 'talk-MOONLIGHT_TAVERN');
    await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
  }
  // Exhausted: the mark is gone, and the place still opens.
  await expect(page.getByTestId('new-mark-MOONLIGHT_TAVERN')).toHaveCount(0);
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await expect(page.getByTestId('talk-MOONLIGHT_TAVERN-done')).toBeVisible();
  await expect(page.getByTestId('talk-MOONLIGHT_TAVERN-done')).toContainText('今夜は');
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

  // And the bakery is still waiting, untouched by any of that.
  await expect(page.getByTestId('new-mark-ALDEN_BAKERY')).toBeVisible();
});

test('the rumour a world tells matches the life the player chose', async ({ page }) => {
  const cases = [
    { preset: 'SPARE_3Y', says: '一人減った' },
    { preset: 'HELP_3Y', says: '手当てしてくれた' },
    { preset: 'CAPTURE_3Y', says: '裁きは終わった' },
    { preset: 'KILL_3Y', says: '石が積んである' },
  ];
  const others = cases.map((c) => c.says);

  await newWorld(page);
  for (const c of cases) {
    await usePreset(page, c.preset);
    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-MOONLIGHT_TAVERN').click();

    let text = await playScene(page, 'talk-MOONLIGHT_TAVERN');
    await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
    // First visit is the greeting; the rumour is the next one in.
    await page.getByTestId('location-MOONLIGHT_TAVERN').click();
    text += await playScene(page, 'talk-MOONLIGHT_TAVERN');
    await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

    expect(text, `${c.preset} should be talked about`).toContain(c.says);
    for (const other of others.filter((o) => o !== c.says)) {
      expect(text, `${c.preset} must not carry another route's rumour`).not.toContain(other);
    }
    // No rumour ever names the place.
    expect(text).not.toContain('ガルド');
    await page.locator('.screen-footer .btn').click(); // back to HOME
  }
});

test('the village has small things in it, and never a dead end', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('new-mark-ALDEN_VILLAGE')).toBeVisible();

  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.getByTestId('location-ALDEN_VILLAGE').click();
    if ((await page.getByTestId('talk-ALDEN_VILLAGE').count()) > 0) {
      seen.push(await playScene(page, 'talk-ALDEN_VILLAGE'));
    }
    await page.getByTestId('talk-ALDEN_VILLAGE-leave').click();
    if ((await page.getByTestId('new-mark-ALDEN_VILLAGE').count()) === 0) break;
  }
  expect(seen.length).toBeGreaterThanOrEqual(2);

  // Walked dry, the village is quiet — not broken.
  await page.getByTestId('location-ALDEN_VILLAGE').click();
  await expect(page.getByTestId('talk-ALDEN_VILLAGE-done')).toContainText('いつもどおり');
  await page.getByTestId('talk-ALDEN_VILLAGE-leave').click();
  await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();
});

test('what the player has met survives a reload', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await playScene(page, 'talk-MOONLIGHT_TAVERN');
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

  await page.reload();
  await page.getByTestId('continue-button').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  // The greeting does not play twice; the seed is what comes next.
  const scene = page.getByTestId('talk-MOONLIGHT_TAVERN');
  await expect(scene).toBeVisible();
  await expect(scene).not.toContainText('いらっしゃい');
});

test('the NEXT seed reads as "not yet", not as a missing feature', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  await playScene(page, 'talk-MOONLIGHT_TAVERN');
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();

  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  const text = await playScene(page, 'talk-MOONLIGHT_TAVERN');
  expect(text).toContain('地図にない道');
  // Kaos admits she has not been either — a promise, not a bug.
  await expect(page.getByTestId('talk-MOONLIGHT_TAVERN-done')).toContainText('いつか');
});
