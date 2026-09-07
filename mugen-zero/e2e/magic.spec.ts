import { test, expect, type Page } from './fixtures';
import {
  PHONES,
  enterDevAdmin,
  playToLifeChoice,
  readMemoryEvents,
  swingUntil,
  viewportOf,
  walkTheForestUntil,
} from './helpers';

/**
 * KAOS IN THE FIGHT.
 *
 * The one rule everything here is protecting: the player has ONE action
 * a turn, and choosing hers is choosing not to swing. If a single test
 * in this file ever passes while both of them act, two characters have
 * become one character with a second attack button and the whole
 * feature has quietly stopped being what it was for.
 */

/** Play Gald until she steps forward, and read the scene. */
async function awaken(page: Page) {
  const scene = page.getByTestId('magic-awakening');
  for (let i = 0; i < 24; i++) {
    if (await scene.isVisible().catch(() => false)) break;
    await page
      .getByTestId('attack-button')
      .click({ force: true, timeout: 2500 })
      .catch(() => {});
    await page.waitForTimeout(110);
  }
  await expect(scene).toBeVisible();
  for (let i = 0; i < 10; i++) {
    if (!(await scene.isVisible().catch(() => false))) break;
    await scene.click({ force: true });
    await page.waitForTimeout(110);
  }
  await expect(scene).toHaveCount(0);
}

function hpOf(text: string | null): number {
  return Number(/(\d+)\s*\/\s*(\d+)/.exec((text ?? '').replace(/\s+/g, ' '))?.[1] ?? NaN);
}

test.describe('the awakening', () => {
  test('is not offered at the start, and arrives partway through the fight', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    // 2 — locked until it happens.
    await expect(page.getByTestId('magic-button')).toHaveCount(0);
    await expect(page.getByTestId('magic-tray')).toHaveCount(0);

    // 1 — it happens in the fight, without leaving it.
    await awaken(page);
    await expect(page.getByTestId('battle-screen')).toBeVisible();
    // 3 — and the command is on screen afterwards.
    await expect(page.getByTestId('magic-button')).toBeVisible();
    await expect(page.getByTestId('player-mp')).toContainText('48/48');
  });

  test('reads over the fight and resets nothing behind it', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    const enemyHp = page.getByTestId('enemy-hp');
    const scene = page.getByTestId('magic-awakening');
    for (let i = 0; i < 24; i++) {
      if (await scene.isVisible().catch(() => false)) break;
      await page
        .getByTestId('attack-button')
        .click({ force: true, timeout: 2500 })
        .catch(() => {});
      await page.waitForTimeout(110);
    }
    await expect(scene).toBeVisible();
    const hurtDuring = hpOf(await enemyHp.textContent());
    // Both fighters are still there behind it, at the numbers they had.
    await expect(page.getByTestId('gald-portrait-ready')).toBeVisible();
    for (let i = 0; i < 10; i++) {
      if (!(await scene.isVisible().catch(() => false))) break;
      await scene.click({ force: true });
      await page.waitForTimeout(110);
    }
    expect(hpOf(await enemyHp.textContent())).toBe(hurtDuring);
  });
});

