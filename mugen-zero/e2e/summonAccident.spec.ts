import { test, expect, type Page } from './fixtures';

/**
 * ARCANA v0.3 — a summon that always means something, and the first
 * time something arrives that was never in the book.
 *
 * The three things being protected here:
 *
 *  - a memory that arrives is never a non-event. Hurt, it heals; not
 *    hurt, it leaves a little cover behind. "HPはもう満ちている。" and
 *    nothing else is the failure this replaced;
 *  - a sighting is not an acquisition. Seeing something must not put
 *    an ARCANA in the book, must not start one at any percentage, and
 *    must not enter WORLD MEMORY;
 *  - however enormous it was, it decides nobody's fate. A creature
 *    the breath brings to zero goes down and is asked about in the
 *    ordinary way, exactly as if the player had done it.
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

/** Back to HOME with the save intact, the way closing and reopening would. */
async function reopen(page: Page) {
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function unlockDev(page: Page) {
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
}

interface Setup {
  arcana?: string;
  summon?: 'SUCCESS' | 'FAILURE' | 'ACCIDENT' | null;
  chaos?: string;
  enemyAction?: 'ATTACK' | 'SKILL';
  finishable?: boolean;
}

/** Opens the prototype straight from DEV ADMIN. No back click: this leaves. */
async function openBattle(page: Page, options: Setup) {
  await unlockDev(page);
  await page.getByTestId('force-story-off').click();
  if (options.arcana) await page.getByTestId(`arcana-set-${options.arcana}`).click();
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

async function playerHp(page: Page): Promise<number> {
  const text = (await page.getByTestId('bp-player-hp').textContent()) ?? '';
  return Number(/(\d+)\s*\/\s*40/.exec(text.replace(/\s+/g, ' '))?.[1] ?? NaN);
}

async function enemyHp(page: Page): Promise<number> {
  const text = (await page.getByTestId('bp-enemy-hp').textContent()) ?? '';
  return Number(/(\d+)\s*\/\s*\d+/.exec(text.replace(/\s+/g, ' '))?.[1] ?? NaN);
}

/** Guards a turn and waits for the commands to come back. */
async function guard(page: Page) {
  await page.getByTestId('bp-skill').click();
  await page.getByTestId('bp-skill-guard').click();
  await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 8_000 });
}

/** Sits through the whole thing and comes out the other side. */
async function throughTheAccident(page: Page) {
  await expect(page.getByTestId('bp-accident-card')).toBeVisible({ timeout: 8_000 });
  await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 15_000 });
  await page.getByTestId('bp-accident-talk').click();
}

// ---------------------------------------------------------------
// PHASE 1 — a summon that is never nothing
// ---------------------------------------------------------------

test.describe('what a called memory does', () => {
  test('leaves cover behind when there is no wound, instead of nothing', async ({ page }) => {
    // The whole reason this changed: at the start of a fight nobody is
    // hurt, and the old version said "HPはもう満ちている。" and stopped.
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS', enemyAction: 'ATTACK' });
    await expect(page.getByTestId('bp-summon-card')).toBeVisible();
    await page.getByTestId('bp-summon-card').click();

    const said = page.getByTestId('bp-said');
    await expect(said).toBeVisible({ timeout: 8_000 });
    await expect(said).toContainText('森の息吹');
    await expect(said).toContainText('身体を包んだ');
    await expect(page.getByTestId('bp-said-result')).toContainText('森の加護');
    await expect(said).not.toContainText('HPはもう満ちている');
    expect(await playerHp(page)).toBe(40);

    // And the fight is an ordinary fight afterwards.
    await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 8_000 });
    await guard(page);
    expect(await playerHp(page)).toBeLessThan(40);
  });

  test('closes a wound when there is one', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE', summon: null, enemyAction: 'ATTACK' });
    await guard(page);
    const before = await playerHp(page);
    expect(before).toBeLessThan(40);

    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    const said = page.getByTestId('bp-said');
    await expect(said).toBeVisible();
    await expect(said).toContainText('森の息吹');
    await expect(said).toContainText('傷を包んだ');
    await expect(page.getByTestId('bp-said-result')).toContainText('回復');
    expect(await playerHp(page)).toBeGreaterThan(before);
  });

  test('is gone by the next fight', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS', enemyAction: 'ATTACK' });
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-said-result')).toContainText('森の加護');

    await reopen(page);
    await openBattle(page, { arcana: '0', summon: null, enemyAction: 'ATTACK' });
    await expect(page.getByTestId('bp-summon-card')).toHaveCount(0);
    await guard(page);
    // Nothing carried over: the plate is reporting an ordinary blow.
    await expect(page.getByTestId('bp-message')).toContainText('ダメージ');
  });
});

