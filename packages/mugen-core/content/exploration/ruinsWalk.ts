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
      stand: { x: 0.55, y: 0.51 },
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
      stand: { x: 0.35, y: 0.5 },
      lines: [{ text: '色褪せた旗が、風に小さく揺れている。' }],
    },
    {
      id: 'BROKEN_STEPS',
      label: '崩れた石段',
      at: { x: 0.12, y: 0.44 },
      // On the steps themselves.
      marker: { x: 0.14, y: 0.39 },
      stand: { x: 0.19, y: 0.52 },
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
  // WALKED ABOUT IN: the whole stone floor, from the foot of the steps
  // and the arches at the back to the flowers at the front — not the
  // steps, walls, low parapet or the drop beyond it on the right.
  roam: {
    floor: [
      { x: 0.03, y: 0.52 },
      { x: 0.12, y: 0.49 },
      { x: 0.3, y: 0.475 },
      { x: 0.52, y: 0.47 },
      // Right of the arch the floor stops at the low parapet, with the drop beyond.
      { x: 0.58, y: 0.5 },
      { x: 0.64, y: 0.53 },
      { x: 0.8, y: 0.545 },
      { x: 0.9, y: 0.575 },
      { x: 0.93, y: 0.62 },
      { x: 0.93, y: 0.95 },
      { x: 0.08, y: 0.95 },
      { x: 0.02, y: 0.62 },
    ],
    far: 0.47,
    near: 0.67,
    start: { x: 0.76, y: 0.62 },
    // Spread over the open floor, clear of where the arch, the banner and
    // the steps are looked at from.
    spots: [
      { x: 0.07, y: 0.56 },
      { x: 0.26, y: 0.62 },
      { x: 0.44, y: 0.56 },
      { x: 0.38, y: 0.645 },
      { x: 0.5, y: 0.63 },
      { x: 0.64, y: 0.57 },
      { x: 0.66, y: 0.655 },
      { x: 0.77, y: 0.58 },
      { x: 0.86, y: 0.635 },
      { x: 0.12, y: 0.64 },
    ],
    // SMALL THINGS ON THE GROUND. Only what could lie on an old stone
    // floor; nothing says who was here, when, or why.
    discoveries: [
      { id: 'WHITE_FLOWER', label: '白い花', text: '石のすき間で、白い花が風に揺れている。' },
      { id: 'CRACKED_SLAB', label: 'ひび割れた石板', text: 'ひび割れた石板が、半ば土に埋もれている。' },
      { id: 'OLD_FOOTPRINTS', label: '古い足跡', text: '乾いた土に、古い足跡がかすかに残っている。' },
      { id: 'SMALL_PUDDLE', label: '小さな水たまり', text: '石畳のくぼみに、小さな水たまりができている。\n空が映っている。' },
      { id: 'MOSSY_STONE', label: '苔むした石', text: '苔むした石が、陽を受けて柔らかく光っている。' },
      { id: 'BROKEN_ARROW', label: '折れた矢', text: '折れた矢が一本、石のすき間に挟まっている。\nずいぶん古いものだ。' },
      { id: 'WORN_CREST', label: '古い紋章', text: '石に刻まれた紋章が、すり減って形を失いかけている。' },
      { id: 'SAT_HERE', label: '平たい石', text: '平たい石の上だけ、苔が薄い。\n誰かがよく腰かけていたのかもしれない。' },
      { id: 'ANIMAL_TRACKS', label: '動物の足跡', text: '小さな獣の足跡が、草むらの方へ続いている。' },
      { id: 'WORN_LETTERS', label: '風化した文字', text: '石に文字のようなものが刻まれている。\n風化して、もう読めない。' },
      { id: 'FEATHER', label: '落ちている羽根', text: '小さな鳥の羽根が一枚、石畳に落ちている。' },
      { id: 'WARM_STONE', label: '日だまりの石', text: '日だまりの石が、ほんのり温かい。' },
    ],
  },
};
