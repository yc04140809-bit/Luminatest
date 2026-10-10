import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { settled } from './roam';
import { readyToAct, fightToResult, fightUntil, enemyHp } from './battle';

/**
 * THE APP'S THREE FIGHTS, PINNED (2026-10-10) — written before the App's
 * note of "which fight is on" was tidied into one value, so the tidy-up can
 * be shown to change nothing.
 *
 *   モスラビット   the forest's ordinary fight
 *   ガルド         the story's fight, from the road to the four answers
 *   セキリュウガ   the first boss route's fight, in the ruins
 *
 * For each: what stands there and how the screen is set (name, BOSS tag,
 * 逃げる, AUTO, ♪, ground, place, music, health), and where each way out
 * leads — fleeing, winning, losing. The win against Gald and the one
 * against セキリュウガ are walked for real in gald.spec and sekiryuga.spec.
 */

type DevWorld = {
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
  getBattleCondition(): { hp: number; mp: number };
  setBattleCondition(c: { hp: number; mp: number }): Promise<unknown>;
  getSekiryugaStage(): string;
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
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Gald answered and the one look ahead walked: back in the village, AUTO open. */
async function pastGald(page: Page) {
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
}

async function intoTheForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);
}

/** To the seal's entrance, the route at TOLD. */
async function toTheSeal(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('ruins-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await settled(page);
  await page.getByTestId('deep-button').click();
  await expect(page.getByTestId('seal-approach')).toBeVisible();
  for (let i = 0; i < 40; i++) {
    if (!(await page.getByTestId('seal-next').isVisible().catch(() => false))) break;
    await page.getByTestId('seal-next').click();
  }
  await expect(page.getByTestId('seal-entrance')).toBeVisible({ timeout: 10_000 });
}

/** How the fight on screen is set. */
async function fingerprint(page: Page) {
  await readyToAct(page);
  const shown = async (id: string) => page.getByTestId(id).isVisible().catch(() => false);
  return {
    name: (await page.getByTestId('bp-enemy-name').textContent())?.trim(),
    boss: await shown('bp-boss-tag'),
    escape: await shown('bp-escape'),
    auto: await shown('bp-auto'),
    bgmCycle: await shown('bp-bgm-cycle'),
    ground: await page.getByTestId('bp-battle-bg').getAttribute('data-background'),
    place: (await page.getByTestId('bx-place').textContent())?.trim(),
    music: await page.evaluate(
      () => (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio?.bgmState().current ?? null,
    ),
    health: (await enemyHp(page))[1],
  };
}

/** Down to one point of health, and swinging until the fight is lost. */
async function loseFrom(page: Page, done: () => Promise<boolean>) {
  await fightUntil(page, done, { maxTurns: 40 });
}

test.describe.configure({ timeout: 240_000 });

test('モスラビット before Gald: set as ever; 逃げる puts the forest back; a loss carries them home, on their feet', async ({ page }) => {
  await freshVillage(page);
  await intoTheForest(page);
  await page.getByTestId('encounter-button').click();
  expect(await fingerprint(page)).toEqual({
    name: 'モスラビット',
    boss: false,
    escape: true,
    auto: false,
    bgmCycle: false,
    ground: 'FOREST',
    place: 'GREENWOOD FORESTグリーンウッドの森',
    music: 'NORMAL_BATTLE',
    health: 124,
  });
  await page.getByTestId('bp-escape').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
  await settled(page);

  // Lost: home, and put back on their feet.
  const { mp } = await world<{ hp: number; mp: number }>(page, `(w) => w.getBattleCondition()`);
  await world(page, `(w) => w.setBattleCondition({ hp: 1, mp: ${mp} })`);
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await loseFrom(page, () => page.getByTestId('world-clock').isVisible().catch(() => false));
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect((await world<{ hp: number }>(page, `(w) => w.getBattleCondition()`)).hp).toBeGreaterThan(1);
});

test('モスラビット after Gald: AUTO open; a win shows what was won and goes back to the forest', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  await intoTheForest(page);
  await page.getByTestId('encounter-button').click();
  expect(await fingerprint(page)).toEqual({
    name: 'モスラビット',
    boss: false,
    escape: true,
    auto: true,
    bgmCycle: true,
    ground: 'FOREST',
    place: 'GREENWOOD FORESTグリーンウッドの森',
    music: 'NORMAL_BATTLE',
    health: 124,
  });
  await fightToResult(page);
  await expect(page.getByTestId('result-exp')).toBeVisible();
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'GREENWOOD_FOREST');
});