// ---------------------------------------------------------------
// PHASE 2 — something crosses
// ---------------------------------------------------------------

test.describe('the three ways an unfinished memory goes', () => {
  test('holds', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'SUCCESS' });
    await expect(page.getByTestId('bp-summon-card')).toHaveAttribute('data-outcome', 'SUCCESS');
    await page.getByTestId('bp-summon-card').click();
    // The creature is on the field for a second and a half, so what is
    // asserted is the mark it leaves rather than the moment itself:
    // the log keeps what happened after the picture has gone.
    // The plate keeps its identity while a summon speaks through it,
    // and the log keeps what happened after the picture has gone.
    await expect(page.getByTestId('bp-message')).toContainText(/森の加護|回復/, {
      timeout: 8_000,
    });
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
  });

  test('does not hold, and costs nothing', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'FAILURE' });
    await expect(page.getByTestId('bp-summon-card')).toHaveAttribute('data-outcome', 'FAILURE');
    await expect(page.getByTestId('bp-summon-card')).toContainText('輪郭が足りない');
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-commands')).toBeVisible({ timeout: 8_000 });
    expect(await playerHp(page)).toBe(40);
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
  });

  test('is crossed by something that was never in the book', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });

    // It begins exactly like an ordinary attempt: the same page, the
    // same number, the same thing she says.
    const card = page.getByTestId('bp-summon-card');
    await expect(card).toHaveAttribute('data-outcome', 'ACCIDENT');
    await expect(card).toContainText('ARCANA #001');
    await expect(card).toContainText('モスラビット');
    await expect(card).toContainText('CONSTRUCTION');
    await card.click();

    // And then it is not that at all. She notices first.
    const accident = page.getByTestId('bp-accident-card');
    await expect(accident).toBeVisible({ timeout: 8_000 });
    await expect(accident).toContainText('え？');
    await expect(accident).toContainText('???');
    await expect(accident).toContainText('UNKNOWN');
    // Nothing is named. Not the page it was, and not what arrived.
    await expect(accident).not.toContainText('モスラビット');
    await expect(accident).not.toContainText('#001');

    // Nobody explains it, least of all her.
    const talk = page.getByTestId('bp-accident-talk');
    await expect(talk).toBeVisible({ timeout: 15_000 });
    await expect(talk).toContainText('今の、何だったんだ？');
    await expect(talk).toContainText('知らない');
    await talk.click();
    // The breath brought the creature to zero, so what comes back is
    // the end of an ordinary fight — never a decision made for the
    // player by the thing that crossed them.
    await expect(
      page
        .getByTestId('bp-commands')
        .or(page.getByTestId('bp-mugen-choice'))
        .or(page.getByTestId('bp-normal-end')),
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('the thing itself', () => {
  test('is far too big for the frame it arrived in', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();

    const dragon = page.getByTestId('bp-dragon');
    await expect(dragon).toBeVisible({ timeout: 10_000 });
    const art = (await page.locator('.bp-dragon-art').boundingBox())!;
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    // Over half the battlefield. A summoned moss rabbit is 15% of it;
    // that difference is the entire message of the moment.
    expect((art.width * art.height) / (stage.width * stage.height)).toBeGreaterThan(0.5);
    const summonHeight = stage.height * 0.15;
    expect(art.height).toBeGreaterThan(summonHeight * 3);
  });

  test('faces the creature it came for', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 10_000 });

    // The enemy stands on the left, so it looks left. The drawing
    // faces right, so the screen mirrors it — and mirrors it only.
    const art = page.locator('.bp-dragon-art');
    const transform = await art.evaluate((el) => getComputedStyle(el).transform);
    expect(transform.startsWith('matrix(-1')).toBe(true);
    // Used exactly as delivered otherwise: no recolour, no tint.
    const filter = await art.evaluate((el) => getComputedStyle(el).filter);
    expect(filter).not.toContain('saturate');
    expect(filter).not.toContain('hue-rotate');
  });

  test('does not stay: it comes apart and the field is the field again', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();
    await throughTheAccident(page);
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
    await expect(page.getByTestId('bp-breath')).toHaveCount(0);
    // Nothing joined the party: the only ARCANA anybody can call is
    // the one the player actually collected, and 30% is not callable.
    await expect(page.getByTestId('bp-arcana')).toHaveCount(0);
  });
});

