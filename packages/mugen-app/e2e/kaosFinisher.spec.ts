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
    document.addEventListener('animationstart', (e) => {
      if (e.animationName === 'pb-cl-white') w.__cl.flashStart ??= Math.round(performance.now() - t0);
    });
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
      // (It is 80ms: on a slow frame it can be over between two looks — its start is heard of too.)
      if (c.flashStart !== undefined && c.flashAt === undefined) {
        c.flashAt = c.flashStart;
        c.filmAtFlash = film ? film.currentTime : -1;
      }
      // Held with the blow (paused short of its end — it is 3.47s long); and before it, held at the point (the stillness).
      if (film && c.filmOn !== undefined && film.paused && film.currentTime > 2 && film.currentTime < 3.2) c.filmHeld = true;
      if (film && c.filmOn !== undefined && c.flashAt === undefined && film.paused && film.currentTime > 2 && c.stillAt === undefined) {
        c.stillAt = now;
        c.stillFilm = film.currentTime;
      }
      // Results (v2 §4–6, §33): HP, the numbers, COMBO and the line — none before the release.
      const hp = [...document.querySelectorAll('.pb-foe[data-hp]')].map((e) => e.getAttribute('data-hp')).join(',');
      if (c.on !== undefined) {
        c.hp0 ??= hp;
        if (hp !== c.hp0) c.hpAt ??= now;
      }
      if (document.querySelector('[data-testid="pb-float"], [data-testid="pb-float-cut"], [data-testid="pb-collapse-num"]')) c.numberAt ??= now;
      // Over each one's head, its own number (2026-10-30 F-5).
      const nums = [...document.querySelectorAll('[data-testid="pb-collapse-num"]')];
      if (nums.length > ((c.nums as number) ?? 0)) {
        c.nums = nums.length;
        c.numsText = nums.map((n) => n.textContent).join(',');
      }
      // The stillness (F-2): nothing running on the screen but the collapse's own layers.
      if (c.stillAt !== undefined && c.flashAt === undefined && now - (c.stillAt as number) > 40 && c.stillRunning === undefined) {
        c.stillRunning = (document.querySelector('[data-testid="pb-screen"]') as HTMLElement)
          .getAnimations({ subtree: true })
          .filter((a) => {
            const on = (a.effect as KeyframeEffect).target as HTMLElement;
            // (the camera excepted: it holds still on them, and is never held — or its jolt would come late)
            return a.playState === 'running' && !on.dataset.shakeLayer && !on.closest('.pb-collapse, .pb-cl-flash, .pb-cl-front, .pb-cl-back');
          }).length;
      }
      // The creatures drawn toward the point (F-3), and Kaos lit at her edges in the dark (F-4).
      for (const img of document.querySelectorAll<HTMLElement>('.pb-foe > img')) {
        // (on `transform`, as its reel is — the screen's shake owns `translate`)
        const t = getComputedStyle(img).transform;
        const m = t && t !== 'none' ? new DOMMatrixReadOnly(t) : null;
        c.drag = Math.max((c.drag as number) ?? 0, m ? Math.hypot(m.m41, m.m42) : 0);
      }
      if (c.filmOn !== undefined && c.flashAt === undefined) {
        const fig = document.querySelector<HTMLElement>('[data-testid="pb-figure-kaos"]');
        const kimg = fig?.querySelector('img');
        if (fig && kimg && getComputedStyle(kimg).filter.includes('drop-shadow') && Number(getComputedStyle(fig).zIndex) > 45) c.kaosLit = true;
      }
      if ((document.querySelector('[data-testid="pb-combo"]')?.textContent ?? '').includes('12')) c.comboAt ??= now;
      const log = document.querySelector('[data-testid="pb-log"]')?.textContent ?? '';
      if (c.on !== undefined && log.includes('《双極臨界》') && !log.includes('ダメージ')) c.logUsed ??= now;
      if (log.includes('ダメージ')) c.logDamageAt ??= now;
      if (log.includes('魔法防御')) c.logMdownAt ??= now;
      if (document.querySelector('[data-testid="pb-focus-lines"]')) c.focusLines = true;
      // What is pulled in: a mote's way to the point, and each circle dragged toward the creatures.
      const box = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
      const core = box('[data-testid="pb-collapse-core"]');
      const mote = document.querySelectorAll<HTMLElement>('[data-testid="pb-collapse-dust"]')[5];
      if (core && mote && Number(getComputedStyle(mote).opacity) > 0.3) {
        const m = mote.getBoundingClientRect();
        const d = Math.hypot(m.x + m.width / 2 - (core.x + core.width / 2), m.y + m.height / 2 - (core.y + core.height / 2));
        c.moteFar = Math.max((c.moteFar as number) ?? 0, d);
        c.moteNear = Math.min((c.moteNear as number) ?? 9999, d);
      }
      for (const k of ['white', 'violet']) {
        const r = box(`[data-testid="pb-collapse-ringbox-${k}"]`);
        const img = document.querySelector(`[data-testid="pb-collapse-ring-${k}"]`);
        if (!r || !img || Number(getComputedStyle(img).opacity) < 0.3) continue;
        const x = r.x + r.width / 2;
        c[`ring0-${k}`] ??= x;
        c[`ringMoved-${k}`] = Math.max((c[`ringMoved-${k}`] as number) ?? 0, Math.abs(x - (c[`ring0-${k}`] as number)));
      }
      if (core && c.flashAt === undefined && Number(getComputedStyle(document.querySelector('[data-testid="pb-collapse-core"]')!).opacity) > 0.5) {
        c.coreBig = Math.max((c.coreBig as number) ?? 0, core.width);
        c.coreLast = core.width;
      }
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
        // Her circles over no one else in the party (v2 §14): each drawn ring clear of every other figure's body.
        if (c.ringsClear === undefined) {
          const bodies = [...document.querySelectorAll<HTMLElement>('[data-testid^="pb-figure-"] > img')]
            .filter((el) => !el.closest('[data-testid="pb-figure-kaos"]'))
            .map((el) => el.getBoundingClientRect())
            .map((r) => ({ l: r.left + r.width * 0.25, r: r.right - r.width * 0.25, t: r.top + r.height * 0.1, b: r.bottom }));
          c.ringsClear = ['white', 'violet'].every((k) => {
            const r = document.querySelector(`[data-testid="pb-collapse-ringbox-${k}"]`)!.getBoundingClientRect();
            const x = r.x + r.width / 2;
            const y = r.y + r.height / 2;
            const rad = (r.height / 2) * 0.8;
            return bodies.every((o) => Math.hypot(x - Math.max(o.l, Math.min(x, o.r)), y - Math.max(o.t, Math.min(y, o.b))) >= rad);
          });
        }
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
      c.beams = Math.max((c.beams as number) ?? 0, document.querySelectorAll('.pb-cl-beam').length);
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
    test(`at ${fast ? '×2' : '×1'}: her cut-in, her circles beside her and into the seal, the pull, the stillness, 界核崩壊 — and only then four strikes at all three (COMBO 12), then 魔防DOWN; she never moves`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto('/?preview=party&collapse=1&enemies=3');
      if (fast) await page.getByTestId('pb-speed').click();
      await turnOf(page, 'kaos');
      await record(page);
      await collapse(page);
      await expect(page.getByTestId('pb-collapse')).toBeVisible({ timeout: 8_000 });
      // The pictures: the white-gold circle, the black-purple, the core.
      for (const id of ['pb-collapse-ring-white', 'pb-collapse-ring-violet', 'pb-collapse-seal', 'pb-collapse-film', 'pb-collapse-void', 'pb-collapse-core', 'pb-collapse-blaze', 'pb-collapse-cracks'])
        await expect(page.getByTestId(id)).toHaveCount(1);
      await expect(page.getByTestId('pb-collapse-ring-white')).toHaveAttribute('src', /kaos-circle-gold/);
      await expect(page.getByTestId('pb-collapse-ring-violet')).toHaveAttribute('src', /kaos-circle-purple/);
      await expect(page.getByTestId('pb-collapse-seal')).toHaveAttribute('src', /kaos-seal/);
      await expect(page.getByTestId('pb-collapse-film')).toHaveAttribute('src', /kaos-collapse-video.*\.webm/);
      await expect(page.getByTestId('pb-collapse-residue')).toHaveAttribute('src', /kaos-residue/);
      // What is really pulled in (v2 §9–10): motes, thin light and crystal shards; warped space closing, twice — no picture turning.
      await expect(page.getByTestId('pb-collapse-dust')).toHaveCount(32);
      await expect(page.getByTestId('pb-collapse-streak')).toHaveCount(8);
      await expect(page.getByTestId('pb-collapse-crystal')).toHaveCount(10);
      await expect(page.getByTestId('pb-collapse-warp')).toHaveCount(2);
      await expect(page.locator('[data-testid="pb-collapse-pull"], [data-testid="pb-collapse-gold"]')).toHaveCount(0);
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
      // No streak straight across (v2 §25), no manga focus lines (§23); her light runs in as motes.
      expect(c.beams).toBe(0);
      expect(c.focusLines).toBeUndefined();
      expect(c.motes).toBeGreaterThanOrEqual(16);
      // Her circles beside her and over no one else; pulled toward the creatures before they are gone.
      expect(c.ringsClear).toBe(true);
      expect(c['ringMoved-white'] as number).toBeGreaterThan(30);
      expect(c['ringMoved-violet'] as number).toBeGreaterThan(30);
      // Drawn in, not turned: a mote from far out to the point; the core grown, then crushed to a point.
      expect(c.moteNear as number).toBeLessThan((c.moteFar as number) * 0.3);
      expect(c.coreLast as number).toBeLessThan((c.coreBig as number) * 0.25);
      // The stillness (v2 §19–21): the film held at the point before the release — 0.12s or so at ×1, 0.08s at ×2.
      expect(c.stillFilm as number).toBeGreaterThan(2.25);
      expect(c.stillFilm as number).toBeLessThan(2.42);
      expect((c.flashAt as number) - (c.stillAt as number)).toBeGreaterThanOrEqual(fast ? 120 : 150);
      // …and the whole screen still with it (F-2), the creatures drawn toward the point before it (F-3), Kaos's outline
      // there in the dark (F-4).
      expect(c.stillRunning).toBe(0);
      expect(c.drag as number).toBeGreaterThan(15);
      expect(c.kaosLit).toBe(true);
      // Each one's own number over it (F-5): three struck, three numbers, 4+5+5+9 each.
      expect(c.nums).toBe(3);
      expect(c.numsText).toBe('23,23,23');
      // Every result with the release (v2 §33): HP, the numbers, COMBO, its line — none before the white flash; before
      // it the line says only that she used it; 魔防DOWN's line after, in the afterglow.
      for (const k of ['hpAt', 'numberAt', 'comboAt', 'logDamageAt']) expect(c[k] as number, k).toBeGreaterThanOrEqual((c.flashAt as number) - 34);
      for (const k of ['hpAt', 'numberAt', 'comboAt', 'logDamageAt']) expect(c[k] as number, k).toBeLessThanOrEqual((c.flashAt as number) + 120);
      expect(c.logUsed as number).toBeLessThan(c.flashAt as number);
      // The lines one after another, never at once (F-5): the release's, then 魔防DOWN's once the afterglow is over.
      expect(c.logMdownAt as number).toBeGreaterThan((c.flashAt as number) + (fast ? 300 : 650));
      // After her cut-in, never under it.
      expect(c.on as number).toBeGreaterThanOrEqual((c.cutOff as number) - 50);
      // 魔防DOWN said on them in the afterglow — and only then on the plate.
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
