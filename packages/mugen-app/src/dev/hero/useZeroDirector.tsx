// PLAYING 零閃・天衝 — debug preview only (STEP 9).
//
// Optionally his cut-in first (the v18 sample), then every step of
// ZeroScene on its own clock (zeroTiming.ts), handed to the battle screen
// as a field scene. The clock is the shared one (ui/battle/scene/
// useScenePlayer): when it is over, stopped, or its screen goes away,
// nothing of it is left and he is home. It reads and writes no battle,
// world or save.

import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/scene/fieldScene';
import { useScenePlayer, type SceneEnd } from '../../ui/battle/scene/useScenePlayer';
import { zeroPlan, type ZeroPlan } from './zeroTiming';
import { ZeroOver, zeroVars, type ZeroStep } from './ZeroScene';

interface ZeroNow {
  plan: ZeroPlan;
  step: ZeroStep;
  /** The moon has been cut. */
  cut: boolean;
}

export interface ZeroDirector {
  play: (cutIn?: CutInSpec | null) => Promise<SceneEnd>;
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
  const player = useScenePlayer<ZeroNow>(speed, cutIns);

  const play = (cutIn?: CutInSpec | null) =>
    player.play(cutIn ?? null, (at) => {
      const plan = zeroPlan(at);
      return {
        start: { plan, step: 'charge', cut: false },
        cues: [
          { at: plan.dash, change: (n) => ({ ...n, step: 'dash' }) },
          { at: plan.hitstop, change: (n) => ({ ...n, step: 'hitstop' }) },
          { at: plan.moon, change: (n) => ({ ...n, step: 'moon' }) },
          { at: plan.cut, change: (n) => ({ ...n, cut: true }) },
          { at: plan.pause, change: (n) => ({ ...n, step: 'pause' }) },
          { at: plan.break, change: (n) => ({ ...n, step: 'break' }) },
          { at: plan.recover, change: (n) => ({ ...n, step: 'recover' }) },
          { at: plan.return, change: (n) => ({ ...n, step: 'return' }) },
        ],
        end: plan.end,
      };
    });

  const on = player.now;
  const now = on?.state;
  const scene: FieldScene | null =
    on && now
      ? {
          id: on.id,
          name: 'zero',
          step: now.step,
          heroAside: false,
          hero: HERO_AT[now.step],
          enemy: now.step === 'break' ? 'broken' : undefined,
          vars: (marks) => zeroVars(marks, now.plan),
          over: () => <ZeroOver step={now.step} cut={now.cut} />,
        }
      : null;

  return { play, stop: player.stop, playing: player.playing, scene };
}
