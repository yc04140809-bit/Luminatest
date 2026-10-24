import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CAMERA_COMBOS,
  CAMERA_PERSONA,
  IMPACT_ZOOM,
  KICK,
  KICK_MIN_MS,
  KICK_PEAK_AT,
  TRACK,
  TRACK_MS,
  TRACK_OVERSHOOT,
  TRACK_JOLT,
  PULL_BACK,
  PUSH_IN,
  RECOIL,
  camera,
  cameraKeyframes,
  cameraSequence,
  getCameraMotion,
  moveMs,
  sequenceTimes,
  setCameraMotion,
  type CameraMove,
  type CameraStrength,
} from './camera';

// CAMERA DIRECTOR (作者 2026-10-17): one way and back, within the author's numbers, the HUD never, off in one place.

/** Reads a frame's transform back: [px, %, scale]. */
function pose(f: Keyframe): [number, number, number] {
  const t = String(f.transform);
  const px = Number(/translate\((-?[\d.]+)px/.exec(t)![1]);
  const pct = Number(/translateX\((-?[\d.]+)%\)/.exec(t)![1]);
  const scale = Number(/scale\(([\d.]+)\)/.exec(t)![1]);
  return [px, pct, scale];
}
const strengths: CameraStrength[] = ['small', 'medium', 'large'];

describe('the numbers (作者 CAMERA KICK / DIRECTOR)', () => {
  it('KICK as the reference video measures (実機 2026-10-23): 1.5–3% of the width, a peak about a frame in, gone within ~200ms; the lengths still the author\'s bands', () => {
    const msBand = { small: [100, 150], medium: [150, 220], large: [200, 300] } as const;
    for (const s of strengths) {
      expect(KICK[s].pct).toBeGreaterThanOrEqual(1.5);
      expect(KICK[s].pct).toBeLessThanOrEqual(3);
      expect(KICK[s].ms).toBeGreaterThanOrEqual(msBand[s][0]);
      expect(KICK[s].ms).toBeLessThanOrEqual(msBand[s][1]);
      // About one frame (33ms at 30fps) to the peak, as the video's.
      expect(KICK[s].ms * KICK_PEAK_AT).toBeLessThanOrEqual(40);
    }
    expect(KICK.small.pct).toBeLessThan(KICK.medium.pct);
    expect(KICK.medium.pct).toBeLessThan(KICK.large.pct);
  });

  it('PUSH-IN 1.01–1.05, IMPACT ZOOM about 1.03, PULL-BACK 0.97–0.99, RECOIL 4–8px', () => {
    for (const s of strengths) {
      expect(PUSH_IN[s].scale).toBeGreaterThanOrEqual(1.01);
      expect(PUSH_IN[s].scale).toBeLessThanOrEqual(1.05);
      expect(IMPACT_ZOOM[s].scale).toBeGreaterThanOrEqual(1.015);
      expect(IMPACT_ZOOM[s].scale).toBeLessThanOrEqual(1.05);
      expect(PULL_BACK[s].scale).toBeGreaterThanOrEqual(0.97);
      expect(PULL_BACK[s].scale).toBeLessThanOrEqual(0.99);
      expect(RECOIL[s].px).toBeGreaterThanOrEqual(4);
      expect(RECOIL[s].px).toBeLessThanOrEqual(8);
    }
    expect(IMPACT_ZOOM.medium.scale).toBe(1.03);
  });
});

describe('cameraKeyframes', () => {
  const moves: CameraMove[] = [
    { kind: 'KICK', dir: 'left', strength: 'large' },
    { kind: 'RECOIL', dir: 'left', strength: 'medium' },
    { kind: 'PUSH_IN', strength: 'large' },
    { kind: 'IMPACT_ZOOM', strength: 'medium' },
    { kind: 'PULL_BACK', strength: 'large' },
    { kind: 'FOCUS', at: 0.2, strength: 'large' },
    { kind: 'SNAP', from: 0.8, to: 0.2, strength: 'large' },
  ];

  it.each(moves)('$kind: starts and ends at rest', (move) => {
    for (const backdrop of [false, true]) {
      const { frames } = cameraKeyframes(move, { backdrop });
      expect(pose(frames[0])).toEqual([0, 0, 1]);
      expect(pose(frames[frames.length - 1])).toEqual([0, 0, 1]);
      expect(frames[0].offset).toBe(0);
      expect(frames[frames.length - 1].offset).toBe(1);
    }
  });

  it('KICK jolts ONE way (the way asked) at once, snaps back, swings a little past, and rests — the video\'s 「カクッ」', () => {
    const left = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'medium' }).frames;
    const xs = left.map((f) => pose(f)[1]);
    expect(Math.min(...xs)).toBe(-KICK.medium.pct);
    expect(Number(left[1].offset)).toBe(KICK_PEAK_AT);
    expect(xs[1]).toBe(-KICK.medium.pct);
    // Past the other way, by a little only.
    expect(Math.max(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(KICK.medium.pct * 0.25);
    expect(xs[xs.length - 1]).toBe(0);
    const right = cameraKeyframes({ kind: 'KICK', dir: 'right', strength: 'medium' }).frames;
    expect(pose(right[1])[1]).toBe(KICK.medium.pct);
    // A medium one leans in a touch at the peak; a small one does not.
    expect(pose(right[1])[2]).toBeGreaterThan(1);
    expect(pose(cameraKeyframes({ kind: 'KICK', dir: 'right', strength: 'small' }).frames[1])[2]).toBe(1);
  });

  it('TRACK (FF Resonance\'s way, cut-in moves; 実機 2026-10-24 「‼️って感じではない」): leans in on the one acting, WHIPS at the one struck — past the mark and settled, there before the blow — punches in and jolts at it, then home', () => {
    const move: CameraMove = { kind: 'TRACK', from: 0.75, to: 0.2, impact: 500, strength: 'medium' };
    const { ms, frames, origin } = cameraKeyframes(move);
    const p = frames.map(pose);
    const t = frames.map((f) => Number(f.offset) * ms);
    // In order, from rest to rest; as long as the blow, its punch, the hold and the way back.
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(p[0]).toEqual([0, 0, 1]);
    expect(p[p.length - 1]).toEqual([0, 0, 1]);
    expect(ms).toBe(500 + TRACK_MS.punch + TRACK_MS.hold + TRACK_MS.back);
    // The lean: toward him on the right (the picture left), nearer — held there until the whip.
    expect(p[1][1]).toBeLessThan(0);
    expect(p[1][2]).toBeGreaterThan(1);
    expect(p[2]).toEqual(p[1]);
    // The whip: a tenth of a second, toward the creature on the left (the picture right), past the mark…
    const aim = (0.5 - 0.2) * 2 * TRACK.medium.pct;
    expect(t[3] - t[2]).toBe(TRACK_MS.whip);
    expect(p[3][1]).toBeCloseTo(aim * (1 + TRACK_OVERSHOOT), 1);
    expect(p[3][1]).toBeGreaterThan(aim);
    expect(p[3][2]).toBe(TRACK.medium.zoom);
    // …settled onto it, and there before the blow.
    expect(p[4][1]).toBeCloseTo(aim, 1);
    expect(t[4]).toBeCloseTo(500 - TRACK_MS.early, 0);
    expect(t[5]).toBeCloseTo(500, 0);
    // The blow: punched in and jolted the way it goes (left), harder than a KICK; then back to the hold.
    expect(p[6][1]).toBeCloseTo(aim - KICK.medium.pct * TRACK_JOLT, 1);
    expect(p[6][2]).toBeCloseTo(TRACK.medium.zoom + TRACK.medium.punch, 4);
    expect(p[7][1]).toBeCloseTo(aim, 1);
    expect(p[7][2]).toBe(TRACK.medium.zoom);
    // Zoomed on the one struck.
    expect(origin).toBe(0.2);
    // A painting goes half as far, grown to hide its edges.
    const bg = cameraKeyframes(move, { backdrop: true }).frames.map(pose);
    expect(bg[4][1]).toBeCloseTo(aim / 2, 1);
    expect(bg[4][2]).toBeGreaterThanOrEqual(1 + aim / 100);
  });

  it('TRACK through a move of several cuts (《瞬断》 three): there before the first, held through all, a punch at each — the last the hardest — then home', () => {
    const move: CameraMove = { kind: 'TRACK', from: 0.75, to: 0.25, impact: 400, blows: [400, 630, 860], strength: 'medium' };
    const { ms, frames } = cameraKeyframes(move);
    const p = frames.map(pose);
    const t = frames.map((f) => Number(f.offset) * ms);
    for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThan(t[i - 1]);
    expect(ms).toBe(860 + TRACK_MS.punch + TRACK_MS.hold + TRACK_MS.back);
    const aim = (0.5 - 0.25) * 2 * TRACK.medium.pct;
    // A punch (nearer than the hold) at each cut, each starting from the hold.
    const punches = p.map((q, i) => ({ q, at: t[i] })).filter(({ q }) => q[2] > TRACK.medium.zoom + 0.001);
    expect(punches).toHaveLength(3);
    for (const [i, cut] of [400, 630, 860].entries()) {
      expect(punches[i].at).toBeGreaterThan(cut);
      expect(punches[i].at).toBeLessThan(cut + 60);
    }
    expect(punches[2].q[2]).toBeGreaterThan(punches[0].q[2]);
    expect(Math.abs(punches[2].q[1] - aim)).toBeGreaterThan(Math.abs(punches[0].q[1] - aim));
    // Never back home between the cuts.
    const between = p.filter((_, i) => t[i] > 400 && t[i] < 860);
    for (const q of between) expect(q[2]).toBeGreaterThanOrEqual(TRACK.medium.zoom);
  });

  it('TRACK on a quick blow still leans, swings and then holds — never out of order', () => {
    for (const impact of [80, 150, 260]) {
      const offsets = cameraKeyframes({ kind: 'TRACK', from: 0.7, to: 0.25, impact }).frames.map((f) => Number(f.offset));
      for (let i = 1; i < offsets.length; i++) expect(offsets[i], `impact ${impact}`).toBeGreaterThan(offsets[i - 1]);
    }
  });

  it('RECOIL is thrown back the other way from the blow', () => {
    const f = cameraKeyframes({ kind: 'RECOIL', dir: 'left', strength: 'large' }).frames.map(pose);
    expect(Math.max(...f.map(([px]) => px))).toBe(8);
  });

  it('a painting moves half as far (as far on a KICK: the whole picture jolts), never shrinks, and grows enough to hide its edges', () => {
    const field = cameraKeyframes({ kind: 'RECOIL', dir: 'left', strength: 'large' }).frames.map(pose);
    const bg = cameraKeyframes({ kind: 'RECOIL', dir: 'left', strength: 'large' }, { backdrop: true }).frames.map(pose);
    expect(bg[1][0]).toBe(field[1][0] / 2);
    const kickField = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'large' }).frames.map(pose);
    const kickBg = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'large' }, { backdrop: true }).frames.map(pose);
    expect(kickBg[1][1]).toBe(kickField[1][1]);
    // 3% each way uncovered: at least 1 + 6%.
    expect(kickBg[1][2]).toBeGreaterThanOrEqual(1 + (2 * KICK.large.pct) / 100);
    for (const move of moves) {
      for (const [, , scale] of cameraKeyframes(move, { backdrop: true }).frames.map(pose)) expect(scale).toBeGreaterThanOrEqual(1);
    }
  });

  it('FOCUS leans toward its point: one on the left moves the picture right', () => {
    const f = cameraKeyframes({ kind: 'FOCUS', at: 0.2, strength: 'medium' }).frames.map(pose);
    expect(f[1][1]).toBeGreaterThan(0);
    expect(f[1][2]).toBeGreaterThan(1);
    expect(cameraKeyframes({ kind: 'FOCUS', at: 0.2 }).origin).toBe(0.2);
  });

  it('weak goes half as far', () => {
    const f = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'large' }, { weak: true }).frames.map(pose);
    expect(f[1][1]).toBe(-KICK.large.pct / 2);
  });

  it('every character has their own tempo; ヴァルシール is the slowest, レヴィ the sharpest', () => {
    const tempos = Object.values(CAMERA_PERSONA).map((p) => p.tempo);
    expect(CAMERA_PERSONA.valsheel.tempo).toBe(Math.max(...tempos));
    expect(CAMERA_PERSONA.levi.tempo).toBe(Math.min(...tempos));
    expect(CAMERA_PERSONA.hero.tempo).toBeLessThan(1);
  });
});

