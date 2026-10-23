/**
 * CAMERA DIRECTOR — the camera's own small moves (作者「CAMERA KICK」「CAMERA DIRECTOR SYSTEM」2026-10-17).
 *
 * Not the SCREEN SHAKE (ui/fx/screenShake.ts): a shake trembles in place; a
 * camera move goes ONE way and comes back — the camera reacting to a blow.
 * The two add up: the shake moves the individual `translate`/`scale`
 * properties of a layer, the camera moves its `transform`, so one never
 * cancels the other.
 *
 *   KICK         a quick push one way and back                 SMALL 8px 120ms · MEDIUM 13px 180ms · LARGE 20px 250ms
 *   PUSH-IN      a slow lean in, a hold, back (a wind-up)      scale 1.015 / 1.03 / 1.05
 *   IMPACT ZOOM  a snap in at the blow, eased back             scale 1.02 / 1.03 / 1.045
 *   PULL-BACK    the camera draws back before something big    scale 0.99 / 0.98 / 0.97 (the field only)
 *   FOCUS        leans toward one point of the field           (attacker focus, the one broken)
 *   SNAP         from the one acting to the one it is aimed at, fast
 *   RECOIL       the camera thrown back the other way a little  4 / 6 / 8px
 *
 * WHAT MOVES: the same marked layers as the shake (`data-shake-layer`) — the
 * field, its painting, a scene's picture — never the HUD. A painting moves
 * half as far (it is further away) and grows by just enough that its edge
 * never shows, and never shrinks: on PULL-BACK only the field draws back.
 *
 * Every move goes fast out and comes back smoothly (ease-out, then a soft
 * return), leaves nothing behind (no fill), and a new move on a layer
 * replaces the one running there — nothing piles up, at ×2 or with AUTO.
 * At ×2 a KICK is never shorter than KICK_MIN_MS, so it still reads as a
 * 「クイッ」 rather than a one-frame jump (作者 TIGS「CAMERA KICK」 §17).
 *
 * OFF IN ONE PLACE: `setCameraMotion('off' | 'weak' | 'on')`, and always off
 * for a device that asks for less motion (as the e2e suite runs).
 */

import { shakeTargets } from './screenShake';

export type CameraStrength = 'small' | 'medium' | 'large';
export type CameraSetting = 'on' | 'weak' | 'off';
/** Which way the camera goes: toward the left of the screen, or the right. */
export type CameraDir = 'left' | 'right';

export type CameraMove =
  | { kind: 'KICK'; dir: CameraDir; strength?: CameraStrength }
  | { kind: 'PUSH_IN'; strength?: CameraStrength; at?: number }
  | { kind: 'IMPACT_ZOOM'; strength?: CameraStrength; at?: number }
  | { kind: 'PULL_BACK'; strength?: CameraStrength }
  | { kind: 'FOCUS'; at: number; strength?: CameraStrength }
  | { kind: 'SNAP'; from: number; to: number; strength?: CameraStrength }
  | { kind: 'RECOIL'; dir: CameraDir; strength?: CameraStrength };

/** A character's way with the camera (作者: キャラ別カメラ個性) — `tempo` stretches every move (below 1: sharper). */
export interface CameraPersona {
  tempo: number;
  /** Their blows kick the camera, or lean it in first. */
  lead: 'KICK' | 'PUSH_IN' | 'SNAP';
}

/** 主人公 sharp; ケイオス leans in on her magic; グレイヴ heavy (lean in, then recoil); アリア smooth; レヴィ fast snaps; ヴァルシール slow, drawn back. */
export const CAMERA_PERSONA: Readonly<Record<string, CameraPersona>> = {
  hero: { tempo: 0.85, lead: 'KICK' },
  kaos: { tempo: 1, lead: 'PUSH_IN' },
  grave: { tempo: 1.15, lead: 'PUSH_IN' },
  aria: { tempo: 1.25, lead: 'KICK' },
  levi: { tempo: 0.8, lead: 'SNAP' },
  valsheel: { tempo: 1.3, lead: 'KICK' },
};
export const DEFAULT_PERSONA: CameraPersona = { tempo: 1, lead: 'KICK' };
export const personaOf = (id: string): CameraPersona => CAMERA_PERSONA[id] ?? DEFAULT_PERSONA;

