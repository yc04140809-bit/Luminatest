import { test, expect, type Page } from './fixtures';
import { PHONES, enterDevAdmin, viewportOf, walkTheForestUntil } from './helpers';

/**
 * THE GROUND THE REST IS BUILT ON.
 *
 * Not a feature test: three questions asked of every screen, at every
 * size the game is judged on.
 *
 *   1. Does the stage use the screen it was given?
 *   2. Does anything stick out of the stage?
 *   3. Can everything in a scrolling screen actually be reached?
 */

/** How much of the window the stage is actually using. */
async function stageFill(page: Page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-testid="landscape-frame"]') as HTMLElement | null;
    const stage = document.querySelector('[data-testid="landscape-stage"]') as HTMLElement | null;
    if (!frame || !stage) return null;
    const r = stage.getBoundingClientRect();
    return {
      w: r.width,
      h: r.height,
      vw: window.innerWidth,
      vh: window.innerHeight,
      scale: frame.dataset.scale ?? 'none',
    };
  });
}

/**
 * Anything visible that reaches outside the stage AND cannot be brought
 * back into it.
 *
 * The distinction is the whole point. A settings row four hundred
 * pixels down a scrolling screen is outside the stage and perfectly
 * fine — it is below the fold, and a thumb reaches it. What is not fine
 * is a control that is outside and STAYS outside however the screen is
 * scrolled, because that is a button nobody can press.
 */
