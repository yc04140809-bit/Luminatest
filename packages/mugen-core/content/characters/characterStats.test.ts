import { describe, expect, it } from 'vitest';
import { statSheetOf } from './characterStats';
import { statsForLevels } from '../../core/progression/levelStats';

const whole = (s = statsForLevels(1, 1)) => ({ currentHp: s.maxHp, maxHp: s.maxHp, currentMp: s.maxMp, maxMp: s.maxMp });

describe('the six numbers (作者指示 2026-10-11)', () => {
  it('HP, MP and his 攻撃力 are the battle’s own, untouched', () => {
    const party = statsForLevels(1, 1);
    const hero = statSheetOf('hero', 1, whole(), party);
    expect(hero.hp).toEqual({ current: 100, max: 100 });
    expect(hero.mp).toEqual({ current: 48, max: 48 });
    expect(hero.attack).toEqual({ min: 8, max: 12 });
    // A weapon's lift reaches him (it is in getPartyStats), not her.
    const armed = { ...party, attackMin: 10, attackMax: 14 };
    expect(statSheetOf('hero', 1, whole(), armed).attack).toEqual({ min: 10, max: 14 });
    expect(statSheetOf('kaos', 1, whole(), armed).attack).toEqual({ min: 4, max: 6 });
    // HP and MP are whatever the world says (current values kept as they are).
    const hurt = statSheetOf('kaos', 1, { currentHp: 40, maxHp: 100, currentMp: 10, maxMp: 48 }, party);
    expect(hurt.hp).toEqual({ current: 40, max: 100 });
    expect(hurt.mp).toEqual({ current: 10, max: 48 });
  });

  it('who they are: he hits harder and stands firmer; she has far more 魔力 and is quicker — at every level', () => {
    for (const level of [1, 5, 10, 30, 100]) {
      const party = statsForLevels(level, level);
      const he = statSheetOf('hero', level, whole(party), party);
      const she = statSheetOf('kaos', level, whole(party), party);
      expect(he.attack.max, `Lv${level}`).toBeGreaterThan(she.attack.max);
      expect(he.defense, `Lv${level}`).toBeGreaterThan(she.defense);
      expect(she.magic, `Lv${level}`).toBeGreaterThan(he.magic * 2);
      expect(she.speed, `Lv${level}`).toBeGreaterThan(he.speed);
    }
  });

  it('they grow with the level, never down, and never a blank', () => {
    const at = (id: string, level: number) => statSheetOf(id, level, whole(), statsForLevels(level, level));
    for (const id of ['hero', 'kaos', 'somebody_new']) {
      let prev = at(id, 1);
      for (const level of [2, 3, 10, 50, 100]) {
        const now = at(id, level);
        expect(now.defense).toBeGreaterThanOrEqual(prev.defense);
        expect(now.magic).toBeGreaterThanOrEqual(prev.magic);
        expect(now.speed).toBeGreaterThanOrEqual(prev.speed);
        for (const v of [now.defense, now.magic, now.speed]) expect(v).toBeGreaterThan(0);
        prev = now;
      }
    }
    // Nothing for later is filled yet.
    expect(at('hero', 1).future).toEqual({});
  });
});
