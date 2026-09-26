import { test, expect, type Page } from '@playwright/test';
import { enemyHp, fightToResult, readyToAct, throughTheAwakening } from './battle';
import { throughTheOpening } from './opening';

/**
 * THE DEBUG BATTLE PREVIEW — for watching a move again and again.
 *
 * Debug builds only (the dev server here; the debug APK on a phone).
 * Its turns are the shared core's own, on fixed dice, so the same
 * presses give the same numbers every time; it never opens a world.
 */

async function strikeOnce(page: Page): Promise<number> {
  await readyToAct(page);
  const [before] = await enemyHp(page);
  await page.getByTestId('bp-attack').click();
  await readyToAct(page);
  return before - (await enemyHp(page))[0];
}

test('the title has a way in, on a debug build', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('debug-battle-preview').click();
  await expect(page.getByTestId('battle-preview')).toBeVisible();
  await expect(page.getByTestId('bp-attack')).toBeVisible();
  // And a way back out.
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-exit').click();
  await expect(page.getByTestId('debug-battle-preview')).toBeVisible();
});

test('played again, the same presses give the same numbers', async ({ page }) => {
  await page.goto('/?preview=battle');
  const first = [await strikeOnce(page), await strikeOnce(page), await strikeOnce(page)];
  expect(first.every((d) => d > 0)).toBe(true);

  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-replay').click();
  await page.getByTestId('debug-toggle').click();
  const second = [await strikeOnce(page), await strikeOnce(page), await strikeOnce(page)];
  expect(second).toEqual(first);
});

test('the enemy can be told what to answer with, every turn', async ({ page }) => {
  await page.goto('/?preview=battle&answer=ATTACK');
  const hero = async () => Number((await page.getByTestId('bp-player-hp').textContent())?.split('/')[0]);
  for (let i = 0; i < 3; i++) {
    const before = await hero();
    await strikeOnce(page);
    expect(await hero()).toBeLessThan(before);
  }
});

test('beaten, it goes down and stays down — no result screen, no world', async ({ page }) => {
  await page.goto('/?preview=battle');
  const until = Date.now() + 60_000;
  while (Date.now() < until && !(await page.getByTestId('bp-enemy-downed').isVisible())) {
    const free = await page.evaluate(
      () => document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no',
    );
    if (free) await page.getByTestId('bp-attack').click().catch(() => {});
    else await page.waitForTimeout(60);
  }
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('battle-preview')).toBeVisible();
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
  expect(await page.evaluate(async () => (await indexedDB.databases()).length)).toBe(0);

  // And up again for another go, at the speed it was being watched at.
  await page.getByTestId('bp-speed').click();
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-replay').click();
  await expect(page.getByTestId('bp-enemy-normal')).toBeVisible();
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '2');
});

test("against Gald she wakes, and her spell is the core's", async ({ page }) => {
  await page.goto('/?preview=battle&enemy=gald');
  const awakening = page.getByTestId('magic-awakening');
  const until = Date.now() + 90_000;
  while (Date.now() < until && !(await awakening.isVisible())) {
    const free = await page.evaluate(
      () => document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no',
    );
    if (free) await page.getByTestId('bp-attack').click().catch(() => {});
    else await page.waitForTimeout(60);
  }
  expect(await throughTheAwakening(page)).toBe(true);
  await readyToAct(page);
  const [before] = await enemyHp(page);
  await page.getByTestId('bp-magic').click();
  await page.getByTestId('magic-starlight_bolt').click();
  // Her casting pose — the one piece of a spell this phase draws (its
  // light, its number and its cut-in are the next phase's).
  await expect(page.locator('.bp-kaos.casting')).toBeVisible();
  await readyToAct(page);
  expect((await enemyHp(page))[0]).toBeLessThan(before);
});

test('the panel switches the fight: enemy, background', async ({ page }) => {
  await page.goto('/?preview=battle');
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-enemy').click();
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('盗賊 ガルド');
  await page.getByTestId('debug-bg').click();
  await expect(page.getByTestId('bp-battle-bg')).toHaveAttribute('data-background', 'RUINS');
});

/** Every row of every store of every database this page can see. */
async function everythingSaved(page: Page) {
  return page.evaluate(async () => {
    const out: Record<string, Record<string, unknown[]>> = {};
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(info.name!);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      out[info.name] = {};
      for (const store of Array.from(db.objectStoreNames)) {
        out[info.name][store] = await new Promise<unknown[]>((resolve, reject) => {
          const req = db.transaction(store).objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      db.close();
    }
    return { idb: out, local: { ...localStorage } };
  });
}

test('a real save is exactly as it was after the preview: rows, memory, rewards, story', async ({ page }) => {
  // A world with something in it: named, a fight won and paid for.
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await fightToResult(page);
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();

  // Closed and opened, to the title, where the way into the preview is.
  await page.reload();
  await expect(page.getByTestId('continue-button')).toBeVisible();
  await page.waitForTimeout(500);
  const before = await everythingSaved(page);
  expect(Object.keys(before.idb).length).toBeGreaterThan(0);

  // Everything the preview can do: fight to the end, heal, cast, switch.
  await page.getByTestId('debug-battle-preview').click();
  await expect(page.getByTestId('battle-preview')).toBeVisible();
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-bag').click();
  await page.getByTestId('debug-toggle').click();
  await readyToAct(page);
  await page.getByTestId('bp-item').click();
  await page.getByTestId('bp-item-close').click();
  const until = Date.now() + 60_000;
  while (Date.now() < until && !(await page.getByTestId('bp-enemy-downed').isVisible())) {
    const free = await page.evaluate(
      () => document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no',
    );
    if (free) await page.getByTestId('bp-attack').click().catch(() => {});
    else await page.waitForTimeout(60);
  }
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-enemy').click();
  await page.getByTestId('debug-exit').click();

  // Back at the title: not one row different, and the save still opens.
  await expect(page.getByTestId('continue-button')).toBeVisible();
  await page.waitForTimeout(500);
  expect(await everythingSaved(page)).toEqual(before);
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('explore-button').or(page.getByTestId('forest-button'))).toBeVisible();
});
