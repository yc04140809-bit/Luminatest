// 古代遺跡 (ANCIENT_RUINS) — walked, in the App. Working title.
//
// The second place in the walk template (`walkScene.ts`), and the first
// that is not the forest: the same walk, glints and ambience across a
// different painting and different ground. Reached only from a
// developer's door, and — once the tavern's master has told of what was
// sealed here — from the map (the first boss route, content/story/
// sekiryugaArc.ts). No memory.
//
// THE WORDS ONLY SAY WHAT THE PAINTING SHOWS. The stairs, the banners,
// the arches, the water far off — nothing about who built it, when, or
// what became of them. Those are not decided, and this does not decide
// them.

import type { WalkSceneDef } from './walkScene';
import { WALK_PLACES } from './walkPlaces';
import { RUINS_PAST_BATTLE_TRACES } from '../story/sekiryugaArc';

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
    // THINGS TO PICK UP — four, among the stones, all above the band the
    // way deeper takes along the bottom, and clear of where small finds
    // turn up. The fragment is said to be found, and nothing more: what it
    // is, is not told.
    pickups: [
      {
        id: 'ruins_pickup_001',
        label: '壊れた壺',
        at: { x: 0.4, y: 0.49 },
        line: '割れた壺の底に、古い硬貨が残っていた。',
        items: [{ itemId: 'OLD_COIN', quantity: 2 }],
      },
      {
        id: 'ruins_pickup_002',
        label: '瓦礫',
        at: { x: 0.58, y: 0.62 },
        line: '崩れた石の下に、何かが埋もれていた。',
        items: [
          { itemId: 'IRON_ORE', quantity: 1, weight: 70 },
          { itemId: 'FOREST_HERB', quantity: 1, weight: 30 },
        ],
      },
      {
        id: 'ruins_pickup_003',
        label: '床の光',
        at: { x: 0.32, y: 0.605 },
        line: '石畳のすき間で、小さな光が揺れていた。',
        items: [{ itemId: 'MANA_SHARD', quantity: 1 }],
      },
      {
        id: 'ruins_pickup_004',
        label: '古い箱',
        at: { x: 0.2, y: 0.62 },
        line: '朽ちかけた箱の中に、小さな破片がひとつ。',
        items: [{ itemId: 'ANCIENT_SHARD', quantity: 1 }],
      },
    ],
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
      // AND TRACES OF A FIGHT, long ago — a sword's scar, a scorch, a worn
      // seat. Whose, nothing says (content/story/sekiryugaArc.ts).
      ...RUINS_PAST_BATTLE_TRACES,
    ],
    // GOLDEN: rarer — and, from 2026-10-11 (作者判断 A), most hand over a
    // material already in the catalogue, into the bag (no new material).
    // The glass bead stays a sight.
    rareDiscoveries: [
      { id: 'OLD_COIN', label: '古いコイン', text: '古いコインが落ちている。', reward: { kind: 'VALUABLE', itemId: 'OLD_COIN', quantity: 1 } },
      { id: 'ORE_SHARD', label: '鉱石の欠片', text: '珍しい鉱石の欠片を見つけた。', reward: { kind: 'MATERIAL', itemId: 'IRON_ORE', quantity: 1 } },
      { id: 'OLD_FITTING', label: '古びた金具', text: '古びた金具が土に埋もれている。', reward: { kind: 'MATERIAL', itemId: 'BROKEN_CLASP', quantity: 1 } },
      { id: 'GOLD_CLASP', label: '金の留め具', text: '金色の小さな留め具が、石のすき間で光っている。', reward: { kind: 'MATERIAL', itemId: 'BROKEN_CLASP', quantity: 1 } },
      { id: 'GLASS_BEAD', label: '硝子玉', text: '色の褪せた硝子玉が、陽を受けてきらめいている。' },
    ],
    // ONCE IN A WORLD: 《星紋の遺剣》.
    rainbow: { id: 'STAR_CREST_RELIC_SWORD', label: '虹色の光', equipmentId: 'weapon/star_crest_relic_sword' },
  },
};

/** The paved road (緑 MAIN), from the author's grid image of the ruins (2026-10-17). */
const RUINS_MAIN = [
        { x: 0.179, y: 0.71 },
        { x: 0.269, y: 0.691 },
        { x: 0.383, y: 0.65 },
        { x: 0.455, y: 0.622 },
        { x: 0.514, y: 0.595 },
        { x: 0.553, y: 0.555 },
        { x: 0.598, y: 0.537 },
        { x: 0.658, y: 0.499 },
        { x: 0.712, y: 0.468 },
        { x: 0.769, y: 0.425 },
        { x: 0.781, y: 0.351 },
        { x: 0.791, y: 0.308 },
        { x: 0.861, y: 0.303 },
        { x: 0.882, y: 0.372 },
        { x: 0.864, y: 0.468 },
        { x: 0.855, y: 0.502 },
        { x: 0.785, y: 0.553 },
        { x: 0.779, y: 0.582 },
        { x: 0.807, y: 0.646 },
        { x: 0.861, y: 0.664 },
        { x: 1.0, y: 0.68 },
        { x: 1.0, y: 1.0 },
        { x: 0.556, y: 1.0 },
        { x: 0.538, y: 0.946 },
        { x: 0.434, y: 0.903 },
        { x: 0.413, y: 0.82 },
        { x: 0.359, y: 0.749 },
        { x: 0.251, y: 0.735 },
] as const;