test.describe('《エンシェントブレス》', () => {
  test('is shown as its own picture, and its name is not printed twice', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();

    const breath = page.getByTestId('bp-breath');
    await expect(breath).toBeVisible({ timeout: 12_000 });
    const art = page.locator('.bp-breath-art');
    await expect(art).toHaveAttribute('data-title-in-art', 'yes');
    await expect(art).toHaveJSProperty('naturalWidth', 1536);

    // The lettering is drawn into the artwork, so nothing in the UI
    // may write it again.
    const text = (await page.getByTestId('battle-prototype').innerText()) ?? '';
    expect(text).not.toContain('エンシェントブレス');
    expect(text).not.toContain('ANCIENT BREATH');
  });

  test('is legible in portrait: nothing of it is cropped away', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-breath')).toBeVisible({ timeout: 12_000 });

    // The face, the mouth, the beam and the title are at opposite
    // ends of a wide drawing, so the whole of it is shown rather than
    // a crop: any crop tight enough to enlarge it loses one of them.
    const box = (await page.locator('.bp-breath-art').boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(page.viewportSize()!.width - 1);
    expect(Math.abs(box.width / box.height - 1536 / 1024)).toBeLessThan(0.05);
  });

  test('hits every enemy, and the fight decides what that means', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    expect(await enemyHp(page)).toBeGreaterThan(0);
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-breath')).toBeVisible({ timeout: 12_000 });
    await expect
      .poll(() => enemyHp(page), { timeout: 8_000 })
      .toBe(0);
    // Brought to zero, not killed. The creature goes down and lies
    // there, exactly as it does when the player does it.
    await expect(page.getByTestId('bp-message')).toContainText('膝をついた');
    expect(await playerHp(page)).toBe(40);
  });

  test('leaves the four answers to the player, not to the dragon', async ({ page }) => {
    await freshWorld(page);
    await unlockDev(page);
    await page.getByTestId('preset-SPARE_3Y').click();
    await page.getByTestId('force-encounter-BATTLE').click();
    await page.getByTestId('force-story-on').click();
    await page.getByTestId('arcana-set-中').click();
    await page.getByTestId('force-summon-ACCIDENT').click();
    await page.getByTestId('force-chaos-NONE').click();
    await page.getByTestId('dev-admin-back').click();

    await page.getByTestId('explore-button').click();
    await page.getByTestId('location-GREENWOOD_FOREST').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2200);
    const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
    const fighting = () => page.getByTestId('battle-prototype').isVisible().catch(() => false);
    let found = false;
    for (let pass = 0; pass < 2 && !found; pass++) {
      for (const [x, y] of RING_SPOTS) {
        await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
        for (let i = 0; i < 16 && !found; i++) {
          await page.waitForTimeout(180);
          if (await fighting()) found = true;
        }
        if (found) break;
      }
    }
    expect(found).toBe(true);

    await page.getByTestId('bp-summon-card').click();
    await throughTheAccident(page);
    // Down first, and only then asked — never decided for.
    await expect(page.getByTestId('bp-enemy-downed')).toBeVisible({ timeout: 12_000 });
    const choice = page.getByTestId('bp-mugen-choice');
    await expect(choice).toBeVisible({ timeout: 12_000 });
    for (const id of ['KILL', 'SPARE', 'HELP', 'CAPTURE']) {
      await expect(page.getByTestId(`bp-mugen-${id}`)).toBeVisible();
    }
    await page.getByTestId('bp-mugen-SPARE').click();
    await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('it is quiet, however large it is', () => {
  test('no white flash, no blackout, no takeover', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-breath')).toBeVisible({ timeout: 12_000 });

    // The UI is still the UI: both plates and the message are there.
    await expect(page.getByTestId('bp-player-hp')).toBeVisible();
    await expect(page.getByTestId('bp-enemy-hp')).toBeVisible();
    await expect(page.getByTestId('bp-message')).toBeVisible();

    // And nothing white or black is laid over the whole screen.
    const veils = await page.evaluate(() => {
      const screen = document.querySelector('.bp-screen')!.getBoundingClientRect();
      return [...document.querySelectorAll('.bp-screen *')].filter((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (r.width * r.height < screen.width * screen.height * 0.85) return false;
        if (s.opacity === '0' || s.visibility === 'hidden') return false;
        const bg = s.backgroundColor;
        const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(bg);
        if (!m) return false;
        const alpha = m[4] === undefined ? 1 : Number(m[4]);
        if (alpha < 0.5) return false;
        const [r1, g1, b1] = [Number(m[1]), Number(m[2]), Number(m[3])];
        return (r1 > 230 && g1 > 230 && b1 > 230) || (r1 < 25 && g1 < 25 && b1 < 25);
      }).length;
    });
    expect(veils).toBe(0);
  });
});

