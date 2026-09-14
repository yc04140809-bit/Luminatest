import { test, expect } from './fixtures';
import { playToLifeChoice } from './helpers';

/**
 * WHAT A BLOW LOOKS LIKE, AND WHAT IT COSTS TO LOOK AT IT.
 *
 * The fight used to report damage and show almost none of it. What is
 * checked here is that the moment of contact is DRAWN — a number off
 * the wound rather than a sentence at the bottom of the screen — and
 * that none of the drawing costs the player anything: the commands
 * stay pressable, the fight's own numbers stay readable, and nothing
 * that appears outlives the beat it belongs to.
 */

test('a swing is seen, not just reported', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

  const before = await page.getByTestId('bp-enemy-read').textContent();
  await page.getByTestId('bp-attack').click();

  // THE NUMBER, on the field. And it is the fight's own number: the
  // health it took off the bar is the figure that floated off it.
  // AT LEAST one: each blow of a turn draws its own now, so the
  // creature's answer can be on screen beside the player's swing. The
  // first one up is the swing that was just tapped.
  const damage = page.getByTestId('bp-hit-damage').first();
  await expect(damage).toBeVisible({ timeout: 3_000 });
  const shown = Number((await damage.textContent())?.trim());
  expect(Number.isFinite(shown)).toBe(true);
  expect(shown).toBeGreaterThan(0);

  await expect(page.getByTestId('bp-enemy-read')).not.toHaveText(before ?? '');
  const after = await page.getByTestId('bp-enemy-read').textContent();
  const hpOf = (t: string | null) => Number(/(\d+)/.exec((t ?? '').replace(/\s+/g, ''))?.[1] ?? NaN);
  expect(hpOf(before) - hpOf(after), 'the number shown is the health taken').toBe(shown);
});

test('nothing it draws is left on the field', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  await page.getByTestId('bp-attack').click();
  // COUNTED, NOT "VISIBLE". The effect is a decoration and says so —
  // `aria-hidden`, and a zero-sized anchor with everything drawn out of
  // its margins — so it is deliberately not visible in the sense a
  // screen reader or `toBeVisible` means. Whether it is THERE is the
  // question, and the count answers it.
  await expect(page.getByTestId('bp-hit-fx')).toHaveCount(1, { timeout: 3_000 });
  // Gone on its own, without anybody pressing anything.
  await expect(page.getByTestId('bp-hit-fx')).toHaveCount(0, { timeout: 6_000 });
});

/**
 * A second swing arriving before the first has finished must REPLACE
 * the effect rather than stack a second one on top of it. One element,
 * always.
 */
test('a fast player never gets two effects at once', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  const attack = page.getByTestId('bp-attack');
  for (let i = 0; i < 6; i++) {
    await attack.click({ timeout: 1200 }).catch(() => {});
    expect(await page.getByTestId('bp-hit-fx').count()).toBeLessThanOrEqual(1);
    await page.waitForTimeout(90);
  }
});

/**
 * THE READING STEPS BACK, AND DOES NOT LEAVE.
 *
 * The corners dim while a blow lands so the field is what the player is
 * looking at. The numbers that say how the fight is going dim less, and
 * never to nothing: losing track of your own health to a prettier
 * screen is not a trade anybody agreed to.
 */
test('the reading steps back for a blow and comes back after it', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

  const hud = page.getByTestId('bp-hud');
  await expect(hud).toHaveAttribute('data-stagecraft', 'IDLE');
  const opacityOf = (sel: string) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      return el ? Number(getComputedStyle(el).opacity) : null;
    }, sel);

  await page.getByTestId('bp-attack').click();
  await expect(hud).toHaveAttribute('data-stagecraft', 'ATTACK', { timeout: 3_000 });
  await page.waitForTimeout(200);
  const readingDuring = await opacityOf('.bx-tc');
  const vitalsDuring = await opacityOf('.bx-enemy-plate');
  expect(readingDuring!).toBeLessThan(0.9);
  expect(vitalsDuring!, 'the fight’s own numbers never go out').toBeGreaterThanOrEqual(0.3);

  // And back, on its own.
  await expect(hud).toHaveAttribute('data-stagecraft', 'IDLE', { timeout: 6_000 });
  await page.waitForTimeout(420);
  expect((await opacityOf('.bx-tc'))!).toBeGreaterThan(0.95);
});

/**
 * A cut-in is over the commands for a moment. A player who presses 攻撃
 * during one has pressed 攻撃 — every part of it is transparent to a
 * thumb, and that is what this asks the page.
 */
