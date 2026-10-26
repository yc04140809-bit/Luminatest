import { test, expect, type Page } from '@playwright/test';
import { readyToAct } from './battle';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * THE CAMERA, EACH BLOW, AND THE FINALE'S 間 (作者「無料強化メモ②③」「CAMERA KICK」
 * 「CAMERA DIRECTOR」2026-10-17; src/ui/fx/camera.ts, src/ui/battle/partyFx.ts,
 * content/story/chapter1Finale.ts, src/platform/ambience.ts).
 *
 * The camera's moves go through the Web Animations API on `transform` (the
 * shake keeps `translate`), so this records those calls from before the page
 * loads: who moved, which way, and that it came back. The flashes are CSS —
 * looked for where the blow lands. The suite runs with less motion
 * (playwright.config `reducedMotion`): the camera is off then (the last
 * camera test holds that); the flashes, the numbers and the finale's cues are
 * there either way.
 */

type Move = { who: string; ms: number; xs: number[]; scales: number[] };

async function recordCamera(page: Page) {
  await page.addInitScript(() => {
    const log: { who: string; ms: number; xs: number[]; scales: number[]; ops: number[] }[] = [];
    (window as unknown as { __camera: typeof log }).__camera = log;
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const list = Array.isArray(frames) ? frames : [];
      const el = this as HTMLElement;
      if (list.some((f) => f && typeof f === 'object' && 'transform' in f)) {
        const t = list.map((f) => String((f as { transform?: string }).transform ?? ''));
        log.push({
          // A layer of the world, or (the one struck reeling) its drawing — anything else would be the HUD.
          who: el.dataset.shakeLayer ?? (el.closest('[data-shake-layer]') && el.tagName === 'IMG' ? 'drawing' : el.className || el.tagName),
          ms: typeof options === 'object' ? Number(options?.duration ?? 0) : Number(options ?? 0),
          xs: t.map((s) => Number(/translate\((-?[\d.]+)px/.exec(s)?.[1] ?? 0) + Number(/translateX\((-?[\d.]+)%/.exec(s)?.[1] ?? 0)),
          scales: t.map((s) => Number(/scale\(([\d.]+)\)/.exec(s)?.[1] ?? 1)),
          ops: list.map((f) => Number((f as { opacity?: number }).opacity ?? 1)),
        });
      }
      return animate.call(this, frames, options);
    };
  });
}
const everything = (page: Page) => page.evaluate(() => (window as unknown as { __camera: Move[] }).__camera.slice());
/** The camera's own: the moves of the layers. */
const moves = async (page: Page) => (await everything(page)).filter((m) => m.who === 'field' || m.who === 'backdrop');
/** Nothing moved but the world (its layers, a drawing reeling) — never the HUD. */
const onlyTheWorld = async (page: Page) => (await everything(page)).every((m) => ['field', 'backdrop', 'drawing'].includes(m.who));
const clear = (page: Page) => page.evaluate(() => void ((window as unknown as { __camera: Move[] }).__camera.length = 0));
const atRest = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).transform === 'none' && el.getAnimations().length === 0);

