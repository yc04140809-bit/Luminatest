import { test, expect, type Page } from './fixtures';
import { enterDevAdmin, PHONES, viewportOf } from './helpers';

// AUTO と 倍速 on the screen the player actually fights on.
//
// Both existed on the old battle screen and neither was reachable from
// a forest fight, because the forest uses the prototype. These tests are
// about the prototype and nothing else.

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

async function openPrototype(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('open-battle-prototype').click();
  await expect(page.getByTestId('battle-prototype')).toBeVisible();
  // And wait for the commands, which are not on screen at once: Kaos
  // steps in at the start of a fight and the row appears when she is
  // done. Every test that CLICKS a command got this for free from
  // Playwright's auto-waiting; the one that read styles with
  // `page.evaluate` did not, and failed under parallel load with
  // `getComputedStyle(null)` — because the row genuinely was not there
  // yet. Waiting here fixes the class of problem rather than the one
  // test that happened to hit it.
  await expect(page.getByTestId('bp-modes')).toBeVisible();
}

test('both controls exist on the screen a forest fight uses', async ({ page }) => {
  await freshWorld(page);
  await openPrototype(page);
  await expect(page.getByTestId('bp-modes')).toBeVisible();
  await expect(page.getByTestId('bp-auto')).toBeVisible();
  await expect(page.getByTestId('bp-speed')).toBeVisible();
  // BESIDE the commands, not below them. They started below and that
  // cost the battlefield its share of a 360px screen — so what is
  // checked here is the two properties that actually matter.
  const attack = (await page.getByTestId('bp-attack').boundingBox())!;
  const auto = (await page.getByTestId('bp-auto').boundingBox())!;
  const speed = (await page.getByTestId('bp-speed').boundingBox())!;

  // 1. On the command row, so the row — and the forest above it — is
  //    exactly the height it was before these existed.
  expect(auto.y).toBeCloseTo(attack.y, 0);
  expect(speed.y).toBeCloseTo(attack.y, 0);

  // 2. Well clear of 攻撃, which is the one a thumb reaches for in a
  //    hurry, and never overlapping it.
  const overlaps = (a: typeof auto, b: typeof auto) =>
    a.x < b.x + b.width && b.x < a.x + a.width;
  expect(overlaps(auto, attack), 'AUTO is not under the attack thumb').toBe(false);
  expect(overlaps(speed, attack), 'speed is not under the attack thumb').toBe(false);
  expect(auto.x).toBeGreaterThan(attack.x + attack.width);

  // 3. And the forest is still most of the screen.
  const bg = (await page.locator('.bp-bg').boundingBox())!;
  const size = page.viewportSize()!;
  expect(bg.height / size.height, 'the forest is still most of the screen').toBeGreaterThan(0.5);
});

test('AUTO is off, on, and off again — and the next turn is the player’s', async ({ page }) => {
  await freshWorld(page);
  await openPrototype(page);

  const auto = page.getByTestId('bp-auto');
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  const hp = page.getByTestId('bp-enemy-hp');
  const before = await hp.innerText();

  // OFF: the fight waits for the player, exactly as it did.
  await page.waitForTimeout(2500);
  expect(await hp.innerText()).toBe(before);

  // ON: it takes turns by itself, and says so.
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(auto).toContainText('AUTO ON');
  await expect(async () => {
    expect(await hp.innerText()).not.toBe(before);
  }).toPass({ timeout: 15_000 });

  // OFF AGAIN: it stops, and the very next tap is a hand-played turn.
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1200);
  const held = await hp.innerText();
  await page.waitForTimeout(3000);
  expect(await hp.innerText()).toBe(held);

  await page.getByTestId('bp-attack').click();
  await expect(async () => {
    expect(await hp.innerText()).not.toBe(held);
  }).toPass({ timeout: 8000 });
});