test('a cut-in never eats a tap', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  // Her magic is what has a cut-in, and it arrives partway through the
  // fight. Swing until she has stepped forward.
  const magic = page.getByTestId('bp-magic');
  for (let i = 0; i < 40; i++) {
    if (await magic.isVisible().catch(() => false)) break;
    const scene = page.getByTestId('magic-awakening');
    if (await scene.isVisible().catch(() => false)) {
      await scene.click({ timeout: 1200 }).catch(() => {});
      continue;
    }
    await page.getByTestId('bp-attack').click({ timeout: 1200 }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await expect(magic).toBeVisible({ timeout: 10_000 });
  // Pressed by identity, as the suite's swinger does: the commands are
  // mid-animation most of the time and a click that waits for one to
  // settle can wait out the test.
  const press = async (id: string) => {
    await page
      .getByTestId(id)
      .evaluate((el) => {
        if (el instanceof HTMLButtonElement && !el.disabled) el.click();
      })
      .catch(() => {});
  };
  await press('bp-magic');
  await expect(page.getByTestId('magic-tray')).toBeVisible({ timeout: 5_000 });
  await press('magic-starlight_bolt');

  const cut = page.getByTestId('bp-cutin');
  await expect(cut).toHaveCount(1, { timeout: 3_000 });
  await expect(page.getByTestId('bp-cutin-name')).toContainText('《');
  // What is under the thumb where the commands are, while it plays.
  const box = (await page.getByTestId('bp-attack').boundingBox())!;
  const underneath = await page.evaluate(
    ([x, y]) => document.elementFromPoint(Number(x), Number(y))?.closest('[data-testid]')
      ?.getAttribute('data-testid') ?? null,
    [String(box.x + box.width / 2), String(box.y + box.height / 2)],
  );
  expect(underneath, 'the commands are still what a thumb hits').not.toBe('bp-cutin');
  // And it takes itself off.
  await expect(cut).toHaveCount(0, { timeout: 6_000 });
});

/**
 * THE OTHER SIDE'S BLOW, DRAWN THE SAME WAY.
 *
 * Nobody's turn is drawn better than anybody else's: the creature's
 * attack gets the same five things the party's does. What must NOT be
 * the same is the direction — the party swings right to left and the
 * creature left to right, always — so the lean of the cut is checked
 * as well as its presence.
 */
test('the creature’s blow is drawn too, and leans the other way', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

  const hp = page.getByTestId('bp-player-hp');
  const fx = page.getByTestId('bp-hit-fx');
  const hpOf = (t: string | null) => Number(/(\d+)/.exec((t ?? '').replace(/\s+/g, ''))?.[1] ?? NaN);

  // GUARD UNTIL HE SWINGS. He does not swing every turn — he measures
  // the distance, he resets his grip, his phase changes — so the test
  // takes turns until the one that is a blow. Guarding rather than
  // swinging so the only effect on screen is the one coming back.
  let lean: string | null = null;
  let shown = NaN;
  let taken = NaN;
  for (let turn = 0; turn < 14; turn++) {
    const before = await hp.textContent();
    await page.getByTestId('bp-defend').click({ timeout: 2_000 }).catch(() => {});
    // Wait out the whole turn: his beat is queued behind the player's,
    // so his blow lands about a beat later than theirs would.
    for (let t = 0; t < 30; t++) {
      if ((await fx.count()) > 0) break;
      await page.waitForTimeout(60);
    }
    if ((await fx.count()) === 0) continue;
    lean = await fx.evaluate((el) => getComputedStyle(el).getPropertyValue('--hit-lean').trim());
    const damage = page.getByTestId('bp-hit-damage');
    if ((await damage.count()) === 0) continue;
    shown = Number((await damage.textContent())?.trim());
    await expect(hp).not.toHaveText(before ?? '', { timeout: 3_000 });
    taken = hpOf(before) - hpOf(await hp.textContent());
    break;
  }

  expect(lean, 'the creature swings left to right').toBe('24deg');
  expect(shown, 'a number floated off the party').toBeGreaterThan(0);
  // And it is the fight's own number: the health it took off the party
  // is the figure that floated off them. Read off the state rather than
  // from the difference, which is why a turn that also mends cannot
  // make the two disagree.
  expect(taken, 'the number shown is the health taken').toBe(shown);
});

/** And the party's own blow still leans the way it always did. */
test('the party’s blow leans right to left', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  await page.getByTestId('bp-attack').click();
  const fx = page.getByTestId('bp-hit-fx');
  await expect(fx).toHaveCount(1, { timeout: 4_000 });
  const lean = await fx.evaluate((el) => getComputedStyle(el).getPropertyValue('--hit-lean').trim());
  expect(lean, 'the party swings right to left').toBe('-24deg');
});

/**
 * THE BODY ANSWERS THE LIGHT, NOT THE NEXT BEAT.
 *
 * Measured at ×1 before this: the creature's blow flashed at 551ms and
 * the player flinched at 826ms — a 276ms hole, because the recoil was
 * its own beat queued behind the whole of the creature's lunge while
 * contact happens two fifths of the way through it. It read as being
 * hit and then, a moment later, deciding to react.
 *
 * The reaction hangs off the same state the flash does now, so the two
 * cannot separate; what is left is one deliberate breath between them,
 * because perfectly simultaneous is the one thing a real impact never
 * is. This measures the gap by listening for the animations themselves
 * — sampling the transform cannot tell a recoil from the actor's own
 * lunge, and the camera lean moves the baseline under both.
 */
