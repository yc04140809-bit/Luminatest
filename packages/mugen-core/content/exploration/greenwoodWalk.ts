// グリーンウッドの森 — walked, in the App.
//
// The first place in the walk template (`walkScene.ts`). Things along
// the way picked from what the painting already shows — the puddle on
// the right of the path, the fallen log by the water, the old tree on
// the left — placed on them by the painting's own coordinates; and, on
// the bare earth of the path, fresh footprints while there is somebody
// out there to have made them.
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
      // Looked at from its left: the party comes in from the right and
      // must walk to it, not arrive on top of it.
      stand: { x: 0.68, y: 0.72 },
      marker: { x: 0.75, y: 0.68 },
      lines: [{ text: '水たまりに、木漏れ日が揺れている。' }],
    },
    {
      // A TRACE, NOT A CLUE WITH AN ANSWER. Somebody walked here, alone,
      // away from the village — and that is all it says. It names nobody
      // and settles nothing; it is only on the ground while the man in
      // the road is still out there, and gone once the four answers are.
      id: 'FRESH_FOOTPRINTS',
      label: '新しい足跡',
      at: { x: 0.55, y: 0.74 },
      stand: { x: 0.6, y: 0.74 },
      when: BEFORE_THE_ANSWER,
      lines: [{ text: '湿った土に、まだ新しい足跡が残っている。\n一人分だ。村とは逆方向へ続いている。' }],
    },
    {
      id: 'FALLEN_LOG',
      label: '倒れた丸太',
      at: { x: 0.36, y: 0.52 },
      // On the log's near edge: the top of it is up under the words.
      marker: { x: 0.36, y: 0.56 },
      // On the earth in front of it: the log itself lies beyond the floor.
      stand: { x: 0.41, y: 0.585 },
      lines: [
        { text: '丸太の苔が、誰かに踏まれて剥げている。', when: BEFORE_THE_ANSWER },
        { text: '剥げていた苔が、また丸太を覆いはじめている。', when: AFTER_THE_ANSWER },
      ],
    },
    {
      id: 'OLD_TREE',
      label: '古い大樹',
      at: { x: 0.14, y: 0.46 },
      // At the roots, where the footprints are.
      marker: { x: 0.14, y: 0.58 },
      stand: { x: 0.19, y: 0.6 },
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
  // The clearing's floor sits in the lower middle of the painting: look a
  // little higher than its bottom edge, so a walker at the back of it is
  // still whole on the screen.
  framing: 0.6,
  // WALKED ABOUT IN, as the ruins are: the open clearing, from the logs
  // and the water's edge at the back to the dark roots and rocks at the
  // front — not the trees, the water or the undergrowth.
  roam: {
    floor: [
      { x: 0.03, y: 0.66 },
      { x: 0.12, y: 0.62 },
      { x: 0.22, y: 0.575 },
      { x: 0.4, y: 0.555 },
      { x: 0.55, y: 0.56 },
      { x: 0.75, y: 0.56 },
      { x: 0.88, y: 0.575 },
      { x: 0.97, y: 0.6 },
      { x: 0.97, y: 0.84 },
      { x: 0.04, y: 0.84 },
    ],
    far: 0.56,
    near: 0.78,
    start: { x: 0.84, y: 0.66 },
    // Never low on the floor: the forest's two doors sit along the
    // bottom of the screen, and a find under them could not be reached.
    // THINGS TO PICK UP — three, so a walk now and then turns up something
    // to carry home, never a floor of glints. Out of sight of where the
    // party walks in (further in, to the left), and clear of the forest's
    // own things and of the spots where small finds turn up.
    pickups: [
      {
        id: 'forest_pickup_001',
        label: '草むら',
        at: { x: 0.25, y: 0.595 },
        line: '草むらをかき分けると、香りの強い草が生えていた。',
        items: [
          { itemId: 'FOREST_HERB', quantity: 1, weight: 65 },
          { itemId: 'MANA_HERB', quantity: 1, weight: 35 },
        ],
      },
      {
        id: 'forest_pickup_002',
        label: '木の根元',
        at: { x: 0.16, y: 0.71 },
        line: '木の根元に、固い木の実がいくつも落ちていた。',
        items: [{ itemId: 'FOREST_NUT', quantity: 2 }],
      },
      {
        id: 'forest_pickup_003',
        label: '岩陰',
        at: { x: 0.41, y: 0.71 },
        line: '岩の陰に、何か光るものが挟まっていた。',
        items: [
          { itemId: 'IRON_ORE', quantity: 1, weight: 85 },
          { itemId: 'MANA_SHARD', quantity: 1, weight: 15 },
        ],
      },
    ],
    spots: [
      { x: 0.08, y: 0.68 },
      { x: 0.24, y: 0.72 },
      { x: 0.3, y: 0.64 },
      { x: 0.34, y: 0.72 },
      { x: 0.47, y: 0.7 },
      { x: 0.5, y: 0.6 },
      { x: 0.58, y: 0.6 },
      { x: 0.75, y: 0.59 },
      { x: 0.86, y: 0.72 },
      { x: 0.9, y: 0.66 },
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
  },
};
