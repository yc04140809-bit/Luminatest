import { test, expect, type Page } from '@playwright/test';

/**
 * SUMMONING — a memory put back together on a battlefield.
 *
 * The rules held to here are the ones a player would feel if they
 * broke: nothing can be called out of a page nobody has opened, a
 * fight never opens with a blessing AND a summon, an unfinished memory
 * may not hold and costs nothing when it does not, a finished one
 * never fails and can be spent once a fight, and in the one fight
 * where both creatures are moss rabbits it is obvious which is which.
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

async function unlockDev(page: Page) {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
}

interface Setup {
  /** Which ARCANA preset the book is put into. */
  arcana: string;
  summon?: 'SUCCESS' | 'FAILURE' | null;
  chaos?: string;
  enemyAction?: 'ATTACK' | 'SKILL';
  finishable?: boolean;
}

/**
 * Opens the prototype straight from DEV ADMIN.
 *
 * Note there is no dev-admin-back: opening the prototype IS leaving
 * that screen. This route writes nothing to the world, which is what
 * makes it safe to use for the summoning rules.
 */
async function openBattle(page: Page, options: Setup) {
  await unlockDev(page);
  await page.getByTestId('force-story-off').click();
  await page.getByTestId(`arcana-set-${options.arcana}`).click();
  await page
    .getByTestId(options.summon ? `force-summon-${options.summon}` : 'force-summon-none')
    .click();
  await page.getByTestId(`force-chaos-${options.chaos ?? 'NONE'}`).click();
  if (options.enemyAction) await page.getByTestId(`force-enemy-${options.enemyAction}`).click();
  if (options.finishable) {
    const finishable = page.getByTestId('battle-start-finishable');
    if ((await finishable.textContent())?.includes('OFF')) await finishable.click();
    await expect(finishable).toContainText('ON');
  }
  await page.getByTestId('open-battle-prototype').click();
  await expect(page.getByTestId('battle-prototype')).toBeVisible();
}

/** Sets the book, then walks into a real forest fight. */
async function forestFight(page: Page, options: Setup & { story?: 'on' | 'off' }) {
  await unlockDev(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId(options.story === 'on' ? 'force-story-on' : 'force-story-off').click();
  // AFTER the preset: it resets the world, the book with it.
  await page.getByTestId(`arcana-set-${options.arcana}`).click();
  await page
    .getByTestId(options.summon ? `force-summon-${options.summon}` : 'force-summon-none')
    .click();
  await page.getByTestId(`force-chaos-${options.chaos ?? 'NONE'}`).click();
  if (options.enemyAction) await page.getByTestId(`force-enemy-${options.enemyAction}`).click();
  if (options.finishable) {
    const finishable = page.getByTestId('battle-start-finishable');
    if ((await finishable.textContent())?.includes('OFF')) await finishable.click();
    await expect(finishable).toContainText('ON');
  }
  await page.getByTestId('dev-admin-back').click();

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(2200);
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const fighting = () => page.getByTestId('battle-prototype').isVisible().catch(() => false);
  for (let pass = 0; pass < 2; pass++) {
    for (const [x, y] of RING_SPOTS) {
      await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
      for (let i = 0; i < 16; i++) {
        await page.waitForTimeout(180);
        if (await fighting()) return;
      }
    }
  }
}

async function playerHp(page: Page): Promise<number> {
  const text = (await page.getByTestId('bp-player-hp').textContent()) ?? '';
  return Number(/(\d+)\s*\/\s*40/.exec(text.replace(/\s+/g, ' '))?.[1] ?? NaN);
}

/** Guards a turn and waits for the commands to come back. */
async function guard(page: Page) {
  await page.getByTestId('bp-skill').click();
  await page.getByTestId('bp-skill-guard').click();
  await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 8_000 });
}

test.describe('what can be called at all', () => {
  test('a memory nobody has opened cannot be summoned, and is not offered', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '0', summon: 'SUCCESS' });
    // Forcing settles how a summon goes, never that there is one: an
    // empty book means an ordinary fight, however the switch is set.
    await expect(page.getByTestId('bp-summon-card')).toHaveCount(0);
    await expect(page.getByTestId('bp-summoned')).toHaveCount(0);
    // And nothing to spend, so no command for it.
    await expect(page.getByTestId('bp-commands')).toBeVisible();
    await expect(page.getByTestId('bp-arcana')).toHaveCount(0);
  });

  test('an unfinished memory is hers to try, not the player’s to spend', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '高', summon: 'SUCCESS' });
    await expect(page.getByTestId('bp-summon-card')).toBeVisible();
    await page.getByTestId('bp-summon-card').click();
    // 95% is still not 100%: no command appears for it.
    await expect(page.getByTestId('bp-arcana')).toHaveCount(0);
  });
});