const WATCH_ANIMATIONS = `
  window.__anim = [];
  document.addEventListener('animationstart', (e) => {
    const el = e.target;
    const who = el.closest && el.closest('.bp-hero') ? 'hero'
      : el.closest && el.closest('.bp-enemy') ? 'foe' : '?';
    window.__anim.push({ name: e.animationName, who, t: performance.now() });
  }, true);
`;

type Anim = { name: string; who: string; t: number };

async function animations(page: import('@playwright/test').Page): Promise<Anim[]> {
  return page.evaluate(() => (window as unknown as { __anim: Anim[] }).__anim ?? []);
}

/**
 * The gap between a side being lit and that side moving.
 *
 * The recoil has two spellings — consecutive blows alternate between
 * them so that a second blow on the same body restarts the motion
 * instead of being swallowed by the one already running — so both are
 * accepted here. See blows.ts.
 */
function reactionGap(log: Anim[], who: string, recoil: string): number | null {
  const flash = log.find((a) => a.name === 'bp-hit-flash' && a.who === who);
  if (!flash) return null;
  // WITHIN THIS BLOW'S OWN WINDOW. A recoil a third of a second after
  // the flash is not that flash's recoil, it is the next blow's — and
  // pairing the two would report a number belonging to neither. Out of
  // range is "not measured here", and the caller swings again.
  const react = log.find(
    (a) =>
      (a.name === recoil || a.name === `${recoil}-b`) &&
      a.who === who &&
      a.t >= flash.t - 40 &&
      a.t <= flash.t + 200,
  );
  return react ? react.t - flash.t : null;
}

for (const speed of ['×1', '×2'] as const) {
  test(`the blow and the body arrive together at ${speed}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(WATCH_ANIMATIONS);
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await expect(page.getByTestId('bp-attack')).toBeVisible();
    if (speed === '×2') {
      await page.getByTestId('bp-speed').click();
      await expect(page.getByTestId('bp-speed')).toContainText('×2');
    }

    // Swing until both sides have been hit at least once, so the
    // creature's blow — the one the hole was in — is measured too.
    let creature: number | null = null;
    let player: number | null = null;
    for (let i = 0; i < 8 && (creature === null || player === null); i++) {
      await page.evaluate(() => ((window as unknown as { __anim: Anim[] }).__anim.length = 0));
      const attack = page.getByTestId('bp-attack');
      if (!(await attack.isEnabled().catch(() => false))) break;
      await attack.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(speed === '×2' ? 1400 : 2200);
      const log = await animations(page);
      creature ??= reactionGap(log, 'foe', 'bp-struck');
      player ??= reactionGap(log, 'hero', 'bp-flinch');
      if (await page.getByTestId('bp-attack').count() === 0) break;
    }

    // 0〜80ms. Both of them, at both speeds — the gap is a perceptual
    // constant and does not go through the beat machinery, so ×2 must
    // not be any further apart than ×1.
    expect(creature, 'the creature was never struck in eight swings').not.toBeNull();
    expect(creature!, `creature: flash -> recoil at ${speed}`).toBeGreaterThanOrEqual(0);
    expect(creature!, `creature: flash -> recoil at ${speed}`).toBeLessThanOrEqual(80);
    if (player !== null) {
      expect(player, `player: flash -> recoil at ${speed}`).toBeGreaterThanOrEqual(0);
      expect(player, `player: flash -> recoil at ${speed}`).toBeLessThanOrEqual(80);
    }
  });
}

/**
 * AND THE SECOND BLOW OF A TURN IS DRAWN FOR AS LONG AS THE FIRST.
 *
 * Both blows go through one `hit` slot, and the first one's clear timer
 * used to fire in the middle of the second: measured at ×1, the
 * creature's damage number was on screen for 184ms of the 520 it is
 * drawn for. It now refuses to clear a blow that is not its own.
 */
test('the creature’s own damage number is not cut short by the swing before it', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });

  const lives: number[] = [];
  for (let i = 0; i < 6 && lives.length < 2; i++) {
    const attack = page.getByTestId('bp-attack');
    if (!(await attack.isEnabled().catch(() => false))) break;
    await attack.click({ timeout: 5_000 }).catch(() => {});
    // Watch the slot for the whole exchange and record how long each
    // number it shows stays up.
    const seen = await page.evaluate(async () => {
      const out: number[] = [];
      let shownAt: number | null = null;
      let text: string | null = null;
      const start = performance.now();
      while (performance.now() - start < 2000) {
        const el = document.querySelector('[data-testid="bp-hit-damage"]');
        const now = el ? el.textContent : null;
        if (now !== text) {
          if (shownAt !== null) out.push(performance.now() - shownAt);
          shownAt = now === null ? null : performance.now();
          text = now;
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
      if (shownAt !== null) out.push(performance.now() - shownAt);
      return out;
    });
    lives.push(...seen.filter((ms) => ms > 40));
    if ((await page.getByTestId('bp-attack').count()) === 0) break;
  }

  expect(lives.length, 'no damage number was ever drawn').toBeGreaterThan(0);
  // 184ms was the broken case. Every number gets most of its beat.
  for (const ms of lives) {
    expect(Math.round(ms), `a number was on screen for ${Math.round(ms)}ms`).toBeGreaterThan(260);
  }
});