test('×2 shortens the theatre and nothing else', async ({ page }) => {
  await freshWorld(page);
  await openPrototype(page);

  const speed = page.getByTestId('bp-speed');
  await expect(speed).toHaveAttribute('data-speed', '1');
  await expect(speed).toContainText('×1');

  /**
   * How long one hand-played turn is held on screen.
   *
   * MEASURED OFF THE SCREEN'S OWN CLASSES, which is the whole point and
   * was the first bug here: this used to wait for `.bp-actor.bf-hit`, a
   * class that belongs to the OTHER battle screen and never appears on
   * this one. The wait resolved instantly, both numbers were Playwright
   * round-trip noise (46ms vs 48ms), and the test passed for the wrong
   * reason until parallel load ordered the noise the other way.
   *
   * AND TIMED IN THE PAGE, which was the second. Driving the stopwatch
   * from here with `expect.poll` measured with a ruler coarser than the
   * thing being measured: its intervals ramp to a full second, so a turn
   * of 500ms and a turn of 800ms both land on the same 850ms poll and
   * read as identical — which is exactly what a loaded machine produced
   * (865ms against 867ms). A MutationObserver on the field records both
   * edges at the moment they happen, so the reading is the turn's length
   * rather than the driver's polling granularity, and the coarse poll
   * below only has to notice that a recorded answer exists.
   *
   * A turn is STRIKE(320) + the creature's reply — around a second at ×1
   * and about half that at ×2. The beats are `setTimeout`s in JS, not
   * CSS animations, so reduced-motion does not flatten them.
   */
  const PLAYING = '.bp-hero.strike, .bp-hero.hurt, .bp-enemy.struck, .bp-enemy.tackle, .bp-enemy.hide';

  const theatre = async () => {
    // Watching BEFORE the tap, so the opening beat cannot be missed in
    // the round-trip: it has to start before it can end, or "finished"
    // is just "not begun yet" with a stopwatch on it.
    await page.evaluate((sel) => {
      const w = window as unknown as { __theatre?: { start: number | null; end: number | null } };
      const mark = { start: null as number | null, end: null as number | null };
      w.__theatre = mark;
      const playing = () => Boolean(document.querySelector(sel));
      const observer = new MutationObserver(() => {
        if (mark.start === null) {
          if (playing()) mark.start = performance.now();
        } else if (mark.end === null && !playing()) {
          mark.end = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(document.querySelector('.bp-stage')!, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    }, PLAYING);

    await page.getByTestId('bp-attack').click();

    const recorded = () =>
      page.evaluate(() => {
        const w = window as unknown as { __theatre: { start: number | null; end: number | null } };
        return w.__theatre.end === null || w.__theatre.start === null
          ? null
          : w.__theatre.end - w.__theatre.start;
      });
    await expect.poll(recorded, { timeout: 20_000 }).not.toBeNull();
    return (await recorded())!;
  };

  const atOne = await theatre();
  await speed.click();
  await expect(speed).toHaveAttribute('data-speed', '2');
  await expect(speed).toContainText('×2');
  const atTwo = await theatre();

  // Meaningfully shorter, not shorter by a hair. Half, with room for a
  // loaded machine's polling granularity either side.
  expect(atOne, 'a turn at ×1 is theatre, not an instant').toBeGreaterThan(400);
  expect(atTwo, `×2 (${atTwo}ms) is well under ×1 (${atOne}ms)`).toBeLessThan(atOne * 0.8);

  // Cycling comes back round rather than sticking at the top.
  await speed.click();
  await expect(speed).toHaveAttribute('data-speed', '1');
});

test('being ON is visible, not only announced', async ({ page }) => {
  await freshWorld(page);
  await openPrototype(page);

  // Read through the locator rather than `document.querySelector`, so
  // Playwright waits for the element instead of handing null to
  // getComputedStyle the moment the row has not rendered yet.
  const paint = async (id: string) =>
    page
      .getByTestId(id)
      .evaluate((node) => getComputedStyle(node as HTMLElement).backgroundColor);

  const offAuto = await paint('bp-auto');
  const offSpeed = await paint('bp-speed');

  await page.getByTestId('bp-auto').click();
  await page.getByTestId('bp-speed').click();
  // The chips fade in over 0.16s; read them once they have landed, or
  // the answer is whatever the transition was passing through.
  await page.waitForTimeout(400);

  // A player who cannot tell at a glance whether AUTO is on will tap it,
  // and turning it off on the turn they meant to turn it on is the whole
  // of the frustration this state exists to avoid. So ON is a filled
  // chip, and that it is filled is checked rather than assumed.
  expect(await paint('bp-auto'), 'AUTO is painted when on').not.toBe(offAuto);
  expect(await paint('bp-speed'), 'speed is painted when on').not.toBe(offSpeed);
  expect(await paint('bp-auto')).not.toBe('rgba(0, 0, 0, 0)');
  expect(await paint('bp-speed')).not.toBe('rgba(0, 0, 0, 0)');
});

test('AUTO and ×2 are on at the same time', async ({ page }) => {
  await freshWorld(page);
  await openPrototype(page);

  await page.getByTestId('bp-speed').click();
  await page.getByTestId('bp-auto').click();
  await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '2');
  await expect(page.getByTestId('bp-auto')).toHaveAttribute('aria-pressed', 'true');

  // And the fight goes on being fought while both are on.
  const hp = page.getByTestId('bp-enemy-hp');
  const before = await hp.innerText();
  await expect(async () => {
    expect(await hp.innerText()).not.toBe(before);
  }).toPass({ timeout: 15_000 });
});

test('AUTO plays a whole fight through, using only the commands', async ({ page }) => {
  await freshWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('force-story-off').click();
  await page.getByTestId('battle-start-finishable').click();
  await page.getByTestId('open-battle-prototype').click();
  await expect(page.getByTestId('battle-prototype')).toBeVisible();

  await page.getByTestId('bp-speed').click();
  await page.getByTestId('bp-auto').click();

  // It reaches the end of the fight on its own.
  await expect(page.getByTestId('bp-normal-end')).toBeVisible({ timeout: 60_000 });
  // And the commands are gone, because the fight is over — not because
  // AUTO took some other path out of it.
  await expect(page.getByTestId('bp-attack')).toHaveCount(0);
});

test.describe('on a phone', () => {
  for (const phone of PHONES) {
    test(`both controls are reachable on a ${phone.name} phone`, async ({ page }) => {
      await page.setViewportSize(viewportOf(phone));
      await freshWorld(page);
      await openPrototype(page);

      for (const id of ['bp-auto', 'bp-speed', 'bp-attack']) {
        const box = (await page.getByTestId(id).boundingBox())!;
        expect(box, id).not.toBeNull();
        // Inside the screen, and big enough for a thumb.
        expect(box.height, id).toBeGreaterThanOrEqual(30);
        expect(box.y + box.height, id).toBeLessThanOrEqual(viewportOf(phone).height + 1);
      }
      // Pressing them does not move the commands under the player's thumb.
      const before = (await page.getByTestId('bp-attack').boundingBox())!;
      await page.getByTestId('bp-speed').click();
      await page.getByTestId('bp-auto').click();
      const after = (await page.getByTestId('bp-attack').boundingBox())!;
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    });
  }
});

/**
 * ×2 SHORTENS THE WAITING, NOT THE WATCHING.
 *
 * THE BUG THESE EXIST FOR. Every character motion on this screen is two
 * halves of one thing: a class the screen puts on for a measured number
 * of milliseconds, and a CSS animation of the same length. Only the
 * first half knew what speed the fight was being watched at, so at ×2
 * the class came off at 53% of the animation and the character
 * TELEPORTED back to its mark — the hero mid-swing from 29px out, the
 * creature's tackle from 61px out, before it had ever reached the
 * player. The fight still played correctly; you simply could not see
 * what had happened.
 *
 * So these tests are not about duration. They are about where a
 * character IS at the moment its motion is taken away: if the animation
 * was allowed to finish, it is home already and the class coming off
 * moves nothing.
 *
 * Motion has to be ON for any of this to mean anything, and the suite
 * asks for `prefers-reduced-motion` everywhere — so these ask for it
 * back, and only these.
 */
test.describe('twice speed keeps the fight watchable', () => {
  interface Frame {
    at: number;
    hero: string;
    enemy: string;
    heroX: number;
    enemyX: number;
    /**
     * How far off the ground line she is drawn, in pixels, read as the
     * computed `bottom` rather than from a bounding box.
     *
     * She breathes — an endless three-pixel bob — and that is a
     * transform, so a box never sits still and "moved more than two
     * pixels" would be measuring her lungs. `bottom` is what the camera
     * moves and what a transform cannot touch, and mid-glide it reports
     * where she actually is rather than where she is headed.
     */
    kaosBottom: number;
  }

  async function film(page: Page) {
    await page.evaluate(() => {
      const w = window as unknown as { __f: unknown[] };
      const shift = (el: Element) => Math.round(new DOMMatrixReadOnly(getComputedStyle(el).transform).m41);
      w.__f = [];
      const t0 = performance.now();
      const frame = () => {
        const hero = document.querySelector('.bp-hero')!;
        const enemy = document.querySelector('.bp-enemy')!;
        const kaos = document.querySelector('.bp-kaos')!;
        (w.__f as unknown[]).push({
          at: Math.round(performance.now() - t0),
          hero: (hero.className.match(/strike|hurt/) ?? ['-'])[0],
          enemy: (enemy.className.match(/tackle|struck|hide/) ?? ['-'])[0],
          heroX: shift(hero),
          enemyX: shift(enemy),
          kaosBottom: Math.round(parseFloat(getComputedStyle(kaos).bottom)),
        });
      };
      frame();
      const tick = setInterval(frame, 16);
      setTimeout(() => clearInterval(tick), 3000);
    });
  }

  const frames = (page: Page): Promise<Frame[]> =>
    page.evaluate(() => (window as never as { __f: Frame[] }).__f);

  /**
   * How much of its journey a motion still had left when it was ended,
   * as a share of the furthest it got.
   *
   * A SHARE RATHER THAN PIXELS, because this is sampled on a 16ms timer
   * and a loaded machine widens that: the last frame caught with the
   * class on can be most of a frame before the class actually came off,
   * which reads as further from home than the character ever was. A
   * share is immune to that in a way a pixel budget is not — and it is
   * the honest question anyway. A motion allowed to finish is home when
   * it ends (a share near nought); the truncated ×2 tackle was ended at
   * the far end of its own travel, having never arrived at all.
   */
  function unfinished(rows: Frame[], which: 'hero' | 'enemy', cls: string): number | null {
    const px = (r: Frame) => Math.abs(which === 'hero' ? r.heroX : r.enemyX);
    const playing = rows.filter((r) => r[which] === cls);
    if (!playing.length) return null;
    const peak = Math.max(...playing.map(px));
    return peak === 0 ? 0 : px(playing[playing.length - 1]) / peak;
  }

  async function swingAt(page: Page, speed: 1 | 2) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await freshWorld(page);
    await enterDevAdmin(page);
    await page.getByTestId('force-story-off').click();
    // Settle what the creature does, so the tackle is always there to
    // be measured rather than measured one run in three.
    await page.getByTestId('force-enemy-ATTACK').click();
    await page.getByTestId('open-battle-prototype').click();
    await page.getByTestId('bp-modes').waitFor();
    if (speed === 2) {
      await page.getByTestId('bp-speed').click();
      await expect(page.getByTestId('bp-speed')).toHaveAttribute('data-speed', '2');
    }
    await film(page);
    await page.getByTestId('bp-attack').click();
    await expect.poll(async () => (await frames(page)).some((r) => r.enemy === 'tackle'), { timeout: 10_000 }).toBe(true);
    await expect.poll(async () => (await frames(page)).at(-1)!.enemy === '-', { timeout: 10_000 }).toBe(true);
    return frames(page);
  }

  for (const speed of [1, 2] as const) {
    test(`nobody teleports at ×${speed}`, async ({ page }) => {
      const rows = await swingAt(page, speed);

      // The swing. Cut at ×2 it ended 29px out of a 30px lunge — the
      // whole of it still to come back.
      const strike = unfinished(rows, 'hero', 'strike');
      expect(strike, 'the swing played at all').not.toBeNull();
      expect(strike!, `the swing ended ${Math.round(strike! * 100)}% out`).toBeLessThanOrEqual(0.4);

      // The creature landing on the player. Cut at ×2 it ended 61px out
      // and had never reached him: the blow did not arrive on screen.
      const tackle = unfinished(rows, 'enemy', 'tackle');
      expect(tackle, 'the tackle played at all').not.toBeNull();
      expect(tackle!, `the tackle ended ${Math.round(tackle! * 100)}% out`).toBeLessThanOrEqual(0.4);

      // And it did reach him first: a tackle that never leaves home is
      // not a tackle, and would pass the check above for the wrong
      // reason entirely.
      expect(Math.max(...rows.map((r) => Math.abs(r.enemyX))), 'it crossed the field').toBeGreaterThan(50);
    });
  }

  test('the ally stands back far enough, and long enough, at ×2', async ({ page }) => {
    const rows = await swingAt(page, 2);
    const base = rows[0].kaosBottom;
    const furthest = Math.max(...rows.map((r) => r.kaosBottom));

    // FAR ENOUGH. Nine pixels read as a twitch on a real phone.
    expect(furthest - base, 'she moved a distance somebody can see').toBeGreaterThanOrEqual(20);

    // LONG ENOUGH. Halved, she was at the back for a single frame.
    const away = rows.filter((r) => r.kaosBottom > base + 2);
    const span = away.length ? away[away.length - 1].at - away[0].at : 0;
    expect(span, 'she was away from the front for long enough to be seen').toBeGreaterThanOrEqual(150);

    // And she is home at the end, where the formation lock expects her.
    expect(rows.at(-1)!.kaosBottom).toBe(base);
  });
});