test.describe('an unfinished memory, at the start of a fight', () => {
  test('she says which page she is reaching for, and how much of it there is', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS' });
    const card = page.getByTestId('bp-summon-card');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-outcome', 'SUCCESS');
    await expect(card).toContainText('ケイオス');
    await expect(card).toContainText('ARCANA #001');
    await expect(card).toContainText('モスラビット');
    await expect(page.getByTestId('bp-summon-progress')).toContainText('CONSTRUCTION 30%');

    // A moment, not a screen: the forest and all three of them are
    // exactly where they were, and nothing white is over any of it.
    await expect(page.locator('.bp-bg')).toBeVisible();
    await expect(page.locator('.bp-enemy')).toBeVisible();
    await expect(page.locator('.bp-hero')).toBeVisible();
    await expect(page.locator('.bp-kaos')).toBeVisible();
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    const box = (await card.boundingBox())!;
    expect(box.y, 'her card is under the battlefield, not over it').toBeGreaterThanOrEqual(
      stage.y + stage.height - 1,
    );
  });

  test('holds, and the creature does its own thing rather than the animal’s', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS' });
    await page.getByTestId('bp-summon-card').click();
    const summoned = page.getByTestId('bp-summoned');
    await expect(summoned).toBeVisible();
    await expect(summoned).toHaveAttribute('data-kind', 'INCOMPLETE');
    await expect(summoned).toContainText('ARCANA');
    // 森の息吹, and not リーフタックル or 苔かくれ.
    const message = page.getByTestId('bp-message');
    await expect(message).toContainText('HP');
    // It is a moment, not a party member: it goes on its own.
    await expect(summoned).toHaveCount(0, { timeout: 6_000 });
  });

  test('may not hold — and when it does not, it costs the player nothing', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'FAILURE' });
    const card = page.getByTestId('bp-summon-card');
    await expect(card).toHaveAttribute('data-outcome', 'FAILURE');
    await expect(card).toContainText('まだ、輪郭が足りないみたい');
    await card.click();
    // Nothing arrives, and nothing is taken: full health, full turn,
    // and the fight starts as it always would.
    await expect(page.getByTestId('bp-summoned')).toHaveCount(0);
    expect(await playerHp(page)).toBe(40);
    await expect(page.getByTestId('bp-commands')).toBeVisible();
    await expect(page.getByTestId('bp-enemy-hp')).toContainText('22 / 22');
  });
});

/** The rule that keeps the opening moment readable. */
test.describe('a blessing and a summon are never both', () => {
  test('a fight that opens with a summon has no blessing in it', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS' });
    await expect(page.getByTestId('bp-summon-card')).toBeVisible();
    await expect(page.getByTestId('bp-chaos-card')).toHaveCount(0);
    await page.getByTestId('bp-summon-card').click();
    // No chip either: nothing is in force but the summon itself.
    await expect(page.getByTestId('bp-chaos-badge')).toHaveCount(0);
  });

  test('a fight that opens with a blessing has no summon in it', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', chaos: 'CHAOS_BLESSING' });
    await expect(page.getByTestId('bp-chaos-card')).toBeVisible();
    await expect(page.getByTestId('bp-summon-card')).toHaveCount(0);
    await page.getByTestId('bp-chaos-card').click();
    await expect(page.getByTestId('bp-chaos-badge')).toContainText('ケイオスの加護');
    await expect(page.getByTestId('bp-summoned')).toHaveCount(0);
  });

  test('the four blessings still behave exactly as they did', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', chaos: 'CHAOS_WEAKEN' });
    const card = page.getByTestId('bp-chaos-card');
    await expect(card).toHaveAttribute('data-chaos', 'CHAOS_WEAKEN');
    await expect(card).toContainText('この子、ちょっと弱くしよっか。');
    await expect(page.locator('.bp-enemy .bp-chaos-mark.debuff')).toHaveCount(1);
  });
});