test.describe('one action a turn', () => {
  test('casting spends the turn: the hero does not also swing', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);

    const enemyHp = page.getByTestId('enemy-hp');
    const before = hpOf(await enemyHp.textContent());

    // 4, 5 — one action, and it is hers.
    await page.getByTestId('magic-button').click();
    await expect(page.getByTestId('magic-tray')).toBeVisible();
    await page.getByTestId('magic-starlight_bolt').click();
    await expect(page.getByTestId('magic-tray')).toHaveCount(0);
    await page.waitForTimeout(600);

    const after = hpOf(await enemyHp.textContent());
    const dealt = before - after;
    expect(dealt, 'the spell landed').toBeGreaterThan(0);
    // A swing is 8–12 and the spell is 9. Both in one turn would be 17
    // at the very least, and this must never be that.
    expect(dealt, 'and nothing else landed with it').toBeLessThan(17);
  });

  test('spends MP, and stops offering what cannot be paid for', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);
    const mp = page.getByTestId('player-mp');
    await expect(mp).toContainText('48/48');

    // 6 — eight casts at six each, and then it is gone.
    for (let cast = 0; cast < 8; cast += 1) {
      await page.getByTestId('magic-button').click();
      const spell = page.getByTestId('magic-starlight_bolt');
      await expect(spell).toBeEnabled();
      await spell.click();
      await page.waitForTimeout(320);
      if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) return;
    }
    await expect(mp).toContainText('0/48');
    await page.getByTestId('magic-button').click();
    // Shown and refused rather than hidden: a player needs to know it is
    // there and why they cannot have it.
    await expect(page.getByTestId('magic-starlight_bolt')).toBeDisabled();
    await page.getByTestId('magic-close').click();
    await expect(page.getByTestId('magic-tray')).toHaveCount(0);
  });

  test('her other hand: mending puts health back and strikes nobody', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);
    await page.getByTestId('magic-button').click();
    // Both of hers arrive together, and they are not the same answer.
    await expect(page.getByTestId('magic-starlight_bolt')).toBeVisible();
    const mend = page.getByTestId('magic-mending_light');
    await expect(mend).toBeVisible();

    const hpBefore = hpOf(await page.getByTestId('player-hp').textContent());
    const enemyBefore = hpOf(await page.getByTestId('enemy-hp').textContent());
    await mend.click();
    await expect(page.getByTestId('magic-tray')).toHaveCount(0);
    await page.waitForTimeout(600);

    // Twenty-two back, less whatever he took for the turn it cost.
    expect(hpOf(await page.getByTestId('player-hp').textContent())).toBeGreaterThan(hpBefore);
    // And he is exactly as he was: this is the one spell that is not a
    // blow, so if this ever changes it has become one.
    expect(hpOf(await page.getByTestId('enemy-hp').textContent())).toBe(enemyBefore);
    await expect(page.getByTestId('player-mp')).toContainText('36/48');
  });

  test('her third answer: a shield strikes nobody and stands before the blow', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);
    await page.getByTestId('magic-button').click();
    // All three of hers, and no two of them the same kind of answer.
    await expect(page.getByTestId('magic-starlight_bolt')).toBeVisible();
    await expect(page.getByTestId('magic-mending_light')).toBeVisible();
    const shield = page.getByTestId('magic-star_shield');
    await expect(shield).toBeVisible();

    const enemyBefore = hpOf(await page.getByTestId('enemy-hp').textContent());
    await shield.click();
    await expect(page.getByTestId('magic-tray')).toHaveCount(0);
    await page.waitForTimeout(700);

    // Nobody was struck by it.
    expect(hpOf(await page.getByTestId('enemy-hp').textContent())).toBe(enemyBefore);
    await expect(page.getByTestId('player-mp')).toContainText('40/48');
    await expect(page.getByTestId('battle-log')).toBeVisible();
  });

  test('bracing gives her power back, which is what makes it worth a turn', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);
    await page.getByTestId('magic-button').click();
    await page.getByTestId('magic-starlight_bolt').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('player-mp')).toContainText('42/48');
    await page.getByTestId('defend-button').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('player-mp')).toContainText('48/48');
  });
});

test.describe('the fight is still the fight', () => {
  test('opening the tray does not shrink the battlefield', async ({ page }) => {
    // It is a way of choosing, not a panel: the three of them must be
    // exactly where and what size they were. As a flex item in the
    // column the tray took its height out of the field and halved
    // everybody standing in it, which no assertion in the suite could
    // see and one screenshot could.
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);
    const field = page.locator('.battle-field');
    const before = (await field.boundingBox())!;
    const hero = (await page.getByTestId('battle-hero-art').boundingBox())!;
    await page.getByTestId('magic-button').click({ force: true });
    await expect(page.getByTestId('magic-tray')).toBeVisible();
    await page.waitForTimeout(250);
    const after = (await field.boundingBox())!;
    const heroAfter = (await page.getByTestId('battle-hero-art').boundingBox())!;
    expect(Math.round(after.height), 'the field keeps its height').toBe(Math.round(before.height));
    expect(Math.round(heroAfter.height), 'and so does he').toBe(Math.round(hero.height));
  });


  test('reaches the four answers after a fight fought with magic', async ({ page }) => {
    test.setTimeout(200_000);
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await awaken(page);
    // Cast while she can, swing when she cannot: a real mixed fight.
    //
    // The tray is a toggle, so its state has to be read before it is
    // pressed — pressing it blind shuts it again every other turn and
    // the fight never advances. Every question asked of the spell is
    // given its own small timeout for the same reason: the default one
    // is the whole test budget, and one closed tray would spend it.
    const choice = page.getByTestId('life-choice-screen');
    const tray = page.getByTestId('magic-tray');
    const spell = page.getByTestId('magic-starlight_bolt');
    const deadline = Date.now() + 140_000;
    while (Date.now() < deadline) {
      if (await choice.isVisible().catch(() => false)) break;
      if (!(await tray.isVisible().catch(() => false))) {
        await page
          .getByTestId('magic-button')
          .click({ force: true, timeout: 2000 })
          .catch(() => {});
      }
      const castable =
        (await spell.isVisible().catch(() => false)) &&
        (await spell.isEnabled({ timeout: 1000 }).catch(() => false));
      if (castable) {
        await spell.click({ force: true, timeout: 2000 }).catch(() => {});
      } else {
        await page
          .getByTestId('magic-close')
          .click({ force: true, timeout: 2000 })
          .catch(() => {});
        await page
          .getByTestId('attack-button')
          .click({ force: true, timeout: 2000 })
          .catch(() => {});
      }
      await page.waitForTimeout(110);
    }
    // 11 — the four answers are untouched by any of this.
    await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 20_000 });
    for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
      await expect(page.getByTestId(`choice-${id}`)).toBeVisible();
    }
  });

  test('writes nothing of its own into what the world remembers', async ({ page }) => {
    test.setTimeout(200_000);
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    const before = await readMemoryEvents(page);
    await awaken(page);
    await page.getByTestId('magic-button').click();
    await page.getByTestId('magic-starlight_bolt').click();
    await page.waitForTimeout(500);
    // 12 — a spell is not a memory. Nothing about the fight is world truth
    // until the player answers the question at the end of it.
    const after = await readMemoryEvents(page);
    expect(after.map((e) => e.id).sort()).toEqual(before.map((e) => e.id).sort());
  });
});

