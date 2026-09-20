import { test, expect, type Page } from './fixtures';

/**
 * THE STATUS SCREEN: who the party are, rather than how they are doing.
 *
 * The village line already answers the second question. This is the
 * page you open to look at the PEOPLE — and the round's rule was that
 * it is read-only, so what is worth pinning is that it SHOWS the right
 * things and CHANGES nothing.
 */
async function intoTheVillage(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click().catch(() => {});
  await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 20_000 });
}

test('the party, as people: name, level, health, weapon and style', async ({ page }) => {
  await intoTheVillage(page);
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();

  // HIM: a long sword, and the swordsmanship that goes with it.
  await expect(page.getByTestId('status-name-hero')).toHaveText('あなた');
  await expect(page.getByTestId('status-level-hero')).toHaveText('1');
  await expect(page.getByTestId('status-hp-hero')).toContainText('/');
  await expect(page.getByTestId('status-weapon-hero')).toHaveText('長剣');
  await expect(page.getByTestId('status-style-hero')).toHaveText('剣術');

  /**
   * HER: 魔法 on the weapon line, because what she HOLDS is not decided
   * and 「なし」 would read as unarmed — a claim nobody has made.
   */
  await expect(page.getByTestId('status-name-kaos')).toHaveText('ケイオス');
  await expect(page.getByTestId('status-weapon-kaos')).toHaveText('魔法');
  await expect(page.getByTestId('status-style-kaos')).toHaveText('魔法特化');

  // Both of them are drawn.
  await expect(page.locator('.status-figure img')).toHaveCount(2);
  for (const img of await page.locator('.status-figure img').all()) {
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
});

/** Read-only: nothing on it can change the world, and the way out is one. */
test('it changes nothing, and the way out is the village', async ({ page }) => {
  await intoTheVillage(page);
  const before = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();

  // One control, and it is the way back.
  const buttons = await page.locator('.status-screen button').allInnerTexts();
  expect(buttons, 'nothing to press but もどる').toEqual(['もどる']);

  await page.getByTestId('status-back').click();
  await expect(page.getByTestId('world-clock')).toHaveText(before ?? '');
});

/** What a fight cost is on it, because it reads the same store HOME does. */
test('it shows what a fight actually left them with', async ({ page }) => {
  await intoTheVillage(page);
  const homeHp = await page.getByTestId('home-party-hero').innerText();
  await page.getByTestId('status-button').click();
  const shown = await page.getByTestId('status-hp-hero').innerText();
  // The village line says "HP 100/100"; this says "100/100".
  expect(homeHp.replace(/\s/g, '')).toContain(shown.replace(/\s/g, ''));
});

test('fits the smallest phone the game is judged on', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 360 });
  await intoTheVillage(page);
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
  const [content, visible] = await page
    .locator('.status-screen')
    .evaluate((el) => [el.scrollHeight, el.clientHeight]);
  expect(content, 'nothing runs off the bottom').toBeLessThanOrEqual(visible + 1);
  await expect(page.getByTestId('status-back')).toBeVisible();
});
