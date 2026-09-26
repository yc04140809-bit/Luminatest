import { test, expect, type Page } from '@playwright/test';
import { enemyHp, readyToAct } from './battle';
import { throughTheOpening } from './opening';

/**
 * THE CUT-IN PART, IN THE DEBUG PREVIEW (STEP B).
 *
 * Played from the DEBUG panel with v18's four samples. What is checked
 * is what a player would see and what must not be left behind: how long
 * each one is on screen at ×1 and ×2, that its name is on top of
 * everything, that nothing can be pressed through it, that a row of them
 * plays in order, that stopping one stops it, and that when it is over
 * the fight is exactly as it was — no layer, no veil, no lock.
 */

const SAMPLES = [
  { id: 'chaos', name: '双極崩界', tier: 'SKILL' },
  { id: 'hero', name: '零閃・天衝', tier: 'FINISHER' },
  { id: 'levi', name: '冥槍・黒葬封界', tier: 'SKILL' },
  { id: 'aria', name: '天弓・蒼薔薇祝界', tier: 'FINISHER' },
] as const;
const MS = {
  1: { SKILL: 1400, FINISHER: 2500 },
  2: { SKILL: 1100, FINISHER: 1800 },
} as const;

async function openPanel(page: Page) {
  const box = page.getByTestId('debug-cutin-all');
  if (!(await box.isVisible())) await page.getByTestId('debug-toggle').click();
  await expect(box).toBeVisible();
}

/** Watches for cut-ins, every frame, and reports each one's name and time on screen. */
async function watch(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as {
      __shown: { name: string; from: number; to: number | null }[];
    };
    w.__shown = [];
    const tick = () => {
      const name = document.querySelector('[data-testid="cut-in-name"]')?.textContent ?? null;
      const last = w.__shown[w.__shown.length - 1];
      const now = performance.now();
      if (name && (!last || last.to !== null || last.name !== name)) {
        if (last && last.to === null) last.to = now;
        w.__shown.push({ name, from: now, to: null });
      } else if (!name && last && last.to === null) {
        last.to = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function shown(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        __shown: { name: string; from: number; to: number | null }[];
      }
    ).__shown.map((s) => ({
      name: s.name,
      ms: s.to === null ? null : Math.round(s.to - s.from),
    })),
  );
}

/** Nothing of a cut-in is left, and the fight takes a command. */
async function leftNothing(page: Page) {
  await expect(page.getByTestId('bp-cinematic')).toHaveCount(0);
  await expect(page.locator('.ci')).toHaveCount(0);
  await expect(page.getByTestId('debug-cutin-stop')).toHaveCount(0);
  await expect(page.getByTestId('bp-commands')).toHaveAttribute('data-locked', 'no');
}

for (const motion of ['no-preference', 'reduce'] as const)
  test.describe(`motion: ${motion}`, () => {
    test.use({ reducedMotion: motion });
    for (const speed of [1, 2] as const) {
      test(`×${speed}: each sample is on screen for its length, name on top, and leaves nothing`, async ({
        page,
      }) => {
        await page.goto('/?preview=battle');
        if (speed === 2) await page.getByTestId('bp-speed').click();
        await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', String(speed));
        await watch(page);
        for (const sample of SAMPLES) {
          await openPanel(page);
          await page.getByTestId(`debug-cutin-${sample.id}`).click();
          const cutIn = page.getByTestId('cut-in');
          await expect(cutIn).toHaveAttribute('data-ms', String(MS[speed][sample.tier]));
          await expect(page.getByTestId('cut-in-name')).toHaveText(sample.name);
          // Half-way in, nothing of the fight, its HUD or its commands is over
          // the name: the topmost thing there is the cut-in's own layer (the
          // cut-in itself takes no presses, so the layer holding it is what a
          // finger meets).
          await page.waitForTimeout(MS[speed][sample.tier] / 2);
          const box = (await page.getByTestId('cut-in-name').boundingBox())!;
          const onTop = await page.evaluate(
            ({ x, y }) =>
              !!document.elementFromPoint(x, y)?.closest('[data-testid="bp-cinematic"]'),
            { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          );
          expect(onTop, `${sample.id}: its name is on top`).toBe(true);
          await leftNothing(page);
        }
        const times = await shown(page);
        expect(times.map((t) => t.name)).toEqual(SAMPLES.map((s) => s.name));
        SAMPLES.forEach((sample, i) => {
          // On screen for its length, give or take a frame or two.
          expect(
            Math.abs(times[i].ms! - MS[speed][sample.tier]),
            `${sample.id} at ×${speed}`,
          ).toBeLessThan(150);
        });
      });
    }
  });

test('nothing can be pressed through a cut-in', async ({ page }) => {
  await page.goto('/?preview=battle');
  await readyToAct(page);
  const [before] = await enemyHp(page);
  const attack = (await page.getByTestId('bp-attack').boundingBox())!;
  const speed = (await page.getByTestId('bp-speed').boundingBox())!;
  await openPanel(page);
  await page.getByTestId('debug-cutin-aria').click();
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await page.mouse.click(attack.x + attack.width / 2, attack.y + attack.height / 2);
  await page.mouse.click(speed.x + speed.width / 2, speed.y + speed.height / 2);
  await expect(page.getByTestId('bp-commands')).toHaveAttribute('data-locked', 'yes');
  await expect(page.getByTestId('cut-in')).toHaveCount(0, { timeout: 5000 });
  // No turn was taken, and the speed was not changed underneath it.
  expect((await enemyHp(page))[0]).toBe(before);
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '1');
  await leftNothing(page);
  // And the fight goes on as before.
  await page.getByTestId('bp-attack').click();
  await readyToAct(page);
  expect((await enemyHp(page))[0]).toBeLessThan(before);
});

