import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { KAOS_MP_REGEN, mpAfterRecovery } from './kaosMpRegen';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';

describe('ケイオスの MP 自然回復 (2026-10-12)', () => {
  it('small: a tenth of her most each time (5–10% asked), rounded up, never past it', () => {
    for (const share of Object.values(KAOS_MP_REGEN)) {
      expect(share).toBeGreaterThanOrEqual(0.05);
      expect(share).toBeLessThanOrEqual(0.1);
    }
    expect(mpAfterRecovery(10, 48, 0.1)).toBe(15);
    expect(mpAfterRecovery(46, 48, 0.1)).toBe(48);
    expect(mpAfterRecovery(48, 48, 0.1)).toBe(48);
  });

  it('kept in the world: a spent Kaos gets a little back; a full one nothing; her health and the hero’s untouched', async () => {
    const w = await World.open(new IdbMemoryStore(`mp-${Math.random()}`));
    const full = w.getCharacterCondition('kaos');
    expect(await w.recoverKaosMp(0.1)).toBe(0);
    await w.setBattleCondition({ hp: 50, mp: 4 });
    const gain = await w.recoverKaosMp(0.1);
    expect(gain).toBe(Math.ceil(full.maxMp * 0.1));
    expect(w.getCharacterCondition('kaos').currentMp).toBe(4 + gain);
    expect(w.getCharacterCondition('kaos').currentHp).toBe(full.currentHp);
    expect(w.getCharacterCondition('hero').currentHp).toBe(50);
  });
});
