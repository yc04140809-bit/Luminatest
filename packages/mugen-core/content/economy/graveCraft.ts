// グレイヴの簡単な加工 (作者指示 2026-10-11: 探索 → 素材 → 利用 → また探索).
//
// Not a smithy: the tavern's master was an adventurer once, and a little
// handwork is within him. A few things, from what the forest gives, made
// on the spot. A real smith comes with the village's rebuilding (after the
// raid) — this is the step before, and it should feel like one: plain,
// early, never required, nothing that outclasses what a smith will make.
//
// Each is made as often as the materials allow (the bag is the limit),
// except the charm: one is enough, and it is made once.

import type { TradeLine } from './tavernTrades';

export type CraftOutput =
  | { kind: 'ITEM'; itemId: string; quantity: number }
  | { kind: 'EQUIPMENT'; equipmentId: string };

export interface GraveCraft {
  id: string;
  /** What it is called on his list. */
  name: string;
  give: readonly TradeLine[];
  get: CraftOutput;
  /** One line on what it is for. */
  note: string;
}

export const GRAVE_CRAFTS: readonly GraveCraft[] = [
  {
    id: 'CRAFT_HERB_BUNDLE',
    name: '薬草束',
    give: [{ itemId: 'FOREST_HERB', quantity: 3 }],
    get: { kind: 'ITEM', itemId: 'FINE_HERB', quantity: 1 },
    note: '薬草をまとめて煎じる。上薬草になる。',
  },
  {
    id: 'CRAFT_MANA_DROP',
    name: '魔力の雫',
    give: [{ itemId: 'MANA_HERB', quantity: 2 }],
    get: { kind: 'ITEM', itemId: 'MANA_WATER', quantity: 1 },
    note: '魔力草を搾って澄ませる。魔力水になる。',
  },
  {
    id: 'CRAFT_IRON_CHARM',
    name: '鉄の護符',
    give: [{ itemId: 'IRON_ORE', quantity: 3 }],
    get: { kind: 'EQUIPMENT', equipmentId: 'accessory/iron_charm' },
    note: '鉄を打って護符にする。身につけると、剣にほんの少し力が乗る。',
  },
];

export function graveCraft(id: string): GraveCraft | null {
  return GRAVE_CRAFTS.find((c) => c.id === id) ?? null;
}

/** What he says around it. */
export const GRAVE_CRAFT_WORDS = {
  open: '本職の鍛冶屋の真似事はできねぇが……これくらいなら、俺の手でもなんとかなる。',
  done: 'ほらよ。素人仕事だが、使えなくはねぇ。',
  short: '素材が足りねぇな。森で集めてきな。',
  full: 'これ以上は持てねぇだろ。',
  owned: 'それはもう渡したろ。',
} as const;
