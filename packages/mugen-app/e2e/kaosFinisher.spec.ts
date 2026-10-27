import { expect, test, type Page } from '@playwright/test';

/**
 * ケイオス 《双極臨界 → 界核崩壊》 in the party fight (作者 2026-10-26「ケイオス必殺技 正式実装指示書」): charged by her
 * turns (3 → 2 → 1 → READY, never on her first turn, MP or not), her own gold-and-purple cut-in, the two
 * circles meeting into the core over them, four strikes at all of them (COMBO each), 界核崩壊 — the blast, a
 * white flash (動画＋PNG統合: her circles' light into the bipolar seal, the seal into the keyed suction film — the
 * pull, the crush, the stillness, the release held with the blow — residue after), 魔防DOWN; the same at ×2, quicker; and a fight
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
    w.__cl = { kaosMoved: false, pressable: false };
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
      // The film: when it plays, where it stands at the white flash (its release), whether it is held there.
      const film = document.querySelector<HTMLVideoElement>('[data-testid="pb-collapse-film"]');
      if (film && !film.paused && film.currentTime > 0) c.filmOn ??= now;
      const flash = document.querySelector('[data-testid="pb-collapse-white"]');
      if (flash && Number(getComputedStyle(flash).opacity) > 0.2 && c.flashAt === undefined) {
        c.flashAt = now;
        c.filmAtFlash = film ? film.currentTime : -1;
      }
      // Held with the blow (paused short of its end — it is 3.47s long).
      if (film && c.filmOn !== undefined && film.paused && film.currentTime > 2 && film.currentTime < 3.2) c.filmHeld = true;
      if (document.querySelector('[data-testid="pb-float-mdown"]')) c.said ??= now;
      const badge = document.querySelector('[data-testid="pb-mdown-badge"]');
      if (badge) {
        c.badge ??= now;
        c.badgeText ??= badge.textContent ?? '';
      }
      // Her two circles (魔法陣ブラッシュアップ): when each is clearly there, both together, the core's birth, all gone.
      const op = (id: string) => {
        const el = document.querySelector(`[data-testid="${id}"]`);
        return el ? Number(getComputedStyle(el).opacity) : 0;
      };
      const wo = op('pb-collapse-ring-white');
      const vo = op('pb-collapse-ring-violet');
      const so = op('pb-collapse-seal');
      if (wo > 0.6) c.whiteOn ??= now;
      if (vo > 0.6) c.violetOn ??= now;
      if (wo > 0.6 && vo > 0.6) {
        c.bothFrom ??= now;
        c.bothTo = now;
      }
      if (so > 0.3 && c.sealOn === undefined) {
        c.sealOn = now;
        c.ringsAtSeal = Math.max(wo, vo);
      }
      if (c.whiteOn !== undefined && wo < 0.05 && vo < 0.05) c.ringsGone ??= now;
      const eyes = document.querySelectorAll<HTMLElement>('[data-testid="pb-kaos-eyes"] .pb-eye');
      if (eyes.length === 2 && Number(getComputedStyle(eyes[0]).opacity) > 0.5) {
        c.eyesLit ??= now;
        c.goldLeftOfBlue ??= eyes[0].classList.contains('gold') && eyes[0].getBoundingClientRect().x < eyes[1].getBoundingClientRect().x;
      }
      c.beams = Math.max((c.beams as number) ?? 0, document.querySelectorAll('[data-testid="pb-collapse-beam"]').length);
      c.motes = Math.max((c.motes as number) ?? 0, document.querySelectorAll('[data-testid="pb-collapse-mote"]').length);
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
      // The pictures: the white-gold circle, the black-purple, the core.
      for (const id of ['pb-collapse-ring-white', 'pb-collapse-ring-violet', 'pb-collapse-seal', 'pb-collapse-film', 'pb-collapse-gold', 'pb-collapse-void']) await expect(page.getByTestId(id)).toHaveCount(1);
      await expect(page.getByTestId('pb-collapse-ring-white')).toHaveAttribute('src', /kaos-circle-gold/);
      await expect(page.getByTestId('pb-collapse-ring-violet')).toHaveAttribute('src', /kaos-circle-purple/);
      await expect(page.getByTestId('pb-collapse-seal')).toHaveAttribute('src', /kaos-seal/);
      await expect(page.getByTestId('pb-collapse-film')).toHaveAttribute('src', /kaos-collapse-video.*\.webm/);
      await expect(page.getByTestId('pb-collapse-residue')).toHaveAttribute('src', /kaos-residue/);
      await expect(page.getByTestId('pb-collapse-pull')).toHaveCount(2);
      // The film keyed: a WebM with its own alpha, on the field (moving with the camera), never a black square.
      expect(await page.getByTestId('pb-collapse-film').evaluate((v) => (v as HTMLVideoElement).muted && !!v.closest('[data-shake-layer="field"]'))).toBe(true);
      // The white turns clockwise, the black-purple the other way.
      const turns = await page.evaluate(() =>
        ['white', 'violet'].map((k) => getComputedStyle(document.querySelector(`[data-testid="pb-collapse-ring-${k}"]`)!).animationName.split(',')[0].trim()),
      );
      expect(turns).toEqual(['pb-cl-spin-cw', 'pb-cl-spin-ccw']);
      // Either side of her: the white on her white wing's side (the screen's left), the black-purple on the other.
      const sides = await page.evaluate(() => {
        const x = (sel: string) => {
          const r = document.querySelector(sel)!.getBoundingClientRect();
          return r.x + r.width / 2;
        };
        return { white: x('[data-testid="pb-collapse-ring-white"]'), kaos: x('[data-testid="pb-figure-kaos"] > img'), violet: x('[data-testid="pb-collapse-ring-violet"]') };
      });
      expect(sides.white).toBeLessThan(sides.kaos);
      expect(sides.violet).toBeGreaterThan(sides.kaos);
      // The white flash: once, short.
      const white = await page.getByTestId('pb-collapse-white').evaluate((el) => {
        const t = el.getAnimations()[0]?.effect?.getTiming();
        return { ms: Number(t?.duration ?? 0), times: Number(t?.iterations ?? 0) };
      });
      expect(white).toEqual({ ms: 80, times: 1 });
      // COMBO: four on each of three.
      await expect(page.getByTestId('pb-combo')).toContainText('12', { timeout: 8_000 });
      await expect(page.getByTestId('pb-collapse')).toHaveCount(0, { timeout: 10_000 });
      const c = (await seen(page)) as Record<string, number | string | boolean>;
      expect(c.theme).toBe('collapse');
      // The circles (魔法陣ブラッシュアップ §1–13): the white seen alone first, then the black-purple, the two there
      // together, her eyes lit with them; the core born while they are still there, drinking them (light running
      // from each into it); then they are gone — the white first seen well before, never a flash.
      expect(c.violetOn as number).toBeGreaterThan(c.whiteOn as number);
      expect((c.violetOn as number) - (c.whiteOn as number)).toBeGreaterThanOrEqual(fast ? 180 : 250);
      expect((c.bothTo as number) - (c.bothFrom as number)).toBeGreaterThanOrEqual(fast ? 300 : 400);
      expect(c.eyesLit as number).toBeGreaterThanOrEqual((c.bothFrom as number) - 120);
      expect(c.goldLeftOfBlue).toBe(true);
      expect(c.sealOn as number).toBeGreaterThan(c.bothFrom as number);
      expect(c.ringsAtSeal as number).toBeGreaterThan(0.5);
      expect(c.ringsGone as number).toBeGreaterThan(c.sealOn as number);
      // The seal falls into the film: the film plays once the circles' light is in it, the release at its own moment.
      expect(c.filmOn as number).toBeGreaterThan(c.sealOn as number);
      expect(c.filmAtFlash as number).toBeGreaterThan(2.1);
      expect(c.filmAtFlash as number).toBeLessThan(2.6);
      expect(c.filmHeld).toBe(true);
      expect((c.ringsGone as number) - (c.whiteOn as number)).toBeGreaterThanOrEqual(fast ? 800 : 1100);
      expect(c.beams).toBe(2);
      expect(c.motes).toBeGreaterThanOrEqual(16);
      // After her cut-in, never under it.
      expect(c.on as number).toBeGreaterThanOrEqual((c.cutOff as number) - 50);
      // 魔防DOWN said on them as the afterglow fades — and only then on the plate.
      expect(c.said).toBeDefined();
      expect((c.badge as number) - (c.on as number)).toBeGreaterThan(fast ? 900 : 1700);
      expect(c.badgeText).toBe('魔防DOWN 残り3');
      // She stays where she is (her wings open behind her).
      expect(c.kaosMoved).toBe(false);
      // Its length on screen, from her cut-in's end to the last of it: ×2 the quicker, neither too short to see.
      const ms = (c.off as number) - (c.on as number);
      if (fast) expect(ms).toBeLessThan(5800);
      else expect(ms).toBeGreaterThan(4000);
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
