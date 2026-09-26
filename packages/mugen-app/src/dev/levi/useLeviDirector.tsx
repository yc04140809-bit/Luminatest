// PLAYING LEVI'S PHANTOM SPEARS — debug preview only (STEP 5).
//
// Optionally her cut-in first (the v18 sample), then every step of
// LeviScene on its own clock (leviTiming.ts), handed to the battle screen
// as a field scene. The clock is the shared one (ui/battle/scene/
// useScenePlayer): nothing of it outlives the playing. It reads and
// writes no battle, world or save.

import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/scene/fieldScene';
import { useScenePlayer, type SceneCue, type SceneEnd } from '../../ui/battle/scene/useScenePlayer';
import { SPEAR_COUNT, leviPlan, type LeviPlan } from './leviTiming';
import { LeviFigure, LeviSpears, type LeviStep, type SpearState } from './LeviScene';

interface LeviNow {
  plan: LeviPlan;
  step: LeviStep;
  spears: SpearState[];
  lodged: number;
}

export interface LeviDirector {
  play: (cutIn?: CutInSpec | null) => Promise<SceneEnd>;
  stop: () => void;
  playing: boolean;
  scene: FieldScene | null;
}

const withSpear = (n: LeviNow, i: number, state: SpearState): SpearState[] => {
  const spears = n.spears.slice();
  spears[i] = state;
  return spears;
};

export function useLeviDirector(speed: BattleSpeed, cutIns: CutInDirector): LeviDirector {
  const player = useScenePlayer<LeviNow>(speed, cutIns);

  const play = (cutIn?: CutInSpec | null) =>
    player.play(cutIn ?? null, (at) => {
      const plan = leviPlan(at);
      const cues: SceneCue<LeviNow>[] = [
        { at: plan.stance, change: (n) => ({ ...n, step: 'stance' }) },
        ...plan.form.map((t, i) => ({ at: t, change: (n: LeviNow) => ({ ...n, spears: withSpear(n, i, 'formed') }) })),
        ...plan.launch.map((t, i) => ({
          at: t,
          change: (n: LeviNow) => ({ ...n, step: 'stab' as const, spears: withSpear(n, i, 'thrust') }),
        })),
        ...plan.lodge.map((t, i) => ({
          at: t,
          change: (n: LeviNow) => ({ ...n, spears: withSpear(n, i, 'lodged'), lodged: i + 1 }),
        })),
        { at: plan.rush, change: (n) => ({ ...n, step: 'rush' }) },
        { at: plan.impact, change: (n) => ({ ...n, step: 'impact', spears: n.spears.map(() => 'shatter' as const) }) },
        { at: plan.leave, change: (n) => ({ ...n, step: 'leave' }) },
      ];
      return {
        start: { plan, step: 'enter', spears: Array<SpearState>(SPEAR_COUNT).fill('none'), lodged: 0 },
        cues,
        end: plan.end,
      };
    });

  const on = player.now;
  const now = on?.state;
  const scene: FieldScene | null =
    on && now
      ? {
          id: on.id,
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

  return { play, stop: player.stop, playing: player.playing, scene };
}
