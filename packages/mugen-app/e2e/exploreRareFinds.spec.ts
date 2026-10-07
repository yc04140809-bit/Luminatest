import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { goTo, settled, things, touch, type RoamThing } from './roam';

/**
 * 古代遺跡 — FINDS BY RARITY, and the once-in-a-world rainbow find.
 *
 * NORMAL finds as before; golden (RARE) ones now and then, a line and
 * nothing more; and the ruins' RAINBOW find, 《星紋の遺剣》: taken once,
 * kept in this phone's save (`explorationRareFinds`, the sword in the
 * owned equipment), still held after a restart, and never there again.
 *
 * The DEBUG doors `&find=RARE` / `&find=RAINBOW` make finds that grade
 * so they can be checked without walking for an hour — the rainbow
 * still only while it has not been taken.
 */

const scene = (page: Page) => page.getByTestId('walk-scene');

async function freshSave(page: Page) {
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

async function openRuins(page: Page, find?: 'RARE' | 'RAINBOW') {
  await page.goto(`/?preview=walk&place=ANCIENT_RUINS${find ? `&find=${find}` : ''}`);
  await expect(scene(page)).toHaveAttribute('data-mode', 'roam');
  await settled(page);
  await expect.poll(async () => (await things(page)).some((t) => t.kind === 'find')).toBe(true);
}

/** The rows exploring keeps, read straight from this phone's save. */
async function savedRows(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(
    () =>
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const req = indexedDB.open('mugen-zero-app');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('world_state', 'readonly');
          const all = tx.objectStore('world_state').getAll();
          all.onsuccess = () => {
            const out: Record<string, unknown> = {};
            for (const row of all.result as { key: string; value: unknown }[]) out[row.key] = row.value;
            db.close();
            resolve(out);
          };
        };
      }),
  );
}

const firstFind = async (page: Page, grade?: RoamThing['grade']) =>
  (await things(page)).find((t) => t.kind === 'find' && (!grade || t.grade === grade));

test('NORMAL, then golden, then the rainbow: each its own look, and 《星紋の遺剣》 is taken, saved, held after a restart, and never there again', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await freshSave(page);
  const before = await savedRows(page);
  expect(before.explorationRareFinds).toBeUndefined();
  expect(before.explorationVisits).toBeUndefined();

  // 1. NORMAL: the red 「！」, a plain line.
  await openRuins(page);
  const normal = (await firstFind(page))!;
  expect(normal.grade).toBe('NORMAL');
  await goTo(page, normal.id);
  await expect(page.getByTestId(`walk-marker-${normal.id}`)).toHaveAttribute('data-variant', 'normal');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).toHaveAttribute('data-grade', 'NORMAL');

  // 2. RARE: a golden glint and a golden 「！」; a line, nothing handed over.
  await openRuins(page, 'RARE');
  const rare = (await firstFind(page, 'RARE'))!;
  expect(rare).toBeTruthy();
  await expect(page.getByTestId(`walk-sign-${rare.id}`)).toHaveAttribute('data-grade', 'RARE');
  await goTo(page, rare.id);
  await expect(page.getByTestId(`walk-marker-${rare.id}`)).toHaveAttribute('data-variant', 'rare');
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-caption')).toHaveAttribute('data-grade', 'RARE');
  expect(['古いコインが落ちている。', '珍しい鉱石の欠片を見つけた。', '古びた金具が土に埋もれている。', '金色の小さな留め具が、石のすき間で光っている。', '色の褪せた硝子玉が、陽を受けてきらめいている。']).toContain(
    await page.getByTestId('walk-caption').textContent(),
  );
  await expect(page.getByTestId('walk-prize')).toHaveCount(0);
  const afterRare = await savedRows(page);
  expect(afterRare.owned_equipment).toEqual(before.owned_equipment);

  // 3. RAINBOW: a glint in turning colour with motes, then a star — not a 「！」.
  await openRuins(page, 'RAINBOW');
  await expect(scene(page)).toHaveAttribute('data-rainbow', 'open');
  const rainbow = (await firstFind(page, 'RAINBOW'))!;
  expect(rainbow.id).toBe('STAR_CREST_RELIC_SWORD');
  await expect(page.getByTestId(`walk-sign-${rainbow.id}`)).toHaveAttribute('data-grade', 'RAINBOW');
  await expect(page.getByTestId(`walk-sign-${rainbow.id}`).locator('.roam-mote')).toHaveCount(4);
  // From afar: no marker yet, only the glint.
  await expect(page.getByTestId(`walk-marker-${rainbow.id}`)).toHaveCount(0);
  await goTo(page, rainbow.id);
  await expect(page.getByTestId(`walk-marker-${rainbow.id}`)).toHaveAttribute('data-variant', 'rainbow');
  await expect(page.getByTestId('walk-look')).toHaveAttribute('data-grade', 'RAINBOW');

  // 4. Taken: a flash, its name and words, and it is in the save at once.
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-prize-flash')).toHaveCount(1);
  await expect(page.getByTestId('walk-prize-name')).toHaveText('《星紋の遺剣》');
  await expect(page.getByTestId('walk-prize-text')).toHaveText(
    '欠けた星の紋様が刻まれた古い剣。長い眠りから目覚めたように、刃に淡い光が宿っている。',
  );
  await expect(page.getByTestId('walk-prize-unsaved')).toHaveCount(0);
  // The find card is the story, not the numbers (the equipment list shows those).
  await expect(page.getByTestId('walk-prize')).not.toContainText(/攻撃|\+2|1\.25|先手/);
  await expect(page.getByTestId(`walk-marker-${rainbow.id}`)).toHaveCount(0);
  await expect(scene(page)).toHaveAttribute('data-rainbow', 'taken');
  // 5. SAVE.
  await expect.poll(async () => (await savedRows(page)).explorationRareFinds).toEqual({ ANCIENT_RUINS: true });
  const saved = await savedRows(page);
  expect((saved.owned_equipment as Record<string, number>)['weapon/star_crest_relic_sword']).toBe(1);
  // The card closes, and touching it never walked anybody.
  await page.getByTestId('walk-prize-close').click();
  await expect(page.getByTestId('walk-prize')).toHaveCount(0);

  // 6. Restart.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  // 7. Still held — and it can be put on. Its +2 is in effect (2026-10-07), so the list says so.
  await page.getByTestId('status-button').click();
  await page.getByTestId('status-to-equipment').click();
  await page.getByTestId('equip-slot-WEAPON').click();
  const row = page.getByTestId('equip-choice-weapon/star_crest_relic_sword');
  await expect(row).toBeEnabled();
  await expect(row).toContainText('星紋の遺剣');
  await expect(row).toContainText('攻撃 +2');
  await row.click();
  await expect(page.getByTestId('equip-weapon-name')).toHaveText('星紋の遺剣');
  await expect(page.getByTestId('equip-description')).toContainText('欠けた星の紋様');

  // 8. The ruins again — even asking for the rainbow — and it is not there: ever.
  for (let visit = 0; visit < 2; visit++) {
    await openRuins(page, 'RAINBOW');
    await expect(scene(page)).toHaveAttribute('data-rainbow', 'taken');
    for (const p of [
      { x: 0.3, y: 0.62 },
      { x: 0.8, y: 0.6 },
    ]) {
      await touch(page, p);
      expect((await things(page)).some((t) => t.grade === 'RAINBOW')).toBe(false);
    }
    await expect(page.locator('.roam-sign.g-rainbow')).toHaveCount(0);
  }
  // And nothing it was not meant to touch has moved.
  const after = await savedRows(page);
  for (const key of Object.keys(before)) {
    if (['owned_equipment', 'character_equipment', 'session', 'explorationVisits'].includes(key)) continue;
    expect(after[key], key).toEqual(before[key]);
  }
});