async function outsideTheStage(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector('[data-testid="landscape-stage"]');
    if (!stage) return [];
    const box = stage.getBoundingClientRect();
    const out: string[] = [];
    const beyond = (r: DOMRect) =>
      r.left < box.left - 1 || r.top < box.top - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1;
    for (const el of Array.from(
      document.querySelectorAll('button, .screen-title, .dialogue-box, .battle-log, [data-testid]'),
    )) {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
      let r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (!beyond(r)) continue;
      // Give the page a chance to bring it in, the way a player would.
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      r = el.getBoundingClientRect();
      if (!beyond(r)) continue;
      const id = el.getAttribute('data-testid') ?? el.className ?? el.tagName;
      out.push(
        `${String(id).slice(0, 44)} @${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      );
    }
    return Array.from(new Set(out));
  });
}

/** Scrolling boxes whose content cannot be reached. */
async function unreachableScroll(page: Page) {
  return page.evaluate(() => {
    const stuck: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*')) as HTMLElement[]) {
      const s = getComputedStyle(el);
      const scrolls = s.overflowY === 'auto' || s.overflowY === 'scroll';
      if (!scrolls) continue;
      const hidden = el.scrollHeight - el.clientHeight;
      if (hidden <= 2) continue;
      const before = el.scrollTop;
      el.scrollTop = el.scrollHeight;
      const moved = el.scrollTop > before;
      el.scrollTop = before;
      if (!moved) stuck.push(`${el.className || el.tagName} hidden=${hidden}px`);
    }
    // And the page itself.
    const doc = document.scrollingElement as HTMLElement;
    const pageHidden = doc.scrollHeight - doc.clientHeight;
    if (pageHidden > 2) {
      const before = doc.scrollTop;
      doc.scrollTop = doc.scrollHeight;
      if (!(doc.scrollTop > before)) stuck.push(`document hidden=${pageHidden}px`);
      doc.scrollTop = before;
    }
    return stuck;
  });
}

async function report(page: Page, where: string, phone: string) {
  const fill = await stageFill(page);
  const out = await outsideTheStage(page);
  const stuck = await unreachableScroll(page);
  console.log(
    `STAB ${phone} ${where} :: stage=${fill ? `${Math.round(fill.w)}x${Math.round(fill.h)} of ${fill.vw}x${fill.vh} scale=${fill.scale}` : 'none'}` +
      ` :: outside=[${out.join(' | ')}] :: stuck=[${stuck.join(' | ')}]`,
  );
  return { fill, out, stuck };
}

async function newWorld(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

for (const phone of PHONES) {
  test(`every screen sits inside its stage on a ${phone.name} phone`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(viewportOf(phone));
    const problems: string[] = [];
    const check = async (where: string) => {
      const r = await report(page, where, phone.name);
      if (r.out.length) problems.push(`${where}: outside ${r.out.join(', ')}`);
      if (r.stuck.length) problems.push(`${where}: unreachable ${r.stuck.join(', ')}`);
      if (r.fill) {
        // The stage must use the screen it was given, give or take a pixel.
        const used = (r.fill.w * r.fill.h) / (r.fill.vw * r.fill.vh);
        if (used < 0.98) problems.push(`${where}: stage uses only ${(used * 100).toFixed(0)}% of the window`);
      }
    };

    await page.goto('/');
    await check('title');
    await newWorld(page);
    await check('home');
    await page.getByTestId('explore-button').click();
    await check('explore');
    await page.getByTestId('location-GREENWOOD_FOREST').click();
    await page.waitForTimeout(2000);
    await check('greenwood');
    // Back out of the forest before asking for anything that lives on
    // HOME — the previous version stood in the trees waiting for a
    // button that was never going to appear.
    await page.getByTestId('leave-forest').click({ timeout: 10_000 });
    // Leaving the forest lands on the explore list, not on HOME.
    await page.waitForTimeout(800);
    if (!(await page.getByTestId('world-clock').count())) {
      await check('explore-after-forest');
      await page.locator('.screen-footer .btn').first().click({ timeout: 10_000 });
    }
    await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 15_000 });

    for (const [id, where] of [
      ['world-memory-button', 'world-memory'],
      ['news-button', 'world-news'],
      ['archive-button', 'archive'],
      ['settings-button', 'settings'],
    ] as const) {
      await page.getByTestId(id).click({ timeout: 10_000 });
      await page.waitForTimeout(500);
      await check(where);
      await page.locator('.screen-footer .btn').first().click({ timeout: 10_000 });
      await expect(page.getByTestId('world-clock')).toBeVisible({ timeout: 15_000 });
    }

    await enterDevAdmin(page);
    await check('dev-admin');
    await page.getByTestId('dev-admin-back').click({ timeout: 10_000 });

    expect(problems, problems.join('\n')).toEqual([]);
  });
}

test('the battle screen sits inside its stage', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 800, height: 360 });
  await newWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE').click();
  await page.getByTestId('battle-ui-OLD').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  const battle = page.getByTestId('battle-screen');
  await walkTheForestUntil(page, () => battle.isVisible().catch(() => false));
  await expect(battle).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(500);
  const a = await report(page, 'battle', '800x360');
  await page.getByTestId('magic-button').click();
  await page.waitForTimeout(300);
  const b = await report(page, 'battle+tray', '800x360');
  expect([...a.out, ...b.out, ...a.stuck, ...b.stuck]).toEqual([]);
});

test('the newest line of the battle log is always the one on screen', async ({ page }) => {
  // There is no scrolling log to fall behind: the screen renders the
  // last two lines of it, so the newest is always the one a player is
  // looking at. This is what says so — and what would notice if the box
  // ever started keeping older lines instead.
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 800, height: 360 });
  await newWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE').click();
  await page.getByTestId('battle-ui-OLD').click();
  await page.getByTestId('force-encounter-BATTLE').click();
  await page.getByTestId('dev-admin-back').click();
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  const battle = page.getByTestId('battle-screen');
  await walkTheForestUntil(page, () => battle.isVisible().catch(() => false));
  await expect(battle).toBeVisible({ timeout: 20_000 });

  const log = page.getByTestId('battle-log');
  const enemyHp = page.getByTestId('enemy-hp');
  const hpOf = (text: string | null) =>
    Number(/(\d+)\s*\/\s*(\d+)/.exec((text ?? '').replace(/\s+/g, ' '))?.[1] ?? NaN);
  for (let turn = 0; turn < 5; turn += 1) {
    const hpBefore = hpOf(await enemyHp.textContent());
    const before = (await log.textContent()) ?? '';
    await page.getByTestId('attack-button').click();
    await page.waitForTimeout(900);
    if (!(await log.count())) break;
    const after = (await log.textContent()) ?? '';
    // THE BOX ADVANCED, OR IT IS SHOWING THIS TURN ANYWAY.
    //
    // 「the text differs from last turn's」 alone looked like the right
    // check and was not. The player rolls 8–12 and the creature 2–5, so
    // twenty pairs write the whole two-line box, and two turns in a row
    // landing the same pair write the same sentence — a correct log
    // failing this test about once every four runs.
    //
    // 「it contains the damage just dealt」 alone is not right either:
    // a creature that hides and then recovers writes two lines of its
    // own, and the player's blow is pushed out of a window that holds
    // two. The box is still showing the newest lines, which is what
    // this test is named for.
    //
    // Either one is enough, and a box that had started keeping OLDER
    // lines satisfies neither: its text would sit still while the
    // number it shows stayed somebody else's. Five turns of that is
    // caught on the first.
    //
    // The whole token rather than the digits, because a bare `4` would
    // be found in a health bar reading 104.
    const dealt = hpBefore - hpOf(await enemyHp.textContent());
    expect(dealt, 'the blow landed').toBeGreaterThan(0);
    expect(
      after !== before || after.includes(`${dealt}のダメージ`),
      `the box is showing this turn: ${JSON.stringify(after)} after ${dealt} damage`,
    ).toBe(true);
    // And it is inside the stage, not hidden under anything.
    const box = (await log.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(361);
  }
});