test.describe('a finished memory', () => {
  test('is the player’s to spend, and says so on the battlefield', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE' });
    const command = page.getByTestId('bp-arcana');
    await expect(command).toBeVisible();
    await expect(command).toBeEnabled();
    await expect(command).toContainText('アルカナ');
    // Its own row, so the two existing commands are not squeezed.
    const attack = (await page.getByTestId('bp-attack').boundingBox())!;
    const arcana = (await command.boundingBox())!;
    expect(arcana.y).toBeGreaterThan(attack.y);
    expect(arcana.height, 'thumb-sized').toBeGreaterThanOrEqual(44);
  });

  test('is chosen by name, never fails, and does what the book says', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE', enemyAction: 'ATTACK' });
    await guard(page);
    const hurt = await playerHp(page);
    expect(hurt).toBeLessThan(40);

    await page.getByTestId('bp-arcana').click();
    const tray = page.getByTestId('bp-arcana-tray');
    await expect(tray).toBeVisible();
    await expect(tray).toContainText('森の息吹');
    await page.getByTestId('bp-arcana-moss_rabbit').click();

    const summoned = page.getByTestId('bp-summoned');
    await expect(summoned).toBeVisible();
    await expect(summoned).toHaveAttribute('data-kind', 'COMPLETE');
    expect(await playerHp(page)).toBeGreaterThan(hurt);
    await expect(page.getByTestId('bp-message')).toContainText('回復');
  });

  test('is worth more whole than in pieces', async ({ page }) => {
    // The same ability, called from a finished memory and from an
    // unfinished one. Whole is worth more; that is what finishing buys.
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS', enemyAction: 'ATTACK' });
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-summoned')).toBeVisible();
    const partial = Number(
      /HPが(\d+)回復/.exec((await page.getByTestId('bp-message').textContent()) ?? '')?.[1] ?? '0',
    );

    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE', enemyAction: 'ATTACK' });
    await guard(page);
    await guard(page);
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    await expect(page.getByTestId('bp-summoned')).toBeVisible();
    const whole = Number(
      /HPが(\d+)回復/.exec((await page.getByTestId('bp-message').textContent()) ?? '')?.[1] ?? '0',
    );
    expect(whole).toBeGreaterThan(partial);
  });

  test('can be spent once a fight, and again in the next one', async ({ page }) => {
    await freshWorld(page);
    await forestFight(page, { arcana: 'COMPLETE', enemyAction: 'ATTACK', finishable: true });
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    await expect(page.getByTestId('bp-summoned')).toBeVisible();

    // Spent. The command is still there — a disabled thing that says
    // why is kinder than one that vanishes — and it cannot be used.
    const command = page.getByTestId('bp-arcana');
    await expect(command).toBeDisabled();
    await expect(page.getByTestId('bp-arcana-spent')).toBeVisible();
    await command.click({ force: true });
    await expect(page.getByTestId('bp-arcana-tray')).toHaveCount(0);

    // Out of the fight and into the next one: it is available again.
    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-normal-end')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('bp-normal-end').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
    for (let pass = 0; pass < 2; pass++) {
      for (const [x, y] of RING_SPOTS) {
        await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
        for (let i = 0; i < 16; i++) {
          await page.waitForTimeout(180);
          if (await page.getByTestId('battle-prototype').isVisible().catch(() => false)) break;
        }
        if (await page.getByTestId('battle-prototype').isVisible().catch(() => false)) break;
      }
      if (await page.getByTestId('battle-prototype').isVisible().catch(() => false)) break;
    }
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await expect(page.getByTestId('bp-arcana')).toBeEnabled();
  });

  test('healing at full health does nothing, and says so rather than lying', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE' });
    expect(await playerHp(page)).toBe(40);
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    await expect(page.getByTestId('bp-summoned')).toBeVisible();
    expect(await playerHp(page)).toBe(40);
    await expect(page.getByTestId('bp-message')).toContainText('もう満ちている');
    // It was still spent: the player chose to spend it.
    await expect(page.getByTestId('bp-arcana')).toBeDisabled();
  });
});

