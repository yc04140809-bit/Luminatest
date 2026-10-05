// グリーンウッドの森 — walked, in the App.
//
// The first place in the walk template (`walkScene.ts`). Three things
// along the way, picked from what the painting already shows — the
// puddle on the right of the path, the fallen log by the water, the old
// tree on the left — and placed on them by the painting's own
// coordinates.
//
// THE WORDS ONLY NOTICE. Nothing here explains the forest or decides
// anything about anybody. The one thing that changes is the one the
// world already says changes: once the player has given Gald one of the
// four answers, the forest is quieter (the village says the same —
// 「森の方、最近ちょっと静かだな」), the figure in the distance is gone,
// and nobody has been treading the moss on the log.

import type { MemoryEventType } from '../../core/memory/types';
import type { WalkCondition, WalkSceneDef } from './walkScene';

/** The four answers. Knowing any of them is knowing the encounter is over. */
const GALD_ANSWERED: readonly MemoryEventType[] = [
  'PLAYER_KILLED_GALD',
  'PLAYER_SPARED_GALD',
  'PLAYER_HELPED_GALD',
  'PLAYER_CAPTURED_GALD',
];

const BEFORE_THE_ANSWER: WalkCondition = { kind: 'NOT_KNOWN', types: GALD_ANSWERED };
const AFTER_THE_ANSWER: WalkCondition = { kind: 'KNOWN', types: GALD_ANSWERED };

export const GREENWOOD_WALK: WalkSceneDef = {
  id: 'GREENWOOD_FOREST',
  title: 'グリーンウッドの森',
  points: [
    {
      id: 'PUDDLE',
      label: '水たまり',
      at: { x: 0.72, y: 0.7 },
      lines: [{ text: '水たまりに、木漏れ日が揺れている。' }],
    },
    {
      id: 'FALLEN_LOG',
      label: '倒れた丸太',
      at: { x: 0.36, y: 0.52 },
      lines: [
        { text: '丸太の苔が、誰かに踏まれて剥げている。', when: BEFORE_THE_ANSWER },
        { text: '剥げていた苔が、また丸太を覆いはじめている。', when: AFTER_THE_ANSWER },
      ],
    },
    {
      id: 'OLD_TREE',
      label: '古い大樹',
      at: { x: 0.14, y: 0.46 },
      lines: [{ text: '木の根元に、小さな足跡が残っている。' }],
    },
  ],
  ambientLines: [
    { text: '湿った土の匂いがする。' },
    { text: '遠くで枝の折れる音がした。', when: BEFORE_THE_ANSWER },
    { text: '誰かが最近ここを通ったようだ。', when: BEFORE_THE_ANSWER },
    { text: '水の音が、ずっと奥から聞こえる。' },
    { text: '木漏れ日が、足もとで揺れている。' },
    { text: '森は、前より少し静かになった気がする。', when: AFTER_THE_ANSWER },
  ],
  ambience: ['BIRDS', 'LEAVES', 'MOTES'],
  // The man in the road, seen from a long way off — until he is not.
  figures: [{ id: 'GALD', at: { x: 0.3, y: 0.56 }, when: BEFORE_THE_ANSWER }],
};