test.describe('the book afterwards', () => {
  async function seeIt(page: Page) {
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();
    await throughTheAccident(page);
    await expect(page.getByTestId('bp-message')).toBeVisible({ timeout: 8_000 });
  }

  test('gains a row that is a sighting, not a page', async ({ page }) => {
    await freshWorld(page);
    await seeIt(page);
    await reopen(page);
    await page.getByTestId('arcana-button').click();

    // The count of things that can be finished did not move.
    await expect(page.getByTestId('arcana-count')).toContainText('1 / 1');
    // The sighting is counted apart from it, and never as a fraction.
    await expect(page.getByTestId('arcana-unknown-count')).toContainText('未知の記憶 1');

    const row = page.getByTestId('arcana-unknown-unknown_001');
    await expect(row).toBeVisible();
    await expect(row).toContainText('ARCANA #???');
    await expect(row).toContainText('？？？');
    await expect(row).toContainText('UNKNOWN');
    await expect(row).toContainText('知らない記憶が、一瞬だけ混ざった。');
    // What it was seen to do — which is all anybody knows about it.
    await expect(page.getByTestId('arcana-witnessed-unknown_001')).toContainText('観測されたもの');
    await expect(page.getByTestId('arcana-witnessed-unknown_001')).toContainText(
      'エンシェントブレス',
    );
    // No percentage: a number here would say "you have started
    // collecting this", and there is nothing yet to collect.
    await expect(row).not.toContainText('%');
  });

  test('leaves the real page exactly as it was', async ({ page }) => {
    await freshWorld(page);
    await seeIt(page);
    await reopen(page);
    await page.getByTestId('arcana-button').click();
    await expect(page.getByTestId('arcana-pct-moss_rabbit')).toContainText('30%');
    await page.getByTestId('arcana-card-moss_rabbit').click();
    await expect(page.getByTestId('arcana-detail-moss_rabbit')).toBeVisible();
    await expect(page.getByTestId('arcana-detail-pct')).toContainText('30%');
    await expect(page.getByTestId('arcana-hints')).toBeVisible();
  });

  test('does not tell WORLD MEMORY about it', async ({ page }) => {
    await freshWorld(page);
    await seeIt(page);
    await reopen(page);
    await page.getByTestId('world-memory-button').click();
    const text = (await page.locator('.screen').innerText()) ?? '';
    expect(text).not.toContain('UNKNOWN');
    expect(text).not.toContain('？？？');
  });

  test('survives closing the game, and is written once', async ({ page }) => {
    await freshWorld(page);
    await seeIt(page);
    await reopen(page);
    await reopen(page);
    await page.getByTestId('arcana-button').click();
    await expect(page.getByTestId('arcana-unknown-unknown_001')).toHaveCount(1);
    await expect(page.getByTestId('arcana-unknown-count')).toContainText('未知の記憶 1');
  });

  test('is gone when the world is', async ({ page }) => {
    await freshWorld(page);
    await seeIt(page);
    await reopen(page);
    await unlockDev(page);
    await page.getByTestId('reset-world-button').click();
    await page.getByTestId('confirm-reset-world').click();
    await page.waitForTimeout(800);
    await page.reload();
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
    await page.getByTestId('arcana-button').click();
    await expect(page.getByTestId('arcana-unknown-count')).toHaveCount(0);
    await expect(page.getByTestId('arcana-unknown-unknown_001')).toHaveCount(0);
  });
});

