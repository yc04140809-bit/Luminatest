import { useEffect, useRef, useState } from 'react';
import type { WalkGust, WalkGusts } from '@mugen/content/exploration/walkScene';

/**
 * THE PLACE MOVING ON ITS OWN, NOW AND THEN (作者「探索システムPoC 改善指示書」2026-10-18 環境アニメーション).
 *
 * Not something to watch — the stillness of a painting taken away. One small move at a time, every
 * few seconds to a dozen, picked from the place's own (`WalkGusts.kinds`, never the same twice
 * running), each a handful of soft shapes that drift and fade in a few seconds; and, where the place
 * has water, a few streaks of light that shimmer on it all along.
 *
 * Drawn in the painting's layer, so it goes with the camera and stays behind the party, the marks
 * and the words; nothing here can be touched (pointer-events none) and nothing sits still or glows
 * the way a thing to look at does. Only transform and opacity are animated (styles.css `.gust-*`):
 * cheap on any phone. Not drawn at all for less motion, or with 環境演出 off (explorePrefs).
 */

/** How long each lasts, ms. */
const GUST_MS: Record<WalkGust, number> = {
  WIND: 2800,
  PETALS: 7000,
  FLUFF: 6500,
  DUST: 2000,
  LEAF_DRIFT: 7000,
  SUNBEAM: 7500,
  BUGS: 4200,
  DUST_LIGHT: 8000,
  STONE_DUST: 2600,
  DRAFT: 4200,
};
/** The first comes after this long, ms … */
const FIRST_MS: [number, number] = [1800, 4500];
/** … and each next one after this. */
const GAP_MS: [number, number] = [4000, 11000];

interface Live {
  n: number;
  kind: WalkGust;
  /** Where, in the painting layer's pixels, and the view it was in. */
  x: number;
  y: number;
  vw: number;
  vh: number;
  left: number;
  seed: number;
}

const between = ([a, b]: [number, number]) => a + Math.random() * (b - a);

