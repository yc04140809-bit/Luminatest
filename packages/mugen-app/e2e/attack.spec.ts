import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening } from './opening';
import { enemyHp, fightToResult, readyToAct } from './battle';

/**
 * 攻撃, ON THE ARTIFACT'S BATTLE SCREEN, AGAINST THE REAL FIGHT.
 *
 * One press is one turn the core decides, shown the Artifact's way:
 * he steps in, the blade lands, the creature flinches, the core's own
 * number rises off it, and its answer lands on him. Nothing is checked
 * by eye; every turn is sampled frame by frame from the page.
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

async function intoAFight(page: Page) {
  await freshApp(page);
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
}

interface Frame {
  t: number;
  beat: string;
  camera: string;
  hero: string;
  enemy: string;
  locked: string;
  hits: { side: 'enemy' | 'hero'; amount: string }[];
}

/** Records what the screen shows, every frame, for `ms`. */
async function record(page: Page, ms: number) {
  await page.evaluate((ms) => {
    const w = window as unknown as { __frames: Frame[] };
    w.__frames = [];
    const t0 = performance.now();
    const tick = () => {
      const stage = document.querySelector<HTMLElement>('.bp-stage');
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        beat: stage?.dataset.beat ?? '',
        camera: stage?.dataset.camera ?? '',
        hero: document.querySelector('.bp-hero')?.className ?? '',
        enemy: document.querySelector('.bp-enemy')?.className ?? '',
        locked:
          document.querySelector<HTMLElement>('[data-testid="bp-commands"]')?.dataset.locked ?? '',
        hits: [...document.querySelectorAll<HTMLElement>('.bp-hit')].map((h) => ({
          // Left of centre is the creature's side of the field.
          side: parseFloat(h.style.left) < 50 ? 'enemy' : 'hero',
          amount: h.querySelector('.bp-hit-damage')?.textContent ?? '',
        })),
      });
      if (performance.now() - t0 < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ms);
}

async function frames(page: Page): Promise<Frame[]> {
  return page.evaluate(() => (window as unknown as { __frames: Frame[] }).__frames);
}

/** How long the row stayed locked, from the frames. */
const lockedFor = (f: Frame[]) => {
  const on = f.find((x) => x.locked === 'yes');
  const off = on && f.find((x) => x.t > on.t && x.locked === 'no');
  return on && off ? off.t - on.t : Infinity;
};

test('one 攻撃 is one turn: he steps in, it flinches, the real number, the real health', async ({
  page,
}) => {
  await intoAFight(page);
  const [before] = await enemyHp(page);
  await record(page, 1600);
  await page.getByTestId('bp-attack').click();
  await page.waitForTimeout(1700);
  const f = await frames(page);
  await readyToAct(page);
  const [after] = await enemyHp(page);

  // He steps in: the camera works and his swing is drawn.
  expect(f.some((x) => x.beat === 'STRIKE' && x.hero.includes('strike'))).toBe(true);
  expect(f.some((x) => x.camera === 'FOCUS' || x.camera === 'IMPACT')).toBe(true);
  // It flinches.
  expect(f.some((x) => x.enemy.includes('struck'))).toBe(true);
  // THE NUMBER IS THE CORE'S: exactly what its health lost.
  const shown = f.flatMap((x) => x.hits).find((h) => h.side === 'enemy');
  expect(shown, 'a number rose off the creature').toBeTruthy();
  expect(Number(shown!.amount)).toBe(before - after);
  expect(after).toBeLessThan(before);
  // And the camera is home and the row free once it is over.
  expect(f[f.length - 1].camera).toBe('IDLE');
  expect(f[f.length - 1].locked).toBe('no');
});

test('pressing again and again while it plays is still one turn', async ({ page }) => {
  await intoAFight(page);
  const [before] = await enemyHp(page);
  await record(page, 1600);
  for (let i = 0; i < 6; i++) await page.getByTestId('bp-attack').click();
  await page.waitForTimeout(1700);
  const f = await frames(page);
  await readyToAct(page);
  const [after] = await enemyHp(page);
  const numbers = new Set(
    f.flatMap((x) => x.hits.filter((h) => h.side === 'enemy').map((h) => h.amount)),
  );
  expect(numbers.size, 'one blow landed on it, not six').toBe(1);
  expect(before - after).toBe(Number([...numbers][0]));
  // Never two swings on screen at once.
  expect(Math.max(...f.map((x) => x.hits.filter((h) => h.side === 'enemy').length))).toBe(1);
});

test('×2 is quicker and still shows every part of the turn', async ({ page }) => {
  await intoAFight(page);
  await record(page, 1600);
  await page.getByTestId('bp-attack').click();
  await page.waitForTimeout(1700);
  const slow = lockedFor(await frames(page));
  await readyToAct(page);

  await page.getByTestId('bp-speed').click();
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '2');
  const [before] = await enemyHp(page);
  await record(page, 1200);
  await page.getByTestId('bp-attack').click();
  await page.waitForTimeout(1300);
  const f = await frames(page);
  await readyToAct(page);
  const [after] = await enemyHp(page);
  const fast = lockedFor(f);

  expect(fast).toBeLessThan(slow);
  expect(f.some((x) => x.hero.includes('strike'))).toBe(true);
  expect(f.some((x) => x.enemy.includes('struck'))).toBe(true);
  const shown = f.flatMap((x) => x.hits).find((h) => h.side === 'enemy');
  expect(Number(shown!.amount)).toBe(before - after);
});

test('beaten, it goes down, and the game carries on from there', async ({ page }) => {
  await intoAFight(page);
  // Swing until it falls, watching for it lying down on the way out.
  let sawItDown = false;
  // A whole fight is about a dozen turns of about a second each.
  const until = Date.now() + 60_000;
  while (Date.now() < until) {
    if (await page.getByTestId('bp-enemy-downed').isVisible().catch(() => false)) {
      sawItDown = true;
      break;
    }
    const free = await page.evaluate(
      () => document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no',
    );
    if (free) await page.getByTestId('bp-attack').click().catch(() => {});
    else await page.waitForTimeout(60);
  }
  expect(sawItDown, 'the creature is shown lying down').toBe(true);
  // Its health reads nothing left, the row is gone, and then the game
  // moves on to what it was worth.
  expect((await enemyHp(page))[0]).toBe(0);
  await expect(page.getByTestId('bp-commands')).toHaveCount(0);
  await fightToResult(page);
  await page.getByTestId('result-done').click();
  await expect(page.getByTestId('encounter-button')).toBeVisible();
  await expect(page.locator('.bp-screen')).toHaveCount(0);
});

test('leaving in the middle of a swing leaves nothing behind', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await intoAFight(page);
  await page.getByTestId('bp-attack').click();
  await page.waitForTimeout(150);
  // Closed mid-blow — the harshest way out there is.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('explore-button').or(page.getByTestId('forest-button'))).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.locator('.bp-hit')).toHaveCount(0);
  // And a fight started afresh plays normally.
  if (await page.getByTestId('explore-button').isVisible()) await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  const [before] = await enemyHp(page);
  await page.getByTestId('bp-attack').click();
  await readyToAct(page);
  expect((await enemyHp(page))[0]).toBeLessThan(before);
  expect(errors).toEqual([]);
});
