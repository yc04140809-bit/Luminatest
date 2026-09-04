import { test, expect, type Page } from '@playwright/test';

/**
 * The moss rabbit, from meeting one in the forest to the world writing
 * down what was decided about one of them.
 */
const RING_SPOTS: readonly [number, number][] = [
  [180, 118], [138, 166], [224, 158], [120, 250],
  [172, 232], [238, 258], [206, 322], [134, 330],
];

async function freshWorld(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
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
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** Settles Gald, forces a forest battle, and settles the story roll. */
async function prepare(page: Page, story: 'on' | 'off', enemyAction?: 'ATTACK' | 'SKILL') {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId('preset-SPARE_3Y').click();
  // These are tests of the enemy system — the species, the individual,
  // what the world writes down — so the presentation is pinned to the
  // established screen and cannot drift with it.
  await page.getByTestId('battle-ui-OLD').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId(story === 'on' ? 'force-story-on' : 'force-story-off').click();
  if (enemyAction) await page.getByTestId(`force-enemy-${enemyAction}`).click();
  await page.getByTestId('dev-admin-back').click();
}

async function intoForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1500);
}

/** Walks the ring spots in turn until the fight starts. */
async function walkIntoAFight(page: Page): Promise<boolean> {
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const battle = page.getByTestId('battle-screen');
  for (const [x, y] of RING_SPOTS) {
    await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(180);
      if (await battle.isVisible().catch(() => false)) return true;
    }
  }
  return false;
}

async function winTheFight(page: Page) {
  const attack = page.getByTestId('attack-button');
  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId('enemy-defeated-line').isVisible().catch(() => false)) break;
    if (await attack.isEnabled().catch(() => false)) await attack.click();
    await page.waitForTimeout(140);
  }
  await expect(page.getByTestId('enemy-defeated-line')).toBeVisible();
}

test.describe('moss rabbit', () => {
  test('is what the forest sends, with its own picture and its own numbers', async ({ page }) => {
    await freshWorld(page);
    await prepare(page, 'off');
    await intoForest(page);
    expect(await walkIntoAFight(page)).toBe(true);

    await expect(page.getByTestId('enemy-hp')).toContainText('モスラビット');
    // Its own art, not a stand-in and not Gald's.
    const art = page.getByTestId('enemy-portrait-moss_rabbit');
    await expect(art).toBeVisible();
    await expect(page.getByTestId('gald-portrait-ready')).toHaveCount(0);
    await expect(page.getByTestId('battle-log')).toContainText('モスラビットが飛び出してきた');
  });

  test('uses リーフタックル and 苔かくれ, and neither of them stalls the fight', async ({
    page,
  }) => {
    await freshWorld(page);
    await prepare(page, 'off', 'SKILL');
    await intoForest(page);
    expect(await walkIntoAFight(page)).toBe(true);

    // Asked for the skill on every turn it could take one.
    const log = page.getByTestId('battle-log');
    const attack = page.getByTestId('attack-button');
    await attack.click();
    await expect(log).toContainText('苔かくれ', { timeout: 5_000 });

    // It cannot hide for ever: once its ceiling is spent it has to come
    // at you, which is the only reason the fight can end.
    let tackled = false;
    for (let i = 0; i < 12 && !tackled; i++) {
      if (await page.getByTestId('enemy-defeated-line').isVisible().catch(() => false)) break;
      if (await attack.isEnabled().catch(() => false)) await attack.click();
      await page.waitForTimeout(160);
      tackled = ((await log.textContent()) ?? '').includes('リーフタックル');
    }
    expect(tackled, 'it has to attack eventually').toBe(true);

    await winTheFight(page);
    // Story roll forced off, so this one was only ever an animal.
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  });

  test('is usually just an animal: the world keeps no record of one', async ({ page }) => {
    await freshWorld(page);
    await prepare(page, 'off');
    await intoForest(page);
    expect(await walkIntoAFight(page)).toBe(true);
    await winTheFight(page);

    // Straight back to the path — no question asked about its life.
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('creature-life-choice-screen')).toHaveCount(0);
  });

  test('now and then one has a life, and the four answers are asked', async ({ page }) => {
    await freshWorld(page);
    await prepare(page, 'on');
    await intoForest(page);
    expect(await walkIntoAFight(page)).toBe(true);
    await winTheFight(page);

    // Why this one is different, then the question.
    const scene = page.getByTestId('creature-scene-moss_rabbit');
    await expect(scene).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 6; i++) {
      if (!(await scene.isVisible().catch(() => false))) break;
      await scene.click();
      await page.waitForTimeout(120);
    }
    const choice = page.getByTestId('creature-life-choice-screen');
    await expect(choice).toBeVisible();
    await expect(choice).toHaveAttribute('data-individual', 'moss_rabbit_001');
    for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
      await expect(page.getByTestId(`creature-choice-${id}`)).toBeVisible();
    }

    await page.getByTestId('creature-choice-HELP').click();
    await expect(page.getByTestId('creature-choice-result')).toBeVisible();
    await page.getByTestId('creature-choice-continue').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // And the world wrote it down.
    const kinds = await page.evaluate(
      () =>
        new Promise<string[]>((resolve, reject) => {
          const open = indexedDB.open('mugen-zero-save');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const rq = db
              .transaction('memory_events', 'readonly')
              .objectStore('memory_events')
              .getAll();
            rq.onsuccess = () => {
              db.close();
              resolve((rq.result as { type: string }[]).map((e) => e.type));
            };
            rq.onerror = () => reject(rq.error);
          };
        }),
    );
    expect(kinds).toContain('PLAYER_HELPED_CREATURE');
  });

  test('the species outlives the individual: another one still turns up', async ({ page }) => {
    await freshWorld(page);
    await prepare(page, 'on');
    await intoForest(page);
    expect(await walkIntoAFight(page)).toBe(true);
    await winTheFight(page);
    const scene = page.getByTestId('creature-scene-moss_rabbit');
    await expect(scene).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < 6; i++) {
      if (!(await scene.isVisible().catch(() => false))) break;
      await scene.click();
      await page.waitForTimeout(120);
    }
    await page.getByTestId('creature-choice-KILL').click();
    await page.getByTestId('creature-choice-continue').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // Killing one does not empty the forest of moss rabbits.
    expect(await walkIntoAFight(page)).toBe(true);
    await expect(page.getByTestId('enemy-hp')).toContainText('モスラビット');
  });
});