test.describe('afterwards', () => {
  test('she has not forgotten it by the next fight', async ({ page }) => {
    test.setTimeout(240_000);
    // A world where the question about Gald has already been answered:
    // she stepped forward in that fight, so she can do it in this one.
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
    await enterDevAdmin(page);
    await page.getByTestId('preset-SPARE_3Y').click();
    await page.getByTestId('force-encounter-BATTLE').click();
    await page.getByTestId('dev-admin-back').click();
    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-GREENWOOD_FOREST').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
    const fighting = page.getByTestId('battle-prototype');
    await walkTheForestUntil(page, () => fighting.isVisible().catch(() => false));
    await expect(fighting).toBeVisible();
    // No awakening scene here — it already happened, once, in its fight.
    await expect(page.getByTestId('magic-awakening')).toHaveCount(0);
    await expect(page.getByTestId('bp-magic')).toBeVisible();
    await expect(page.getByTestId('bp-mp')).toContainText('48');
  });

  test('is still locked in a world where that fight has not happened', async ({ page }) => {
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
    await enterDevAdmin(page);
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await expect(page.getByTestId('bp-magic')).toHaveCount(0);
  });
});

test.describe('on a phone', () => {
  for (const phone of PHONES) {
    test(`the magic command and its tray fit a ${phone.name} phone`, async ({ page }) => {
      test.setTimeout(200_000);
      await page.setViewportSize(viewportOf(phone));
      await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
      await awaken(page);

      // 9 — nothing scrolls sideways and nothing hangs off the bottom.
      const overflow = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      }));
      expect(overflow.x).toBeLessThanOrEqual(1);
      expect(overflow.y).toBeLessThanOrEqual(1);

      for (const id of [
        'attack-button',
        'magic-button',
        'defend-button',
        'auto-button',
        'speed-button',
      ]) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box, id).not.toBeNull();
        expect(box.x, `${id} on screen`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${id} inside it`).toBeLessThanOrEqual(phone.width + 1);
        expect(box.y + box.height, `${id} above the fold`).toBeLessThanOrEqual(phone.height + 1);
        expect(box.height, `${id} thumb-sized`).toBeGreaterThanOrEqual(40);
      }

      await page.getByTestId('magic-button').click();
      // Every spell in the tray, not just the first: the tray grows as
      // she learns things and it must still fit the shortest phone.
      for (const id of ['magic-starlight_bolt', 'magic-mending_light', 'magic-star_shield']) {
        const spell = (await page.getByTestId(id).boundingBox())!;
        expect(spell, id).not.toBeNull();
        expect(spell.height, `${id} is thumb-sized too`).toBeGreaterThanOrEqual(40);
        expect(spell.y, `${id} top on screen`).toBeGreaterThanOrEqual(0);
        expect(spell.x + spell.width).toBeLessThanOrEqual(phone.width + 1);
        expect(spell.y + spell.height).toBeLessThanOrEqual(phone.height + 1);
      }
    });
  }
});
