// PLAYING ARIA'S BLUE-ROSE ARROW — debug preview only (STEP 7).
//
// Optionally her cut-in first (the v18 sample), then every step of
// AriaScene on its own clock (ariaTiming.ts), handed to the battle screen
// as a field scene. The clock is the shared one (ui/battle/scene/
// useScenePlayer): nothing of it outlives the playing — she gone, he back
// where he stood. It reads and writes no battle, world or save.

import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/scene/fieldScene';
import { useScenePlayer, type SceneEnd } from '../../ui/battle/scene/useScenePlayer';
import { ariaPlan, type AriaPlan } from './ariaTiming';
import { AriaBloom, AriaFigure, type AriaStep } from './AriaScene';

interface AriaNow {
  plan: AriaPlan;
  step: AriaStep;
  /** Her arrow has burst in the sky. */
  landed: boolean;
  /** He is back, in the rose's light, and she is going. */
  back: boolean;
}

export interface AriaDirector {
  play: (cutIn?: CutInSpec | null) => Promise<SceneEnd>;
  stop: () => void;
  playing: boolean;
  scene: FieldScene | null;
}

export function useAriaDirector(speed: BattleSpeed, cutIns: CutInDirector): AriaDirector {
  const player = useScenePlayer<AriaNow>(speed, cutIns);

  const play = (cutIn?: CutInSpec | null) =>
    player.play(cutIn ?? null, (at) => {
      const plan = ariaPlan(at);
      return {
        start: { plan, step: 'enter', landed: false, back: false },
        cues: [
          { at: plan.draw, change: (n) => ({ ...n, step: 'draw' }) },
          { at: plan.shot, change: (n) => ({ ...n, step: 'shot' }) },
          { at: plan.land, change: (n) => ({ ...n, landed: true }) },
          { at: plan.bloom, change: (n) => ({ ...n, step: 'bloom' }) },
          { at: plan.bless, change: (n) => ({ ...n, step: 'bless' }) },
          { at: plan.back, change: (n) => ({ ...n, back: true }) },
          { at: plan.recover, change: (n) => ({ ...n, step: 'recover' }) },
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
          name: 'aria',
          step: now.step,
          heroAside: !now.back,
          hero: now.back && now.step === 'bless' ? 'blessed' : undefined,
          field: (marks) => <AriaFigure marks={marks} step={now.step} back={now.back} plan={now.plan} />,
          over: (marks) => <AriaBloom marks={marks} step={now.step} landed={now.landed} plan={now.plan} />,
        }
      : null;

  return { play, stop: player.stop, playing: player.playing, scene };
}
