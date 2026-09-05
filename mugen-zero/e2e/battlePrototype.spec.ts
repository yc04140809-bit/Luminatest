import { test, expect, type Page } from './fixtures';
import { playToLifeChoice, enterDevAdmin } from './helpers';

/**
 * The battle UI prototype: a second battle screen, behind a dev flag,
 * that has not been adopted.
 *
 * What these tests are for is mostly the safety rule — the old screen
 * still exists, the story's own fight never sees the new one, and the
 * flag being off is the same game as before.
 */
const SPOTS: readonly [number, number][] = [
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

interface Setup {
  ui: 'OLD' | 'PROTOTYPE';
  story: 'on' | 'off';
  finishable?: boolean;
  /** Settle what the creature does, when the test needs its reply fixed. */
  enemyAction?: 'ATTACK' | 'SKILL';
  /**
   * What Kaos does at the start of the fight. Everything below leaves it
   * at NONE — a fight nobody helped — so these tests keep describing the
   * screen itself rather than a screen with a die rolled over it. The
   * intervention has its own describe block at the bottom.
   */
  chaos?: 'NONE' | 'CHAOS_BLESSING' | 'CHAOS_GUARD' | 'CHAOS_WEAKEN' | 'CHAOS_BREAK';
}

async function setup(page: Page, options: Setup) {
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId(`battle-ui-${options.ui}`).click();
  if (options.finishable) await page.getByTestId('battle-start-finishable').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId(options.story === 'on' ? 'force-story-on' : 'force-story-off').click();
  if (options.enemyAction) await page.getByTestId(`force-enemy-${options.enemyAction}`).click();
  await page.getByTestId(`force-chaos-${options.chaos ?? 'NONE'}`).click();
  await page.getByTestId('dev-admin-back').click();
}

/**
 * Walks the forest until a fight starts, whichever screen shows it.
 *
 * The ring stands on one of several spots, chosen at random, so the walk
 * visits them in turn — and goes round twice, because on a loaded
 * machine the scene can boot slowly enough to swallow the first pass.
 */
async function walkIntoAFight(page: Page): Promise<void> {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2200);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const fighting = () =>
    page
      .getByTestId('battle-prototype')
      .or(page.getByTestId('battle-screen'))
      .isVisible()
      .catch(() => false);
  for (let pass = 0; pass < 2; pass++) {
    for (const [x, y] of SPOTS) {
      await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
      for (let i = 0; i < 16; i++) {
        await page.waitForTimeout(180);
        if (await fighting()) return;
      }
    }
  }
}

