import { test, expect, type Page } from '@playwright/test';
import { enemyHp, fightToResult, readyToAct } from './battle';
import { throughTheOpening } from './opening';

/**
 * HIS 攻撃, WITH THE SWORD SEEN (STEP D) — in the debug preview.
 *
 * The trail and the bite (slash/SwordSlash) are drawn for his swing and
 * for nothing else; the number is still the health the core took off;
 * ×2 keeps them seen; the creature still goes down; and the game's own
 * fight does not draw them yet (joined only after the device check).
 */

interface Frame {
  t: number;
  beat: string;
  slash: boolean;
  slashInEnemy: boolean;
  enemyHits: string[];
  locked: string;
}

async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean };
    w.__frames = [];
    w.__on = true;
    const t0 = performance.now();
    const tick = () => {
      const s = document.querySelector('[data-testid="sword-slash"]');
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        beat: document.querySelector('.bp-stage')?.getAttribute('data-beat') ?? '',
        slash: !!s,
        slashInEnemy: !!s?.closest('.bp-enemy'),
        enemyHits: [...document.querySelectorAll<HTMLElement>('.bp-hit')]
          .filter((h) => parseFloat(h.style.left) < 50)
          .map((h) => h.querySelector('.bp-hit-damage')?.textContent ?? ''),
        locked:
          document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') ?? '',
      });
      if (w.__on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stop(page: Page): Promise<Frame[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean };
    w.__on = false;
    return w.__frames;
  });
}
const shownFor = (f: Frame[]) => {
  const on = f.find((x) => x.slash);
  const off = on && f.find((x) => x.t > on.t && !x.slash);
  return on && off ? off.t - on.t : 0;
};

test("his 攻撃: the trail and bite on the creature, the core's own number, and nothing left", async ({
  page,
}) => {
  await page.goto('/?preview=battle&debug=0&answer=ATTACK');
  await readyToAct(page);
  const [before] = await enemyHp(page);
  await record(page);
  await page.getByTestId('bp-attack').click();
  await readyToAct(page);
  await page.waitForTimeout(200);
  const f = await stop(page);

  // Drawn on the creature, during his swing.
  expect(f.some((x) => x.slash)).toBe(true);
  expect(f.filter((x) => x.slash).every((x) => x.slashInEnemy)).toBe(true);
  expect(f.find((x) => x.slash)!.beat).toBe('STRIKE');
  // His, not the creature's: the bite may still be fading as it starts
  // its lunge, but it is gone before the creature's blow lands on him.
  expect(f.some((x) => x.slash && x.beat === 'HURT')).toBe(false);
  // The number is the core's: exactly the health it lost.
  const number = f.flatMap((x) => x.enemyHits).find(Boolean);
  expect(Number(number)).toBe(before - (await enemyHp(page))[0]);
  // And gone after, the row free.
  await expect(page.getByTestId('sword-slash')).toHaveCount(0);
  expect(f[f.length - 1].locked).toBe('no');
});

test('×2: quicker, and still seen — and still gone before its blow lands', async ({ page }) => {
  const swing = async (speed: 1 | 2) => {
    await page.goto('/?preview=battle&debug=0&answer=ATTACK');
    await readyToAct(page);
    if (speed === 2) await page.getByTestId('bp-speed').click();
    await record(page);
    await page.getByTestId('bp-attack').click();
    await readyToAct(page);
    await page.waitForTimeout(200);
    const f = await stop(page);
    expect(f.some((x) => x.slash && x.beat === 'HURT')).toBe(false);
    return shownFor(f);
  };
  const slow = await swing(1);
  const fast = await swing(2);
  expect(fast).toBeLessThan(slow);
  // Never a flicker: the floors hold it for a readable moment.
  expect(fast).toBeGreaterThanOrEqual(280);
});

test('only for his swing: not for a spell, an item, or a guard', async ({ page }) => {
  // A spell of hers.
  await page.goto('/?preview=battle&debug=0&spell=starlight_bolt');
  await record(page);
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await readyToAct(page, 12_000);
  expect((await stop(page)).some((x) => x.slash)).toBe(false);

  // A guard, and an item.
  await page.goto('/?preview=battle&debug=0&bag=1&hurt=1');
  await readyToAct(page);
  await record(page);
  await page.getByTestId('bp-defend').click();
  await readyToAct(page);
  await page.getByTestId('bp-item').click();
  await page.getByTestId('bp-item-FOREST_HERB').click();
  await readyToAct(page);
  expect((await stop(page)).some((x) => x.slash)).toBe(false);
});

test('switched off, his 攻撃 is drawn as the game draws it today', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0&slash=0');
  await readyToAct(page);
  await record(page);
  await page.getByTestId('bp-attack').click();
  await readyToAct(page);
  expect((await stop(page)).some((x) => x.slash)).toBe(false);
});

test('swung until it falls: it goes down, stays down, nothing left over', async ({ page }) => {
  await page.goto('/?preview=battle&debug=0');
  const until = Date.now() + 60_000;
  while (Date.now() < until && !(await page.getByTestId('bp-enemy-downed').isVisible())) {
    const free = await page.evaluate(
      () =>
        document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no',
    );
    if (free)
      await page
        .getByTestId('bp-attack')
        .click()
        .catch(() => {});
    else await page.waitForTimeout(40);
  }
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByTestId('sword-slash')).toHaveCount(0);
});

for (const bg of ['FOREST', 'RUINS', 'SWAMP', 'CITY', 'BEACH', 'GRASSLAND']) {
  test(`on ${bg}, the swing is drawn and nothing breaks`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`/?preview=battle&debug=0&bg=${bg}`);
    await readyToAct(page);
    await record(page);
    await page.getByTestId('bp-attack').click();
    await readyToAct(page);
    expect((await stop(page)).some((x) => x.slash)).toBe(true);
    // The page is still the size of the screen: nothing spilled out.
    const scroll = await page.evaluate(() => document.scrollingElement!.scrollWidth);
    expect(scroll).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(errors).toEqual([]);
  });
}

test('the same swing, the same number, every time', async ({ page }) => {
  const once = async () => {
    await page.goto('/?preview=battle&debug=0&swing=1');
    // The swing starts a moment after the page does: wait for it to land.
    await expect.poll(async () => (await enemyHp(page))[0]).toBeLessThan(124);
    await readyToAct(page);
    return (await enemyHp(page))[0];
  };
  expect(await once()).toBe(await once());
});

test("the game's own fight does not draw it yet — joined after the device check", async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? [])
      if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('forest-button').click();
  await page.getByTestId('encounter-button').click();
  await readyToAct(page);
  await record(page);
  await page.getByTestId('bp-attack').click();
  await readyToAct(page);
  expect((await stop(page)).some((x) => x.slash)).toBe(false);
  await fightToResult(page);
});
