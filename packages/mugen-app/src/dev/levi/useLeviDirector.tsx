// PLAYING LEVI'S PHANTOM SPEARS — debug preview only (STEP 5).
//
// One way to play the part: optionally her cut-in first (the v18 sample,
// through the cut-in part), then every step of LeviScene on its own
// clock (leviTiming.ts). What it hands the battle screen is a field scene
// (ui/battle/fieldScene.ts) — drawings and words, nothing else. It reads
// and writes no battle, world or save.
//
// NOTHING OUTLIVES IT. When it is over, or stopped, or the screen using
// it goes away, every timer is cleared and the scene is gone: he is back
// where he stood and the creature is as it was.

import { useEffect, useRef, useState } from 'react';
import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/fieldScene';
import { SPEAR_COUNT, leviPlan, type LeviPlan } from './leviTiming';
import { LeviFigure, LeviSpears, type LeviStep, type SpearState } from './LeviScene';

interface LeviNow {
  id: number;
  plan: LeviPlan;
  step: LeviStep;
  spears: SpearState[];
  lodged: number;
}

export type LeviEnd = 'done' | 'stopped';

export interface LeviDirector {
  /** Plays it once — after `cutIn`, if given. Resolves when it is over. */
  play: (cutIn?: CutInSpec | null) => Promise<LeviEnd>;
  stop: () => void;
  /** From the press to the end, cut-in included: no command meanwhile. */
  playing: boolean;
  /** For the battle screen (BattleStage `scene`); null when nothing plays. */
  scene: FieldScene | null;
}

export function useLeviDirector(speed: BattleSpeed, cutIns: CutInDirector): LeviDirector {
  const [now, setNow] = useState<LeviNow | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const resolveRun = useRef<((end: LeviEnd) => void) | null>(null);
  const run = useRef(0);
  // Its length is fixed when it starts, as a cut-in's is.
  const speedNow = useRef(speed);
  speedNow.current = speed;

  const clear = () => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  };
  const finish = (end: LeviEnd) => {
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
    new Promise<LeviEnd>((resolve) => {
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
        const plan = leviPlan(speedNow.current);
        setNow({ id: mine, plan, step: 'enter', spears: Array(SPEAR_COUNT).fill('none'), lodged: 0 });
        const at = (ms: number, change: (n: LeviNow) => LeviNow) => {
          timers.current.push(
            window.setTimeout(() => setNow((n) => (n && n.id === mine ? change(n) : n)), ms),
          );
        };
        const spear = (n: LeviNow, i: number, state: SpearState) => {
          const spears = n.spears.slice();
          spears[i] = state;
          return spears;
        };
        at(plan.stance, (n) => ({ ...n, step: 'stance' }));
        plan.form.forEach((t, i) => at(t, (n) => ({ ...n, spears: spear(n, i, 'formed') })));
        plan.launch.forEach((t, i) =>
          at(t, (n) => ({ ...n, step: 'stab', spears: spear(n, i, 'thrust') })),
        );
        plan.lodge.forEach((t, i) =>
          at(t, (n) => ({ ...n, spears: spear(n, i, 'lodged'), lodged: i + 1 })),
        );
        at(plan.rush, (n) => ({ ...n, step: 'rush' }));
        at(plan.impact, (n) => ({ ...n, step: 'impact', spears: n.spears.map(() => 'shatter') }));
        at(plan.leave, (n) => ({ ...n, step: 'leave' }));
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
        name: 'levi',
        step: now.step,
        heroAside: now.step !== 'leave',
        enemy:
          now.step === 'impact'
            ? 'bound'
            : now.lodged > 0 && (now.step === 'stab' || now.step === 'rush')
              ? `pierced-${now.lodged % 2 === 1 ? 'a' : 'b'}`
              : undefined,
        field: (marks) => <LeviFigure marks={marks} step={now.step} plan={now.plan} />,
        over: (marks) => (
          <LeviSpears marks={marks} step={now.step} spears={now.spears} lodged={now.lodged} plan={now.plan} />
        ),
      }
    : null;

  return { play, stop, playing, scene };
}