test.describe('battle UI prototype', () => {
  test('is what a forest fight shows now, without anybody choosing it', async ({ page }) => {
    await freshWorld(page);
    // Nothing is set: no flag, no dev switch, straight off the shelf.
    await enterDevAdmin(page);
    await page.getByTestId('preset-SPARE_3Y').click();
    await page.getByTestId('force-encounter-BATTLE').click();
    await page.getByTestId('dev-admin-back').click();
    const chosen = await page.evaluate(() => localStorage.getItem('mugen-battle-ui'));
    expect(chosen, 'nobody chose a battle UI').toBeNull();

    await walkIntoAFight(page);
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await expect(page.getByTestId('battle-screen')).toHaveCount(0);
  });

  test('goes back to the old screen the moment it is chosen', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'OLD', story: 'off' });
    await walkIntoAFight(page);
    await expect(page.getByTestId('battle-screen')).toBeVisible();
    await expect(page.getByTestId('battle-prototype')).toHaveCount(0);
  });

  test('shows the forest, the creature on the left and the two of them on the right', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off' });
    await walkIntoAFight(page);
    const stage = page.getByTestId('battle-prototype');
    await expect(stage).toBeVisible();

    // The world is on screen and is not covered by a panel.
    await expect(page.locator('.bp-bg')).toBeVisible();
    const bg = await page.locator('.bp-bg').boundingBox();
    const view = page.viewportSize()!;
    expect(bg!.width).toBeGreaterThanOrEqual(view.width - 1);
    // More than half the screen is still world.
    expect(bg!.height / view.height).toBeGreaterThan(0.5);

    // Left is the enemy; right is the party.
    const stageBox = (await page.locator('.bp-stage').boundingBox())!;
    const enemy = (await page.locator('.bp-enemy').boundingBox())!;
    const hero = (await page.locator('.bp-hero').boundingBox())!;
    const kaos = (await page.locator('.bp-kaos').boundingBox())!;
    expect(enemy.x + enemy.width / 2).toBeLessThan(view.width / 2);
    expect(hero.x + hero.width / 2).toBeGreaterThan(view.width / 2);
    expect(kaos.x + kaos.width / 2).toBeGreaterThan(view.width / 2);
    // He stands between her and it.
    expect(hero.x).toBeLessThan(kaos.x);

    // Depth: it is further up the path than either of them, and she is
    // further back than he is. Their feet, not their heads, say so.
    const feet = (b: typeof hero) => b.y + b.height;
    expect(feet(enemy)).toBeLessThan(feet(kaos));
    expect(feet(kaos)).toBeLessThan(feet(hero));

    // Nobody is a postage stamp, and nobody fills the clearing either.
    for (const [who, box] of [['enemy', enemy], ['hero', hero], ['kaos', kaos]] as const) {
      const share = box.height / stageBox.height;
      expect(share, `${who} is big enough to read`).toBeGreaterThan(0.15);
      expect(share, `${who} leaves room for the forest`).toBeLessThan(0.4);
    }

    // And no two of them are standing in the same place.
    const overlaps = (a: typeof hero, b: typeof hero) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlaps(hero, kaos), 'he and she do not overlap').toBe(false);
    expect(overlaps(hero, enemy), 'he and it do not overlap').toBe(false);
    expect(overlaps(kaos, enemy), 'she and it do not overlap').toBe(false);

    await expect(page.getByTestId('bp-enemy-hp')).toContainText('モスラビット');
    await expect(page.getByTestId('bp-player-hp')).toContainText('40 / 40');
    await expect(page.getByTestId('bp-message')).toContainText('モスラビット');
    await expect(page.getByTestId('bp-attack')).toBeVisible();
    await expect(page.getByTestId('bp-skill')).toBeVisible();
    // Fighting is not deciding: no life question while it is a fight.
    await expect(page.getByTestId('bp-mugen-choice')).toHaveCount(0);
  });

  test('can be looked at straight from DEV ADMIN, without touching the world', async ({
    page,
  }) => {
    await freshWorld(page);
    await enterDevAdmin(page);
    await page.getByTestId('force-story-off').click();
    await page.getByTestId('battle-start-finishable').click();
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();

    await page.getByTestId('bp-attack').click();
    await page.getByTestId('bp-normal-end').click();
    // Straight back to where it was opened from.
    await expect(page.getByTestId('dev-admin-back')).toBeVisible();

    // And nothing was written: no victory counted, nobody named.
    const rows = await page.evaluate(
      () =>
        new Promise<number>((resolve, reject) => {
          const open = indexedDB.open('mugen-zero-save');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const rq = db.transaction('world_state', 'readonly').objectStore('world_state').getAll();
            rq.onsuccess = () => {
              db.close();
              resolve(
                (rq.result as { key: string }[]).filter((r) => r.key.startsWith('enemy_')).length,
              );
            };
            rq.onerror = () => reject(rq.error);
          };
        }),
    );
    expect(rows).toBe(0);
  });

  test('uses the real battle logic, not a mock of it', async ({ page }) => {
    await freshWorld(page);
    // Its reply is settled, so the last line of the log is its attack
    // rather than the skill it might otherwise have chosen — the message
    // box always shows the latest line, and the test has to know which.
    await setup(page, { ui: 'PROTOTYPE', story: 'off', enemyAction: 'ATTACK' });
    await walkIntoAFight(page);
    const hp = page.getByTestId('bp-enemy-hp');
    await expect(hp).toContainText('22 / 22');
    await page.getByTestId('bp-attack').click();
    // The existing numbers: the player hits for 8 to 12.
    await expect(hp).not.toContainText('22 / 22');
    await expect(page.getByTestId('bp-message')).toContainText('リーフタックル');
    await expect(page.getByTestId('bp-message')).toContainText('ダメージ');
  });

  test('opens the skill tray without inventing a skill system', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off' });
    await walkIntoAFight(page);
    const tray = page.getByTestId('bp-skill-tray');
    await expect(tray).toHaveCount(0);
    await page.getByTestId('bp-skill').click();
    await expect(tray).toBeVisible();
    // One thing that exists, and an honest gap where the rest will go.
    await expect(page.getByTestId('bp-skill-guard')).toBeVisible();
    await page.getByTestId('bp-skill').click();
    await expect(tray).toHaveCount(0);
  });

  test('an ordinary fight ends ordinarily, back on the path', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off', finishable: true });
    await walkIntoAFight(page);
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-normal-end')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('bp-mugen-choice')).toHaveCount(0);
    await page.getByTestId('bp-normal-end').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  });

  test('the commands become the four answers only once there is a life to decide', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'on', finishable: true });
    await walkIntoAFight(page);
    await expect(page.getByTestId('bp-commands')).toBeVisible();
    await page.getByTestId('bp-attack').click();

    const mugen = page.getByTestId('bp-mugen-choice');
    await expect(mugen).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('bp-attack')).toHaveCount(0);
    for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
      const button = await page.getByTestId(`bp-mugen-${id}`).boundingBox();
      expect(button!.height, `${id} is a real target`).toBeGreaterThanOrEqual(44);
    }

    await page.getByTestId('bp-mugen-SPARE').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // The choice made in the new UI is the real one, written by the same
    // code the old screen's path uses.
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
    expect(kinds).toContain('PLAYER_SPARED_CREATURE');
  });

  test('the creature goes down and stays there, beaten rather than gone', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off', finishable: true });
    await walkIntoAFight(page);

    // Standing while it is fighting.
    await expect(page.getByTestId('bp-enemy-normal')).toBeVisible();
    await expect(page.getByTestId('bp-enemy-downed')).toHaveCount(0);

    await page.getByTestId('bp-attack').click();

    // Beaten: lying in the grass, in its own drawing.
    const down = page.getByTestId('bp-enemy-downed');
    await expect(down).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('bp-enemy-normal')).toHaveCount(0);

    // And it is still lying there when the fight is over — nothing
    // clears the battlefield before the player has looked at it.
    await expect(page.getByTestId('bp-normal-end')).toBeVisible();
    await expect(down).toBeVisible();
    await expect(page.locator('.bp-bg')).toBeVisible();

    // On the ground rather than floating: its feet are inside the field.
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    const box = (await down.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(stage.y + stage.height + 1);
    expect(box.y).toBeGreaterThanOrEqual(stage.y - 1);
  });

  test('the four answers are asked about the creature lying in front of you', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'on', finishable: true });
    await walkIntoAFight(page);
    await page.getByTestId('bp-attack').click();

    await expect(page.getByTestId('bp-mugen-choice')).toBeVisible({ timeout: 5_000 });
    // The whole point: it is the beaten creature on screen, not a
    // result panel, and the two of them are still standing there.
    await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
    await expect(page.getByTestId('bp-enemy-normal')).toHaveCount(0);
    await expect(page.locator('.bp-hero')).toBeVisible();
    await expect(page.locator('.bp-kaos')).toBeVisible();
    await expect(page.locator('.bp-bg')).toBeVisible();
  });

  test("never touches the story's own fight, flag on or not", async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('mugen-battle-ui', 'PROTOTYPE'));
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
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    // Gald is fought on the screen he has always been fought on.
    await expect(page.getByTestId('battle-screen')).toBeVisible();
    await expect(page.getByTestId('gald-portrait-ready')).toBeVisible();
    await expect(page.getByTestId('battle-prototype')).toHaveCount(0);
  });

  for (const width of [360, 390, 412]) {
    test(`fits a ${width}px phone without scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await freshWorld(page);
      await setup(page, { ui: 'PROTOTYPE', story: 'off' });
      await walkIntoAFight(page);
      await expect(page.getByTestId('battle-prototype')).toBeVisible();

      const scrolls = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      }));
      expect(scrolls.x, 'no sideways scroll').toBe(false);
      expect(scrolls.y, 'no vertical scroll').toBe(false);

      for (const id of ['bp-attack', 'bp-skill']) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box.height, `${id} is thumb-sized`).toBeGreaterThanOrEqual(44);
      }
      // The message is on screen and readable, not clipped away.
      const message = (await page.getByTestId('bp-message').boundingBox())!;
      expect(message.width).toBeGreaterThan(width * 0.8);
      expect(message.y + message.height).toBeLessThanOrEqual(844);
    });
  }
});

/**
 * CHAOS BATTLE INTERVENTION.
 *
 * Sometimes, at the start of a fight, Kaos does something about it. The
 * rules these tests hold to are the ones that make it worth having:
 * most fights are still nobody's business but yours, it is decided once
 * and stays decided, it never covers the forest, and it is over when the
 * fight is.
 */
test.describe('Kaos at the start of a fight', () => {
  const CASES = [
    {
      id: 'CHAOS_BLESSING',
      name: 'ケイオスの加護',
      line: 'ちょっとだけ、手伝ってあげる。',
      mark: '.bp-hero .bp-chaos-mark.buff',
      kind: 'buff',
    },
    {
      id: 'CHAOS_GUARD',
      name: 'ケイオスの守護',
      line: '少しくらい、守ってあげる。',
      mark: '.bp-hero .bp-chaos-mark.buff',
      kind: 'buff',
    },
    {
      id: 'CHAOS_WEAKEN',
      name: 'ケイオスの弱体',
      line: 'この子、ちょっと弱くしよっか。',
      mark: '.bp-enemy .bp-chaos-mark.debuff',
      kind: 'debuff',
    },
    {
      id: 'CHAOS_BREAK',
      name: 'ケイオスの崩し',
      line: 'そこ、隙だらけだよ。',
      mark: '.bp-enemy .bp-chaos-mark.debuff',
      kind: 'debuff',
    },
  ] as const;

  test('a fight she stays out of is the fight it always was', async ({ page }) => {
    await freshWorld(page);
    await setup(page, { ui: 'PROTOTYPE', story: 'off', chaos: 'NONE' });
    await walkIntoAFight(page);
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await expect(page.getByTestId('bp-chaos-card')).toHaveCount(0);
    await expect(page.getByTestId('bp-chaos-badge')).toHaveCount(0);
    await expect(page.locator('.bp-chaos-mark')).toHaveCount(0);
    await expect(page.locator('.bp-chaos-aura')).toHaveCount(0);
    // Straight into it: nothing to sit through.
    await expect(page.getByTestId('bp-commands')).toBeVisible();
    await expect(page.getByTestId('bp-enemy-hp')).toContainText('22 / 22');
  });

  for (const c of CASES) {
    test(`《${c.name}》 says what it is and shows who it landed on`, async ({ page }) => {
      await freshWorld(page);
      await setup(page, { ui: 'PROTOTYPE', story: 'off', chaos: c.id });
      await walkIntoAFight(page);

      const card = page.getByTestId('bp-chaos-card');
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute('data-chaos', c.id);
      await expect(card).toContainText('ケイオス');
      await expect(card).toContainText(c.line);
      await expect(card).toContainText(`《${c.name}》`);
      // Her, and whoever she touched.
      await expect(page.locator('.bp-kaos .bp-chaos-aura')).toBeVisible();
      await expect(page.locator(c.mark)).toHaveCount(1);
      // One side only.
      await expect(page.locator('.bp-chaos-mark')).toHaveCount(1);

      // It is a moment, not a screen: the forest, all three of them and
      // the creature's plate are exactly where they were, and nothing
      // white is laid over any of it.
      await expect(page.locator('.bp-bg')).toBeVisible();
      await expect(page.locator('.bp-enemy')).toBeVisible();
      await expect(page.locator('.bp-hero')).toBeVisible();
      await expect(page.locator('.bp-kaos')).toBeVisible();
      await expect(page.getByTestId('bp-enemy-hp')).toBeVisible();
      const stage = (await page.locator('.bp-stage').boundingBox())!;
      const box = (await card.boundingBox())!;
      expect(box.y, 'her card is under the battlefield, not over it').toBeGreaterThanOrEqual(
        stage.y + stage.height - 1,
      );

      // Commands wait for her, then come back.
      await expect(page.getByTestId('bp-commands')).toHaveCount(0);
      await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 5_000 });
      const badge = page.getByTestId('bp-chaos-badge');
      await expect(badge).toBeVisible();
      await expect(badge).toContainText(c.name);
      await expect(badge).toHaveClass(new RegExp(c.kind));
    });
  }

  test('is settled once, and no turn of the fight gets to roll it again', async ({ page }) => {
    await freshWorld(page);
    await setup(page, {
      ui: 'PROTOTYPE',
      story: 'off',
      chaos: 'CHAOS_BLESSING',
      enemyAction: 'ATTACK',
    });
    await walkIntoAFight(page);

    // Tapping skips her moment rather than waiting it out.
    await page.getByTestId('bp-chaos-card').click();
    await expect(page.getByTestId('bp-chaos-card')).toHaveCount(0);
    const badge = page.getByTestId('bp-chaos-badge');
    await expect(badge).toContainText('ケイオスの加護');

    // Three turns later it is still the same one thing, and her moment
    // has not come round again. Guarding rather than attacking, so the
    // fight is still a fight by the third turn — helped blows would have
    // finished a 22 HP creature before the count was up.
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('bp-skill').click();
      await page.getByTestId('bp-skill-guard').click();
      await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTestId('bp-chaos-card')).toHaveCount(0);
      await expect(badge).toContainText('ケイオスの加護');
      await expect(page.getByTestId('bp-chaos-badge')).toHaveCount(1);
    }
  });

  test('guarding under 《ケイオスの守護》 still costs real HP, and never a strange number', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, {
      ui: 'PROTOTYPE',
      story: 'off',
      chaos: 'CHAOS_GUARD',
      enemyAction: 'ATTACK',
    });
    await walkIntoAFight(page);
    await page.getByTestId('bp-chaos-card').click();

    const hp = page.getByTestId('bp-player-hp');
    await expect(hp).toContainText('40 / 40');
    let before = 40;
    for (let turn = 0; turn < 4; turn++) {
      await page.getByTestId('bp-skill').click();
      await page.getByTestId('bp-skill-guard').click();
      await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 5_000 });

      const text = (await hp.textContent()) ?? '';
      const shown = /(-?\d+)\s*\/\s*40/.exec(text.replace(/\s+/g, ' '));
      expect(shown, `HP is a number after turn ${turn + 1}: ${text}`).not.toBeNull();
      const now = Number(shown![1]);
      // Two things that must both hold: the two reductions stack, and
      // stacking them never reaches zero damage, a negative or a NaN.
      expect(now, 'it still got through').toBeLessThan(before);
      expect(now, 'and never healed him or broke the number').toBeGreaterThan(0);
      expect(before - now, 'a blow is worth at least one').toBeGreaterThanOrEqual(1);
      before = now;
    }
  });

  test('a fight she helped still ends with the creature down and the four answers', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, {
      ui: 'PROTOTYPE',
      story: 'on',
      finishable: true,
      chaos: 'CHAOS_BREAK',
    });
    await walkIntoAFight(page);
    await page.getByTestId('bp-chaos-card').click();
    await page.getByTestId('bp-attack').click();

    await expect(page.getByTestId('bp-mugen-choice')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
    // Her chip is a thing about a fight; there is no fight to be in now.
    await expect(page.getByTestId('bp-chaos-badge')).toHaveCount(0);
    await page.getByTestId('bp-mugen-SPARE').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  });

  test('is over when the fight is: nothing saved, nothing carried into the next one', async ({
    page,
  }) => {
    await freshWorld(page);
    await setup(page, {
      ui: 'PROTOTYPE',
      story: 'off',
      finishable: true,
      chaos: 'CHAOS_BLESSING',
    });
    await walkIntoAFight(page);
    await expect(page.getByTestId('bp-chaos-card')).toBeVisible();
    await page.getByTestId('bp-chaos-card').click();
    await page.getByTestId('bp-attack').click();
    await page.getByTestId('bp-normal-end').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // Nothing of hers was written down. The only key that mentions her
    // is the dev switch this test set itself.
    const keys = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => /chaos/i.test(k)),
    );
    expect(keys).toEqual(['mugen-debug-chaos']);
    const rows = await page.evaluate(
      () =>
        new Promise<string[]>((resolve, reject) => {
          const open = indexedDB.open('mugen-zero-save');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const rq = db.transaction('world_state', 'readonly').objectStore('world_state').getAll();
            rq.onsuccess = () => {
              db.close();
              resolve((rq.result as { key: string }[]).map((r) => r.key));
            };
            rq.onerror = () => reject(rq.error);
          };
        }),
    );
    expect(rows.filter((k) => /chaos/i.test(k))).toEqual([]);

    // And the next fight starts from nothing: she is asked again, and
    // this time the answer is no.
    await page.getByTestId('leave-forest').click();
    await page.getByRole('button', { name: 'もどる' }).click();
    await expect(page.getByTestId('dev-admin-entry')).toBeVisible();
    await setup(page, { ui: 'PROTOTYPE', story: 'off', chaos: 'NONE' });
    await walkIntoAFight(page);
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await expect(page.getByTestId('bp-chaos-card')).toHaveCount(0);
    await expect(page.getByTestId('bp-chaos-badge')).toHaveCount(0);
    await expect(page.getByTestId('bp-player-hp')).toContainText('40 / 40');
  });

  for (const width of [360, 390, 412]) {
    test(`her moment fits a ${width}px phone`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await freshWorld(page);
      await setup(page, { ui: 'PROTOTYPE', story: 'off', chaos: 'CHAOS_WEAKEN' });
      await walkIntoAFight(page);

      const card = page.getByTestId('bp-chaos-card');
      await expect(card).toBeVisible();
      const scrolls = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      }));
      expect(scrolls.x, 'no sideways scroll').toBe(false);
      expect(scrolls.y, 'no vertical scroll').toBe(false);

      const box = (await card.boundingBox())!;
      expect(box.x, 'on screen').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'and inside it').toBeLessThanOrEqual(width);
      expect(box.y + box.height, 'and not hanging off the bottom').toBeLessThanOrEqual(844);
      // Still a card, not a screen: it takes a strip, not the phone.
      expect(box.height / 844, 'her card is a strip, not a takeover').toBeLessThan(0.25);
      // The forest is still most of what is on screen.
      const bg = (await page.locator('.bp-bg').boundingBox())!;
      expect(bg.height / 844).toBeGreaterThan(0.5);
    });
  }
});
