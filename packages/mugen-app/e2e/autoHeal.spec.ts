import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { readyToAct } from './battle';
import { settled } from './roam';

/**
 * 実装メイン⑥ AUTO改善 (2026-10-08): AUTO, hurt to 35% or less, drinks a
 * herb from the bag (her mending spell first, once she has one — core
 * autoHeal.test). The herb leaves the bag through the same path a tapped
 * one does: one fewer, in the save, after the fight and after a restart.
 */

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  setBattleCondition(left: { hp: number; mp: number }): Promise<void>;
  addItem(id: string, n?: number): Promise<number>;
  getItemCount(id: string): number;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

async function freshVillage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
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
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function savedHerbs(page: Page, id: string): Promise<number> {
  return page.evaluate(
    (itemId) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('mugen-zero-app');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const get = req.result.transaction('world_state', 'readonly').objectStore('world_state').get('inventory');
          get.onsuccess = () => {
            const rows = ((get.result as { value?: { itemId: string; quantity: number }[] } | undefined)?.value ?? []);
            req.result.close();
            resolve(rows.find((r) => r.itemId === itemId)?.quantity ?? 0);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    id,
  );
}

async function intoAFight(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await settled(page);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
}

test.describe.configure({ timeout: 180_000 });

test('AUTO, hurt: drinks a herb (one fewer, saved), wins, and the count holds after a restart', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('HELP')`);
  await world(page, `(w) => w.addItem('FOREST_HERB', 2)`);
  // Walked in hurt — 20 of 100 — and with no power for her mending spell.
  await world(page, `(w) => w.setBattleCondition({ hp: 20, mp: 0 })`);
  await intoAFight(page);
  await page.getByTestId('bp-auto').click();
  // A herb is drunk by itself — the bag in the save, one fewer.
  await expect.poll(() => savedHerbs(page, 'FOREST_HERB'), { timeout: 30_000 }).toBeLessThan(2);
  await expect(page.getByTestId('result-exp')).toBeVisible({ timeout: 120_000 });
  const after = await savedHerbs(page, 'FOREST_HERB');
  expect(after).toBeLessThan(2);
  expect(after).toBeGreaterThanOrEqual(0);
  // After a restart: the same.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect.poll(() => world<number>(page, `(w) => w.getItemCount('FOREST_HERB')`)).toBe(after);
});

test('AUTO, hurt, and she can mend: her spell first — the herbs are kept', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('HELP')`);
  await world(page, `(w) => w.addItem('FOREST_HERB', 2)`);
  await world(page, `(w) => w.setBattleCondition({ hp: 20, mp: 48 })`);
  await intoAFight(page);
  // Her magic is open in this world (she mends).
  await page.getByTestId('bp-auto').click();
  await expect
    .poll(async () => Number((await page.getByTestId('bp-player-hp').textContent())?.match(/\d+/)?.[0] ?? '0'), { timeout: 30_000 })
    .toBeGreaterThan(20);
  expect(await savedHerbs(page, 'FOREST_HERB')).toBe(2);
});

test('AUTO, hurt, with no herb: it fights on as before (nothing to drink, no stall)', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('HELP')`);
  await world(page, `(w) => w.setBattleCondition({ hp: 30, mp: 48 })`);
  await intoAFight(page);
  await page.getByTestId('bp-auto').click();
  // It keeps taking turns: the fight ends one way or the other.
  await expect(page.getByTestId('result-exp').or(page.getByTestId('game-over')).or(page.getByTestId('world-clock'))).toBeVisible({
    timeout: 120_000,
  });
});

test('AUTO, whole: no herb is drunk', async ({ page }) => {
  await freshVillage(page);
  await world(page, `(w) => w.recordGaldLifeChoice('HELP')`);
  await world(page, `(w) => w.addItem('FOREST_HERB', 2)`);
  await intoAFight(page);
  await page.getByTestId('bp-auto').click();
  // A few of its turns, at full health or near it: the bag is untouched.
  await page.waitForTimeout(6000);
  const hp = Number((await page.getByTestId('bp-player-hp').textContent())?.match(/\d+/)?.[0] ?? '0');
  if (hp > 35) expect(await savedHerbs(page, 'FOREST_HERB')).toBe(2);
});
