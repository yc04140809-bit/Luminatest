// PLAYING KAOS'S 双極崩界 (v19) — debug preview only.
//
// Optionally her cut-in first (the v18 sample), then every step of
// KaosScene on its own clock (kaosTiming.ts), handed to the battle screen
// as a field scene. The clock is the shared one (ui/battle/scene/
// useScenePlayer): nothing of it outlives the playing — she gone, he back
// where he stood. It reads and writes no battle, world or save.

import type { BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInDirector, CutInSpec } from '../../ui/battle/cutin/CutIn';
import type { FieldScene } from '../../ui/battle/scene/fieldScene';
import { useScenePlayer, type SceneEnd } from '../../ui/battle/scene/useScenePlayer';
import { kaosPlan, type KaosPlan } from './kaosTiming';
import { KaosFigure, KaosOver, type KaosStep } from './KaosScene';

interface KaosNow {
  plan: KaosPlan;
  step: KaosStep;
}

export interface KaosDirector {
  play: (cutIn?: CutInSpec | null) => Promise<SceneEnd>;
  stop: () => void;
  playing: boolean;
  scene: FieldScene | null;
}

export function useKaosDirector(speed: BattleSpeed, cutIns: CutInDirector): KaosDirector {
  const player = useScenePlayer<KaosNow>(speed, cutIns);

  const play = (cutIn?: CutInSpec | null) =>
    player.play(cutIn ?? null, (at) => {
      const plan = kaosPlan(at);
      return {
        start: { plan, step: 'enter' },
        cues: [
          { at: plan.channel, change: (n) => ({ ...n, step: 'channel' }) },
          { at: plan.lock, change: (n) => ({ ...n, step: 'lock' }) },
          { at: plan.blast, change: (n) => ({ ...n, step: 'blast' }) },
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
          name: 'kaos',
          step: now.step,
          heroAside: now.step !== 'recover',
          enemy: now.step === 'lock' ? 'drawn' : now.step === 'blast' ? 'struck' : undefined,
          // The blast's and the lock's lengths, for the field's own rules (the shake, the creature).
          vars: () => ({ '--magic-ms': `${now.plan.ms.BLAST}ms`, '--lock-ms': `${now.plan.ms.LOCK}ms` }),
          field: (marks) => <KaosFigure marks={marks} step={now.step} plan={now.plan} />,
          over: (marks) => <KaosOver marks={marks} step={now.step} plan={now.plan} />,
        }
      : null;

  return { play, stop: player.stop, playing: player.playing, scene };
}