/** To this member's turn: each other member defends. */
async function turnOf(page: Page, id: string) {
  for (let i = 0; i < 8; i++) {
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'no', { timeout: 15_000 });
    if ((await page.getByTestId('pb-screen').getAttribute('data-actor')) === id) return;
    await page.getByTestId('pb-cmd-defend').click();
  }
  throw new Error(`never ${id}'s turn`);
}

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('CAMERA KICK: the hero\'s blow kicks the field toward the creature (left) and back; the painting half as far; the HUD never moves', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&footing=40');
    await turnOf(page, 'hero');
    await clear(page);
    await page.getByTestId('pb-cmd-attack').click();
    await expect.poll(async () => (await moves(page)).length).toBeGreaterThanOrEqual(2);
    const got = await moves(page);
    expect(new Set(got.map((m) => m.who))).toEqual(new Set(['field', 'backdrop']));
    expect(await onlyTheWorld(page)).toBe(true);
    const field = got.find((m) => m.who === 'field')!;
    const bg = got.find((m) => m.who === 'backdrop')!;
    // A jolt one way (left), SMALL (1.6% of the width — the reference video's), fast (≤150ms — his
    // tempo is sharp), a little past the other way, back to rest. The whole picture: the painting as far.
    expect(Math.min(...field.xs)).toBeLessThanOrEqual(-1.5);
    expect(Math.min(...field.xs)).toBeGreaterThanOrEqual(-2);
    expect(Math.max(...field.xs)).toBeGreaterThan(0);
    expect(Math.max(...field.xs)).toBeLessThan(0.5);
    expect(field.ms).toBeLessThanOrEqual(150);
    expect(field.xs[field.xs.length - 1]).toBe(0);
    expect(Math.min(...bg.xs)).toBe(Math.min(...field.xs));
    // The painting grows while it moves, never shrinks.
    expect(Math.min(...bg.scales)).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(500);
    expect(await atRest(page, '.pb-field')).toBe(true);
    expect(await atRest(page, '.pb-bg')).toBe(true);
  });

  test('重撃・豪断 (a cut-in move — 作者 2026-10-23): its camera FOLLOWS it — one TRACK, leaning in on him, swung at the creature and held, jolted at the blow, home again; a BREAK leaves it be', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&hurt=1&footing=4');
    await turnOf(page, 'grave');
    await clear(page);
    await page.getByTestId('pb-cmd-skills').click();
    await page.getByTestId('pb-cmd-tech-goudan').click();
    await expect(page.getByTestId('pb-break-flash')).toBeVisible();
    await expect.poll(async () => (await moves(page)).filter((m) => m.who === 'field').length).toBeGreaterThanOrEqual(1);
    const field = (await moves(page)).filter((m) => m.who === 'field');
    // One move only (the BREAK's focus would cut it short, so it is not played).
    expect(field).toHaveLength(1);
    const [track] = field;
    // A lean toward him first (he stands near the middle, so hardly sideways — nearer, though), then
    // WHIPPED at the creature on the left (the picture right) by LARGE (14%, a little past it at most),
    // nearer (1.13, punched to 1.18 at the blow) — and home (実機 2026-10-24: 「‼️って感じではない」).
    expect(track.xs[1]).toBeLessThan(Math.max(...track.xs));
    expect(track.scales[1]).toBeGreaterThan(1);
    expect(Math.max(...track.xs)).toBeGreaterThan(5);
    expect(Math.max(...track.xs)).toBeLessThanOrEqual(14 * 1.16 + 0.1);
    expect(Math.max(...track.scales)).toBeGreaterThan(1.12);
    expect(Math.max(...track.scales)).toBeLessThanOrEqual(1.18);
    expect(track.xs[track.xs.length - 1]).toBe(0);
    expect(track.scales[track.scales.length - 1]).toBe(1);
    await page.waitForTimeout(1400);
    expect(await atRest(page, '.pb-field')).toBe(true);
  });

  test('ケイオスの魔法 (a cut-in move — 作者 2026-10-23): her cut-in, then the camera FOLLOWS the spell — leaning in on her, swung at the creature (the picture right) and held, home again', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party&footing=40');
    await turnOf(page, 'kaos');
    await clear(page);
    await page.getByTestId('pb-cmd-magic').click();
    await page.locator('[data-testid^="pb-magic-"]:not([disabled])').first().click();
    // Her cut-in first (the same as the ordinary fight's), the commands held while it plays.
    await expect(page.getByTestId('pb-cinematic')).toBeVisible();
    await expect(page.getByTestId('pb-commands')).toHaveAttribute('data-locked', 'yes');
    await expect(page.getByTestId('pb-figure-kaos').getByTestId('pb-cast')).toHaveCount(1, { timeout: 10_000 });
    await expect.poll(async () => (await moves(page)).filter((m) => m.who === 'field').length).toBeGreaterThanOrEqual(1);
    const track = (await moves(page)).find((m) => m.who === 'field')!;
    // MEDIUM: whipped up to 11% at the creature (a little past), nearer (1.10, 1.14 at the blow); a lean
    // toward her first; home at the end.
    expect(Math.min(...track.xs)).toBeLessThan(0);
    expect(Math.max(...track.xs)).toBeGreaterThan(4);
    expect(Math.max(...track.xs)).toBeLessThanOrEqual(11 * 1.16 + 0.1);
    expect(Math.max(...track.scales)).toBeGreaterThan(1.08);
    expect(Math.max(...track.scales)).toBeLessThanOrEqual(1.14);
    expect(track.xs[track.xs.length - 1]).toBe(0);
    expect(await onlyTheWorld(page)).toBe(true);
    await page.waitForTimeout(1400);
    expect(await atRest(page, '.pb-field')).toBe(true);
  });

  test('零閃・天衝 (TIGS CAMERA KICK): a beat of stillness, then the picture kicks once (left, MEDIUM) and comes back', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 640, height: 300 });
    await page.goto('/?preview=finale&from=FORM2_WON');
    const on = page.getByTestId('finale-scene');
    for (let i = 0; i < 20 && (await on.getAttribute('data-scene')) !== 'STOPPED'; i++) {
      const key = `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`;
      await clear(page);
      await page.getByTestId('finale-next').click();
      await expect.poll(async () => `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`).not.toBe(key);
    }
    await expect(on).toHaveAttribute('data-scene', 'STOPPED');
    await expect.poll(async () => (await moves(page)).length).toBeGreaterThanOrEqual(1);
    const got = await moves(page);
    expect(got).toHaveLength(1);
    const [kick] = got;
    expect(kick.who).toBe('backdrop');
    // MEDIUM is 2.2% of the width; a KICK moves the painting as far as the field (the whole picture).
    expect(Math.min(...kick.xs)).toBeLessThanOrEqual(-2);
    expect(Math.min(...kick.xs)).toBeGreaterThanOrEqual(-2.5);
    expect(Math.max(...kick.xs)).toBeLessThan(0.6);
    expect(kick.ms).toBeLessThanOrEqual(220);
    // It grows just enough to hide its edges, never shrinks.
    expect(Math.min(...kick.scales)).toBeGreaterThanOrEqual(1);
    // Back at rest once the cut has landed, held and jolted (its shake, on `translate`, is not the camera's).
    await page.waitForTimeout(1200);
    expect(await atRest(page, '.finale-stage')).toBe(true);
  });

  test('the ordinary fight too (実機 2026-10-23: none before ヴァルシール): his blow landing jolts the whole picture left, as the reference video does; the HUD never moves', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=battle');
    await expect(page.getByTestId('bp-attack')).toBeEnabled({ timeout: 15_000 });
    await clear(page);
    await page.getByTestId('bp-attack').click();
    await expect.poll(async () => (await moves(page)).length, { timeout: 5_000 }).toBeGreaterThanOrEqual(1);
    const [kick] = await moves(page);
    // The stage itself (backdrop and everyone on it) — marked as a painting, so it grows to hide its edges.
    expect(kick.who).toBe('backdrop');
    expect(Math.min(...kick.xs)).toBeLessThanOrEqual(-1.5);
    expect(Math.min(...kick.xs)).toBeGreaterThanOrEqual(-2);
    expect(Math.min(...kick.scales)).toBeGreaterThanOrEqual(1);
    expect(kick.xs[kick.xs.length - 1]).toBe(0);
    expect(await onlyTheWorld(page)).toBe(true);
  });

  test('the ordinary fight\'s 《瞬断》 (a cut-in move): after its cut-in the camera FOLLOWS the swing — one TRACK at the creature (the picture right), home again — not a KICK', async ({ page }) => {
    test.setTimeout(120_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    // The game's own forest fight (the preview has no skill tray).
    await page.goto('/');
    await page.evaluate(async () => {
      for (const d of (await indexedDB.databases?.()) ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    });
    await page.reload();
    await page.getByTestId('start-button').click();
    await throughTheOpening(page);
    await page.getByTestId('naming-default').click();
    await pastTheIntro(page);
    await page.getByTestId('explore-button').click();
    await page.getByTestId('forest-button').click();
    await page.getByTestId('encounter-button').click();
    await readyToAct(page);
    await clear(page);
    await page.getByTestId('bp-skill').click();
    await page.getByTestId('skill-shundan').click();
    await expect(page.getByTestId('bp-cinematic')).toBeVisible();
    await expect.poll(async () => (await moves(page)).length, { timeout: 8_000 }).toBeGreaterThanOrEqual(1);
    const [track] = await moves(page);
    expect(track.who).toBe('backdrop');
    // The stage as a painting: half the swing (MEDIUM, him and it close together: 4.4% and a little past → 2.6% at most), toward the creature on the left.
    expect(Math.max(...track.xs)).toBeGreaterThan(1);
    expect(Math.max(...track.xs)).toBeLessThanOrEqual(4);
    expect(Math.max(...track.scales)).toBeGreaterThan(1);
    expect(track.xs[track.xs.length - 1]).toBe(0);
    expect(await onlyTheWorld(page)).toBe(true);
  });

  test('HE STEPS IN (作者 2026-10-24 §23): his swing takes him to the front of ヴァルシール — never into it — and home; Grave and Kaos stay where they are', async ({ page }) => {
    test.setTimeout(60_000);
    await recordCamera(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/?preview=party');
    await turnOf(page, 'hero');
    const hero = await page.getByTestId('pb-figure-hero').locator('img').boundingBox();
    const giant = await page.getByTestId('pb-foe').locator('img').boundingBox();
    await clear(page);
    await page.getByTestId('pb-cmd-attack').click();
    await expect.poll(async () => (await everything(page)).filter((m) => m.who === 'drawing' && Math.min(...m.xs) < -40).length).toBeGreaterThanOrEqual(1);
    const step = (await everything(page)).find((m) => m.who === 'drawing' && Math.min(...m.xs) < -40)!;
    const far = Math.min(...step.xs);
    // To the creature (left), stopping at its front — its drawing's left part never reached.
    expect(hero!.x + far).toBeGreaterThan(giant!.x + giant!.width * 0.5);
    // Home again, and not a jump: there and back takes a while.
    expect(step.xs[step.xs.length - 1]).toBe(0);
    expect(step.ms).toBeGreaterThanOrEqual(300);
    // Grave's blow: no step.
    await turnOf(page, 'grave');
    await clear(page);
    await page.getByTestId('pb-cmd-attack').click();
    await page.waitForTimeout(800);
    expect((await everything(page)).filter((m) => m.who === 'drawing' && Math.min(...m.xs) < -40)).toHaveLength(0);
  });

  for (const fast of [false, true]) {
    test(`《彼岸花》 at ${fast ? '×2' : '×1'} (最終仕様 §3–4): back and gone first, then at ヴァルシール's front — never into it — the third stepped into, and home`, async ({ page }) => {
      test.setTimeout(60_000);
      await recordCamera(page);
      await page.setViewportSize({ width: 844, height: 390 });
      await page.goto('/?preview=party&higanbana=1&footing=40');
      if (fast) await page.getByTestId('pb-speed').click();
      await turnOf(page, 'hero');
      const hero = await page.getByTestId('pb-figure-hero').locator('img').boundingBox();
      const giant = await page.getByTestId('pb-foe').locator('img').boundingBox();
      await clear(page);
      await page.getByTestId('pb-cmd-skills').click();
      await page.getByTestId('pb-cmd-skill-higanbana').click();
      // The one trace of him while he is gone (仕上げ §2): a red line where he ran and his blade's glint — and
      // (ブラッシュアップ §1) his shadow before the creature for a blink. (Read together: at ×2 the flash is
      // short, and they are gone the same moment.)
      await expect
        .poll(
          () =>
            page.evaluate(() => ['pb-trace', 'pb-glint', 'pb-ghost'].every((id) => !!document.querySelector(`[data-testid="${id}"]`))),
          { timeout: 10_000, intervals: [16] },
        )
        .toBe(true);
      await expect.poll(async () => (await everything(page)).filter((m) => m.who === 'drawing' && Math.min(...m.xs) < -40).length, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
      const step = (await everything(page)).find((m) => m.who === 'drawing' && Math.min(...m.xs) < -40)!;
      const there = step.xs.findIndex((x) => x < -40);
      // Back first (away from it, to the right), fading out — gone before he is there.
      expect(Math.max(...step.xs.slice(0, there))).toBeGreaterThan(10);
      expect(Math.min(...step.ops.slice(0, there + 1))).toBe(0);
      // Seen again only once he is there.
      const seen = step.ops.indexOf(1, there);
      expect(seen).toBeGreaterThan(0);
      expect(step.xs[seen]).toBe(step.xs[there]);
      // There: the giant's front, never its drawing's left part — the third stepped into, further, still in front.
      const far = Math.min(...step.xs);
      expect(far).toBeLessThan(step.xs[there]);
      expect(hero!.x + far).toBeGreaterThan(giant!.x + giant!.width * 0.5);
      // Home, seen, at the end — a step, not a jump (×2 included).
      expect(step.xs[step.xs.length - 1]).toBe(0);
      expect(step.ops[step.ops.length - 1]).toBe(1);
      expect(step.ms).toBeGreaterThanOrEqual(fast ? 700 : 1400);
      await expect(page.getByTestId('pb-figure-hero')).toHaveAttribute('data-lunge', 'deep');
      // The ground split under it, and the lilies.
      await expect(page.getByTestId('pb-crack')).toHaveCount(1, { timeout: 5_000 });
      await expect(page.getByTestId('pb-bloom-lily')).toHaveCount(5);
      // The petals (仕上げ §3–5; ブラッシュアップ §2; 最終 §9): the author's sixteen petals, one picture, far, middle
      // and near — and the last few drifting down after the rest.
      const petals = page.getByTestId('pb-petal');
      await expect(petals).toHaveCount(58);
      const looks = await petals.evaluateAll((els) => els.map((e) => ({ pic: getComputedStyle(e).backgroundImage, at: getComputedStyle(e).backgroundPosition })));
      expect(new Set(looks.map((l) => l.pic)).size).toBe(1);
      expect(looks[0].pic).toContain('hero-higanbana-petals');
      expect(new Set(looks.map((l) => l.at)).size).toBeGreaterThanOrEqual(12);
      for (const [layer, n] of [['back', 30], ['mid', 8], ['rise', 6], ['front', 8], ['drift', 6]] as const) await expect(page.locator(`[data-testid="pb-petal"][data-layer="${layer}"]`)).toHaveCount(n);
      // The third cut's white flash (最終 §8): one, short — never longer than a tenth of a second or so.
      const white = await page.getByTestId('pb-bloom-white').evaluate((el) => {
        const a = el.getAnimations()[0];
        const t = a?.effect?.getTiming();
        return { ms: Number(t?.duration ?? 0), times: Number(t?.iterations ?? 0) };
      });
      expect(white.times).toBe(1);
      expect(white.ms).toBeLessThanOrEqual(110);
      // The trace gone once it has flashed; everything of the bloom taken away once it is over.
      await expect(page.getByTestId('pb-trace')).toHaveCount(0);
      await expect(page.getByTestId('pb-ghost')).toHaveCount(0);
      await expect(page.getByTestId('pb-bloom')).toHaveCount(0, { timeout: 8_000 });
      await expect(page.getByTestId('pb-petal')).toHaveCount(0);
      // Home again where he stood (his step over; a few px for his turn's highlight, gone now).
      // Measured once his step and the camera's last move are both over (a busy device ends the camera's move later).
      await expect.poll(() => page.getByTestId('pb-figure-hero').locator('img').evaluate((el) => el.getAnimations().length), { timeout: 8_000 }).toBe(0);
      await expect.poll(() => page.locator('[data-shake-layer="field"]').evaluate((el) => el.getAnimations().length), { timeout: 8_000 }).toBe(0);
      // Read until he is there: his figure's own move (its turn's highlight, a CSS transition) is not among
      // those animations, and on a busy device one reading could fall in the middle of it.
      await expect
        .poll(async () => Math.abs((await page.getByTestId('pb-figure-hero').locator('img').boundingBox())!.x - hero!.x), { timeout: 5_000 })
        .toBeLessThan(8);
    });
  }

  test('AUTO at ×2: the camera never piles up — everything back at rest, the fight won', async ({ page }) => {
    test.setTimeout(120_000);
    await recordCamera(page);
    await page.goto('/?preview=party&hurt=1');
    await page.getByTestId('pb-speed').click();
    await page.getByTestId('pb-auto').click();
    await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 100_000 });
    const got = await moves(page);
    expect(got.length).toBeGreaterThan(0);
    expect(await onlyTheWorld(page)).toBe(true);
    // No move longer than the longest — at ×2 they are halved: 《瞬断》's TRACK held through its three cuts
    // (作者 2026-10-24 A: its cuts kept 140ms apart even at ×2, so this one is not halved all the way —
    // (260 + 2 × 280 + 110 + 150 + 200 + 240) × ½ — about 760).
    // ケイオス's 《双極臨界》 (作者 2026-10-26), when AUTO uses it: one TRACK held from her circles meeting through its
    // four strikes — (2330 + 150 + 200 + 240) × ½, about 1460 — its own length, not moves piling up.
    const finisher = got.filter((m) => m.ms > 770);
    expect(finisher.every((m) => m.ms <= 1700)).toBe(true);
    expect(Math.max(...got.filter((m) => m.ms <= 770).map((m) => m.ms))).toBeLessThanOrEqual(770);
    // Back at rest once the last blow's moves are over (they never pile up, so this comes soon).
    await expect.poll(() => atRest(page, '.pb-field'), { timeout: 2_000 }).toBe(true);
    await expect.poll(() => atRest(page, '.pb-bg'), { timeout: 2_000 }).toBe(true);
  });
});

