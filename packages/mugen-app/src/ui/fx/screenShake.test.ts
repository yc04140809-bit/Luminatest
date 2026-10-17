import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  HIT_STOP_MAX_MS,
  SHAKE_PATTERNS,
  getScreenShake,
  hitStop,
  screenShake,
  setScreenShake,
  shakeKeyframes,
  shakeTargets,
  type ShakeLevel,
} from './screenShake';

// SCREEN SHAKE (作者 2026-10-17): short, small enough to read through, back to rest, off in one place.

const px = (t: string) => t.split(' ').map((v) => Number.parseFloat(v));

describe('the three weights', () => {
  it('are short: small 120–150ms, medium 180–220ms, large 250–350ms', () => {
    expect(SHAKE_PATTERNS.small.ms).toBeGreaterThanOrEqual(120);
    expect(SHAKE_PATTERNS.small.ms).toBeLessThanOrEqual(150);
    expect(SHAKE_PATTERNS.medium.ms).toBeGreaterThanOrEqual(180);
    expect(SHAKE_PATTERNS.medium.ms).toBeLessThanOrEqual(220);
    expect(SHAKE_PATTERNS.large.ms).toBeGreaterThanOrEqual(250);
    expect(SHAKE_PATTERNS.large.ms).toBeLessThanOrEqual(350);
  });

  it.each(['small', 'medium', 'large'] as ShakeLevel[])('%s: mostly sideways, never past 10px across or 3px up, and ends where it began', (level) => {
    const frames = shakeKeyframes(level);
    const points = frames.map((f) => px(f.translate as string));
    expect(points[0]).toEqual([0, 0]);
    expect(points[points.length - 1]).toEqual([0, 0]);
    for (const [x, y] of points) {
      expect(Math.abs(x)).toBeLessThanOrEqual(10);
      expect(Math.abs(y)).toBeLessThanOrEqual(3);
    }
    // Small is sideways only.
    if (level === 'small') expect(points.every(([, y]) => y === 0)).toBe(true);
  });

  it('heavier is further: small < medium < large', () => {
    const reach = (l: ShakeLevel) => Math.max(...shakeKeyframes(l).map((f) => Math.abs(px(f.translate as string)[0])));
    expect(reach('small')).toBeLessThan(reach('medium'));
    expect(reach('medium')).toBeLessThan(reach('large'));
  });

  it('weak goes half as far; a painting grows while it moves and is back to size at the end', () => {
    const weak = shakeKeyframes('large', { weak: true }).map((f) => px(f.translate as string)[0]);
    expect(Math.max(...weak.map(Math.abs))).toBe(5);
    const bg = shakeKeyframes('medium', { backdrop: true });
    expect(bg[0].scale).toBe('1');
    expect(bg[bg.length - 1].scale).toBe('1');
    expect(Number(bg[2].scale)).toBeGreaterThan(1);
  });
});

/** A stand-in element with the Web Animations API, recording what it was asked. */
function fakeEl(layer?: string) {
  const anims: { cancel: ReturnType<typeof vi.fn>; frames: Keyframe[]; opts: KeyframeAnimationOptions }[] = [];
  const el = {
    dataset: layer ? { shakeLayer: layer } : {},
    animate: vi.fn((frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      const a = { cancel: vi.fn(), finished: Promise.resolve(), frames, opts };
      anims.push(a);
      return a;
    }),
    getAnimations: vi.fn(() => []),
  };
  return { el, anims };
}
function fakeRoot(els: unknown[]) {
  return { querySelectorAll: () => els, querySelector: () => null } as unknown as ParentNode;
}

describe('screenShake', () => {
  const origWindow = globalThis.window;
  const allow = (reduce: boolean) => {
    (globalThis as { window?: unknown }).window = {
      matchMedia: () => ({ matches: reduce }),
      setTimeout: globalThis.setTimeout,
    };
  };
  afterEach(() => {
    setScreenShake('on');
    (globalThis as { window?: unknown }).window = origWindow;
  });

  it('moves only the marked layers, with no fill left behind; a painting with its own frames', async () => {
    allow(false);
    const field = fakeEl('field');
    const bg = fakeEl('backdrop');
    await screenShake('medium', fakeRoot([field.el, bg.el]));
    expect(field.anims).toHaveLength(1);
    expect(field.anims[0].opts).toMatchObject({ duration: 200, fill: 'none' });
    expect(field.anims[0].frames[0].scale).toBeUndefined();
    expect(bg.anims[0].frames[1].scale).toBeDefined();
  });

  it('a second shake replaces the first on the same layer — they never stack', async () => {
    allow(false);
    const field = fakeEl('field');
    const root = fakeRoot([field.el]);
    const first = screenShake('large', root);
    screenShake('small', root);
    expect(field.anims[0].cancel).toHaveBeenCalled();
    expect(field.anims).toHaveLength(2);
    await first;
  });

  it('off in one place, and off for a device that asks for less motion', async () => {
    const field = fakeEl('field');
    allow(true);
    await screenShake('large', fakeRoot([field.el]));
    expect(field.anims).toHaveLength(0);
    allow(false);
    setScreenShake('off');
    expect(getScreenShake()).toBe('off');
    await screenShake('large', fakeRoot([field.el]));
    await hitStop(80, fakeRoot([field.el]));
    expect(field.anims).toHaveLength(0);
    expect(field.el.getAnimations).not.toHaveBeenCalled();
  });

  it('a hit-stop holds what is moving for a moment, never longer than the cap, then lets it go', async () => {
    allow(false);
    const playing = { playState: 'running', pause: vi.fn(function (this: { playState: string }) { this.playState = 'paused'; }), play: vi.fn() };
    const field = fakeEl('field');
    field.el.getAnimations = vi.fn(() => [playing]) as never;
    vi.useFakeTimers();
    (globalThis as { window: { setTimeout: typeof setTimeout } }).window.setTimeout = setTimeout;
    const held = hitStop(5000, fakeRoot([field.el]));
    expect(playing.pause).toHaveBeenCalled();
    vi.advanceTimersByTime(HIT_STOP_MAX_MS - 1);
    expect(playing.play).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await held;
    expect(playing.play).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('with nothing marked, the screen itself — never anything outside it', () => {
    const screen = { matches: () => true };
    const root = { querySelectorAll: () => [], querySelector: (s: string) => (s === '.screen' ? screen : null) } as unknown as ParentNode;
    expect(shakeTargets(root)).toEqual([screen]);
    const empty = { querySelectorAll: () => [], querySelector: () => null } as unknown as ParentNode;
    expect(shakeTargets(empty)).toEqual([]);
  });
});
