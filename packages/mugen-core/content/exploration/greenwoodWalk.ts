// グリーンウッドの森 — walked, in the App.
//
// The first place in the walk template (`walkScene.ts`). Things along
// the way picked from what the painting already shows — the puddle on
// the right of the path, the fallen log by the water, the old tree on
// the left — placed on them by the painting's own coordinates; and, on
// the bare earth of the path, fresh footprints while there is somebody
// out there to have made them.
//
// THE PAINTING (作者 2026-10-19): the forest's road among mossy ruins, the bridge
// over the falls — delivered with its grid image, as the ruins' was. Where one can
// walk is read off that grid (緑 the road, 黄 four ways off it, the rest not walked);
// the forest's own things stand on its blue, purple and orange marks. Their words
// are the ones they always had — none was written for this painting (要判断).
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

/** The road (緑 MAIN), from the author's grid image of the forest (2026-10-19). */
const FOREST_ROAD = [
  { x: 0.359, y: 0.472 },
  { x: 0.414, y: 0.528 },
  { x: 0.422, y: 0.514 },
  { x: 0.453, y: 0.528 },
  { x: 0.461, y: 0.5 },
  { x: 0.492, y: 0.486 },
  { x: 0.523, y: 0.528 },
  { x: 0.539, y: 0.5 },
  { x: 0.594, y: 0.5 },
  { x: 0.617, y: 0.569 },
  { x: 0.664, y: 0.556 },
  { x: 0.688, y: 0.583 },
  { x: 0.75, y: 0.569 },
  { x: 0.766, y: 0.597 },
  { x: 0.797, y: 0.569 },
  { x: 0.805, y: 0.597 },
  { x: 0.883, y: 0.611 },
  { x: 0.898, y: 0.653 },
  { x: 0.93, y: 0.667 },
  { x: 0.93, y: 0.708 },
  { x: 0.898, y: 0.722 },
  { x: 0.875, y: 0.694 },
  { x: 0.789, y: 0.708 },
  { x: 0.758, y: 0.667 },
  { x: 0.703, y: 0.667 },
  { x: 0.703, y: 0.653 },
  { x: 0.625, y: 0.681 },
  { x: 0.594, y: 0.625 },
  { x: 0.562, y: 0.625 },
  { x: 0.531, y: 0.667 },
  { x: 0.5, y: 0.583 },
  { x: 0.461, y: 0.583 },
  { x: 0.445, y: 0.625 },
  { x: 0.43, y: 0.597 },
  { x: 0.422, y: 0.611 },
  { x: 0.383, y: 0.597 },
  { x: 0.367, y: 0.639 },
  { x: 0.391, y: 0.694 },
  { x: 0.344, y: 0.764 },
  { x: 0.312, y: 0.708 },
  { x: 0.273, y: 0.722 },
  { x: 0.266, y: 0.694 },
  { x: 0.305, y: 0.625 },
  { x: 0.305, y: 0.569 },
  { x: 0.281, y: 0.528 },
  { x: 0.312, y: 0.486 },
  { x: 0.344, y: 0.5 },
] as const;

/**
 * The four ways off it (黄 SIDE): up the left past the old stonework to the
 * great tree, down to the rocks at the lower left, up to the right, and down
 * past the bridge to the bank of the falls.
 */
const FOREST_WAYS_OFF = [
  [
    { x: 0.17, y: 0.26 },
    { x: 0.27, y: 0.265 },
    { x: 0.285, y: 0.28 },
    { x: 0.29, y: 0.4 },
    { x: 0.32, y: 0.42 },
    { x: 0.355, y: 0.43 },
    { x: 0.362, y: 0.47 },
    { x: 0.36, y: 0.505 },
    { x: 0.3, y: 0.505 },
    { x: 0.295, y: 0.45 },
    { x: 0.265, y: 0.42 },
    { x: 0.26, y: 0.3 },
    { x: 0.17, y: 0.3 },
  ],
  [
    { x: 0.208, y: 0.665 },
    { x: 0.247, y: 0.642 },
    { x: 0.3, y: 0.648 },
    { x: 0.339, y: 0.671 },
    { x: 0.39, y: 0.712 },
    { x: 0.45, y: 0.729 },
    { x: 0.45, y: 0.746 },
    { x: 0.384, y: 0.752 },
    { x: 0.339, y: 0.717 },
    { x: 0.3, y: 0.73 },
    { x: 0.286, y: 0.775 },
    { x: 0.273, y: 0.856 },
    { x: 0.195, y: 0.856 },
    { x: 0.189, y: 0.752 },
    { x: 0.208, y: 0.717 },
  ],
  [
    { x: 0.72, y: 0.5 },
    { x: 0.745, y: 0.49 },
    { x: 0.75, y: 0.475 },
    { x: 0.79, y: 0.475 },
    { x: 0.8, y: 0.5 },
    { x: 0.815, y: 0.51 },
    { x: 0.815, y: 0.57 },
    { x: 0.8, y: 0.6 },
    { x: 0.73, y: 0.6 },
    { x: 0.715, y: 0.57 },
  ],
  [
    { x: 0.6, y: 0.665 },
    { x: 0.86, y: 0.665 },
    { x: 0.865, y: 0.7 },
    { x: 0.86, y: 0.79 },
    { x: 0.855, y: 0.84 },
    { x: 0.8, y: 0.845 },
    { x: 0.79, y: 0.8 },
    { x: 0.78, y: 0.73 },
    { x: 0.75, y: 0.71 },
    { x: 0.66, y: 0.71 },
    { x: 0.655, y: 0.725 },
    { x: 0.615, y: 0.725 },
    { x: 0.6, y: 0.7 },
  ],
] as const;

