// A CUT-IN — one reusable part, and the one way to play it.
//
// THIS DRAWS; IT DECIDES NOTHING. It is handed what to show (whose
// picture, which colours, what name) and how long, plays it once and
// says when it is over. It never reads or writes a battle, a world or a
// save, and it knows no skill: joining a real skill to a cut-in is a
// separate step, done by whoever calls `play`.
//
// NOTHING OUTLIVES IT. The cut-in is on screen only while it plays: its
// DOM appears for it and is gone after — no class is left on the battle
// screen, no veil, no timer. `stop()` ends it at once, and the screen
// that uses the director going away ends it too.

import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { cutInMs, type CutInTier } from './cutInTiming';
import './cutin.css';

/** Whose colours and layout — v18's four cut-ins, グレイヴ's own, and a boss's great move. */
export type CutInTheme = 'chaos' | 'hero' | 'grave' | 'levi' | 'aria' | 'boss';

/**
 * A moving figure (cutInFigures.ts): a short silent loop, played in a window whose middle is the face —
 * the middle of the screen. `art` stays its first frame, shown until it plays and where it cannot.
 */
export interface CutInMotion {
  video: string;
  /** Where the face is in the frame, a share of its width and height. */
  face: { x: number; y: number };
}

export interface CutInSpec {
  /** Colours, and where the figure and name stand. */
  theme: CutInTheme;
  /** 通常技 or 必殺技 — how long it is held (cutInTiming.ts). */
  tier: CutInTier;
  /** The figure. An existing picture, never a stand-in (with `motion`, its first frame). */
  art: string;
  /** The figure moving, when there is a moving one: drawn instead of `art`. */
  motion?: CutInMotion;
  /** The large faint word behind (v18: CHAOS, ZERO, LEVI, ARIA). */
  word: string;
  /** The small line over the name. */
  kicker: string;
  /** The name — the thing that has to be readable. */
  name: string;
  /** An optional line under it. */
  sub?: string;
}

/**
 * THE LIGHT LINES across the band (作者 2026-10-25: 背景の帯・光の線を綺麗に): thin streaks running the
 * way the panel swept in, each its own height, length, pace and start — fixed, so every cut-in
 * draws the same. Height and length are shares of the band; pace in ms; start a share of one pass.
 */
const LINES: readonly { y: number; len: number; t: number; d: number; a: number; thick: boolean }[] = [
  { y: 9, len: 34, t: 620, d: 0.1, a: 0.5, thick: false },
  { y: 17, len: 22, t: 480, d: 0.62, a: 0.75, thick: true },
  { y: 26, len: 46, t: 700, d: 0.35, a: 0.4, thick: false },
  { y: 34, len: 18, t: 430, d: 0.82, a: 0.6, thick: false },
  { y: 43, len: 30, t: 560, d: 0.05, a: 0.45, thick: true },
  { y: 52, len: 52, t: 760, d: 0.5, a: 0.35, thick: false },
  { y: 60, len: 24, t: 500, d: 0.27, a: 0.7, thick: false },
  { y: 68, len: 38, t: 640, d: 0.74, a: 0.5, thick: true },
  { y: 76, len: 20, t: 450, d: 0.44, a: 0.65, thick: false },
  { y: 84, len: 44, t: 720, d: 0.15, a: 0.4, thick: false },
  { y: 91, len: 28, t: 540, d: 0.9, a: 0.55, thick: true },
];

/** Whether the player asked for less motion (the system's, or the game's own switch). */
function lessMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return document.documentElement.dataset.reducedMotion === 'on' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The moving figure: silent, looped, inline — started here, not by `autoPlay` (muted must be set before
 * it plays, or a phone may refuse). With less motion it is not started: its first frame stands.
 */
function Motion({ motion, still }: { motion: CutInMotion; still: string }) {
  const start = (el: HTMLVideoElement | null) => {
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    if (!lessMotion()) void el.play()?.catch(() => undefined);
  };
  return (
    <span
      className="ci-figure"
      style={{ '--ci-fx': motion.face.x, '--ci-fy': motion.face.y } as CSSProperties}
      aria-hidden="true"
    >
      <video
        ref={start}
        className="ci-video"
        data-testid="cut-in-video"
        src={motion.video}
        poster={still}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
      />
    </span>
  );
}

