import { describe, expect, it } from 'vitest';
import { GREENWOOD_WALK } from './greenwoodWalk';
import { RUINS_WALK } from './ruinsWalk';
import { rollPickup, type WalkPickup } from './walkScene';
import { itemDef } from '../economy/itemDefs';
import { ALDEN_SHOP_OFFERS, ALDEN_TOOL_SHOP_OFFERS, ALDEN_SHOPKEEPER } from '../economy/aldenShop';

/**
 * 探索アイテム＋道具屋基盤 (2026-10-07): what is on the floors, what the
 * new things are, and the App's board.
 */

const forest = GREENWOOD_WALK.roam!.pickups!;
const ruins = RUINS_WALK.roam!.pickups!;

/** Inside the floor outline (the same test the walk uses). */
function onFloor(p: { x: number; y: number }, floor: readonly { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = floor.length - 1; i < floor.length; j = i++) {
    const a = floor[i];
    const b = floor[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

describe('things to pick up', () => {
  it('a few, never a floor of them: forest 3, ruins 4', () => {
    expect(forest.map((p) => p.id)).toEqual(['forest_pickup_001', 'forest_pickup_002', 'forest_pickup_003']);
    expect(ruins.map((p) => p.id)).toEqual(['ruins_pickup_001', 'ruins_pickup_002', 'ruins_pickup_003', 'ruins_pickup_004']);
  });

  it('every id once, everything in them in the catalogue, on the floor, clear of the walk-in, the finds and the place’s own things', () => {
    const all: WalkPickup[] = [...forest, ...ruins];
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    for (const [pickups, scene] of [
      [forest, GREENWOOD_WALK],
      [ruins, RUINS_WALK],
    ] as const) {
      for (const p of pickups) {
        expect(p.label, p.id).not.toBe('');
        expect(p.line, p.id).not.toBe('');
        expect(onFloor(p.at, scene.roam!.floor), p.id).toBe(true);
        // Looked into from a little to its right, and not where they walk in to
        // (its 「！」 shows only once standing at it).
        const start = scene.roam!.start;
        expect(Math.hypot(p.at.x + 0.05 - start.x, (p.at.y - start.y) * (941 / 1672)), p.id).toBeGreaterThan(0.1);
        // Never on a small find's spot, nor where one of the place's own things is looked at.
        const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
          Math.hypot(a.x - b.x, (a.y - b.y) * (941 / 1672));
        for (const spot of scene.roam!.spots) expect(near(p.at, spot), `${p.id} by a spot`).toBeGreaterThanOrEqual(0.05);
        const stand = { x: p.at.x + 0.05, y: p.at.y };
        for (const point of scene.points) {
          for (const q of [point.stand ?? point.at, point.marker ?? point.at]) {
            expect(near(stand, q), `${p.id} by ${point.id}`).toBeGreaterThanOrEqual(0.055);
          }
        }
        for (const roll of p.items) {
          expect(itemDef(roll.itemId), `${p.id} → ${roll.itemId}`).not.toBeNull();
          expect(roll.quantity).toBeGreaterThan(0);
        }
      }
    }
  });

  it('the forest has herbs, 魔力草, nuts, ore and — rarely — a magic shard', () => {
    const ids = new Set(forest.flatMap((p) => p.items.map((r) => r.itemId)));
    expect(ids).toEqual(new Set(['FOREST_HERB', 'MANA_HERB', 'FOREST_NUT', 'IRON_ORE', 'MANA_SHARD']));
  });

  it('the ruins have coins, ore, a shard, a herb and the ancient fragment', () => {
    const ids = new Set(ruins.flatMap((p) => p.items.map((r) => r.itemId)));
    expect(ids).toEqual(new Set(['OLD_COIN', 'IRON_ORE', 'MANA_SHARD', 'FOREST_HERB', 'ANCIENT_SHARD']));
  });

  it('rollPickup: one row fixed; weighed rows by weight', () => {
    const rock = forest[2];
    expect(rollPickup(forest[1], () => 0.99)).toEqual({ itemId: 'FOREST_NUT', quantity: 2 });
    expect(rollPickup(rock, () => 0).itemId).toBe('IRON_ORE');
    expect(rollPickup(rock, () => 0.84).itemId).toBe('IRON_ORE');
    expect(rollPickup(rock, () => 0.86).itemId).toBe('MANA_SHARD');
    expect(rollPickup(rock, () => 1).itemId).toBe('MANA_SHARD');
  });
});

describe('the new things', () => {
  it('上薬草 heals twice a herb; 魔力草 sits between bracing and a flask', () => {
    expect(itemDef('FINE_HERB')!.use).toMatchObject({ kind: 'HEAL', amount: 60, where: 'BOTH' });
    expect(itemDef('FOREST_HERB')!.use).toMatchObject({ kind: 'HEAL', amount: 30 });
    expect(itemDef('MANA_HERB')!.use).toMatchObject({ kind: 'RESTORE_MP', amount: 12, where: 'BOTH' });
    expect(itemDef('MANA_WATER')!.use).toMatchObject({ kind: 'RESTORE_MP', amount: 16 });
  });

  it('the materials are for selling, the ancient fragment never is — and says nothing of what it is', () => {
    for (const id of ['OLD_COIN', 'IRON_ORE', 'MANA_SHARD', 'FOREST_NUT']) {
      const def = itemDef(id)!;
      expect(def.category, id).toBe('MATERIAL');
      expect(def.use, id).toBeUndefined();
      expect(def.sellPrice, id).toBeGreaterThan(0);
      expect(def.isKeyItem, id).toBe(false);
    }
    const shard = itemDef('ANCIENT_SHARD')!;
    expect(shard).toMatchObject({ name: '古代の破片', category: 'MATERIAL', isKeyItem: true, sellPrice: 0, rarity: 'RARE' });
    expect(shard.description).toBe('何かの一部と思われる小さな破片。表面には、見慣れない模様が刻まれている。');
    expect(itemDef('OLD_COIN')!.description).toBe(
      '長い年月で表面が擦り減った古い硬貨。今では通貨として使えないが、収集価値はある。',
    );
  });
});

describe('the App’s board at Alden', () => {
  it('薬草, 上薬草, 魔力草 (and the 魔力水 already sold), each dearer than the shop pays', () => {
    expect(ALDEN_TOOL_SHOP_OFFERS.map((o) => o.itemId)).toEqual(['FOREST_HERB', 'FINE_HERB', 'MANA_HERB', 'MANA_WATER']);
    for (const o of ALDEN_TOOL_SHOP_OFFERS) {
      expect(o.buyPrice, o.itemId).toBeGreaterThan(itemDef(o.itemId)!.sellPrice);
      expect(itemDef(o.itemId)!.use, o.itemId).toBeDefined();
    }
  });

  it('the Artifact’s board is as it was', () => {
    expect(ALDEN_SHOP_OFFERS).toEqual([
      { itemId: 'FOREST_HERB', buyPrice: 16 },
      { itemId: 'MANA_WATER', buyPrice: 24 },
      { itemId: 'OLD_ARROWHEAD', buyPrice: 24 },
      { itemId: 'BROKEN_CLASP', buyPrice: 10 },
    ]);
  });

  it('behind the counter: ミレイ (NPCタッチ反応システム), greeting with her own everyday line', () => {
    expect(ALDEN_SHOPKEEPER.id).toBe('shop_mirei');
    expect(ALDEN_SHOPKEEPER.label).toBe('ミレイ');
    expect(ALDEN_SHOPKEEPER.greeting).toBe('いらっしゃい。今日は何を探してるの？');
  });
});
