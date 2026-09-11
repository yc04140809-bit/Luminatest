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
   * was the bug: this used to wait for `.bp-actor.bf-hit`, a class that
   * belongs to the OTHER battle screen and never appears on this one.
   * The wait therefore resolved instantly, both numbers were Playwright
   * round-trip noise (46ms vs 48ms), and the test passed for two years'
   * worth of the wrong reason until parallel load ordered the noise the
   * other way.
   *
   * A turn is STRIKE(320) + the creature's reply — over a second at ×1
   * and about half that at ×2, so the difference is far larger than any
   * round-trip. The beats are `setTimeout`s in JS, not CSS animations,
   * so reduced-motion does not flatten them.
   */
  const theatre = async () => {
    const playing = () =>
      page.evaluate(() =>
        Boolean(
          document.querySelector(
            '.bp-hero.strike, .bp-hero.hurt, .bp-enemy.struck, .bp-enemy.tackle, .bp-enemy.hide',
          ),
        ),
      );
    await page.getByTestId('bp-attack').click();
    // It has to start before it can end, or "finished" is just "not
    // begun yet" with a stopwatch on it.
    await expect.poll(playing, { timeout: 10_000 }).toBe(true);
    const started = Date.now();
    await expect.poll(playing, { timeout: 20_000 }).toBe(false);
    return Date.now() - started;
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