test.describe('when it may happen again', () => {
  async function seeIt(page: Page) {
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();
    await throughTheAccident(page);
    await expect(page.getByTestId('bp-message')).toBeVisible({ timeout: 8_000 });
    await reopen(page);
  }

  test('not straight away: it waits out its cooldown', async ({ page }) => {
    // "Once, ever" was rejected: a player looking away misses the only
    // strange thing in the build forever. What replaces it is a long
    // wait, so it can never read as a mechanic that turns up twice in
    // an afternoon.
    await freshWorld(page);
    await seeIt(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await expect(page.getByTestId('bp-summon-card')).toBeVisible();
    await expect(page.getByTestId('bp-summon-card')).not.toHaveAttribute(
      'data-outcome',
      'ACCIDENT',
    );
  });

  test('but it may, once enough of the world has gone by', async ({ page }) => {
    await freshWorld(page);
    await seeIt(page);
    await unlockDev(page);
    await page.getByTestId('time-plus-1y').click();
    await page.waitForTimeout(500);
    await page.getByTestId('dev-admin-back').click();

    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await expect(page.getByTestId('bp-summon-card')).toHaveAttribute('data-outcome', 'ACCIDENT');
  });

  test('never again once the player owns it', async ({ page }) => {
    // The hard rule, and the reason a sighting carries an ARCANA it
    // resolves into: a thing you can call on purpose must never turn
    // up again as a thing that crossed you by chance.
    await freshWorld(page);
    await seeIt(page);
    await unlockDev(page);
    await page.getByTestId('time-plus-1y').click();
    await page.waitForTimeout(400);
    await page.getByTestId('accident-state-ACQUIRED').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('accident-state')).toContainText('ACQUIRED');
    await page.getByTestId('dev-admin-back').click();

    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await expect(page.getByTestId('bp-summon-card')).toBeVisible();
    await expect(page.getByTestId('bp-summon-card')).not.toHaveAttribute(
      'data-outcome',
      'ACCIDENT',
    );
  });

  test('never crosses a memory that is finished, or nearly', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE', summon: 'ACCIDENT' });
    await expect(page.getByTestId('bp-summon-card')).toHaveCount(0);
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
    await expect(page.getByTestId('bp-arcana')).toBeVisible();

    await reopen(page);
    await openBattle(page, { arcana: '高', summon: 'ACCIDENT' });
    await expect(page.getByTestId('bp-summon-card')).toBeVisible();
    await expect(page.getByTestId('bp-summon-card')).not.toHaveAttribute(
      'data-outcome',
      'ACCIDENT',
    );
  });
});

test.describe('everything she used to do, she still does', () => {
  test('a blessing asked for by name is still a blessing', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: null, chaos: 'CHAOS_BLESSING' });
    await expect(page.getByTestId('bp-chaos-card')).toBeVisible();
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
    await page.getByTestId('bp-chaos-card').click();
    await expect(page.getByTestId('bp-chaos-badge')).toBeVisible();
  });

  test('and a curse is still a curse', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: null, chaos: 'CHAOS_WEAKEN' });
    await expect(page.getByTestId('bp-chaos-card')).toBeVisible();
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
  });

  test('a finished memory is still the player’s to spend', async ({ page }) => {
    await freshWorld(page);
    await openBattle(page, { arcana: 'COMPLETE', summon: null, enemyAction: 'ATTACK' });
    await page.getByTestId('bp-arcana').click();
    await page.getByTestId('bp-arcana-moss_rabbit').click();
    await expect(page.getByTestId('bp-summoned')).toHaveAttribute('data-kind', 'COMPLETE');
    await expect(page.getByTestId('bp-arcana-spent')).toBeVisible({ timeout: 8_000 });
  });
});

for (const width of [360, 390, 412]) {
  test(`the accident fits a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await freshWorld(page);
    await openBattle(page, { arcana: '中', summon: 'ACCIDENT' });
    await page.getByTestId('bp-summon-card').click();

    const checkpoints = ['bp-accident-card', 'bp-dragon', 'bp-breath', 'bp-accident-talk'];
    for (const id of checkpoints) {
      const node = page.getByTestId(id);
      await expect(node).toBeVisible({ timeout: 15_000 });
      const scrolls = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      }));
      expect(scrolls.x, `no sideways scroll at ${id}`).toBe(false);
      expect(scrolls.y, `no vertical scroll at ${id}`).toBe(false);
      const box = (await node.boundingBox())!;
      expect(box.x + box.width, 'inside the phone').toBeLessThanOrEqual(width + 1);
      // The plates stay readable through all of it.
      await expect(page.getByTestId('bp-player-hp')).toBeVisible();
    }
  });
}