test('ガルド: his own music, no 逃げる, no AUTO, at arm’s length in the forest', async ({ page }) => {
  await freshVillage(page);
  await intoTheForest(page);
  await page.getByTestId('gald-button').click();
  await expect(page.getByTestId('gald-encounter')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  expect(await fingerprint(page)).toEqual({
    name: '盗賊 ガルド',
    boss: false,
    escape: false,
    auto: false,
    bgmCycle: false,
    ground: 'FOREST',
    place: 'GREENWOOD FORESTグリーンウッドの森',
    music: 'BOSS_BATTLE',
    health: 220,
  });

  // Lost: home, on their feet — and he is still on the road, unanswered.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  // つづきから opens where they were (the region map), one step from the village.
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  const { mp } = await world<{ hp: number; mp: number }>(page, `(w) => w.getBattleCondition()`);
  await world(page, `(w) => w.setBattleCondition({ hp: 1, mp: ${mp} })`);
  await intoTheForest(page);
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await readyToAct(page);
  await loseFrom(page, () => page.getByTestId('world-clock').isVisible().catch(() => false));
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect((await world<{ hp: number }>(page, `(w) => w.getBattleCondition()`)).hp).toBeGreaterThan(1);
  await intoTheForest(page);
  await expect(page.getByTestId('gald-button')).toBeVisible();
});

test('セキリュウガ: BOSS, in the ruins; 逃げる back to the ruins; a loss carries them home and closes the ruins', async ({ page }) => {
  await freshVillage(page);
  await pastGald(page);
  for (const s of ['RUMOR', 'TOLD']) await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
  await toTheSeal(page);
  await page.getByTestId('boss-fight').click();
  expect(await fingerprint(page)).toEqual({
    name: 'セキリュウガ',
    boss: true,
    escape: true,
    auto: true,
    bgmCycle: false,
    ground: 'RUINS',
    place: 'ANCIENT RUINS古代遺跡',
    music: 'BOSS_BATTLE',
    health: 170,
  });
  await page.getByTestId('bp-escape').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-place', 'ANCIENT_RUINS');
  await settled(page);
  expect(await world<string>(page, `(w) => w.getSekiryugaStage()`)).toBe('TOLD');

  // Lost: home, on their feet, the route where it was; the map, not the ruins, next time out.
  await page.getByTestId('deep-button').click();
  for (let i = 0; i < 40; i++) {
    if (!(await page.getByTestId('seal-next').isVisible().catch(() => false))) break;
    await page.getByTestId('seal-next').click();
  }
  await expect(page.getByTestId('seal-entrance')).toBeVisible({ timeout: 10_000 });
  const { mp } = await world<{ hp: number; mp: number }>(page, `(w) => w.getBattleCondition()`);
  await world(page, `(w) => w.setBattleCondition({ hp: 1, mp: ${mp} })`);
  await page.getByTestId('boss-fight').click();
  await readyToAct(page);
  await loseFrom(page, () => page.getByTestId('world-clock').isVisible().catch(() => false));
  await expect(page.getByTestId('world-clock')).toBeVisible();
  expect((await world<{ hp: number }>(page, `(w) => w.getBattleCondition()`)).hp).toBeGreaterThan(1);
  expect(await world<string>(page, `(w) => w.getSekiryugaStage()`)).toBe('TOLD');
  await page.getByTestId('explore-button').click();
  await expect(page.getByTestId('ruins-button')).toBeVisible();
  await expect(page.getByTestId('walk-scene')).toHaveCount(0);
});
