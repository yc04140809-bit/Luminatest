import { describe, it, expect } from 'vitest';
import { kaosFaceDrawn } from '../../assets/kaosFaces';
import { RESULT_FACES, resultFaceFor, resultHowOf, resultPartyOf } from './resultFace';

describe('ケイオス on a result (タスクG, 作り替え v2)', () => {
  it('only where she fought: two, three, or nothing', () => {
    expect(resultPartyOf(['hero', 'kaos'])).toBe('DUO');
    expect(resultPartyOf(['grave', 'hero', 'kaos'])).toBe('TRIO');
    expect(resultPartyOf(['hero', 'grave'])).toBe('NO_KAOS');
    expect(resultPartyOf(['hero'])).toBe('NO_KAOS');
    expect(resultFaceFor('NO_KAOS', 'FINISHER')).toBeNull();
  });

  it('how it was won: a finisher’s last blow before a boss, a boss before an ordinary win', () => {
    expect(resultHowOf({ byFinisher: true, boss: true })).toBe('FINISHER');
    expect(resultHowOf({ byFinisher: false, boss: true })).toBe('BOSS');
    expect(resultHowOf({ byFinisher: false, boss: false })).toBe('NORMAL');
  });

  it('her faces are the village talk’s own (none drawn for this): smile, the soft smile, pleased with herself', () => {
    for (const ways of Object.values(RESULT_FACES)) {
      expect(ways.NORMAL.face).toBe('SMILE');
      expect(ways.BOSS.face).toBe('NORMAL');
      expect(ways.FINISHER.face).toBe('DOYA');
      for (const way of Object.values(ways)) {
        // Each one delivered as itself, not borrowed along its chain.
        expect(kaosFaceDrawn(way.face)).toBe(way.face);
        expect(way.line.kaos.length).toBeGreaterThan(0);
        expect(way.line.hero.length).toBeGreaterThan(0);
        // His name is the player's: never written into the line.
        expect(way.line.hero + way.line.kaos).not.toMatch(/ノア/);
      }
    }
    expect(resultFaceFor('TRIO', 'BOSS')).toMatchObject({ face: 'NORMAL', party: 'TRIO', how: 'BOSS' });
  });
});