/** A small repeatable random run, so a gust's shapes do not change as the scene re-renders. */
function rng(seed: number) {
  let s = Math.floor(seed * 2 ** 31) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function Gusts({
  gusts,
  camX,
  w,
  h,
  paintW,
  paintH,
  paintTop,
}: {
  gusts: WalkGusts;
  camX: number;
  w: number;
  h: number;
  paintW: number;
  paintH: number;
  paintTop: number;
}) {
  const view = useRef({ camX, w, h });
  view.current = { camX, w, h };
  const [live, setLive] = useState<Live[]>([]);
  const kindsKey = gusts.kinds.join(',');

  useEffect(() => {
    const kinds = gusts.kinds;
    if (kinds.length === 0) return;
    let n = 0;
    let last: WalkGust | null = null;
    let timer = 0;
    const timers = new Set<number>();
    const fire = (asked?: WalkGust) => {
      const choices = kinds.length > 1 ? kinds.filter((k) => k !== last) : kinds;
      const kind = asked ?? choices[Math.floor(Math.random() * choices.length)];
      last = kind;
      const v = view.current;
      const id = ++n;
      const g: Live = {
        n: id,
        kind,
        x: -v.camX + (0.15 + Math.random() * 0.7) * v.w,
        y: (0.3 + Math.random() * 0.55) * v.h,
        vw: v.w,
        vh: v.h,
        left: -v.camX,
        seed: Math.random(),
      };
      setLive((l) => [...l.slice(-1), g]);
      const t = window.setTimeout(() => {
        timers.delete(t);
        setLive((l) => l.filter((x) => x.n !== id));
      }, GUST_MS[kind]);
      timers.add(t);
    };
    const schedule = (ms: number) => {
      timer = window.setTimeout(() => {
        fire();
        schedule(between(GAP_MS));
      }, ms);
    };
    schedule(between(FIRST_MS));
    if (import.meta.env.DEV) (window as unknown as { __mugenGust?: (k?: WalkGust) => void }).__mugenGust = fire;
    return () => {
      window.clearTimeout(timer);
      for (const t of timers) window.clearTimeout(t);
      if (import.meta.env.DEV) delete (window as unknown as { __mugenGust?: unknown }).__mugenGust;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindsKey]);

  return (
    <div className="gusts" aria-hidden="true" data-testid="walk-gusts" data-live={live.map((g) => g.kind).join(',')}>
      {(gusts.water ?? []).map((p, i) => (
        <i
          key={`water-${i}`}
          className="gust-water"
          style={{
            left: p.x * paintW,
            top: paintTop + p.y * paintH,
            animationDelay: `${(i * 0.83) % 3.4}s`,
            animationDuration: `${2.8 + (i % 3) * 0.6}s`,
          }}
        />
      ))}
      {live.map((g) => (
        <Gust key={g.n} g={g} />
      ))}
    </div>
  );
}

function Gust({ g }: { g: Live }) {
  const r = rng(g.seed);
  const ms = GUST_MS[g.kind];
  const base = { className: `gust gust-${g.kind.toLowerCase()}`, 'data-gust': g.kind } as const;
  const style = (s: Record<string, string | number>) => s as React.CSSProperties;
  switch (g.kind) {
    case 'WIND':
      // A breath of light running over the grass, low on the screen.
      return (
        <span {...base} style={style({ left: g.left, top: g.vh * 0.42, width: g.vw, height: g.vh * 0.58, '--ms': `${ms}ms` })}>
          <i />
        </span>
      );
    case 'PETALS':
    case 'DRAFT': {
      // Carried across from one side by the wind.
      const count = g.kind === 'PETALS' ? 3 + Math.floor(r() * 3) : 5 + Math.floor(r() * 2);
      return (
        <span {...base} style={style({ left: g.left - 12, top: 0 })}>
          {Array.from({ length: count }, (_, i) => (
            <b
              key={i}
              style={style({
                top: g.y + (r() - 0.5) * g.vh * 0.35,
                '--dx': `${(0.55 + r() * 0.45) * g.vw}px`,
                '--dy': `${(r() - 0.5) * 40}px`,
                animationDelay: `${r() * (g.kind === 'PETALS' ? 1.6 : 0.8)}s`,
                animationDuration: `${(ms - 1600) / 1000}s`,
              })}
            >
              <i />
            </b>
          ))}
        </span>
      );
    }
    case 'FLUFF':
    case 'BUGS': {
      const count = g.kind === 'FLUFF' ? 2 + Math.floor(r() * 2) : 3;
      return (
        <span {...base} style={style({ left: g.x, top: g.y })}>
          {Array.from({ length: count }, (_, i) => (
            <b
              key={i}
              style={style({
                left: (r() - 0.5) * 60,
                top: (r() - 0.5) * 30,
                '--dx': `${20 + r() * 60}px`,
                '--dy': `${-(30 + r() * 50)}px`,
                '--jx': `${(r() - 0.5) * 24}px`,
                '--jy': `${(r() - 0.5) * 18}px`,
                animationDelay: `${r() * 0.8}s`,
              })}
            />
          ))}
        </span>
      );
    }
    case 'DUST':
      // A puff off the path, low down.
      return (
        <span {...base} style={style({ left: g.x, top: Math.max(g.y, g.vh * 0.62) })}>
          {Array.from({ length: 5 }, (_, i) => (
            <b key={i} style={style({ left: i * 7 - 14, '--dx': `${14 + r() * 26}px`, animationDelay: `${i * 0.08}s` })} />
          ))}
        </span>
      );
    case 'LEAF_DRIFT':
      return (
        <span {...base} style={style({ left: g.left, top: 0 })}>
          {Array.from({ length: 3 }, (_, i) => (
            <b
              key={i}
              className={r() < 0.5 ? 'gold' : 'green'}
              style={style({
                left: (0.15 + r() * 0.7) * g.vw,
                '--dx': `${-30 - r() * 60}px`,
                '--dy': `${g.vh * (0.55 + r() * 0.25)}px`,
                animationDelay: `${r() * 1.4}s`,
              })}
            >
              <i />
            </b>
          ))}
        </span>
      );
    case 'SUNBEAM':
    case 'DUST_LIGHT': {
      // A shaft of light from above, swaying a little; in the ruins, dust turning in it.
      const beams = g.kind === 'SUNBEAM' ? 2 : 1;
      return (
        <span {...base} style={style({ left: g.left, top: 0, width: g.vw, height: g.vh })}>
          {Array.from({ length: beams }, (_, i) => (
            <i key={`beam-${i}`} style={style({ left: `${(0.18 + r() * 0.55) * 100}%`, '--ms': `${ms}ms` })} />
          ))}
          {g.kind === 'DUST_LIGHT' &&
            Array.from({ length: 7 }, (_, i) => (
              <b
                key={i}
                style={style({
                  left: `${30 + r() * 40}%`,
                  top: `${20 + r() * 45}%`,
                  '--dx': `${(r() - 0.5) * 30}px`,
                  '--dy': `${10 + r() * 24}px`,
                  animationDelay: `${0.8 + r() * 2.5}s`,
                })}
              />
            ))}
        </span>
      );
    }
    case 'STONE_DUST':
      // A thin trickle from high on a wall.
      return (
        <span {...base} style={style({ left: g.x, top: g.vh * (0.12 + r() * 0.3) })}>
          {Array.from({ length: 6 }, (_, i) => (
            <b key={i} style={style({ left: (r() - 0.5) * 6, '--dy': `${50 + r() * 40}px`, animationDelay: `${i * 0.18}s` })} />
          ))}
        </span>
      );
  }
}
