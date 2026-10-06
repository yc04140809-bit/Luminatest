// 古代遺跡 (ANCIENT_RUINS) — walked, in the App. Working title.
//
// The second place in the walk template (`walkScene.ts`), and the first
// that is not the forest: the same walk, glints and ambience across a
// different painting and different ground. Reached only from a
// developer's door for now — no map, no story, no memory.
//
// THE WORDS ONLY SAY WHAT THE PAINTING SHOWS. The stairs, the banners,
// the arches, the water far off — nothing about who built it, when, or
// what became of them. Those are not decided, and this does not decide
// them.

import type { WalkSceneDef } from './walkScene';
import { WALK_PLACES } from './walkPlaces';

export const RUINS_WALK: WalkSceneDef = {
  id: 'ANCIENT_RUINS',
  title: WALK_PLACES.ANCIENT_RUINS.title,
  // Its arches, banners and mountains stand in the upper half of the
  // painting, so the screen looks higher up it than the forest's does.
  framing: 0.3,
  points: [
    {
      id: 'STONE_ARCH',
      label: '石造りのアーチ',
      at: { x: 0.5, y: 0.42 },
      // On the arch's pillars, where the eye goes.
      marker: { x: 0.5, y: 0.38 },
      lines: [{ text: '欠けた石のアーチが、遠い山々を切り取っている。' }],
    },
    {
      id: 'OLD_BANNER',
      label: '古い旗',
      // The glint sits on the floor at the foot of the banner's pillar,
      // as the forest's do on the ground: up among the ivy it is lost.
      at: { x: 0.3, y: 0.47 },
      // Just under the banner's fringe, on the pillar it hangs from.
      marker: { x: 0.3, y: 0.36 },
      lines: [{ text: '色褪せた旗が、風に小さく揺れている。' }],
    },
    {
      id: 'BROKEN_STEPS',
      label: '崩れた石段',
      at: { x: 0.12, y: 0.44 },
      // On the steps themselves.
      marker: { x: 0.14, y: 0.39 },
      lines: [{ text: '崩れた石段に、白い花が根を張っている。' }],
    },
  ],
  ambientLines: [
    { text: '石畳のすき間から、草が伸びている。' },
    { text: '遠くで、水の落ちる音がする。' },
    { text: '白い花びらが、風に舞っている。' },
  ],
  // Petals and motes of light; no flock crossing — the ruins are still.
  ambience: ['LEAVES', 'MOTES'],
};