/** KICK: how far (px) and how long (ms). 作者: SMALL 6〜10px/100〜150ms, MEDIUM 10〜16px/150〜220ms, LARGE 16〜24px/200〜300ms. */
export const KICK: Readonly<Record<CameraStrength, { px: number; ms: number }>> = {
  small: { px: 8, ms: 120 },
  medium: { px: 13, ms: 180 },
  large: { px: 20, ms: 250 },
};
/** The shortest a KICK may be, whatever the tempo (×2 halves the rest): about five frames. */
export const KICK_MIN_MS = 90;
export const PUSH_IN: Readonly<Record<CameraStrength, { scale: number; ms: number }>> = {
  small: { scale: 1.015, ms: 360 },
  medium: { scale: 1.03, ms: 460 },
  large: { scale: 1.05, ms: 580 },
};
export const IMPACT_ZOOM: Readonly<Record<CameraStrength, { scale: number; ms: number }>> = {
  small: { scale: 1.02, ms: 180 },
  medium: { scale: 1.03, ms: 220 },
  large: { scale: 1.045, ms: 280 },
};
export const PULL_BACK: Readonly<Record<CameraStrength, { scale: number; ms: number }>> = {
  small: { scale: 0.99, ms: 420 },
  medium: { scale: 0.98, ms: 520 },
  large: { scale: 0.97, ms: 640 },
};
/** FOCUS / SNAP: how far toward the point (a share of the screen's width, %), and the lean in. */
const FOCUS: Readonly<Record<CameraStrength, { pct: number; scale: number; ms: number }>> = {
  small: { pct: 2, scale: 1.02, ms: 380 },
  medium: { pct: 3, scale: 1.03, ms: 480 },
  large: { pct: 4.5, scale: 1.04, ms: 600 },
};
const SNAP: Readonly<Record<CameraStrength, { pct: number; ms: number }>> = {
  small: { pct: 1.5, ms: 240 },
  medium: { pct: 2.5, ms: 300 },
  large: { pct: 3.5, ms: 380 },
};
export const RECOIL: Readonly<Record<CameraStrength, { px: number; ms: number }>> = {
  small: { px: 4, ms: 90 },
  medium: { px: 6, ms: 120 },
  large: { px: 8, ms: 150 },
};

/** Fast out; and the soft way back. */
const OUT = 'cubic-bezier(0.15, 0.85, 0.3, 1)';
const BACK = 'cubic-bezier(0.35, 0, 0.25, 1)';
/** The narrowest screen the painting must cover (px) — what a px move costs it in growth. */
const NARROWEST = 600;

let setting: CameraSetting = 'on';