/** A stand-in layer with the Web Animations API. */
function fakeEl(layer: string) {
  const anims: { cancel: ReturnType<typeof vi.fn>; frames: Keyframe[]; opts: KeyframeAnimationOptions }[] = [];
  const el = {
    dataset: { shakeLayer: layer },
    style: { transformOrigin: '' },
    animate: vi.fn((frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = { cancel: vi.fn(), finished: Promise.resolve(), frames, opts };
      anims.push(a);
      return a;
    }),
  };
  return { el, anims };
}
const fakeRoot = (els: unknown[]) => ({ querySelectorAll: () => els, querySelector: () => null }) as unknown as ParentNode;

describe('camera', () => {
  const origWindow = globalThis.window;
  const allow = (reduce: boolean) => {
    (globalThis as { window?: unknown }).window = { matchMedia: () => ({ matches: reduce }), setTimeout: globalThis.setTimeout };
  };
  afterEach(() => {
    setCameraMotion('on');
    (globalThis as { window?: unknown }).window = origWindow;
  });

  it('moves the marked layers on `transform` (the shake keeps `translate`), leaving nothing behind', async () => {
    allow(false);
    const field = fakeEl('field');
    const bg = fakeEl('backdrop');
    await camera({ kind: 'KICK', dir: 'left', strength: 'small' }, fakeRoot([field.el, bg.el]));
    expect(field.anims[0].opts).toMatchObject({ duration: KICK.small.ms, fill: 'none' });
    expect(field.anims[0].frames.every((f) => 'transform' in f && !('translate' in f))).toBe(true);
    expect(bg.anims).toHaveLength(1);
  });

  it('a new move replaces the running one on the same layer — they never pile up', async () => {
    allow(false);
    const field = fakeEl('field');
    const root = fakeRoot([field.el]);
    const first = camera({ kind: 'PUSH_IN' }, root);
    void camera({ kind: 'KICK', dir: 'left' }, root);
    expect(field.anims[0].cancel).toHaveBeenCalled();
    await first;
  });

  it('PULL-BACK draws back the field alone; the painting stays', async () => {
    allow(false);
    const field = fakeEl('field');
    const bg = fakeEl('backdrop');
    await camera({ kind: 'PULL_BACK', strength: 'large' }, fakeRoot([field.el, bg.el]));
    expect(field.anims).toHaveLength(1);
    expect(bg.anims).toHaveLength(0);
  });

  it('a tempo stretches the move (a character\'s way)', async () => {
    allow(false);
    const field = fakeEl('field');
    await camera({ kind: 'KICK', dir: 'right', strength: 'large' }, fakeRoot([field.el]), 1.3);
    expect(field.anims[0].opts.duration).toBe(Math.round(KICK.large.ms * 1.3));
  });

  it('at ×2 a KICK stays a 「クイッ」 — never under KICK_MIN_MS — while the rest still halve (作者 TIGS §17)', async () => {
    allow(false);
    const field = fakeEl('field');
    await camera({ kind: 'KICK', dir: 'left', strength: 'small' }, fakeRoot([field.el]), 0.85 * 0.5);
    expect(field.anims[0].opts.duration).toBe(KICK_MIN_MS);
    expect(moveMs({ kind: 'KICK', dir: 'left', strength: 'large' }, 0.5)).toBe(KICK.large.ms / 2);
    expect(moveMs({ kind: 'PUSH_IN', strength: 'small' }, 0.5)).toBe(180);
    expect(moveMs({ kind: 'KICK', dir: 'left', strength: 'small' }, 1)).toBe(KICK.small.ms);
  });

  it('sequenceTimes: each move\'s start and end as a sequence plays them (waits, then durations)', () => {
    expect(
      sequenceTimes([
        { kind: 'KICK', dir: 'left', strength: 'small' },
        { kind: 'KICK', dir: 'right', strength: 'medium', wait: 80 },
      ]),
    ).toEqual([
      { kind: 'KICK', start: 0, end: KICK.small.ms },
      { kind: 'KICK', start: KICK.small.ms + 80, end: KICK.small.ms + 80 + KICK.medium.ms },
    ]);
  });

  it('a sequence plays its moves in order', async () => {
    allow(false);
    const field = fakeEl('field');
    await cameraSequence(CAMERA_COMBOS.PULL_RUSH('right'), fakeRoot([field.el]));
    expect(field.anims).toHaveLength(2);
    expect(pose(field.anims[0].frames[1])[2]).toBeLessThan(1);
    expect(pose(field.anims[1].frames[1])[1]).toBe(KICK.large.pct);
  });

  it('off in one place, and off for a device that asks for less motion', async () => {
    const field = fakeEl('field');
    allow(true);
    await camera({ kind: 'KICK', dir: 'left' }, fakeRoot([field.el]));
    allow(false);
    setCameraMotion('off');
    expect(getCameraMotion()).toBe('off');
    await camera({ kind: 'KICK', dir: 'left' }, fakeRoot([field.el]));
    await cameraSequence(CAMERA_COMBOS.DOUBLE_PUNCH('left'), fakeRoot([field.el]));
    expect(field.anims).toHaveLength(0);
  });
});