export const GREENWOOD_WALK: WalkSceneDef = {
  id: 'GREENWOOD_FOREST',
  title: 'グリーンウッドの森',
  points: [
    {
      id: 'PUDDLE',
      label: '水たまり',
      // The blue mark under the bridge: the water below it, looked at from the
      // way off the road on the bridge's left.
      at: { x: 0.709, y: 0.747 },
      stand: { x: 0.63, y: 0.715 },
      marker: { x: 0.709, y: 0.72 },
      lines: [{ text: '水たまりに、木漏れ日が揺れている。' }],
    },
    {
      // A TRACE, NOT A CLUE WITH AN ANSWER. Somebody walked here, alone,
      // away from the village — and that is all it says. It names nobody
      // and settles nothing; it is only on the ground while the man in
      // the road is still out there, and gone once the four answers are.
      id: 'FRESH_FOOTPRINTS',
      label: '新しい足跡',
      // The grid's orange mark (an event: 伏線), on the road.
      at: { x: 0.363, y: 0.567 },
      stand: { x: 0.385, y: 0.575 },
      when: BEFORE_THE_ANSWER,
      lines: [{ text: '湿った土に、まだ新しい足跡が残っている。\n一人分だ。村とは逆方向へ続いている。' }],
    },
    {
      id: 'FALLEN_LOG',
      label: '倒れた丸太',
      // The blue mark at the road's left end.
      at: { x: 0.314, y: 0.561 },
      marker: { x: 0.314, y: 0.53 },
      stand: { x: 0.335, y: 0.575 },
      lines: [
        { text: '丸太の苔が、誰かに踏まれて剥げている。', when: BEFORE_THE_ANSWER },
        { text: '剥げていた苔が、また丸太を覆いはじめている。', when: AFTER_THE_ANSWER },
      ],
    },
    {
      id: 'OLD_TREE',
      label: '古い大樹',
      // The blue mark up the way off to the left, under the great tree.
      at: { x: 0.291, y: 0.402 },
      marker: { x: 0.291, y: 0.37 },
      stand: { x: 0.3, y: 0.43 },
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
  // Now and then, over the leaves already falling: a few let go together, the light sways, small insects.
  gusts: { kinds: ['LEAF_DRIFT', 'SUNBEAM', 'BUGS'] },
  // The man in the road, seen from a long way off — until he is not.
  figures: [{ id: 'GALD', at: { x: 0.66, y: 0.565 }, when: BEFORE_THE_ANSWER }],
  painting: 'GREENWOOD_RUINS',
  // The ways off the road climb into the upper half and drop below it to the
  // falls: the camera follows the party up and down (as the grassland's does),
  // so a walker up by the great tree is whole and one down by the falls stays
  // above the forest's doors. `framing` is where it looks before anyone moves.
  followY: true,
  framing: 0.5,
  // WALKED ABOUT IN, as the ruins are: the open clearing, from the logs
  // and the water's edge at the back to the dark roots and rocks at the
  // front — not the trees, the water or the undergrowth.
  roam: {
    // The outline of old, kept for anything that still reads it: the road's.
    floor: FOREST_ROAD,
    areas: {
      main: [FOREST_ROAD],
      // No words on stepping in: none were written for this painting.
      side: FOREST_WAYS_OFF.map((outline) => ({ outline })),
    },
    far: 0.3,
    near: 0.8,
    // Up the ways off the road, walkers are drawn smaller.
    farScale: 0.62,
    start: { x: 0.91, y: 0.69 },
    // THINGS TO PICK UP — three, so a walk now and then turns up something
    // to carry home, never a floor of glints. Out of sight of where the
    // party walks in (further in, to the left), and clear of the forest's
    // own things and of the spots where small finds turn up.
    pickups: [
      {
        id: 'forest_pickup_001',
        label: '草むら',
        // The purple marks (採取): the way off on the right…
        at: { x: 0.757, y: 0.494 },
        line: '草むらをかき分けると、香りの強い草が生えていた。',
        items: [
          { itemId: 'FOREST_HERB', quantity: 1, weight: 65 },
          { itemId: 'MANA_HERB', quantity: 1, weight: 35 },
        ],
      },
      {
        id: 'forest_pickup_002',
        label: '木の根元',
        // …up the way off on the left, below the great tree's roots…
        at: { x: 0.21, y: 0.275 },
        line: '木の根元に、固い木の実がいくつも落ちていた。',
        items: [{ itemId: 'FOREST_NUT', quantity: 2 }],
      },
      {
        id: 'forest_pickup_003',
        label: '岩陰',
        // …and among the rocks of the way off at the lower left.
        at: { x: 0.231, y: 0.771 },
        line: '岩の陰に、何か光るものが挟まっていた。',
        items: [
          { itemId: 'IRON_ORE', quantity: 1, weight: 85 },
          { itemId: 'MANA_SHARD', quantity: 1, weight: 15 },
        ],
      },
    ],
    spots: [
      { x: 0.48, y: 0.53 },
      { x: 0.56, y: 0.59 },
      { x: 0.52, y: 0.56 },
      { x: 0.6, y: 0.55 },
      { x: 0.7, y: 0.62 },
      { x: 0.84, y: 0.66 },
      { x: 0.33, y: 0.72 },
      { x: 0.76, y: 0.585 },
      { x: 0.85, y: 0.69 },
    ],
    // SMALL THINGS IN A FOREST. Plants, animals, the weather — never a
    // person: who has been walking here is the footprints' to say, and
    // only while it is so.
    discoveries: [
      { id: 'MUSHROOMS', label: '小さなきのこ', text: '倒れた枝の陰に、小さなきのこが並んで生えている。' },
      { id: 'ACORN', label: 'どんぐり', text: 'どんぐりが一つ、苔の上に転がっている。' },
      { id: 'BLUE_FEATHER', label: '鳥の羽根', text: '青い小鳥の羽根が、一枚落ちている。' },
      { id: 'DEWY_WEB', label: '蜘蛛の巣', text: '枝の間に張られた蜘蛛の巣に、露が光っている。' },
      { id: 'CLOVER', label: 'クローバー', text: 'クローバーの群れの中に、四つ葉が一枚まじっている。' },
      { id: 'GNAWED_SHELLS', label: '木の実の殻', text: 'かじられた木の実の殻が、いくつも散らばっている。' },
      { id: 'MOSSY_ROOT', label: '苔むした根', text: '地面から盛り上がった根が、すっかり苔に覆われている。' },
      { id: 'BLUE_FLOWER', label: '青い花', text: '青い小さな花が、木漏れ日の中で揺れている。' },
      { id: 'SNAIL', label: 'かたつむり', text: '葉の裏で、かたつむりがゆっくり動いている。' },
      { id: 'LEAF_DRIFT', label: '落ち葉', text: '吹き寄せられた落ち葉が、柔らかく積もっている。' },
      { id: 'ROUND_PEBBLE', label: '丸い小石', text: '水に磨かれたような、丸い小石が落ちている。' },
      { id: 'DEER_TRACKS', label: '鹿の足跡', text: '鹿の足跡が、水辺の方へ続いている。' },
    ],
    // GOLDEN (2026-10-11, 作者判断 A): now and then, something worth carrying
    // home — a material already in the catalogue, into the bag. Plants,
    // water and an old arrowhead; no person, and no new material.
    rareDiscoveries: [
      { id: 'HERB_PATCH', label: '薬草の群れ', text: '香りの強い薬草が、群れになって生えている。', reward: { kind: 'MATERIAL', itemId: 'FINE_HERB', quantity: 1 } },
      { id: 'GLOWING_DEW', label: '光る露', text: '葉の先に、淡く光る露をつけた草がある。', reward: { kind: 'MATERIAL', itemId: 'MANA_HERB', quantity: 1 } },
      { id: 'NUT_CACHE', label: '木のうろ', text: '木のうろに、木の実がたくさん詰まっている。', reward: { kind: 'MATERIAL', itemId: 'FOREST_NUT', quantity: 2 } },
      { id: 'CLEAR_SPRING', label: '湧き水', text: '岩の割れ目から、澄んだ水がわき出ている。', reward: { kind: 'MATERIAL', itemId: 'MANA_WATER', quantity: 1 } },
      { id: 'TRUNK_ARROWHEAD', label: '古い矢じり', text: '古い矢じりが、木の幹に刺さったままになっている。', reward: { kind: 'COLLECTIBLE', itemId: 'OLD_ARROWHEAD', quantity: 1 } },
    ],
  },
};

