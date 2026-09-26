// PLAYING 零閃・天衝 — debug preview only (STEP 9).
//
// The same shape as Levi's and Aria's (../levi, ../aria): optionally his
// cut-in first (the v18 sample), then every step of ZeroScene on its own
// clock (zeroTiming.ts), handed to the battle screen as a field scene.
// It reads and writes no battle, world or save; when it is over, stopped,
// or its screen goes away, every timer is cleared and he is home.

import { useEffect, useRef, useState } from 'react';
import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/fieldScene';
import { zeroPlan, type ZeroPlan } from './zeroTiming';
import { ZeroOver, zeroVars, type ZeroStep } from './ZeroScene';

interface ZeroNow {
  id: number;
  plan: ZeroPlan;
  step: ZeroStep;
  /** The moon has been cut. */
  cut: boolean;
}

export type ZeroEnd = 'done' | 'stopped';

export interface ZeroDirector {
  play: (cutIn?: CutInSpec | null) => Promise<ZeroEnd>;
  stop: () => void;
  playing: boolean;
  scene: FieldScene | null;
}

/** Where he is, as the scene's stylesheet knows it (zero.css). */
const HERO_AT: Record<ZeroStep, string> = {
  charge: 'charge',
  dash: 'dash',
  hitstop: 'away',
  moon: 'away',
  pause: 'away',
  break: 'away',
  recover: 'recover',
  return: 'return',
};

export function useZeroDirector(speed: BattleSpeed, cutIns: CutInDirector): ZeroDirector {
  const [now, setNow] = useState<ZeroNow | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const resolveRun = useRef<((end: ZeroEnd) => void) | null>(null);
  const run = useRef(0);
  const speedNow = useRef(speed);
  speedNow.current = speed;

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  const finish = (end: ZeroEnd) => {
    clear();
    setNow(null);
    setPlaying(false);
    const resolve = resolveRun.current;
    resolveRun.current = null;
    resolve?.(end);
  };

  useEffect(
    () => () => {
      clear();
      const resolve = resolveRun.current;
      resolveRun.current = null;
      resolve?.('stopped');
    },
    [],
  );

  const play = (cutIn?: CutInSpec | null) =>
    new Promise<ZeroEnd>((resolve) => {
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
        const plan = zeroPlan(speedNow.current);
        setNow({ id: mine, plan, step: 'charge', cut: false });
        const at = (ms: number, change: (n: ZeroNow) => ZeroNow) => {
          timers.current.push(
            window.setTimeout(() => setNow((n) => (n && n.id === mine ? change(n) : n)), ms),
          );
        };
        at(plan.dash, (n) => ({ ...n, step: 'dash' }));
        at(plan.hitstop, (n) => ({ ...n, step: 'hitstop' }));
        at(plan.moon, (n) => ({ ...n, step: 'moon' }));
        at(plan.cut, (n) => ({ ...n, cut: true }));
        at(plan.pause, (n) => ({ ...n, step: 'pause' }));
        at(plan.break, (n) => ({ ...n, step: 'break' }));
        at(plan.recover, (n) => ({ ...n, step: 'recover' }));
        at(plan.return, (n) => ({ ...n, step: 'return' }));
        timers.current.push(
          window.setTimeout(() => {
            if (run.current === mine) finish('done');
          }, plan.end),
        );
      })();
    });

  const stop = () => {
    run.current += 1;
    cutIns.stop();
    if (resolveRun.current || playing) finish('stopped');
  };

  const scene: FieldScene | null = now
    ? {
        id: now.id,
        name: 'zero',
        step: now.step,
        heroAside: false,
        hero: HERO_AT[now.step],
        enemy: now.step === 'break' ? 'broken' : undefined,
        vars: (marks) => zeroVars(marks, now.plan),
        over: () => <ZeroOver step={now.step} cut={now.cut} />,
      }
    : null;

  return { play, stop, playing, scene };
}
