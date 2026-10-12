import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 第1章終盤 手順3 (2026-10-12): 遺跡〜襲撃〜誘導 → ヴァルシール第1形態戦.
 *
 *   the signs at their heaviest (PHASE 3) → a night's rest is the night
 *   before → the ruins' depths (the hooded figure; the hymn) → the morning,
 *   the raid, the lure to the grassland (立ち向かう背中) → the village's
 *   first moment → the first form, fought by the three → 「つづく」 (the
 *   second form is the next step) → the title.
 *
 * Each beat kept as it is seen: closing the game mid-way resumes at the beat
 * it was in, never the ordinary village.
 */

type DevWorld = {
  addIncident(kind: string, id?: string): Promise<boolean>;
  getIncidentPhase(): number;
  getFinaleStage(): string;
  markRead(ids: string[]): Promise<unknown>;
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const stage = (page: Page) => world<string>(page, `(w) => w.getFinaleStage()`);
const playing = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio?.bgmState().current ?? null,
  );

/** A village at the signs' heaviest: fresh, Gald answered and seen ahead, セキリュウガ's part over, PHASE 3. */
async function heaviestVillage(page: Page, places = 10) {
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
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await world(page, `(w) => w.recordGaldLifeChoice('SPARE')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED']) await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
  for (let i = 0; i < places; i++) await world(page, `(w) => w.addIncident('PLACE', 'P${i}')`);
  if (places >= 10) expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBe(3);
}

/** Reads the scene on screen to its end (and any after it, while `while` holds). */
async function readWhile(page: Page, scenes: readonly string[]): Promise<string[]> {
  const seen: string[] = [];
  const scene = page.getByTestId('finale-scene');
  for (let i = 0; i < 200; i++) {
    if (!(await scene.isVisible().catch(() => false))) break;
    const id = (await scene.getAttribute('data-scene')) ?? '';
    if (!scenes.includes(id)) break;
    if (seen[seen.length - 1] !== id) seen.push(id);
    await page.getByTestId('finale-next').click();
  }
  return seen;
}

test('PHASE 3: the rest is the night before — the ruins, the raid, the lure, the first form, つづく; kept across a restart', async ({ page }) => {
  test.setTimeout(180_000);
  await heaviestVillage(page);
  expect(await stage(page)).toBe('NONE');

  // The rest: the night before, at home (the village's own music).
  await page.getByTestId('rest-button').click();
  const scene = page.getByTestId('finale-scene');
  await expect(scene).toHaveAttribute('data-scene', 'EVE');
  await expect(page.getByTestId('finale-line')).toHaveText('その夜は、風がなかった。');
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
  expect(await readWhile(page, ['EVE'])).toEqual(['EVE']);

  // The ruins' depths: the hymn, and the pictures in order.
  await expect(scene).toHaveAttribute('data-scene', 'RUINS_SEAL');
  await expect.poll(() => stage(page)).toBe('EVE');
  await expect.poll(() => playing(page)).toBe('CHURCH_HYMN');
  const pictures: string[] = [];
  for (let i = 0; i < 40 && (await scene.getAttribute('data-scene')) === 'RUINS_SEAL'; i++) {
    const b = (await scene.getAttribute('data-backdrop')) ?? '';
    if (pictures[pictures.length - 1] !== b) pictures.push(b);
    await page.getByTestId('finale-next').click();
  }
  expect(pictures).toEqual(['RUINS_DEPTHS', 'RUINS_UNSEALING', 'RUINS_REFUSED', 'VALSHEEL_AWAKENING', 'RUINS_DEPTHS']);

  // The morning to the grassland: 立ち向かう背中.
  await expect(scene).toHaveAttribute('data-scene', 'MORNING');
  await expect.poll(() => playing(page)).toBe('CHAPTER1_FINAL_BOSS');
  expect(await readWhile(page, ['MORNING', 'RAID', 'LURE'])).toEqual(['MORNING', 'RAID', 'LURE']);
  await expect.poll(() => stage(page)).toBe('RAID');

  // Closed here, and opened again: the beat it was in — the village's first moment, not the square.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(scene).toHaveAttribute('data-scene', 'VILLAGE_MIREI');
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
  expect(await readWhile(page, ['VILLAGE_MIREI', 'FORM1_START'])).toEqual(['VILLAGE_MIREI', 'FORM1_START']);

  // The first form, by the three, on the grassland; it cannot be fled.
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  for (const id of ['hero', 'kaos', 'grave']) await expect(page.getByTestId(`pb-member-${id}`)).toBeVisible();
  await expect(page.getByTestId('pb-enemy-plate')).toContainText('ヴァルシール');
  await expect.poll(() => playing(page)).toBe('CHAPTER1_FINAL_BOSS');
  expect(await stage(page)).toBe('RAID');
});

test('the first form beaten: the stage moves on, つづく, the title — and 「つづきから」 comes back to つづく, not the village', async ({ page }) => {
  test.setTimeout(180_000);
  await heaviestVillage(page);
  await page.evaluate(() => ((window as unknown as { __mugenFinaleFoeHp?: number }).__mugenFinaleFoeHp = 1));
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'EVE');
  expect(await readWhile(page, ['EVE', 'RUINS_SEAL', 'MORNING', 'RAID', 'LURE', 'VILLAGE_MIREI', 'FORM1_START'])).toEqual([
    'EVE',
    'RUINS_SEAL',
    'MORNING',
    'RAID',
    'LURE',
    'VILLAGE_MIREI',
    'FORM1_START',
  ]);
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 60_000 });
  await page.getByTestId('pb-result-next').click();
  await expect(page.getByTestId('finale-pause')).toBeVisible();
  await expect.poll(() => stage(page)).toBe('FORM1_WON');
  await page.getByTestId('finale-pause-ok').click();
  await expect(page.getByTestId('continue-button')).toBeVisible();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('finale-pause')).toBeVisible();
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
});

test('before PHASE 3 a rest is only a rest', async ({ page }) => {
  await heaviestVillage(page, 0);
  expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBeLessThan(3);
  const day = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(page.getByTestId('finale-scene')).toHaveCount(0);
  expect(await stage(page)).toBe('NONE');
});

test('DEBUG: 第1章終盤 from the 3人戦闘 chooser — nothing kept', async ({ page }) => {
  await page.goto('/?preview=party&enemy=select');
  await page.getByTestId('pb-select-finale').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'EVE');
  await page.goto('/?preview=finale&from=RAID&weak=1');
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'VILLAGE_MIREI');
});
