// 酒場の物々交換 — THINGS FOR THINGS, AT THE TAVERN (酒場ハブ化 Phase 1, 2026-10-09).
//
// Not a shop: no LUMI changes hands. A stranger with a trade offers one
// swap — what they want from the bag for what they give — and it is made
// at most once while they are in (one night: the guests change with a
// night's rest). Everything here is a thing that already exists in the
// catalogue; nothing is invented for a trade.
//
// HANDY, NEVER NEEDED. Nothing a trade gives is the only way to get it or
// something the story waits on: a herb is still a herb at the shop, and
// what the hooded guest has is a little rarer, not unique. No key item is
// ever asked for or given (`isKeyItem`), and nothing is worth more than
// what it costs by more than a little — it is a reason to look in, not a
// way to mint LUMI.

/** One side of a swap. */
export interface TradeLine {
  itemId: string;
  quantity: number;
}

export interface TavernTrade {
  id: string;
  /** What the stranger wants from the bag. */
  give: readonly TradeLine[];
  /** What they hand over. */
  get: readonly TradeLine[];
  /** The hooded guest's: a little rarer, and said a little differently. */
  rare?: boolean;
}

export const TAVERN_TRADES: readonly TavernTrade[] = [
  // ── the ordinary guests and the warrior: handy ──
  { id: 'TRADE_HERBS_FOR_FINE', give: [{ itemId: 'FOREST_HERB', quantity: 2 }], get: [{ itemId: 'FINE_HERB', quantity: 1 }] },
  { id: 'TRADE_NUTS_FOR_MANA_HERB', give: [{ itemId: 'FOREST_NUT', quantity: 2 }], get: [{ itemId: 'MANA_HERB', quantity: 1 }] },
  { id: 'TRADE_ORE_FOR_COIN', give: [{ itemId: 'IRON_ORE', quantity: 2 }], get: [{ itemId: 'OLD_COIN', quantity: 1 }] },
  { id: 'TRADE_SHARDS_FOR_WATER', give: [{ itemId: 'MANA_SHARD', quantity: 2 }], get: [{ itemId: 'MANA_WATER', quantity: 1 }] },
  // ── the hooded guest: what the shops do not sell, and a use for what only sells ──
  {
    id: 'RARE_RELICS_FOR_SHARD',
    give: [
      { itemId: 'OLD_ARROWHEAD', quantity: 1 },
      { itemId: 'BROKEN_CLASP', quantity: 1 },
    ],
    get: [{ itemId: 'MANA_SHARD', quantity: 1 }],
    rare: true,
  },
  {
    id: 'RARE_COINS_FOR_SHARD',
    give: [{ itemId: 'OLD_COIN', quantity: 2 }],
    get: [{ itemId: 'MANA_SHARD', quantity: 1 }],
    rare: true,
  },
];

export function tavernTrade(id: string | undefined): TavernTrade | null {
  return TAVERN_TRADES.find((t) => t.id === id) ?? null;
}

/** What a stranger says around a swap. */
export const TRADE_WORDS = {
  ask: '交換してくれないか？',
  rareAsk: '……交換する気はあるか？',
  done: '助かるよ。',
  rareDone: '悪くない。',
  short: '素材が足りない。',
  full: 'これ以上持てない。',
  already: '今日はもう交換した。',
} as const;
