import { describe, expect, it } from 'vitest';
import { itemDef } from '../economy/itemDefs';
import {
  CELEBRATE_PRIORITY,
  celebrationForCraft,
  celebrationForDiscovery,
  celebrationForItem,
  craftMark,
  discoveryMark,
  gotMark,
  mostWorthShowing,
} from './celebrate';

const def = (id: string) => itemDef(id)!;

describe('ハイタッチ: which moments are worth it', () => {
  it('anything got for the first time; never again after (an ordinary herb)', () => {
    const first = celebrationForItem(def('FOREST_HERB'), true)!;
    expect(first.kind).toBe('FIRST_ITEM');
    expect(first.title).toBe('初めて手に入れた！');
    expect(first.subtitle).toBe('薬草を入手');
    expect(celebrationForItem(def('FOREST_HERB'), false)).toBeNull();
  });

  it('a treat is a moment every time (the mana shard), shown as a rare one', () => {
    for (const first of [true, false]) {
      const c = celebrationForItem(def('MANA_SHARD'), first)!;
      expect(c.kind).toBe('RARE');
      expect(c.title).toBe('おっ、いいもの発見！');
    }
    expect(def('MANA_SHARD').isRareRewardEffect).toBe(true);
    expect(def('ANCIENT_SHARD').isRareRewardEffect).toBe(true);
  });

  it('no cheap thing that turns up again and again is a treat', () => {
    for (const id of ['FOREST_HERB', 'FOREST_NUT', 'IRON_ORE', 'MANA_HERB', 'ROUND_ACORN', 'OLD_ARROWHEAD']) {
      expect(def(id).isRareRewardEffect ?? false, id).toBe(false);
    }
  });

  it("Grave's handwork: the first time only", () => {
    const c = celebrationForCraft('CRAFT_IRON_CHARM', '鉄の護符', true)!;
    expect(c.title).toBe('クラフト成功！');
    expect(c.subtitle).toBe('鉄の護符を作成した');
    expect(celebrationForCraft('CRAFT_IRON_CHARM', '鉄の護符', false)).toBeNull();
  });

  it('a first sight: 「新しい発見！」, once', () => {
    const c = celebrationForDiscovery('forest_rare_001', '光る苔', true)!;
    expect(c.title).toBe('新しい発見！');
    expect(c.subtitle).toBe('光る苔を見つけた');
    expect(celebrationForDiscovery('forest_rare_001', '光る苔', false)).toBeNull();
  });

  it('several at one moment: discovery, then craft, then rare, then a first', () => {
    expect(CELEBRATE_PRIORITY.DISCOVERY).toBeLessThan(CELEBRATE_PRIORITY.CRAFT);
    expect(CELEBRATE_PRIORITY.CRAFT).toBeLessThan(CELEBRATE_PRIORITY.RARE);
    expect(CELEBRATE_PRIORITY.RARE).toBeLessThan(CELEBRATE_PRIORITY.FIRST_ITEM);
    const first = celebrationForItem(def('FOREST_HERB'), true)!;
    const found = celebrationForDiscovery('x', 'x', true)!;
    const craft = celebrationForCraft('c', 'c', true)!;
    expect(mostWorthShowing([first, craft, found])).toBe(found);
    expect(mostWorthShowing([first, craft])).toBe(craft);
    expect(mostWorthShowing([])).toBeNull();
  });

  it('remembered in the read marks, each kind apart', () => {
    expect(gotMark('FOREST_HERB')).toBe('celebrated:ITEM_FOREST_HERB');
    expect(craftMark('CRAFT_HERB_BUNDLE')).toBe('celebrated:CRAFT_CRAFT_HERB_BUNDLE');
    expect(discoveryMark('forest_rare_001')).toBe('celebrated:FOUND_forest_rare_001');
  });
});