export function setCameraMotion(next: CameraSetting): void {
  setting = next;
}
export function getCameraMotion(): CameraSetting {
  return setting;
}
/** Whether the camera moves at all here: switched on, and the device not asking for less motion. */
export function cameraAllowed(): boolean {
  if (setting === 'off') return false;
  if (typeof window === 'undefined') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** One pose of the camera: where it is (px and % of the width) and how near (scale). */
interface Pose {
  px: number;
  pct: number;
  scale: number;
  offset: number;
  /** How the camera goes from this pose to the next. */
  easing?: string;
}
const REST = (offset: number, easing?: string): Pose => ({ px: 0, pct: 0, scale: 1, offset, easing });
const sign = (dir: CameraDir) => (dir === 'left' ? -1 : 1);
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** The poses of a move, start to end (pure). */
function posesOf(move: CameraMove, k: number): { ms: number; poses: Pose[]; origin?: number } {
  const s = move.strength ?? 'small';
  switch (move.kind) {
    case 'KICK': {
      const { px, ms } = KICK[s];
      return { ms, poses: [REST(0, OUT), { px: sign(move.dir) * px * k, pct: 0, scale: 1, offset: 0.3, easing: BACK }, REST(1)] };
    }
    case 'RECOIL': {
      // The camera thrown back: the other way from `dir` (the way the blow went).
      const { px, ms } = RECOIL[s];
      return { ms, poses: [REST(0, OUT), { px: -sign(move.dir) * px * k, pct: 0, scale: 1, offset: 0.25, easing: BACK }, REST(1)] };
    }
    case 'PUSH_IN': {
      const { scale, ms } = PUSH_IN[s];
      const z = 1 + (scale - 1) * k;
      return { ms, origin: move.at, poses: [REST(0, 'ease-out'), { px: 0, pct: 0, scale: z, offset: 0.4 }, { px: 0, pct: 0, scale: z, offset: 0.7, easing: BACK }, REST(1)] };
    }
    case 'IMPACT_ZOOM': {
      const { scale, ms } = IMPACT_ZOOM[s];
      return { ms, origin: move.at, poses: [REST(0, OUT), { px: 0, pct: 0, scale: 1 + (scale - 1) * k, offset: 0.22, easing: BACK }, REST(1)] };
    }
    case 'PULL_BACK': {
      const { scale, ms } = PULL_BACK[s];
      const z = 1 - (1 - scale) * k;
      return { ms, poses: [REST(0, 'ease-out'), { px: 0, pct: 0, scale: z, offset: 0.45 }, { px: 0, pct: 0, scale: z, offset: 0.75, easing: OUT }, REST(1)] };
    }
    case 'FOCUS': {
      const { pct, scale, ms } = FOCUS[s];
      // Toward the point: a point on the left draws the camera left (the picture right).
      const shift = (0.5 - clamp01(move.at)) * 2 * pct * k;
      const z = 1 + (scale - 1) * k;
      return { ms, origin: move.at, poses: [REST(0, OUT), { px: 0, pct: shift, scale: z, offset: 0.35 }, { px: 0, pct: shift, scale: z, offset: 0.7, easing: BACK }, REST(1)] };
    }
    case 'SNAP': {
      const { pct, ms } = SNAP[s];
      const toward = (x: number) => (0.5 - clamp01(x)) * 2 * pct * k;
      return { ms, poses: [REST(0, OUT), { px: 0, pct: toward(move.from), scale: 1, offset: 0.2, easing: OUT }, { px: 0, pct: toward(move.to), scale: 1, offset: 0.55, easing: BACK }, REST(1)] };
    }
  }
}

const round = (n: number, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/**
 * The keyframes of one move for one layer (pure). A painting (`backdrop`)
 * goes half as far, leans in half as much, never draws back, and grows by
 * what its move would otherwise uncover.
 */
export function cameraKeyframes(move: CameraMove, opts: { weak?: boolean; backdrop?: boolean } = {}): { ms: number; frames: Keyframe[]; origin?: number } {
  const k = opts.weak ? 0.5 : 1;
  const { ms, poses, origin } = posesOf(move, k);
  const frames = poses.map((p): Keyframe => {
    let { px, pct, scale } = p;
    if (opts.backdrop) {
      px /= 2;
      pct /= 2;
      scale = Math.max(1, 1 + (scale - 1) / 2);
      // Grown by what the move uncovers (both edges), so no edge of the painting shows.
      scale *= 1 + (2 * Math.abs(px)) / NARROWEST + (2 * Math.abs(pct)) / 100;
      // Rounded up, never down past what covers it.
      scale = Math.ceil(scale * 10_000) / 10_000;
    }
    const frame: Keyframe = { offset: p.offset, transform: `translate(${round(px, 1)}px, 0px) translateX(${round(pct)}%) scale(${round(scale, 4)})` };
    if (p.easing) frame.easing = p.easing;
    return frame;
  });
  return { ms, frames, origin };
}

/** How long a move takes (ms) at `tempo` — a KICK never under KICK_MIN_MS. */
export function moveMs(move: CameraMove, tempo = 1): number {
  const base = posesOf(move, 1).ms;
  const ms = Math.round(base * tempo);
  return move.kind === 'KICK' ? Math.max(ms, Math.min(KICK_MIN_MS, base)) : ms;
}

/**
 * When each move of a sequence starts and is back (ms from its start), as
 * cameraSequence plays it (pure) — so a plan can be checked: the KICK comes
 * before the blow (作者: KICK → 技発動 → 命中 → HIT STOP → SHAKE).
 */
export function sequenceTimes(steps: readonly (CameraMove & { wait?: number })[], tempo = 1): { kind: CameraMove['kind']; start: number; end: number }[] {
  let t = 0;
  return steps.map((step) => {
    t += step.wait ?? 0;
    const start = t;
    t += moveMs(step, tempo);
    return { kind: step.kind, start, end: t };
  });
}

/** The move running on each layer now, so a new one replaces it. */
const running = new WeakMap<Element, Animation>();
/** Raised by every move and sequence: a sequence whose turn has passed stops. */
let generation = 0;

function play(move: CameraMove, root: ParentNode, tempo: number): Promise<void> {
  const weak = setting === 'weak';
  const done: Promise<unknown>[] = [];
  for (const el of shakeTargets(root)) {
    const h = el as HTMLElement;
    if (typeof h.animate !== 'function') continue;
    const backdrop = h.dataset?.shakeLayer === 'backdrop';
    // A painting never draws back with the field: PULL-BACK leaves it be.
    if (backdrop && move.kind === 'PULL_BACK') continue;
    const { frames, origin } = cameraKeyframes(move, { weak, backdrop });
    running.get(el)?.cancel();
    if (h.style) h.style.transformOrigin = origin === undefined ? '' : `${round(clamp01(origin) * 100, 1)}% 60%`;
    const anim = h.animate(frames, { duration: moveMs(move, tempo), fill: 'none' });
    running.set(el, anim);
    done.push(
      anim.finished
        .catch(() => undefined)
        .finally(() => {
          if (running.get(el) !== anim) return;
          running.delete(el);
          if (h.style) h.style.transformOrigin = '';
        }),
    );
  }
  return Promise.all(done).then(() => undefined);
}

/**
 * Moves the camera once. Resolves when it is back (at once, when the camera
 * is off). `tempo` stretches it (a character's way — CAMERA_PERSONA).
 */
export function camera(move: CameraMove, root: ParentNode = document, tempo = 1): Promise<void> {
  if (!cameraAllowed()) return Promise.resolve();
  generation++;
  return play(move, root, tempo);
}

/**
 * Several moves, one after another (作者: シーケンスAPI) — each waits `gap` ms
 * (or its own `wait`) after the one before is back. Any other camera move
 * started meanwhile ends the rest of it.
 */
export async function cameraSequence(
  steps: readonly (CameraMove & { wait?: number })[],
  root: ParentNode = document,
  opts: { tempo?: number; gap?: number } = {},
): Promise<void> {
  if (!cameraAllowed()) return;
  const mine = ++generation;
  for (const step of steps) {
    if (step.wait) await new Promise((r) => window.setTimeout(r, step.wait));
    if (generation !== mine) return;
    await play(step, root, opts.tempo ?? 1);
    if (opts.gap) await new Promise((r) => window.setTimeout(r, opts.gap));
    if (generation !== mine) return;
  }
}

/** The combinations the camera knows by name (作者: 複合演出). */
export const CAMERA_COMBOS = {
  /** Two kicks, the second harder — a one-two. */
  DOUBLE_PUNCH: (dir: CameraDir): (CameraMove & { wait?: number })[] => [
    { kind: 'KICK', dir, strength: 'small' },
    { kind: 'KICK', dir, strength: 'medium', wait: 40 },
  ],
  /** BREAK: the camera snaps onto the one broken (a FOCUS is its own impact zoom: in fast, held, back). */
  BREAK_FOCUS: (at: number): (CameraMove & { wait?: number })[] => [{ kind: 'FOCUS', at, strength: 'small' }],
  /** A big creature's blow: the camera draws back, then is thrown at those it rushes. */
  PULL_RUSH: (dir: CameraDir): (CameraMove & { wait?: number })[] => [
    { kind: 'PULL_BACK', strength: 'small' },
    { kind: 'KICK', dir, strength: 'large' },
  ],
} as const;
