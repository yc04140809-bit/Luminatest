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

/** Whose colours and layout — v18's four cut-ins. */
export type CutInTheme = 'chaos' | 'hero' | 'levi' | 'aria';

export interface CutInSpec {
  /** Colours, and where the figure and name stand. */
  theme: CutInTheme;
  /** 通常技 or 必殺技 — how long it is held (cutInTiming.ts). */
  tier: CutInTier;
  /** The figure. An existing picture, never a stand-in. */
  art: string;
  /** The large faint word behind (v18: CHAOS, ZERO, LEVI, ARIA). */
  word: string;
  /** The small line over the name. */
  kicker: string;
  /** The name — the thing that has to be readable. */
  name: string;
  /** An optional line under it. */
  sub?: string;
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
        <img className="ci-art" src={spec.art} alt="" aria-hidden="true" draggable={false} />
        <div className="ci-copy">
          <span className="ci-kicker">{spec.kicker}</span>
          <strong className="ci-name" data-testid="cut-in-name">
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
