import { test, expect, type Page } from '@playwright/test';

/**
 * EACH CHARACTER'S OWN EFFECTS (作者 2026-10-17: グレイヴ専用「重撃／豪断」, 主人公専用「赤黒斬撃」,
 * ケイオス専用「背後の双翼」; src/ui/fx/special). Looks only — so this asks where each one is drawn
 * and whose it is: グレイヴ's on his blow, the hero's red moon on his, ケイオス's wings behind her, and
 * never one in another's place. The suite runs with less motion; the effects are there either way
 * (they only fade, then).
 */

const sx = (page: Page, where: string, type: string) => page.getByTestId(where).locator(`[data-testid="special-fx"][data-type="${type}"]`);

/** To this member's turn: each other member defends. */
async function turnOf(page: Page, id: string) {
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === id) return;
    await page.getByTestId('pb-cmd-defend').click();
  }
  throw new Error(`never ${id}'s turn`);
}

test('グレイヴ\'s 重撃・豪断: the 重撃 and the 豪断 on the creature, his blade gathering on him — all his, none of the hero\'s', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?preview=party&hurt=1&footing=40');
  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await expect(sx(page, 'pb-foe', 'grave_juugeki')).toHaveCount(1);
  await expect(sx(page, 'pb-foe', 'grave_goudan')).toHaveCount(1);
  await expect(sx(page, 'pb-figure-grave', 'grave_goudan_charge')).toHaveCount(1);
  await expect(page.locator('[data-testid="special-fx"][data-owner="hero"]')).toHaveCount(0);
  // Its picture is the delivered one, inside its frame.
  await expect(sx(page, 'pb-foe', 'grave_juugeki').locator('img.gj-bolt')).toHaveAttribute('src', /grave-heavy-impact/);
});

test('the hero: 《瞬断》 his red-black crescent on the creature; 月影の構え his moon arc behind him and the stance held at his feet; none of グレイヴ\'s', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/?preview=party&hurt=1&footing=40');
  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-shundan').click();
  await expect(sx(page, 'pb-foe', 'protagonist_redmoon_slash')).toHaveCount(1);
  await expect(sx(page, 'pb-foe', 'protagonist_redmoon_slash').locator('img')).toHaveAttribute('src', /hero-redmoon-crescent/);
  await expect(page.locator('[data-testid="special-fx"][data-owner="grave"]')).toHaveCount(0);

  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-moon_guard').click();
  await expect(sx(page, 'pb-figure-hero', 'protagonist_counter_moon')).toHaveCount(1);
  await expect(page.getByTestId('pb-stance-hero')).toHaveCount(1);
  // The stance is his alone, and goes with the guard.
  await expect(page.locator('[data-testid^="pb-stance-"]')).toHaveCount(1);
});

test('ケイオス\'s 星光弾 in the party fight: her wings behind her (her drawing over them), then her spell as before', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?preview=party&hurt=1&footing=40');
  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-magic').click();
  await page.locator('[data-testid="pb-magic-starlight_bolt"]').click();
  const wings = sx(page, 'pb-figure-kaos', 'kaos_twin_wings_light');
  await expect(wings).toHaveCount(1);
  expect(await wings.evaluate((el) => getComputedStyle(el).zIndex)).toBe('-1');
  await expect(page.getByTestId('pb-figure-kaos').getByTestId('pb-cast')).toHaveCount(1);
});

test('ケイオス\'s 彗星撃 in a fight of one: the cut-in, then the wings behind her, then her aura — and the wings gone after', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?preview=battle&spell=comet_strike&debug=0');
  await expect(page.getByTestId('bp-cinematic')).toBeVisible({ timeout: 15_000 });
  // While the cut-in plays, no wings yet.
  await expect(page.locator('.bp-kaos [data-testid="special-fx"]')).toHaveCount(0);
  await expect(page.locator('.bp-kaos [data-testid="special-fx"][data-type="kaos_twin_wings"]')).toHaveCount(1, { timeout: 15_000 });
  await expect(page.getByTestId('bp-cinematic')).toHaveCount(0);
  await expect(page.getByTestId('spell-aura')).toBeVisible();
  await expect(page.locator('.bp-kaos [data-testid="special-fx"]')).toHaveCount(0, { timeout: 15_000 });
});

test('零閃・天衝 in the finale: the hero\'s red moon over the picture as the stop begins — the words wait their 間', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/?preview=finale&from=FORM2_WON');
  const on = page.getByTestId('finale-scene');
  for (let i = 0; i < 20 && (await on.getAttribute('data-scene')) !== 'STOPPED'; i++) {
    const key = `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`;
    await page.getByTestId('finale-next').click();
    await expect.poll(async () => `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`).not.toBe(key);
  }
  await expect(on).toHaveAttribute('data-scene', 'STOPPED');
  await expect(page.locator('.finale-stage [data-testid="special-fx"][data-type="protagonist_zero_tenshou"]')).toHaveCount(1);
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '1000');
  // The next line: it is gone.
  await page.getByTestId('finale-next').click();
  await expect(page.locator('[data-testid="special-fx"]')).toHaveCount(0);
});

test('DEBUG: ?preview=fx plays every effect, each where it stands', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?preview=fx');
  await expect(page.getByTestId('fx-preview')).toBeVisible();
  const buttons = page.locator('[data-testid^="fx-play-"]');
  const n = await buttons.count();
  expect(n).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < n; i++) {
    await buttons.nth(i).click();
    await expect(page.locator('[data-testid="special-fx"]').first()).toBeAttached();
  }
});
