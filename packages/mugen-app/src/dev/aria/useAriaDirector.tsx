// PLAYING ARIA'S BLUE-ROSE ARROW — debug preview only (STEP 7).
//
// The same shape as Levi's (../levi/useLeviDirector): optionally her
// cut-in first (the v18 sample, through the cut-in part), then every step
// of AriaScene on its own clock (ariaTiming.ts), handed to the battle
// screen as a field scene. It reads and writes no battle, world or save,
// and when it is over, stopped, or its screen goes away, nothing of it is
// left: every timer cleared, she gone, he back where he stood.

import { useEffect, useRef, useState } from 'react';
import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/fieldScene';
import { ariaPlan, type AriaPlan } from './ariaTiming';
import { AriaBloom, AriaFigure, type AriaStep } from './AriaScene';

interface AriaNow {
  id: number;
  plan: AriaPlan;
  step: AriaStep;
  /** Her arrow has burst in the sky. */
  landed: boolean;
  /** He is back, in the rose's light, and she is going. */
  back: boolean;
}

export type AriaEnd = 'done' | 'stopped';

export interface AriaDirector {
  /** Plays it once — after `cutIn`, if given. Resolves when it is over. */
  play: (cutIn?: CutInSpec | null) => Promise<AriaEnd>;
  stop: () => void;
  /** From the press to the end, cut-in included: no command meanwhile. */
  playing: boolean;
  /** For the battle screen (BattleStage `scene`); null when nothing plays. */
  scene: FieldScene | null;
}

export function useAriaDirector(speed: BattleSpeed, cutIns: CutInDirector): AriaDirector {
  const [now, setNow] = useState<AriaNow | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const resolveRun = useRef<((end: AriaEnd) => void) | null>(null);
  const run = useRef(0);
  // Its length is fixed when it starts, as a cut-in's is.
  const speedNow = useRef(speed);
  speedNow.current = speed;

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  const finish = (end: AriaEnd) => {
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
    new Promise<AriaEnd>((resolve) => {
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
        const plan = ariaPlan(speedNow.current);
        setNow({ id: mine, plan, step: 'enter', landed: false, back: false });
        const at = (ms: number, change: (n: AriaNow) => AriaNow) => {
          timers.current.push(
            window.setTimeout(() => setNow((n) => (n && n.id === mine ? change(n) : n)), ms),
          );
        };
        at(plan.draw, (n) => ({ ...n, step: 'draw' }));
        at(plan.shot, (n) => ({ ...n, step: 'shot' }));
        at(plan.land, (n) => ({ ...n, landed: true }));
        at(plan.bloom, (n) => ({ ...n, step: 'bloom' }));
        at(plan.bless, (n) => ({ ...n, step: 'bless' }));
        at(plan.back, (n) => ({ ...n, back: true }));
        at(plan.recover, (n) => ({ ...n, step: 'recover' }));
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
        name: 'aria',
        step: now.step,
        heroAside: !now.back,
        hero: now.back && now.step === 'bless' ? 'blessed' : undefined,
        field: (marks) => <AriaFigure marks={marks} step={now.step} back={now.back} plan={now.plan} />,
        over: (marks) => <AriaBloom marks={marks} step={now.step} landed={now.landed} plan={now.plan} />,
      }
    : null;

  return { play, stop, playing, scene };
}
