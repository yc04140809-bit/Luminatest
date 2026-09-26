import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { fightToResult } from './battle';

/**
 * THE ONE LOOP APP ALPHA EXISTS TO PROVE.
 *
 * TITLE → OPENING → ALDEN → GREENWOOD → BATTLE → RESULT → 探索復帰 →
 * SAVE → 終了 → 再起動 → CONTINUE.
 *
 * Every number this touches is produced by the shared core: the fight
 * by `@mugen/game/battle`, the winnings and levels by
 * `@mugen/core/progression`, the save by `@mugen/core/world`. A green
 * run here is the claim that the core is genuinely shared, made in a
 * browser rather than in a diagram.
 */

async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
}

const numberIn = (text: string | null, label: string) =>
  Number((text ?? '').match(new RegExp(`${label} (\\d+)`))?.[1]);

async function intoTheVillage(page: Page) {
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  // Naming sits between the opening and the village now. Taking the
  // default keeps every test in this file about what it was about.
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/**
 * The village, the map, then the trees.
 *
 * EXPLORE is アルデン地方 — the shared flow table's own idea of it,
 * with the shop as a door off it — so the forest is one step further
 * out than it was when the map had nothing else on it.
 */
async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();
}

/** Swings until the fight is decided. */
async function win(page: Page) {
  await fightToResult(page);
}

test('the whole loop, and it is still there after a restart', async ({ page }) => {
  await freshApp(page);

  // TITLE — nothing has been played, so nothing is offered back.
  await expect(page.getByTestId('start-button')).toBeVisible();
  await expect(page.getByTestId('continue-button')).toHaveCount(0);

  await intoTheVillage(page);
  expect(numberIn(await page.getByTestId('lumi').textContent(), 'LUMI')).toBe(0);
  const full = numberIn(await page.getByTestId('party-hero').textContent(), 'HP');

  // ALDEN → MAP → GREENWOOD → BATTLE
  await intoTheForest(page);
  await page.getByTestId('encounter-button').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible();
  await win(page);

  // RESULT — the winnings are the core's, not this screen's.
  const exp = Number((await page.getByTestId('result-exp').textContent())?.replace(/\D/g, ''));
  const lumi = Number((await page.getByTestId('result-lumi').textContent())?.replace(/\D/g, ''));
  expect(exp).toBeGreaterThan(0);
  expect(lumi).toBeGreaterThan(0);
  await expect(page.getByTestId('result-levels'), 'the first victory is a level').toBeVisible();

  // 探索復帰
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  // What the fight cost and paid, carried out of it.
  expect(numberIn(await page.getByTestId('lumi').textContent(), 'LUMI')).toBe(lumi);
  const hurt = numberIn(await page.getByTestId('party-hero').textContent(), 'HP');
  expect(hurt, 'a wound outlives the fight').toBeLessThan(full);

  // 終了 → 再起動 → CONTINUE
  await page.reload();
  await expect(page.getByTestId('continue-button')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect(numberIn(await page.getByTestId('lumi').textContent(), 'LUMI')).toBe(lumi);
  expect(numberIn(await page.getByTestId('party-hero').textContent(), 'HP')).toBe(hurt);
});

test('a night’s rest puts them back, and the day moves', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  const day = await page.getByTestId('world-clock').textContent();
  await intoTheForest(page);
  await page.getByTestId('encounter-button').click();
  await win(page);
  await page.getByTestId('result-done').click();
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('back-to-village').click();

  const full = numberIn(await page.getByTestId('party-hero').textContent(), 'HP');
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect
    .poll(async () => numberIn(await page.getByTestId('party-hero').textContent(), 'HP'))
    .toBeGreaterThan(full);
});

test('the save is the app’s own, not the Artifact’s', async ({ page }) => {
  await freshApp(page);
  await intoTheVillage(page);
  const names = await page.evaluate(async () =>
    ((await indexedDB.databases?.()) ?? []).map((d) => d.name),
  );
  expect(names).toContain('mugen-zero-app');
  expect(names, 'the Artifact’s world is left alone').not.toContain('mugen-zero-save');
});
