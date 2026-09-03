// What Greenwood has lying in it, and what lives in it.
//
// Content only, and deliberately small: four things to pick up and one
// thing that would rather you did not. None of them change a number,
// because there are no numbers yet — an item here is a moment and a
// line of description, which is the whole of what a find is worth
// before there is anything to spend it on.

export interface FoundItemDef {
  id: string;
  name: string;
  /** Two lines at most: this is read standing up, in a forest. */
  description: string;
}

export const FOREST_ITEMS: readonly FoundItemDef[] = [
  {
    id: 'FOREST_HERB',
    name: '薬草',
    description: '森に生える香りの強い薬草。小さな傷なら役に立ちそうだ。',
  },
  {
    id: 'OLD_ARROWHEAD',
    name: '古い矢じり',
    description: '地面から半分だけ出ていた。誰かがここで狩りをしていた。',
  },
  {
    id: 'BROKEN_CLASP',
    name: '割れた留め金',
    description: '紐が切れている。落とした人は、まだ探しているだろうか。',
  },
  {
    id: 'ROUND_ACORN',
    name: 'まるいどんぐり',
    description: 'つやがあって、よくまるい。持っていても、たぶん何も起きない。',
  },
];

/** One of them, at random. Injectable rng so a test can pin it. */
export function pickForestItem(rng: () => number = Math.random): FoundItemDef {
  return FOREST_ITEMS[Math.min(FOREST_ITEMS.length - 1, Math.floor(rng() * FOREST_ITEMS.length))];
}

export interface BattleEnemyDef {
  id: string;
  name: string;
  /** Stands in for art that does not exist yet. */
  glyph: string;
  /** What is said once it is beaten. Nobody dies here either. */
  defeatedSpeaker: string | null;
  defeatedText: string;
}

/**
 * The one thing in Greenwood that fights back.
 *
 * A stray, not a monster: hungry, outnumbered, and gone the moment it
 * stops being sure of winning. The forest is not a dungeon and this is
 * not a bestiary — it exists so that walking towards something unknown
 * carries a little weight.
 */
export const GREENWOOD_STRAY_WOLF: BattleEnemyDef = {
  id: 'GREENWOOD_STRAY_WOLF',
  name: 'はぐれ狼',
  glyph: '🐺',
  defeatedSpeaker: null,
  defeatedText: '狼は一歩下がり、木立の奥へ消えていった。',
};
