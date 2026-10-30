import { test, expect, type Page } from '@playwright/test';
import { fightUntil } from './battle';
import { throughTheOpening, pastTheIntro } from './opening';
import { placeButton } from './village';

/**
 * ケイオス’S FACE ON A WON FIGHT'S RESULT (2026-10-30 タスクG, src/ui/battle/resultFace.ts).
 *
 * Only where she fought; which face by who fought (ケイオス×主人公, the three) and how it was won — an
 * ordinary win, a boss beaten, the last blow a party finisher. Until the pictures are delivered her own
 * faces stand in. Beside 「勝利！」 / the numbers, never over them.
 */

/** Each turn of theirs, a plain blow (the first creature standing) until the fight is over. */
async function blowsUntilWon(page: Page) {
  for (let i = 0; i < 80; i++) {
    if (await page.getByTestId('pb-result').isVisible().catch(() => false)) break;
    const commands = page.getByTestId('pb-commands');
    if ((await commands.getAttribute('data-locked').catch(() => 'yes')) !== 'no') {
      await page.waitForTimeout(150);
      continue;
    }
    await page.getByTestId('pb-cmd-attack').click();
    const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
    if (await pick.isVisible().catch(() => false)) await pick.click();
  }
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 20_000 });
}

/**
 * The three's win, laid over the fight (作者 2026-10-30 v2): the field behind, blurred; her bust on the left,
 * large and unframed, clear of the panel; 「勝利！」 and つぎへ in the small panel on the right; her line and his
 * answer in one band under them.
 */
async function wonOverTheField(page: Page, how: string, face: string) {
  const over = page.getByTestId('pb-result-over');
  await expect(over).toBeVisible();
  expect(await over.locator('.ro-veil').evaluate((el) => getComputedStyle(el).backdropFilter)).toContain('blur');
  // The field is still there behind it — the fight itself, not a picture of it.
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  const bust = over.getByTestId('result-face');
  await expect(bust).toHaveAttribute('data-party', 'TRIO');
  await expect(bust).toHaveAttribute('data-how', how);
  await expect(bust).toHaveAttribute('data-face', face);
  await expect(bust).toHaveAttribute('data-drawn', 'yes');
  const view = page.viewportSize()!;
  const b = (await bust.boundingBox())!;
  const panel = (await over.getByTestId('pb-result').boundingBox())!;
  const line = (await over.getByTestId('result-line').boundingBox())!;
  // Large: most of the height, in the left half; the panel to the right of it, never over it.
  expect(b.height).toBeGreaterThan(view.height * 0.7);
  expect(b.x + b.width).toBeLessThanOrEqual(view.width / 2 + 1);
  expect(b.x + b.width).toBeLessThanOrEqual(panel.x);
  // The panel small (half the old plate or less); the band under the bust and the panel, one line.
  expect(panel.width).toBeLessThanOrEqual(260);
  expect(line.y).toBeGreaterThanOrEqual(b.y + b.height - 1);
  expect(line.y).toBeGreaterThanOrEqual(panel.y + panel.height);
  expect(line.height).toBeLessThanOrEqual(40);
  await expect(over.getByTestId('result-line')).toContainText('ケイオス');
  await expect(over.getByTestId('result-line')).toContainText('主人公');
  await expect(over.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY');
}

test('the three, an ordinary win: her ordinary face (smiling) beside 「勝利！」', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?preview=party&enemies=2&weak=1');
  await blowsUntilWon(page);
  await wonOverTheField(page, 'NORMAL', 'SMILE');
});

test('the three, a boss beaten (セキリュウガ): the boss face', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?preview=party&enemy=sekiryuga&weak=1');
  await blowsUntilWon(page);
  await wonOverTheField(page, 'BOSS', 'NORMAL');
});

test('the three, the last blow her 《双極臨界》: the finisher face', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/?preview=party&collapse=1&enemies=3&weak=1');
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === 'kaos') break;
    await page.getByTestId('pb-cmd-defend').click();
  }
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-soukyoku_rinkai').click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 30_000 });
  await wonOverTheField(page, 'FINISHER', 'DOYA');
});

test('a fight of one in the forest: nothing of her before she wakes; after, her face beside the numbers (ケイオス×主人公)', async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  // Before Gald: a creature of the forest, alone — she is not in it.
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await fightUntil(page, () => page.getByTestId('result-exp').isVisible().catch(() => false));
  await expect(page.getByTestId('result-face')).toHaveCount(0);
  await expect(page.getByTestId('result-line')).toHaveCount(0);
  await page.getByTestId('result-done').click();
  // Gald, and the four answers: she wakes in that fight.
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });
  await page.getByTestId('choice-SPARE').click();
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }
  for (let i = 0; i < 4; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await (await placeButton(page, 'rest-button')).click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await fightUntil(page, () => page.getByTestId('result-exp').isVisible().catch(() => false));
  const face = page.getByTestId('result-face');
  await expect(face).toHaveAttribute('data-party', 'DUO');
  await expect(face).toHaveAttribute('data-how', 'NORMAL');
  await expect(face).toHaveAttribute('data-face', 'SMILE');
  await expect(face).toHaveAttribute('data-drawn', 'yes');
  // Over the fight itself (作者 2026-10-30 v2): it stays behind, blurred; her bust left, the small panel right.
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  const at = (await face.boundingBox())!;
  const sheet = (await page.locator('.result-sheet').boundingBox())!;
  expect(at.x + at.width).toBeLessThanOrEqual(sheet.x + 1);
  expect(sheet.width).toBeLessThanOrEqual(320);
  await expect(page.getByTestId('result-line')).toContainText('主人公');
  await page.getByTestId('result-done').click();
});

test('the three, the last blow his 《彼岸花》 (at every creature standing): the finisher face', async ({ page }) => {
  // (A finisher before a boss — FINISHER over BOSS — is resultFace.test.ts's: a boss long enough to wear down
  // is a fight long enough to lose.)
  test.setTimeout(90_000);
  await page.goto('/?preview=party&higanbana=1&enemies=2&weak=1');
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === 'hero') break;
    await page.getByTestId('pb-cmd-defend').click();
  }
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-higanbana').click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 30_000 });
  await wonOverTheField(page, 'FINISHER', 'DOYA');
});
