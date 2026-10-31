import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { fightUntil } from './battle';
import { placeButton } from './village';

/**
 * 見逃す, PLAYED THROUGH — THE SECOND PROVING ROUTE (ROUTE D, TIGS2027,
 * 作者 2026-10-20).
 *
 * The real path, like the bakery route's: はじめから → the forest → Gald's
 * fight → 「見逃す」 → Kaos shows the three years once (no picture is
 * borrowed: her, 「3年後」, only that he left) → back to the moment of
 * choosing → the nights. Outside the village, with nobody watching, he
 * helps a trading house's people, and they learn of his sister — world
 * truth the player is told nothing of. Then the author's DEBUG view, where
 * this world and the treated one sit side by side.
 */

type DevWorld = {
  getEvents(): { type: string; worldDay: number; causedBy?: string[] }[];
  getKnownEvents(): { type: string }[];
  getCharacter(id: string): { location: string; occupation: string } | undefined;
};
const dev = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;

const BAKERY_ROUTE = [
  'GALD_SAVES_LINA',
  'RIZEL_TENDS_GALD',
  'GALD_TELLS_OF_ELNA',
  'RIZEL_OFFERS_TO_SEE_ELNA',
  'VILLAGE_HEARS_OF_GALD',
  'RIZEL_SPEAKS_FOR_GALD',
  'BAKER_OFFERS_WORK',
  'GALD_TAKES_BAKERY_WORK',
  'LINA_WRITES_TO_ELNA',
];

async function noDebugOnScreen(page: Page) {
  await expect(page.locator('[data-testid^="chain-"]')).toHaveCount(0);
  const text = (await page.locator('body').innerText()) ?? '';
  expect(text).not.toMatch(/GALD_|MERCHANT|BLOOM|SEED|GROWING|DORMANT|\d\.\d\d/);
}

async function freshApp(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    try {
      window.localStorage.clear();
    } catch {
      /* none */
    }
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

test('はじめから to the three years and back: 見逃す, and the let-go world lived off screen', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewportSize({ width: 844, height: 390 });
  await freshApp(page);

  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await fightUntil(page, () => page.getByTestId('life-choice-screen').isVisible().catch(() => false), { maxTurns: 200 });

  // The answer, written and locked — its own fact, not the treatment.
  await page.getByTestId('choice-SPARE').click();
  await expect(page.getByTestId('choice-result')).toHaveAttribute('data-choice', 'SPARE');
  expect(await dev<string[]>(page, `(w) => w.getEvents().map((e) => e.type)`)).toEqual(['PLAYER_SPARED_GALD']);
  for (let i = 0; i < 10; i++) {
    if (await page.getByTestId('future-vision').isVisible().catch(() => false)) break;
    await page.getByTestId('choice-result-next').click();
  }

  // Kaos shows the three years, once: no picture borrowed, only that he left.
  await page.getByTestId('future-vision-next').click();
  await expect(page.getByTestId('future-vision')).toHaveAttribute('data-beat', 'SEE');
  await expect(page.getByTestId('future-vision-cg')).toHaveCount(0);
  await expect(page.getByTestId('future-vision-years')).toHaveText('――3年後。');
  await expect(page.getByTestId('vision-GALD_LEAVES_BANDITS')).toBeVisible();
  await expect(page.getByTestId('future-vision')).not.toContainText('パン屋');
  await expect(page.getByTestId('future-vision')).not.toContainText('商会');
  expect(await dev<string[]>(page, `(w) => w.getEvents().map((e) => e.type)`)).toEqual(['PLAYER_SPARED_GALD']);

  // Back to the moment they chose.
  await page.getByTestId('future-vision-next').click();
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await noDebugOnScreen(page);

  // The nights: he leaves (day 4); outside the village he helps the
  // merchants, who learn of his sister (day 6). The player is told nothing.
  for (let n = 0; n < 6; n++) {
    const button = await placeButton(page, 'rest-button');
    const day = await page.getByTestId('world-clock').textContent();
    await button.click();
    await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
    await expect(await placeButton(page, 'rest-button')).toBeEnabled();
  }
  const events = await dev<{ type: string; worldDay: number; causedBy?: string[] }[]>(page, `(w) => w.getEvents()`);
  const byType = Object.fromEntries(events.map((e) => [e.type, e]));
  expect(byType.GALD_LEAVES_BANDITS?.worldDay).toBe(4);
  expect(byType.GALD_SAVES_MERCHANTS?.worldDay).toBe(6);
  expect(byType.GALD_SAVES_MERCHANTS?.causedBy).toEqual(['GALD_LEAVES_BANDITS']);
  expect(byType.MERCHANTS_LEARN_OF_ELNA?.causedBy).toEqual(['GALD_SAVES_MERCHANTS']);
  for (const t of BAKERY_ROUTE) expect(byType[t], t).toBeUndefined();
  expect(await dev<{ location: string }>(page, `(w) => w.getCharacter('GALD')`)).toMatchObject({ location: 'OUTSIDE_ALDEN' });
  expect(await dev<string[]>(page, `(w) => w.getKnownEvents().map((e) => e.type)`)).toEqual(['PLAYER_SPARED_GALD']);
  await noDebugOnScreen(page);

  // The author's view: this world's chain, and the two answers side by side.
  await page.goto('/?tool=chain');
  await expect(page.getByTestId('chain-panel-choice')).toHaveText('SPARE');
  await expect(page.getByTestId('chain-truth-GARDO_SAVED_MERCHANTS')).toContainText('Y1D6');
  await expect(page.getByTestId('chain-truth-MERCHANTS_LEARNED_OF_ELNA')).toBeVisible();
  await expect(page.getByTestId('chain-next-none')).toContainText('全部起きた');
  await expect(page.getByTestId('chain-compare-HELP-npc-GARDO_SAVED_LINA')).toBeVisible();
  await expect(page.getByTestId('chain-compare-HELP-future')).toHaveText('ALDEN_VILLAGE / BAKERY_HAND');
  await expect(page.getByTestId('chain-compare-SPARE-npc-GARDO_SAVED_MERCHANTS')).toBeVisible();
  await expect(page.getByTestId('chain-compare-SPARE-npc-MERCHANTS_LEARNED_OF_ELNA')).toBeVisible();
  await expect(page.getByTestId('chain-compare-SPARE-memory-PLAYER_SPARED_GALD')).toBeVisible();
  await expect(page.getByTestId('chain-compare-SPARE-memory-PLAYER_HELPED_GALD')).toHaveCount(0);
  await expect(page.getByTestId('chain-compare-SPARE-npc-GARDO_SAVED_LINA')).toHaveCount(0);
  await expect(page.getByTestId('chain-compare-SPARE-future')).toHaveText('OUTSIDE_ALDEN / NONE');
  expect(errors).toEqual([]);
});