test('less motion asked for (as the suite runs): the camera does not move', async ({ page }) => {
  test.setTimeout(60_000);
  await recordCamera(page);
  await page.goto('/?preview=party&hurt=1&footing=4');
  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await expect(page.getByTestId('pb-break-flash')).toBeVisible();
  await page.waitForTimeout(400);
  expect(await everything(page)).toEqual([]);
});

test('each blow its own flash where it lands: a white cut, Kaos\'s circle and colour, the feathers; the big number on 重撃・豪断', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?preview=party&hurt=1&footing=40');
  const hit = (kind: string) => page.locator(`[data-testid="pb-hit"][data-kind="${kind}"]`);

  await turnOf(page, 'hero');
  await page.getByTestId('pb-cmd-attack').click();
  await expect(page.getByTestId('pb-foe').locator('[data-testid="pb-hit"][data-kind="slash"]')).toHaveCount(1);

  await turnOf(page, 'grave');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-goudan').click();
  await expect(page.getByTestId('pb-foe').getByTestId('pb-float')).toHaveAttribute('data-tier', 'big');

  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-skills').click();
  await page.getByTestId('pb-cmd-tech-star_feather').click();
  await page.getByTestId('pb-target-grave').click();
  await expect(page.getByTestId('pb-figure-grave').locator('[data-testid="pb-hit"][data-kind="feather"]')).toHaveCount(1);
  // Feathers: no jolt, no camera — and nothing that cuts.
  await expect(hit('slash')).toHaveCount(0);

  await turnOf(page, 'kaos');
  await page.getByTestId('pb-cmd-magic').click();
  // Her first damage spell (星光弾).
  await page.locator('[data-testid^="pb-magic-"]:not([disabled])').first().click();
  await expect(page.getByTestId('pb-figure-kaos').getByTestId('pb-cast')).toHaveCount(1);
  await expect(page.getByTestId('pb-foe').locator('[data-testid="pb-hit"][data-kind="magic"]')).toHaveCount(1);
});