/** One cut-in, drawn for `ms` and then reported over. */
export function CutIn({ spec, ms, onDone }: { spec: CutInSpec; ms: number; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), ms);
    return () => window.clearTimeout(t);
  }, [ms]);

  return (
    <div
      className="ci"
      data-testid="cut-in"
      data-theme={spec.theme}
      data-tier={spec.tier}
      data-figure={spec.motion ? 'motion' : 'still'}
      data-ms={ms}
      style={{ '--ci-ms': `${ms}ms` } as CSSProperties}
      role="presentation"
    >
      <span className="ci-veil" />
      <div className="ci-panel">
        <span className="ci-energy" />
        <span className="ci-word" aria-hidden="true">
          {spec.word}
        </span>
        <span className="ci-lines" aria-hidden="true">
          {LINES.map((l, i) => (
            <i
              key={i}
              className={l.thick ? 'thick' : undefined}
              style={{ top: `${l.y}%`, '--len': `${l.len}%`, opacity: l.a, animationDuration: `${l.t}ms`, animationDelay: `${-l.d * l.t}ms` } as CSSProperties}
            />
          ))}
        </span>
        {spec.motion ? (
          <Motion motion={spec.motion} still={spec.art} />
        ) : (
          <img className="ci-art" src={spec.art} alt="" aria-hidden="true" draggable={false} />
        )}
        <span className="ci-rails" aria-hidden="true" />
        <div className="ci-copy">
          <span className="ci-kicker">{spec.kicker}</span>
          <strong className="ci-name" data-testid="cut-in-name" data-text={spec.name}>
            {spec.name}
          </strong>
          {spec.sub && <small className="ci-sub">{spec.sub}</small>}
        </div>
      </div>
      <span className="ci-edge ci-edge-gold" />
      <span className="ci-edge ci-edge-blue" />
      <span className="ci-flash" />
    </div>
  );
}

/** How a cut-in ended: played through, or stopped. */
export type CutInEnd = 'done' | 'stopped';

export interface CutInDirector {
  /** Plays one; resolves when it is over. A cut-in already playing is stopped first. */
  play: (spec: CutInSpec) => Promise<CutInEnd>;
  /** Ends the one playing, now. */
  stop: () => void;
  /** Whether one is on screen — the time to take no command. */
  playing: boolean;
  /** What to draw, in the battle screen's cut-in layer (null when nothing plays). */
  element: ReactElement | null;
}

/**
 * THE ONE WAY TO PLAY A CUT-IN.
 *
 * Its length is fixed when it starts, from the speed at that moment, so
 * pressing ×2 mid-cut-in cannot cut a name short.
 */
export function useCutInDirector(speed: BattleSpeed): CutInDirector {
  const [current, setCurrent] = useState<{
    id: number;
    spec: CutInSpec;
    ms: number;
  } | null>(null);
  const resolveCurrent = useRef<((end: CutInEnd) => void) | null>(null);
  const nextId = useRef(0);
  // Read when a cut-in starts, not when `play` was made: a caller that
  // plays several in a row gets the speed of the moment each one starts.
  const speedNow = useRef(speed);
  speedNow.current = speed;

  const finish = (end: CutInEnd) => {
    const resolve = resolveCurrent.current;
    resolveCurrent.current = null;
    setCurrent(null);
    resolve?.(end);
  };

  // Going away ends whatever was playing, and says so.
  useEffect(
    () => () => {
      const resolve = resolveCurrent.current;
      resolveCurrent.current = null;
      resolve?.('stopped');
    },
    [],
  );

  const play = (spec: CutInSpec) =>
    new Promise<CutInEnd>((resolve) => {
      if (resolveCurrent.current) finish('stopped');
      resolveCurrent.current = resolve;
      nextId.current += 1;
      setCurrent({
        id: nextId.current,
        spec,
        ms: cutInMs(spec.tier, speedNow.current),
      });
    });

  const element = current ? (
    <CutIn key={current.id} spec={current.spec} ms={current.ms} onDone={() => finish('done')} />
  ) : null;

  return {
    play,
    stop: () => finish('stopped'),
    playing: current !== null,
    element,
  };
}
