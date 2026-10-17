/**
 * SCREEN SHAKE — the short jolt of a heavy moment (作者「臨場感強化：汎用 SCREEN SHAKE」2026-10-17).
 *
 * One call, three weights, anywhere — a fight or a scene:
 *
 *   screenShake('small')   a heavier blow, a tremor        ~140ms  ±4px
 *   screenShake('medium')  BREAK, 重撃・豪断, a big hit      ~200ms  ±6px, 1px of height
 *   screenShake('large')   waking, the shell breaking,       ~300ms  ±10px, 2px of height
 *                          a finisher landing
 *
 * WHAT MOVES: only what a screen marks as its world — `data-shake-layer` on
 * the battlefield and its painting, on a scene's picture. The HUD (TURN
 * ORDER, HP, MP, commands, the words of a scene) is never marked, so it holds
 * still and stays readable. A screen with nothing marked falls back to the
 * whole screen (`.screen`), never the app or the page.
 *
 * HOW: the Web Animations API on the individual `translate` (and, for a
 * painting, `scale`) property — so it adds to whatever `transform` the
 * element already has (a scene's close-up keeps its framing), nothing is
 * left behind when it ends (no fill, no class), and a second shake on the
 * same element replaces the first instead of stacking. A painting that fills
 * the screen grows a few per cent while it moves, so no edge shows (640×300).
 * No library, no work per frame in JavaScript.
 *
 * OFF IN ONE PLACE: `setScreenShake('off' | 'weak' | 'on')` — and always off
 * for somebody whose device asks for less motion (prefers-reduced-motion),
 * which is also how the e2e suite runs. A settings screen can drive the
 * switch later; nothing else needs to know.
 */

export type ShakeLevel = 'small' | 'medium' | 'large';
export type ShakeSetting = 'on' | 'weak' | 'off';

/** Each weight: how long, and where it goes (x, y px), evenly spaced, from rest back to rest. */
export const SHAKE_PATTERNS: Readonly<Record<ShakeLevel, { ms: number; path: readonly (readonly [number, number])[] }>> = {
  small: { ms: 140, path: [[0, 0], [-4, 0], [4, 0], [-2, 0], [0, 0]] },
  medium: { ms: 200, path: [[0, 0], [-6, 1], [6, -1], [-4, 1], [3, 0], [0, 0]] },
  large: { ms: 300, path: [[0, 0], [-10, 2], [9, -2], [-7, 2], [5, -1], [-3, 1], [0, 0]] },
};

/** How much a painting grows while it moves, so its edges stay off screen. */
const BACKDROP_GROW: Readonly<Record<ShakeLevel, number>> = { small: 1.02, medium: 1.03, large: 1.045 };
/** The longest a hit-stop may hold (作者: 50〜100ms から). */
export const HIT_STOP_MAX_MS = 100;

let setting: ShakeSetting = 'on';

/** The one switch: 'off' stops every shake and hit-stop; 'weak' halves how far it goes. */
export function setScreenShake(next: ShakeSetting): void {
  setting = next;
}

export function getScreenShake(): ShakeSetting {
  return setting;
}

/** Whether shaking happens at all here: switched on, and the device not asking for less motion. */
export function shakeAllowed(): boolean {
  if (setting === 'off') return false;
  if (typeof window === 'undefined') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** The keyframes of one shake (pure): `translate` along the path, a painting grown while it moves. */
export function shakeKeyframes(level: ShakeLevel, opts: { weak?: boolean; backdrop?: boolean } = {}): Keyframe[] {
  const { path } = SHAKE_PATTERNS[level];
  const k = opts.weak ? 0.5 : 1;
  const grow = BACKDROP_GROW[level];
  return path.map(([x, y], i) => {
    const frame: Keyframe = { translate: `${round(x * k)}px ${round(y * k)}px` };
    if (opts.backdrop) frame.scale = i === 0 || i === path.length - 1 ? '1' : String(grow);
    return frame;
  });
}

const round = (n: number) => Math.round(n * 10) / 10;

/** The shake running on each element now, so a new one replaces it. */
const running = new WeakMap<Element, Animation>();

/** What moves in `root`: its marked layers, or failing those, the screen itself. */
export function shakeTargets(root: ParentNode = document): Element[] {
  const marked = [...root.querySelectorAll('[data-shake-layer]')];
  if (marked.length > 0) return marked;
  const self = root as Partial<Element>;
  const screen = typeof self.matches === 'function' && self.matches('.screen') ? (root as Element) : root.querySelector('.screen');
  return screen ? [screen] : [];
}

/**
 * Shakes the world on screen once. Resolves when it is over (at once, when
 * shaking is off). Safe to call again while one is running.
 */
export function screenShake(level: ShakeLevel, root: ParentNode = document): Promise<void> {
  if (!shakeAllowed()) return Promise.resolve();
  const { ms } = SHAKE_PATTERNS[level];
  const weak = setting === 'weak';
  const done: Promise<unknown>[] = [];
  for (const el of shakeTargets(root)) {
    if (typeof (el as HTMLElement).animate !== 'function') continue;
    running.get(el)?.cancel();
    const backdrop = (el as HTMLElement).dataset?.shakeLayer === 'backdrop';
    const anim = (el as HTMLElement).animate(shakeKeyframes(level, { weak, backdrop }), {
      duration: ms,
      easing: 'ease-out',
      fill: 'none',
    });
    running.set(el, anim);
    done.push(
      anim.finished
        .catch(() => undefined)
        .finally(() => {
          if (running.get(el) === anim) running.delete(el);
        }),
    );
  }
  return Promise.all(done).then(() => undefined);
}

/**
 * A HIT-STOP: everything moving in the world on screen (its CSS and Web
 * animations) holds for `ms` — at most HIT_STOP_MAX_MS — then goes on. The
 * HUD is not held. Nothing happens when shaking is off.
 */
export function hitStop(ms: number, root: ParentNode = document): Promise<void> {
  if (!shakeAllowed() || ms <= 0) return Promise.resolve();
  const hold = Math.min(ms, HIT_STOP_MAX_MS);
  const held: Animation[] = [];
  for (const el of shakeTargets(root)) {
    if (typeof (el as HTMLElement).getAnimations !== 'function') continue;
    for (const a of (el as HTMLElement).getAnimations({ subtree: true })) {
      if (a.playState === 'running') {
        a.pause();
        held.push(a);
      }
    }
  }
  if (held.length === 0) return Promise.resolve();
  return new Promise((resolve) =>
    window.setTimeout(() => {
      for (const a of held) if (a.playState === 'paused') a.play();
      resolve();
    }, hold),
  );
}
