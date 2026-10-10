import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { settled } from './roam';
import { readyToAct, fightToResult } from './battle';

/**
 * THE FOREST'S ORDINARY FIGHTS (作者判断 2026-10-10): every ordinary creature
 * FORGE sends is part of the forest's life unless there is a reason not.
 *
 *   ヒョウレイ (MON-000008)  talked of first (the signs' second phase), met in
 *                            ordinary fights a little after; the first time a
 *                            few lines, then an ordinary fight. Not a boss.
 *   フウミミ (MON-000002)    its kind met in ordinary fights once its one
 *                            individual (IND-43452DFD) has been answered — that
 *                            one's story stays once; the species does not end.
 *
 * The roll for who comes out of the undergrowth is fixed by the test
 * (`__mugenEncounterRoll`, DEV only).
 */

type DevWorld = {
  addIncident(kind: string, id?: string): Promise<boolean>;
  getIncidentPoint(): number;
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  meetFixedIndividual(id: string, species: string): Promise<unknown>;
  recordCreatureLifeChoice(id: string, c: string): Promise<unknown>;
  getFuumimiAnswer(): { choice: string } | null;
  getKnownEvents(): { id: string }[];
  isRead(id: string): boolean;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const roll = (page: Page, r: number) =>
  page.evaluate((v) => ((window as unknown as { __mugenEncounterRoll?: number }).__mugenEncounterRoll = v), r);

async function settledVillage(page: Page) {
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
}

const toPoint = (page: Page, n: number) =>
  world(page, `async (w) => { for (let i = 0; w.getIncidentPoint() < ${n}; i++) await w.addIncident('PLACE', 'P' + i); }`);

async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);
}

async function firstSight(page: Page): Promise<string[]> {
  await expect(page.getByTestId('creature-encounter')).toBeVisible();
  const said: string[] = [];
  for (let i = 0; i < 8; i++) {
    if (!(await page.getByTestId('creature-encounter-next').isVisible().catch(() => false))) break;
    said.push(((await page.getByTestId('creature-encounter-line').textContent()) ?? '').trim());
    await page.getByTestId('creature-encounter-next').click();
  }
  return said;
}

test.describe.configure({ timeout: 240_000 });

test('ヒョウレイ: not before it is talked of; a little after, met in the forest — a few lines the first time, then an ordinary fight, not a boss', async ({
  page,
}) => {
  await settledVillage(page);
  // The signs' second phase: the rumour is there, the creature not yet.
  await toPoint(page, 6);
  await page.getByTestId('rumor-button').click();
  await expect(page.getByTestId('rumor-INC_SHINING_WINGS')).toBeVisible();
  await page.getByTestId('rumor-leave').click();
  await intoTheForest(page);
  // 0.7 is ヒョウレイ’s share once it is open (モスラビット 6・ヒョウレイ 2・イワホロ 2); before, it falls on the rabbit.
  await roll(page, 0.7);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('モスラビット');
  await page.getByTestId('bp-escape').click();
  await settled(page);

  // Two steps on: it can come out of the undergrowth.
  await toPoint(page, 8);
  await roll(page, 0.7);
  await page.getByTestId('encounter-button').click();
  const lines = await firstSight(page);
  expect(lines.at(-1)).toBe('「……あれが、噂の子かな。気をつけて、すごく速いよ。」');
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('ヒョウレイ');
  await expect(page.getByTestId('bp-boss-tag')).toHaveCount(0);
  await expect(page.getByTestId('bp-escape')).toBeVisible();
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('note:FIRST_SIGHT_hyourei')`)).toBe(true);
  await page.getByTestId('bp-escape').click();
  await settled(page);

  // The second time: straight into an ordinary fight, and an ordinary win.
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('creature-encounter')).toHaveCount(0);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('ヒョウレイ');
  await fightToResult(page);
  await expect(page.getByTestId('result-exp')).toContainText('24');
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');

  // And the rabbit is still the forest's commonest (roll 0).
  await settled(page);
  await roll(page, 0);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('モスラビット');
});

test('フウミミ: its kind joins the forest’s fights once the one individual is answered — an ordinary fight, which writes nothing into WORLD MEMORY', async ({
  page,
}) => {
  await settledVillage(page);
  await intoTheForest(page);
  // Before the individual is answered: only the rabbit, whatever the roll.
  await roll(page, 0.99);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('モスラビット');
  await page.getByTestId('bp-escape').click();
  await settled(page);

  await world(page, `async (w) => { await w.meetFixedIndividual('IND-43452DFD', 'fuumimi'); await w.recordCreatureLifeChoice('IND-43452DFD', 'SPARE'); }`);
  const memory = (await world<{ id: string }[]>(page, `(w) => w.getKnownEvents()`)).length;
  await roll(page, 0.99);
  await page.getByTestId('encounter-button').click();
  const lines = await firstSight(page);
  expect(lines[0]).toContain('あの時と同じ姿');
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('フウミミ');
  await fightToResult(page);
  await expect(page.getByTestId('result-exp')).toContainText('22');
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  // No four answers for an ordinary one; WORLD MEMORY as it was; the individual's answer unchanged.
  await expect(page.getByTestId('creature-life-choice-screen')).toHaveCount(0);
  expect((await world<{ id: string }[]>(page, `(w) => w.getKnownEvents()`)).length).toBe(memory);
  expect((await world<{ choice: string }>(page, `(w) => w.getFuumimiAnswer()`)).choice).toBe('SPARE');
  // The individual is not offered again.
  await expect(page.getByTestId('fuumimi-button')).toHaveCount(0);
});

test('イワホロ: not in the signs’ first phase; from the second, met in the forest — a few lines the first time, then an ordinary fight, not a boss', async ({
  page,
}) => {
  await settledVillage(page);
  await toPoint(page, 4);
  await intoTheForest(page);
  // Before the second phase (going into the forest is itself a step): only the rabbit, whatever the roll.
  expect(await world<number>(page, `(w) => w.getIncidentPoint()`)).toBeLessThan(6);
  await roll(page, 0.99);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('モスラビット');
  await page.getByTestId('bp-escape').click();
  await settled(page);

  await toPoint(page, 6);
  await roll(page, 0.99);
  await page.getByTestId('encounter-button').click();
  const lines = await firstSight(page);
  expect(lines.at(-1)).toBe('「……石じゃない。生きてる。来るよ！」');
  await readyToAct(page);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('イワホロ');
  await expect(page.getByTestId('bp-boss-tag')).toHaveCount(0);
  await expect.poll(() => world<boolean>(page, `(w) => w.isRead('note:FIRST_SIGHT_iwahoro')`)).toBe(true);
  const memory = (await world<{ id: string }[]>(page, `(w) => w.getKnownEvents()`)).length;
  await fightToResult(page);
  await expect(page.getByTestId('result-exp')).toContainText('20');
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await expect(page.getByTestId('creature-life-choice-screen')).toHaveCount(0);
  expect((await world<{ id: string }[]>(page, `(w) => w.getKnownEvents()`)).length).toBe(memory);

  // The second time: straight into an ordinary fight.
  await settled(page);
  await roll(page, 0.99);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await expect(page.getByTestId('creature-encounter')).toHaveCount(0);
  await expect(page.getByTestId('bp-enemy-name')).toHaveText('イワホロ');
});
