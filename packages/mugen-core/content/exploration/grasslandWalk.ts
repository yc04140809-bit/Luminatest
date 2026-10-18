// 草原 (GRASSLAND), WALKED — the PoC of 作者「探索システム拡張」(2026-10-18): 遠近スケール and
// 探索ポイント発見演出. DEBUG only (`?preview=walk&place=GRASSLAND`); nothing in the game walks it yet.
//
// The painting delivered with its grid image (the open grassland with the stream, the old signpost
// and the great tree), its ground read off that grid image onto the painting itself (the two are
// framed a little differently): the meadow and the road (緑 MAIN), the hill under the great tree, the
// ruins on the right hill, the flowers by the stream and the roadside on the right (黄 SIDE); the
// stream, its rocks, the old stone post and the hill's rock face not walked (赤).
//
// Its things are the grid image's marks: two to look at (the old signpost, the riverside), four to
// gather (stars: the great tree, the hill, the ruins, the flowers) and one event mark on the road's
// right. THE WORDS ONLY SAY WHAT THE PAINTING SHOWS; nothing here decides who was here or why.

import type { WalkSceneDef } from './walkScene';
import { WALK_PLACES } from './walkPlaces';

const MEADOW = [
      { x: 0.02, y: 0.288 },
      { x: 0.2, y: 0.31 },
      { x: 0.33, y: 0.326 },
      { x: 0.43, y: 0.351 },
      { x: 0.47, y: 0.391 },
      { x: 0.7, y: 0.397 },
      { x: 0.86, y: 0.432 },
      { x: 1.0, y: 0.432 },
      { x: 1.0, y: 1.0 },
      { x: 0.33, y: 1.0 },
      { x: 0.28, y: 0.883 },
      { x: 0.3, y: 0.802 },
      { x: 0.33, y: 0.707 },
      { x: 0.29, y: 0.639 },
      { x: 0.37, y: 0.584 },
      { x: 0.41, y: 0.546 },
      { x: 0.5, y: 0.546 },
      { x: 0.512, y: 0.448 },
      { x: 0.46, y: 0.408 },
      { x: 0.42, y: 0.37 },
      { x: 0.33, y: 0.356 },
      { x: 0.2, y: 0.34 },
      { x: 0.02, y: 0.326 },
    ] as const;

const HILL_UNDER_TREE = [
      { x: 0.24, y: 0.315 },
      { x: 0.33, y: 0.292 },
      { x: 0.42, y: 0.279 },
      { x: 0.52, y: 0.261 },
      { x: 0.64, y: 0.265 },
      { x: 0.7, y: 0.279 },
      { x: 0.64, y: 0.293 },
      { x: 0.52, y: 0.288 },
      { x: 0.42, y: 0.302 },
      { x: 0.36, y: 0.329 },
      { x: 0.3, y: 0.342 },
    ] as const;
const RUINS_HILL = [
      { x: 0.705, y: 0.356 },
      { x: 0.8, y: 0.356 },
      { x: 0.9, y: 0.374 },
      { x: 0.945, y: 0.408 },
      { x: 0.94, y: 0.469 },
      { x: 0.82, y: 0.455 },
      { x: 0.72, y: 0.435 },
    ] as const;
const FLOWERS = [
      { x: 0.33, y: 0.761 },
      { x: 0.37, y: 0.709 },
      { x: 0.56, y: 0.709 },
      { x: 0.575, y: 0.761 },
      { x: 0.54, y: 0.802 },
      { x: 0.355, y: 0.802 },
    ] as const;
const ROADSIDE = [
      { x: 0.815, y: 0.611 },
      { x: 1.0, y: 0.611 },
      { x: 1.0, y: 0.713 },
      { x: 0.825, y: 0.713 },
    ] as const;