test('four in a row play in order, then the fight is back', async ({ page }) => {
  await page.goto('/?preview=battle');
  await watch(page);
  await openPanel(page);
  await page.getByTestId('debug-cutin-all').click();
  await expect(page.getByTestId('cut-in-name')).toHaveText('双極崩界');
  await expect(page.getByTestId('cut-in')).toHaveCount(0, { timeout: 12_000 });
  await page.waitForTimeout(300);
  expect((await shown(page)).map((t) => t.name)).toEqual(SAMPLES.map((s) => s.name));
  await leftNothing(page);
});

test('stopped part-way, it is gone at once and the row does not go on', async ({ page }) => {
  await page.goto('/?preview=battle');
  await watch(page);
  await openPanel(page);
  await page.getByTestId('debug-cutin-all').click();
  await expect(page.getByTestId('cut-in-name')).toHaveText('双極崩界');
  await page.waitForTimeout(500);
  await page.getByTestId('debug-cutin-stop').click();
  await leftNothing(page);
  // Nothing more comes: the rest of the row was stopped with it.
  await page.waitForTimeout(3000);
  await expect(page.getByTestId('cut-in')).toHaveCount(0);
  expect((await shown(page)).map((t) => t.name)).toEqual(['双極崩界']);

  // Played again: the same row, from its start.
  await openPanel(page);
  await page.getByTestId('debug-cutin-again').click();
  await expect(page.getByTestId('cut-in-name')).toHaveText('双極崩界');
  await page.getByTestId('debug-cutin-stop').click();
  await leftNothing(page);
});

test('its length can be forced to 通常技 or 必殺技', async ({ page }) => {
  await page.goto('/?preview=battle');
  await openPanel(page);
  await page.getByTestId('debug-cutin-tier').click();
  await expect(page.getByTestId('debug-cutin-tier')).toHaveText('長さ：通常技');
  await page.getByTestId('debug-cutin-hero').click();
  await expect(page.getByTestId('cut-in')).toHaveAttribute('data-ms', '1400');
  await page.getByTestId('debug-cutin-stop').click();
  await openPanel(page);
  await page.getByTestId('debug-cutin-tier').click();
  await expect(page.getByTestId('debug-cutin-tier')).toHaveText('長さ：必殺技');
  await page.getByTestId('debug-cutin-chaos').click();
  await expect(page.getByTestId('cut-in')).toHaveAttribute('data-ms', '2500');
  await page.getByTestId('debug-cutin-stop').click();
  await leftNothing(page);
});

test('closing the preview in the middle of one leaves no error and nothing behind', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?preview=battle');
  await openPanel(page);
  await page.getByTestId('debug-cutin-all').click();
  await expect(page.getByTestId('cut-in')).toBeVisible();
  // Played again from the panel mid-cut-in: the fight restarts clean.
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-replay').click();
  await leftNothing(page);
  // And out to the title in the middle of another.
  await openPanel(page);
  await page.getByTestId('debug-cutin-aria').click();
  await expect(page.getByTestId('cut-in')).toBeVisible();
  await page.getByTestId('debug-toggle').click();
  await page.getByTestId('debug-exit').click();
  await expect(page.getByTestId('debug-battle-preview')).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(page.locator('.ci')).toHaveCount(0);
  expect(errors).toEqual([]);
});

// Her spells have cut-ins in the game's fight now (magic.spec). A swing
// of the sword is not a skill and has none.
test("a sword swing in the game's own fight plays no cut-in", async ({ page }) => {
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
  await watch(page);
  for (let i = 0; i < 3; i++) {
    await readyToAct(page);
    await page.getByTestId('bp-attack').click();
  }
  await readyToAct(page);
  expect(await shown(page)).toEqual([]);
  await expect(page.getByTestId('bp-cinematic')).toHaveCount(0);
});