/** Reads the finale until this line is up. */
async function readUntil(page: Page, scene: string, text: string) {
  const on = page.getByTestId('finale-scene');
  for (let i = 0; i < 90; i++) {
    if ((await on.getAttribute('data-scene')) === scene && (await page.getByTestId('finale-line').textContent())?.includes(text)) return;
    const key = `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`;
    await page.getByTestId('finale-next').click();
    await expect.poll(async () => `${await on.getAttribute('data-scene')}:${await on.getAttribute('data-at')}`).not.toBe(key);
  }
  throw new Error(`never reached ${scene}: ${text}`);
}

test('the finale\'s 間, its music and each place\'s air: the hymn falls away at the red light and stays gone; a hum in the depths; the words wait their 間 — and つぎへ never does', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/?preview=finale&from=NONE');
  const on = page.getByTestId('finale-scene');
  await readUntil(page, 'RUINS_SEAL', '黒いフードの人影');
  await expect(on).toHaveAttribute('data-ambience', 'HUM');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mugenAmbience: () => string | null }).__mugenAmbience())).toBe('HUM');
  await expect(on).toHaveAttribute('data-music', 'AS_IS');
  await readUntil(page, 'RUINS_SEAL', '装置が、赤く光った。');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  await readUntil(page, 'RUINS_SEAL', '……違う。');
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '500');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  // The 間 is the words' alone: つぎへ is there at once, and goes on at once.
  await expect(page.getByTestId('finale-next')).toBeEnabled();
  await readUntil(page, 'RUINS_SEAL', '床の封印紋');
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '700');
  await readUntil(page, 'RUINS_SEAL', '完全起動');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  // The next scene: the music as it is again; the village (morning) has no air of its own.
  await readUntil(page, 'MORNING', '翌朝。');
  await expect(on).toHaveAttribute('data-music', 'AS_IS');
  await expect(on).toHaveAttribute('data-ambience', 'NONE');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mugenAmbience: () => string | null }).__mugenAmbience())).toBeNull();
  await readUntil(page, 'RAID', '柵を踏み砕いて');
  await expect(on).toHaveAttribute('data-ambience', 'FIRE');
});

test('before the fight on the grassland: the music falls away at 「止める。」, a breath on 「おう。」, a dark moment — then the fight, with no air left under it', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 640, height: 300 });
  await page.goto('/?preview=finale&from=LURED');
  const on = page.getByTestId('finale-scene');
  await expect(on).toHaveAttribute('data-scene', 'FORM1_START');
  await expect(on).toHaveAttribute('data-ambience', 'WIND');
  await readUntil(page, 'FORM1_START', '止める。');
  await expect(on).toHaveAttribute('data-music', 'DROP');
  await readUntil(page, 'FORM1_START', 'おう。');
  await expect(page.getByTestId('finale-line')).toHaveAttribute('data-pause', '500');
  await page.getByTestId('finale-next').click();
  await expect(page.getByTestId('finale-breath')).toBeVisible();
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await expect(page.getByTestId('finale-breath')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __mugenAmbience: () => string | null }).__mugenAmbience())).toBeNull();
});