export const GRASSLAND_WALK_POC: WalkSceneDef = {
  id: 'GRASSLAND',
  title: WALK_PLACES.GRASSLAND.title,
  painting: 'GRASSLAND_RIVER',
  paintingAspect: 1462 / 1076,
  followY: true,
  discoveryFx: true,
  points: [
    {
      id: 'OLD_SIGNPOST',
      label: '古びた道標',
      at: { x: 0.54, y: 0.571 },
      marker: { x: 0.505, y: 0.476 },
      stand: { x: 0.54, y: 0.571 },
      lines: [{ text: '古い道標に、かすれた文字が残っている。' }],
    },
    {
      id: 'RIVERSIDE',
      label: '川辺',
      at: { x: 0.32, y: 0.639 },
      marker: { x: 0.25, y: 0.605 },
      stand: { x: 0.32, y: 0.639 },
      lines: [{ text: '澄んだ流れの底で、小石が光っている。' }],
    },
    {
      id: 'ROADSIDE_MARK',
      kind: 'EVENT',
      label: '道の脇',
      at: { x: 0.86, y: 0.69 },
      // Where the grass is trodden aside: up the roadside ahead of where they stand, clear of Kaos
      // following behind.
      marker: { x: 0.925, y: 0.635 },
      stand: { x: 0.86, y: 0.69 },
      lines: [{ text: '草が踏み分けられ、道から外れて続いている。' }],
    },
  ],
  ambientLines: [
    { text: '風が草を渡っていく。' },
    { text: '遠くで、水の流れる音がする。' },
    { text: '大きな木の葉が、さわさわと鳴っている。' },
  ],
  ambience: ['BIRDS', 'LEAVES'],
  roam: {
    // The outline of old, kept for anything that still reads it: the meadow's.
    floor: MEADOW,
    areas: {
      main: [MEADOW],
      side: [
        { outline: HILL_UNDER_TREE, enter: '丘の上に、大きな木が枝を広げている。' },
        { outline: RUINS_HILL, enter: '小高い丘に、崩れた石柱が立っている。' },
        { outline: FLOWERS, enter: '川べりに、小さな花が群れて咲いている。' },
        { outline: ROADSIDE, enter: '道の脇の草が、少し倒れている。' },
      ],
    },
    // 遠近 (作者: 手前100% / 中景80〜85% / 奥60〜70% / 下限55〜60%): from the hill far back to the front.
    far: 0.288,
    near: 0.95,
    farScale: 0.6,
    start: { x: 0.72, y: 0.842 },
    pickups: [
      { id: 'grass_pickup_001', label: '大樹の根元', at: { x: 0.56, y: 0.274 }, line: '大樹の根元に、葉の陰で草が茂っていた。', items: [{ itemId: 'FINE_HERB', quantity: 1 }] },
      { id: 'grass_pickup_002', label: '丘の草むら', at: { x: 0.33, y: 0.318 }, line: '丘の草むらに、薬草が混じっていた。', items: [{ itemId: 'FOREST_HERB', quantity: 2 }] },
      { id: 'grass_pickup_003', label: '石柱の足もと', at: { x: 0.83, y: 0.408 }, line: '崩れた石柱の足もとに、小さな破片が落ちていた。', items: [{ itemId: 'MANA_SHARD', quantity: 1 }] },
      { id: 'grass_pickup_004', label: '花の群れ', at: { x: 0.41, y: 0.751 }, line: '花の群れの中に、香りの強い草があった。', items: [{ itemId: 'MANA_HERB', quantity: 1 }] },
    ],
    spots: [
      { x: 0.6, y: 0.543 },
      { x: 0.7, y: 0.611 },
      { x: 0.62, y: 0.761 },
      { x: 0.76, y: 0.815 },
      { x: 0.9, y: 0.516 },
      { x: 0.52, y: 0.883 },
      { x: 0.45, y: 0.829 },
      { x: 0.85, y: 0.87 },
      { x: 0.15, y: 0.312 },
      { x: 0.95, y: 0.815 },
    ],
    discoveries: [
      { id: 'GRASS_FEATHER', label: '白い羽', text: '草の上に、白い羽が一枚落ちている。' },
      { id: 'GRASS_STONE', label: '丸い石', text: '手のひらほどの、丸い石が転がっている。' },
      { id: 'GRASS_CLOVER', label: '四つ葉', text: '足もとに、四つ葉が一本だけ混じっている。' },
      { id: 'GRASS_TRACKS', label: '足跡', text: '小さな獣の足跡が、草むらへ続いている。' },
      { id: 'GRASS_DEW', label: '朝露', text: '草の先で、露が光っている。' },
      { id: 'GRASS_BUTTERFLY', label: '蝶', text: '小さな蝶が、花から花へ移っていく。' },
    ],
    rareDiscoveries: [
      { id: 'GRASS_OLD_COIN', label: '古い硬貨', text: '草の根元に、古い硬貨が埋もれていた。', reward: { kind: 'VALUABLE', itemId: 'OLD_COIN', quantity: 1 } },
    ],
  },
};
