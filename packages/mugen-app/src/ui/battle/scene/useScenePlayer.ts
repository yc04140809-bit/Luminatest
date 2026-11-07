// PLAYING A SHOWING THAT IS A ROW OF STEPS — the one clock under Levi's
// spears, Aria's arrow and his 零閃・天衝 (src/dev/levi, aria, hero), and
// under whatever showing is joined to a real skill later.
//
// A showing is: an optional cut-in first (through the cut-in part), then
// a state that changes at set times (its cues), then over. This keeps the
// clock and nothing else. It knows no skill, draws nothing and decides
// nothing: what the state IS, what each cue changes and how it is drawn
// belong to the showing (its plan and its field scene, fieldScene.ts).
//
// NOTHING OUTLIVES IT. Played again, stopped, or its screen gone away,
// every timer is cleared and the state is gone; `play` says how it ended.
// Its length is fixed when it starts, from the speed at that moment, as a
// cut-in's is — pressing ×2 half-way cannot tear a showing in two.

import { useEffect, useRef, useState } from 'react';
import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../cutin/CutIn';

export type SceneEnd = 'done' | 'stopped';

/** At `at` ms from the start, the state becomes `change(state)`. */
export interface SceneCue<S> {
  at: number;
  change: (state: S) => S;
}

/** One playing, laid out when it starts. */
export interface SceneScript<S> {
  /** The state as it begins. */
  start: S;
  cues: readonly SceneCue<S>[];
  /** When it is over, in ms from the start. */
  end: number;
}

export interface ScenePlayer<S> {
  /** Plays it once — after `cutIn`, if given. Resolves when it is over. */
  play: (cutIn: CutInSpec | null, script: (speed: BattleSpeed) => SceneScript<S>) => Promise<SceneEnd>;
  /** Ends it now (the cut-in too, if that is what is playing). */
  stop: () => void;
  /** From the press to the end, cut-in included: the time to take no command. */
  playing: boolean;
  /** Where it is now, and which playing it is (changes each time); null between. */
  now: { id: number; state: S } | null;
}

export function useScenePlayer<S>(speed: BattleSpeed, cutIns: CutInDirector): ScenePlayer<S> {
  const [now, setNow] = useState<{ id: number; state: S } | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const resolveRun = useRef<((end: SceneEnd) => void) | null>(null);
  const run = useRef(0);
  const speedNow = useRef(speed);
  speedNow.current = speed;

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  const finish = (end: SceneEnd) => {
    clear();
    setNow(null);
    setPlaying(false);
    const resolve = resolveRun.current;
    resolveRun.current = null;
    resolve?.(end);
  };

  // Going away ends whatever was playing, and says so.
  useEffect(
    () => () => {
      clear();
      const resolve = resolveRun.current;
      resolveRun.current = null;
      resolve?.('stopped');
    },
    [],
  );

  const play: ScenePlayer<S>['play'] = (cutIn, script) =>
    new Promise<SceneEnd>((resolve) => {
      if (resolveRun.current) finish('stopped');
      resolveRun.current = resolve;
      const mine = ++run.current;
      setPlaying(true);
      void (async () => {
        if (cutIn) {
          const end = await cutIns.play(cutIn);
          if (run.current !== mine) return;
          if (end !== 'done') return finish('stopped');
        }
        const { start, cues, end } = script(speedNow.current);
        setNow({ id: mine, state: start });
        for (const cue of cues)
          timers.current.push(
            window.setTimeout(
              () => setNow((n) => (n && n.id === mine ? { id: mine, state: cue.change(n.state) } : n)),
              cue.at,
            ),
          );
        timers.current.push(
          window.setTimeout(() => {
            if (run.current === mine) finish('done');
          }, end),
        );
      })();
    });

  const stop = () => {
    run.current += 1;
    cutIns.stop();
    if (resolveRun.current || playing) finish('stopped');
  };

  return { play, stop, playing, now };
}
