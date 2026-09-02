import { test, expect } from '@playwright/test';

// PHASE A acceptance: TITLE → PROLOGUE → HOME → EXPLORE → GREENWOOD
// → GALD ENCOUNTER → BATTLE → LIFE CHOICE, in one uninterrupted run.
test('Phase A vertical flow: title to life choice', async ({ page }) => {
  await page.goto('/');

  // TITLE
  await expect(page.getByText('MUGEN ZERO')).toBeVisible();
  await page.getByTestId('start-button').click();

  // PROLOGUE — monologue (1 line), then Kaos intro (6 lines)
  const monologue = page.getByTestId('prologue-monologue');
  await expect(monologue).toBeVisible();
  await expect(page.getByText('あなたが忘れても、世界は覚えている。')).toBeVisible();
  await monologue.click();

  const kaos = page.getByTestId('kaos-intro');
  await expect(kaos).toBeVisible();
  await expect(page.getByText('やっと来た。')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await kaos.click();
  }

  // HOME
  await expect(page.getByTestId('explore-button')).toBeVisible();
  await page.getByTestId('explore-button').click();

  // EXPLORE — the village, the tavern and the forest are all enterable
  await expect(page.getByTestId('location-ALDEN_VILLAGE')).toBeEnabled();
  await expect(page.getByTestId('location-MOONLIGHT_TAVERN')).toBeEnabled();
  await page.getByTestId('location-GREENWOOD_FOREST').click();

  // GREENWOOD — Phaser scene. Click the "!" marker (game coords 180,120 of 360x520).
  const canvas = page.locator('.phaser-wrap canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500); // let the scene finish booting
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas bounding box unavailable');
  await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));

  // Player walks up (~2s), fade, then encounter dialogue.
  const encounter = page.getByTestId('gald-encounter');
  await expect(encounter).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('……止まれ。')).toBeVisible();
  await encounter.click();
  await expect(page.getByText('金を置いていけ。命までは取らねぇ。')).toBeVisible();
  await encounter.click();

  // BATTLE — attack until victory
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  const attack = page.getByTestId('attack-button');
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
    if (await attack.isEnabled().catch(() => false)) {
      await attack.click();
    }
    await page.waitForTimeout(150);
  }

  // LIFE CHOICE — no EXP screen, the question instead
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('彼の人生を、どうしますか？')).toBeVisible();
  await page.getByTestId('choice-SPARE').click();

  // Aftermath dialogue (SPARE = 3 lines), then recorded screen, then HOME.
  const result = page.getByTestId('choice-result-dialogue');
  await expect(result).toBeVisible();
  await expect(page.getByText('俺はお前を殺そうとしたんだぞ。')).toBeVisible();
  await result.click();
  await result.click();
  await result.click();

  await expect(page.getByTestId('choice-recorded-screen')).toBeVisible();
  await page.getByTestId('return-home-button').click();
  await expect(page.getByTestId('explore-button')).toBeVisible();
});
