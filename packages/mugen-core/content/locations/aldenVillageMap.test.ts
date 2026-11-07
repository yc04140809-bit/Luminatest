import { describe, expect, it } from 'vitest';
import { VILLAGE_SPOTS, nextObjective, villagePresence } from './aldenVillageMap';

/** アルデン村の縮図 (作者 改修指示書 2026-10-16). */
describe('the village seen whole', () => {
  it('the places: church, tool shop, bakery, inn-tavern, the square, three houses (one label, three ids), two roads out — no sea', () => {
    expect(VILLAGE_SPOTS.map((s) => [s.id, s.label])).toEqual([
      ['church', '教会'],
      ['shop', '道具屋'],
      ['bakery', 'パン屋'],
      ['tavern', '宿酒場'],
      ['plaza', '中央広場'],
      ['house_01', '民家'],
      ['house_02', '民家'],
      ['house_03', '民家'],
      ['road_forest', '森への道'],
      ['road_ruins', '遺跡への道'],
    ]);
    expect(VILLAGE_SPOTS.filter((s) => s.kind === 'HOUSE')).toHaveLength(3);
    expect(VILLAGE_SPOTS.map((s) => s.label).join('')).not.toMatch(/海|港|クエスト|セーブ/);
  });

  it('who is where: only those whose place is settled — worked out from the world, nobody put somewhere just to be seen', () => {
    const now = villagePresence({ graveMet: false, tavernGuest: '吟遊詩人' });
    expect(now.bakery?.map((p) => p.name)).toEqual(['リナ', '主人']);
    expect(now.shop?.map((p) => p.name)).toEqual(['ミレイ']);
    expect(now.tavern?.map((p) => p.name)).toEqual(['マスター', '吟遊詩人']);
    expect(villagePresence({ graveMet: true, tavernGuest: null }).tavern?.map((p) => p.name)).toEqual(['グレイヴ']);
    // Not settled yet (作者判断 2026-10-16): リゼル and バルド are nowhere on the village's face.
    const everyone = Object.values(now).flatMap((ps) => ps!.map((p) => p.name));
    expect(everyone).not.toContain('リゼル');
    expect(everyone).not.toContain('バルド');
    expect(Object.keys(now).sort()).toEqual(['bakery', 'shop', 'tavern']);
  });

  it('次の目的 follows the route: the forest, the rumour, the master, the ruins, then the days', () => {
    const at = (over: Partial<Parameters<typeof nextObjective>[0]>) =>
      nextObjective({ galdDecided: true, arcOpen: true, stage: 'NONE', phase: 0, ...over });
    expect(at({ galdDecided: false, arcOpen: false })).toBe('グリーンウッドの森を調べよう');
    expect(at({ stage: 'NONE' })).toBe('村の噂を聞いてみよう');
    expect(at({ stage: 'RUMOR' })).toBe('月灯りの酒場でマスターと話そう');
    expect(at({ stage: 'TOLD' })).toBe('遺跡への道を調べよう');
    expect(at({ stage: 'SETTLED', phase: 0 })).toBe('アルデン村で日々を過ごそう');
    expect(at({ stage: 'SETTLED', phase: 2 })).toBe('村の異変に気を配ろう');
  });
});
