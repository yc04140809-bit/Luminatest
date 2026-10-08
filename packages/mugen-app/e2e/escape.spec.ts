import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';
import { command, readyToAct } from './battle';
import { goTo, hero, settled, things, touch } from './roam';

/**
 * 逃げる — BACK TO BEFORE THE FIGHT.
 *
 * Fleeing an ordinary fight puts the player back in the forest exactly as
 * they left it — standing where they stood, what they had read still read,
 * the finds still waiting — and keeps nothing from the fight: the wounds
 * and the MP it cost are not kept, a herb drunk in it is back in the bag,
 * and there is no EXP, LUMI or result. Gald's fight cannot be fled.
 */

type W = {
  __mugenWorld: {
    addItem(id: string, n: number): Promise<number>;
    getItemCount(id: string): number;
    getBattleCondition(): { hp: number; mp: number };
    getProgress(id: string): { totalExp: number };
    getLumi(): number;
  };
};

async function freshForest(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __played: string[] };
    w.__played = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.__played.push(decodeURIComponent(this.currentSrc || this.src));
      return play.call(this).catch(() => undefined);
    };
  });
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
  await page.evaluate(() => (window as unknown as W).__mugenWorld.addItem('FOREST_HERB', 2));
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-mode', 'roam');
  await settled(page);
}

const world = <T,>(page: Page, f: (w: W['__mugenWorld']) => T) =>
  page.evaluate((src) => new Function('w', `return (${src})(w)`)((window as unknown as W).__mugenWorld), f.toString()) as Promise<T>;

test('fleeing puts the forest back as it was, and keeps nothing from the fight', async ({ page }) => {
  test.setTimeout(120_000);
  await freshForest(page);
  // Walk somewhere and read something.
  await goTo(page, 'PUDDLE');
  await page.getByTestId('walk-look').click();
  await touch(page, { x: 0.5, y: 0.66 });
  const stood = await hero(page);
  const thingsBefore = (await things(page)).map((t) => t.id).sort();
  const caption = await page.getByTestId('walk-caption').textContent();
  const before = await world(page, (w) => ({
    hp: w.getBattleCondition().hp,
    mp: w.getBattleCondition().mp,
    herbs: w.getItemCount('FOREST_HERB'),
    exp: w.getProgress('hero').totalExp,
    lumi: w.getLumi(),
  }));

  // Into a fight; be hurt, drink a herb.
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  const hp = async () => Number(((await page.getByTestId('bp-player-hp').textContent()) ?? '').replace(/\D+/g, ' ').trim().split(' ')[0]);
  for (let i = 0; i < 10 && (await hp()) >= before.hp; i++) await command(page, 'bp-attack');
  expect(await hp()).toBeLessThan(before.hp);
  await readyToAct(page);
  await page.getByTestId('bp-item').click();
  await page.getByTestId('bp-item-FOREST_HERB').click();
  await expect.poll(() => world(page, (w) => w.getItemCount('FOREST_HERB'))).toBe(before.herbs - 1);
  await readyToAct(page);

  // 逃げる.
  await page.getByTestId('bp-escape').click();
  await expect(page.getByTestId('walk-scene')).toBeVisible();
  await expect.poll(async () => (await page.evaluate(() => (window as unknown as { __played: string[] }).__played)).some((s) => s.includes('/battle_escape'))).toBe(true);
  await expect(page.getByTestId('battle-result')).toHaveCount(0);
  await expect(page.getByTestId('result-exp')).toHaveCount(0);

  // The forest as it was: where they stood, what was read, what was waiting.
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-walking', 'no');
  expect(await hero(page)).toEqual(stood);
  expect((await things(page)).map((t) => t.id).sort()).toEqual(thingsBefore);
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-read', /PUDDLE/);
  await expect(page.getByTestId('walk-marker-PUDDLE')).toHaveCount(0);
  await expect(page.getByTestId('walk-caption')).toHaveText(caption ?? '');

  // Nothing from the fight kept: health and MP as before, the herb back, no EXP or LUMI.
  const after = await world(page, (w) => ({
    hp: w.getBattleCondition().hp,
    mp: w.getBattleCondition().mp,
    herbs: w.getItemCount('FOREST_HERB'),
    exp: w.getProgress('hero').totalExp,
    lumi: w.getLumi(),
  }));
  expect(after).toEqual(before);

  // And the forest goes on: a touch walks, the doors are there.
  await touch(page, { x: 0.3, y: 0.66 });
  expect((await hero(page)).x).toBeLessThan(stood.x);
  await expect(page.getByTestId('encounter-button')).toBeVisible();
});

test('the forest entered any other way walks in afresh', async ({ page }) => {
  await freshForest(page);
  await touch(page, { x: 0.4, y: 0.66 });
  await page.getByTestId('leave-forest').click();
  await page.getByTestId('forest-button').click();
  await expect(page.getByTestId('walk-scene')).toHaveAttribute('data-mode', 'roam');
  // Walking in from the right again, to where a walk starts.
  await settled(page);
  expect((await hero(page)).x).toBeGreaterThan(0.8);
});

test('Gald’s fight cannot be fled', async ({ page }) => {
  await freshForest(page);
  await page.getByTestId('gald-button').click();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('battle-screen').isVisible().catch(() => false)) break;
    await page.getByTestId('encounter-next').click();
  }
  await readyToAct(page);
  await expect(page.getByTestId('bp-escape')).toHaveCount(0);
});
