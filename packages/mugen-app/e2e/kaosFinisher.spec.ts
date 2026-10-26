import { expect, test, type Page } from '@playwright/test';

/**
 * ケイオス 《双極臨界 → 界核崩壊》 in the party fight (作者 2026-10-26「ケイオス必殺技 正式実装指示書」): charged by her
 * turns (3 → 2 → 1 → READY, never on her first turn, MP or not), her own gold-and-purple cut-in, the two
 * circles meeting into the core over them, four strikes at all of them (COMBO each), 界核崩壊 — the blast, a
 * white flash, the space cracked, shards — the afterglow, 魔防DOWN; the same at ×2, quicker; and a fight
 * won by it seen through before 「勝利！」. The numbers and AUTO are the core's (partyKaosFinisher.test.ts).
 */

const screen = (page: Page) => page.getByTestId('pb-screen');

/** To this member's turn: each other member defends. */
async function turnOf(page: Page, id: string) {
  for (let i = 0; i < 10; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 20_000 });
    if ((await screen(page).getAttribute('data-actor')) === id) return;
    await page.getByTestId('pb-cmd-defend').click();
    await page.waitForTimeout(200);
  }
  throw new Error(`never ${id}'s turn`);
}

/** What the screen shows of it, frame by frame (ms from now). */
async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __cl: Record<string, number | string | boolean> };
    w.__cl = { waves: 0, shards: 0, kaosMoved: false, pressable: false };
    const t0 = performance.now();
    const tick = () => {
      const now = Math.round(performance.now() - t0);
      const c = w.__cl;
      const cut = document.querySelector('.ci');
      if (cut) {
        c.cutOn ??= now;
        c.theme ??= cut.getAttribute('data-theme') ?? '';
      } else if (c.cutOn !== undefined) c.cutOff ??= now;
      if (document.querySelector('[data-testid="pb-collapse"]')) c.on ??= now;
      else if (c.on !== undefined) c.off ??= now;
      c.waves = Math.max(c.waves as number, document.querySelectorAll('[data-testid="pb-collapse-wave"]').length);
      c.shards = Math.max(c.shards as number, document.querySelectorAll('[data-testid="pb-collapse-shard"]').length);
      if (document.querySelector('[data-testid="pb-collapse-blast"]')) c.blast ??= now;
      if (document.querySelector('[data-testid="pb-collapse-cracks"]')) c.cracks ??= now;
      if (document.querySelector('[data-testid="pb-float-mdown"]')) c.said ??= now;
      const badge = document.querySelector('[data-testid="pb-mdown-badge"]');
      if (badge) {
        c.badge ??= now;
        c.badgeText ??= badge.textContent ?? '';
      }
      if (document.querySelector('[data-testid="pb-result"]')) c.result ??= now;
      if (document.querySelector('.pb-foe.down')) c.fell ??= now;
      // While it plays: she stays where she is — nothing moves her own figure (the camera moves the whole field).
      if (c.on !== undefined && c.off === undefined) {
        const img = document.querySelector<HTMLElement>('[data-testid="pb-figure-kaos"] > img');
        const st = img ? getComputedStyle(img) : null;
        if (st && ((st.transform !== 'none' && st.transform !== '') || (st.translate !== 'none' && st.translate !== ''))) c.kaosMoved = true;
      }
      if (screenOf()?.getAttribute('data-ending') === 'yes' && document.querySelector('[data-testid="pb-commands"][data-locked="no"]')) c.pressable = true;
      requestAnimationFrame(tick);
    };
    const screenOf = () => document.querySelector('[data-testid="pb-screen"]');
    requestAnimationFrame(tick);
  });
}
const seen = (page: Page) => page.evaluate(() => (window as unknown as { __cl: Record<string, number | string | boolean> }).__cl);

/** Her finisher, from her turn (a creature to aim at, if asked). */
async function collapse(page: Page) {
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-skill-soukyoku_rinkai').click();
  const pick = page.locator('[data-testid^="pb-target-enemy-"]').first();
  if (await pick.isVisible().catch(() => false)) await pick.click();
}