/** The old steps on the left up to the small arch (黄 SIDE). */
const RUINS_SIDE_STEPS = [
        { x: 0.057, y: 0.356 },
        { x: 0.179, y: 0.374 },
        { x: 0.263, y: 0.395 },
        { x: 0.299, y: 0.468 },
        { x: 0.335, y: 0.553 },
        { x: 0.362, y: 0.6 },
        { x: 0.389, y: 0.654 },
        { x: 0.269, y: 0.693 },
        { x: 0.251, y: 0.661 },
        { x: 0.197, y: 0.597 },
        { x: 0.167, y: 0.533 },
        { x: 0.144, y: 0.48 },
        { x: 0.096, y: 0.438 },
        { x: 0.06, y: 0.395 },
] as const;

/**
 * 古代遺跡, ITS GROUND TOLD APART — the PoC of 作者「探索画面仕様 更新指示」(2026-10-17).
 *
 * The same painting, read as the author's grid image draws it: the paved road (緑 MAIN) from
 * the front up to the far steps on the right; the old steps on the left (黄 SIDE) climbing to
 * the small arch — a way off the road, with something to find; everything else (赤) not walked:
 * the rubble at the front, the low walls, the cliffs and the distance. The three things to look
 * at stand where the grid's blue marks are (the arch at the top of the side steps, the carved
 * stone beside them, the fallen pillar on the right), with the arch, the banner and the steps of
 * old kept as they were — every id, pickup and find the same; only where they stand moves, onto
 * the ground.
 *
 * DEBUG only, for now (`?preview=walk&place=ANCIENT_RUINS&areas=1`): RUINS_WALK above is what the
 * game walks, untouched, until this is decided. Then it is one line to swap.
 */
export const RUINS_WALK_AREAS_POC: WalkSceneDef = {
  ...RUINS_WALK,
  // The painting the grid image was drawn over (delivered with it), not the ruins' battle background.
  painting: 'RUINS_PATH',
  // Its road runs from the front to steps high on the right: the screen looks at its middle.
  framing: 0.45,
  points: [
    {
      id: 'STONE_ARCH',
      label: '石造りのアーチ',
      at: { x: 0.17, y: 0.39 },
      marker: { x: 0.144, y: 0.33 },
      stand: { x: 0.19, y: 0.39 },
      lines: [{ text: '欠けた石のアーチが、遠い山々を切り取っている。' }],
    },
    {
      id: 'OLD_BANNER',
      label: '古い旗',
      at: { x: 0.74, y: 0.46 },
      // Under the banners on the pillars to the right of the far steps.
      marker: { x: 0.715, y: 0.21 },
      stand: { x: 0.748, y: 0.468 },
      lines: [{ text: '色褪せた旗が、風に小さく揺れている。' }],
    },
    {
      id: 'BROKEN_STEPS',
      label: '崩れた石段',
      at: { x: 0.23, y: 0.52 },
      marker: { x: 0.18, y: 0.47 },
      stand: { x: 0.25, y: 0.53 },
      lines: [{ text: '崩れた石段に、白い花が根を張っている。' }],
    },
    {
      id: 'CARVED_STONE',
      label: '刻まれた石',
      at: { x: 0.35, y: 0.6 },
      marker: { x: 0.378, y: 0.5 },
      stand: { x: 0.353, y: 0.611 },
      lines: [{ text: '倒れかけた石の面に、細かな模様が刻まれている。' }],
    },
    {
      id: 'FALLEN_PILLAR',
      label: '倒れた柱',
      at: { x: 0.8, y: 0.66 },
      marker: { x: 0.921, y: 0.51 },
      stand: { x: 0.8, y: 0.66 },
      lines: [{ text: '倒れた柱の端に、丸い紋様が残っている。' }],
    },
  ],
  roam: {
    ...RUINS_WALK.roam!,
    // The outline of old, kept for anything that still reads it: the road's.
    floor: RUINS_MAIN,
    areas: {
      main: [RUINS_MAIN],
      side: [
        {
          outline: RUINS_SIDE_STEPS,
          enter: '崩れた石段が、上の小さなアーチへ続いている。',
        },
      ],
    },
    // The road climbs far back to the steps: walkers there are drawn much smaller.
    far: 0.33,
    near: 0.72,
    farScale: 0.55,
    start: { x: 0.76, y: 0.62 },
    pickups: [
      { ...RUINS_WALK.roam!.pickups![0], at: { x: 0.538, y: 0.638 } },
      { ...RUINS_WALK.roam!.pickups![1], at: { x: 0.86, y: 0.7 } },
      // Two of the four up the side steps: off the way is where things are.
      { ...RUINS_WALK.roam!.pickups![2], at: { x: 0.12, y: 0.404 } },
      { ...RUINS_WALK.roam!.pickups![3], at: { x: 0.227, y: 0.611 } },
    ],
    spots: [
      { x: 0.45, y: 0.66 },
      { x: 0.6, y: 0.62 },
      { x: 0.7, y: 0.57 },
      { x: 0.78, y: 0.52 },
      { x: 0.65, y: 0.7 },
      { x: 0.33, y: 0.7 },
      { x: 0.2, y: 0.46 },
      { x: 0.28, y: 0.55 },
      { x: 0.83, y: 0.4 },
    ],
  },
};
