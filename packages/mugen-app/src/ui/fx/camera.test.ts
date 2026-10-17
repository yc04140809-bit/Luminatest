import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CAMERA_COMBOS,
  CAMERA_PERSONA,
  IMPACT_ZOOM,
  KICK,
  PULL_BACK,
  PUSH_IN,
  RECOIL,
  camera,
  cameraKeyframes,
  cameraSequence,
  getCameraMotion,
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
  it('KICK: SMALL 6–10px 100–150ms, MEDIUM 10–16px 150–220ms, LARGE 16–24px 200–300ms', () => {
    const want = { small: [6, 10, 100, 150], medium: [10, 16, 150, 220], large: [16, 24, 200, 300] } as const;
    for (const s of strengths) {
      const [lo, hi, msLo, msHi] = want[s];
      expect(KICK[s].px).toBeGreaterThanOrEqual(lo);
      expect(KICK[s].px).toBeLessThanOrEqual(hi);
      expect(KICK[s].ms).toBeGreaterThanOrEqual(msLo);
      expect(KICK[s].ms).toBeLessThanOrEqual(msHi);
    }
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

  it('KICK goes ONE way (the way asked), fast out (its peak early), and back', () => {
    const left = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'medium' }).frames.map(pose);
    expect(left.every(([px]) => px <= 0)).toBe(true);
    expect(Math.min(...left.map(([px]) => px))).toBe(-13);
    const right = cameraKeyframes({ kind: 'KICK', dir: 'right', strength: 'medium' }).frames;
    expect(pose(right[1])[0]).toBe(13);
    expect(Number(right[1].offset)).toBeLessThan(0.5);
  });

  it('RECOIL is thrown back the other way from the blow', () => {
    const f = cameraKeyframes({ kind: 'RECOIL', dir: 'left', strength: 'large' }).frames.map(pose);
    expect(Math.max(...f.map(([px]) => px))).toBe(8);
  });

  it('a painting moves half as far, never shrinks, and grows enough to hide its edges', () => {
    const field = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'large' }).frames.map(pose);
    const bg = cameraKeyframes({ kind: 'KICK', dir: 'left', strength: 'large' }, { backdrop: true }).frames.map(pose);
    expect(bg[1][0]).toBe(field[1][0] / 2);
    // 10px across a 600px painting: at least 1 + 20/600.
    expect(bg[1][2]).toBeGreaterThanOrEqual(1 + 20 / 600);
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
    expect(f[1][0]).toBe(-10);
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
    expect(field.anims[0].opts).toMatchObject({ duration: 120, fill: 'none' });
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
    expect(field.anims[0].opts.duration).toBe(325);
  });

  it('a sequence plays its moves in order', async () => {
    allow(false);
    const field = fakeEl('field');
    await cameraSequence(CAMERA_COMBOS.PULL_RUSH('right'), fakeRoot([field.el]));
    expect(field.anims).toHaveLength(2);
    expect(pose(field.anims[0].frames[1])[2]).toBeLessThan(1);
    expect(pose(field.anims[1].frames[1])[0]).toBe(20);
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