test('the third find of a visit makes it a real visit, counted once in the save', async ({ page }) => {
  test.setTimeout(90_000);
  await freshSave(page);
  await openRuins(page);
  const count = async () => ((await savedRows(page)).explorationVisits as Record<string, number> | undefined)?.ANCIENT_RUINS ?? 0;
  expect(await count()).toBe(0);
  // Read finds and walk until three have turned up this visit.
  let seen = new Set<string>((await things(page)).filter((t) => t.kind === 'find').map((t) => t.id));
  for (let i = 0; i < 12 && seen.size < 3; i++) {
    const f = (await things(page)).find((t) => t.kind === 'find');
    if (f) {
      await goTo(page, f.id);
      await page.getByTestId('walk-look').click();
    }
    await touch(page, i % 2 ? { x: 0.25, y: 0.62 } : { x: 0.8, y: 0.62 });
    await page.waitForTimeout(3200);
    await touch(page, { x: 0.55, y: 0.66 });
    for (const t of await things(page)) if (t.kind === 'find') seen.add(t.id);
  }
  expect(seen.size).toBeGreaterThanOrEqual(3);
  await expect.poll(count).toBe(1);
  // More finds in the same visit do not count it again.
  await touch(page, { x: 0.25, y: 0.62 });
  await page.waitForTimeout(3200);
  await touch(page, { x: 0.8, y: 0.62 });
  expect(await count()).toBe(1);
});

test('with no save on the phone: the rainbow can be seen and taken, says it is not kept, and no save is created', async ({
  page,
}) => {
  await page.goto('/?preview=walk&place=ANCIENT_RUINS');
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
  await openRuins(page, 'RAINBOW');
  const rainbow = (await firstFind(page, 'RAINBOW'))!;
  await goTo(page, rainbow.id);
  await page.getByTestId('walk-look').click();
  await expect(page.getByTestId('walk-prize-name')).toHaveText('《星紋の遺剣》');
  await expect(page.getByTestId('walk-prize-unsaved')).toBeVisible();
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))).toEqual([]);
});