test.describe('a moss rabbit fighting a moss rabbit', () => {
  test('is never ambiguous about which is which', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE' });
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    const summoned = page.getByTestId('bp-summoned');
    await expect(summoned).toBeVisible();

    const enemy = (await page.locator('.bp-enemy').boundingBox())!;
    const called = (await summoned.boundingBox())!;
    const hero = (await page.locator('.bp-hero').boundingBox())!;
    const kaos = (await page.locator('.bp-kaos').boundingBox())!;

    // Told apart three ways at once, none of which repaints the art:
    // it stands on the player's side of the clearing…
    expect(called.x, 'the called one is nearer the party than the enemy is').toBeGreaterThan(enemy.x);
    expect(called.y + called.height, 'and nearer the camera').toBeGreaterThan(enemy.y + enemy.height);
    // …it is visibly smaller than the animal actually being fought…
    expect(called.height).toBeLessThan(enemy.height);
    // …and it is labelled.
    await expect(summoned).toContainText('ARCANA');

    // And it crowds nobody: not the hero, not Kaos, not the enemy.
    const overlaps = (a: typeof hero, b: typeof hero) =>
      a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlaps(called, hero), 'clear of the hero').toBe(false);
    expect(overlaps(called, kaos), 'clear of Kaos').toBe(false);
    expect(overlaps(called, enemy), 'clear of the creature being fought').toBe(false);
  });
});

test.describe('the rest of the fight is untouched', () => {
  test('a summoned fight still ends in a beaten creature and the four answers', async ({ page }) => {
    await freshWorld(page);
    await forestFight(page, {
      arcana: 'COMPLETE',
      story: 'on',
      finishable: true,
      enemyAction: 'ATTACK',
    });
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    await expect(page.getByTestId('bp-summoned')).toBeVisible();

    await page.getByTestId('bp-attack').click();
    await expect(page.getByTestId('bp-mugen-choice')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('bp-enemy-downed')).toBeVisible();
    await page.getByTestId('bp-mugen-SPARE').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });

    // And what was decided is in WORLD MEMORY, exactly as before.
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

  test('summoning writes nothing: the book is what it was', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE' });
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    await expect(page.getByTestId('bp-summoned')).toBeVisible();
    // This route never touches the world, and a summon is not a fact
    // about it either — it is a thing that happened in a fight.
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
    expect(rows.filter((k) => /summon/i.test(k))).toEqual([]);
  });
});

test.describe('the book', () => {
  test('shows what can be called only once the memory is finished', async ({ page }) => {
    await freshWorld(page);
    await unlockDev(page);
    await page.getByTestId('arcana-set-高').click();
    await page.getByTestId('dev-admin-back').click();
    await page.getByTestId('arcana-button').click();
    await page.getByTestId('arcana-card-moss_rabbit').click();
    await expect(page.getByTestId('arcana-summon')).toHaveCount(0);
    await page.getByTestId('arcana-detail-back').click();
    await page.getByTestId('arcana-back').click();

    await unlockDev(page);
    await page.getByTestId('arcana-set-COMPLETE').click();
    await page.getByTestId('dev-admin-back').click();
    await page.getByTestId('arcana-button').click();
    await page.getByTestId('arcana-card-moss_rabbit').click();
    const section = page.getByTestId('arcana-summon');
    await expect(section).toBeVisible();
    await expect(section).toContainText('森の息吹');
    // One ability and a sentence. Not a stat block, not a rarity.
    const text = (await section.textContent()) ?? '';
    expect(text).not.toMatch(/SSR|★|攻撃力|防御力|レア/);
  });
});

for (const width of [360, 390, 412]) {
  test(`summoning fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE' });

    const command = page.getByTestId('bp-arcana');
    const box = (await command.boundingBox())!;
    expect(box.height, 'thumb-sized').toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    // The two older commands are not squeezed by the new one.
    for (const id of ['bp-attack', 'bp-skill']) {
      const other = (await page.getByTestId(id).boundingBox())!;
      expect(other.height, `${id} is still thumb-sized`).toBeGreaterThanOrEqual(44);
    }

    await command.click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    const summoned = page.getByTestId('bp-summoned');
    await expect(summoned).toBeVisible();
    const called = (await summoned.boundingBox())!;
    expect(called.x).toBeGreaterThanOrEqual(0);
    expect(called.x + called.width).toBeLessThanOrEqual(width);

    const scrolls = await page.evaluate(() => ({
      x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    }));
    expect(scrolls.x, 'no sideways scroll').toBe(false);
    expect(scrolls.y, 'no vertical scroll').toBe(false);
    // The forest is still most of what is on screen.
    const bg = (await page.locator('.bp-bg').boundingBox())!;
    expect(bg.height / 844).toBeGreaterThan(0.5);
  });
}
