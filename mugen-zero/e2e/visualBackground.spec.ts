import { test, expect, type Page } from './fixtures';
import { playToLifeChoice } from './helpers';

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

  const canvas = page.locator('.phaser-wrap canvas');
  await canvas.waitFor({ timeout: 20_000 });
  const box = await canvas.boundingBox();
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * (120 / 520));

  const encounter = page.getByTestId('gald-encounter');
  await expect(encounter).toBeVisible({ timeout: 20_000 });
  const encounterArt = await backdropUrl(page, 'dialogue-backdrop');
  expect(encounterArt).toContain('location-greenwood-forest');

  await encounter.click();
  await encounter.click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();

  // The point of the whole change: the fight inherits the place.
  const battleArt = await backdropUrl(page, 'battle-backdrop');
  expect(battleArt).toContain('location-greenwood-forest');
  expect(battleArt).toBe(encounterArt);
  expect(await horizontalOverflow(page)).toBe(0);

  // And the commands still work with art behind them.
  await page.getByTestId('attack-button').click();
  await expect(page.getByTestId('battle-log')).toContainText('ダメージ');
});

for (const width of [360, 390, 412]) {
  test(`no sideways scroll at ${width}px, title through battle`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await playToLifeChoice(page);
    expect(await horizontalOverflow(page)).toBe(0);
    await expect(page.getByTestId('life-choice-screen')).toBeVisible();
  });
}