test('charged by her turns: 3, 2, 1 on her card and her skill, never usable before; READY on the fourth — glowing — with full MP or not', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?preview=party');
  const chip = page.getByTestId('pb-charge-kaos');
  for (const left of [3, 2, 1]) {
    await turnOf(page, 'kaos');
    await expect(chip).toHaveAttribute('data-left', String(left));
    await expect(chip).toHaveText(`必殺 あと${left}`);
    await expect(page.getByTestId('pb-cmd-skills')).toHaveAttribute('data-ready', 'no');
    await page.getByTestId('pb-cmd-skills').click();
    await expect(page.getByTestId('pb-cmd-skill-soukyoku_rinkai')).toBeDisabled();
    await expect(page.getByTestId('pb-cmd-skill-soukyoku_rinkai').getByTestId('pb-wait')).toHaveAttribute('data-left', String(left));
    await page.getByTestId('pb-cmd-skills').click();
    // Her MP is full the whole time: it is her turns that count.
    await expect(page.getByTestId('pb-member-kaos-mp')).toHaveAttribute('data-mp', '48');
    await page.getByTestId('pb-cmd-defend').click();
    await page.waitForTimeout(300);
  }
  await turnOf(page, 'kaos');
  await expect(chip).toHaveAttribute('data-ready', 'yes');
  await expect(chip).toHaveText('必殺 READY');
  await expect(page.getByTestId('pb-cmd-skills')).toHaveAttribute('data-ready', 'yes');
  await page.getByTestId('pb-cmd-skills').click();
  await expect(page.getByTestId('pb-cmd-skill-soukyoku_rinkai')).toBeEnabled();
  await expect(page.getByTestId('pb-cmd-skill-soukyoku_rinkai')).toHaveClass(/ready/);
  // Used: four of her turns before it again.
  await page.getByTestId('pb-cmd-skill-soukyoku_rinkai').click();
  await expect(chip).toHaveAttribute('data-left', '4', { timeout: 15_000 });
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  for (const fast of [false, true]) {
    test(`at ${fast ? '×2' : '×1'}: her cut-in (gold and purple), the circles into the core, four strikes at all three (COMBO 12), 界核崩壊 — then 魔防DOWN; she never moves`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto('/?preview=party&collapse=1&enemies=3');
      if (fast) await page.getByTestId('pb-speed').click();
      await turnOf(page, 'kaos');
      await record(page);
      await collapse(page);
      await expect(page.getByTestId('pb-collapse')).toBeVisible({ timeout: 8_000 });
      // The pictures: the gold circle, the purple, the core.
      for (const id of ['pb-collapse-gold', 'pb-collapse-violet', 'pb-collapse-core']) await expect(page.getByTestId(id)).toHaveCount(1);
      await expect(page.getByTestId('pb-collapse-gold')).toHaveAttribute('src', /kaos-circle-gold/);
      await expect(page.getByTestId('pb-collapse-violet')).toHaveAttribute('src', /kaos-circle-purple/);
      await expect(page.getByTestId('pb-collapse-core')).toHaveAttribute('src', /kaos-core/);
      await expect(page.getByTestId('pb-collapse-blast')).toHaveAttribute('src', /kaos-collapse/);
      // The gold turns one way, the purple the other.
      const turns = await page.evaluate(() =>
        ['gold', 'violet'].map((k) => getComputedStyle(document.querySelector(`[data-testid="pb-collapse-${k}"]`)!).animationName),
      );
      expect(turns).toEqual(['pb-cl-gold', 'pb-cl-violet']);
      // The white flash: once, short.
      const white = await page.getByTestId('pb-collapse-white').evaluate((el) => {
        const t = el.getAnimations()[0]?.effect?.getTiming();
        return { ms: Number(t?.duration ?? 0), times: Number(t?.iterations ?? 0) };
      });
      expect(white).toEqual({ ms: 100, times: 1 });
      // COMBO: four on each of three.
      await expect(page.getByTestId('pb-combo')).toContainText('12', { timeout: 8_000 });
      await expect(page.getByTestId('pb-collapse')).toHaveCount(0, { timeout: 10_000 });
      const c = (await seen(page)) as Record<string, number | string | boolean>;
      expect(c.theme).toBe('collapse');
      // After her cut-in, never under it; three pulses before the collapse, the blast and cracks and shards at it.
      expect(c.on as number).toBeGreaterThanOrEqual((c.cutOff as number) - 50);
      expect(c.waves).toBe(3);
      expect(c.shards).toBeGreaterThanOrEqual(12);
      expect(c.cracks).toBe(c.blast);
      // 魔防DOWN said on them as the afterglow fades — and only then on the plate.
      expect(c.said).toBeDefined();
      expect((c.badge as number) - (c.on as number)).toBeGreaterThan(fast ? 900 : 1700);
      expect(c.badgeText).toBe('魔防DOWN 残り3');
      // She stays where she is (her wings open behind her).
      expect(c.kaosMoved).toBe(false);
      // Its length on screen, from her cut-in's end to the last of it: ×2 the quicker, neither too short to see.
      const ms = (c.off as number) - (c.on as number);
      if (fast) expect(ms).toBeLessThan(3600);
      else expect(ms).toBeGreaterThan(2400);
    });
  }

  test('a fight won by it is seen through: the collapse whole, each falling as it lands, a breath — then 「勝利！」, nothing pressable meanwhile', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto('/?preview=party&collapse=1&weak=1&enemies=2');
    await turnOf(page, 'kaos');
    await record(page);
    await collapse(page);
    await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 20_000 });
    const c = (await seen(page)) as Record<string, number | boolean>;
    expect(c.pressable).toBe(false);
    expect(c.on).toBeLessThan(c.result as number);
    expect(c.off).toBeDefined();
    expect((c.result as number) - (c.off as number)).toBeGreaterThanOrEqual(300);
  });
});
