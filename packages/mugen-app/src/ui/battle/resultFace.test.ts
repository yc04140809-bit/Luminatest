import { describe, it, expect } from 'vitest';
import { RESULT_FACES, resultFaceFile, resultFaceFor, resultHowOf, resultPartyOf } from './resultFace';

describe('ケイオス on a result (タスクG)', () => {
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

  it('every party and way has its own file, and a face of hers standing in until it is delivered', () => {
    const files = Object.values(RESULT_FACES).flatMap((ways) => Object.values(ways).map((w) => w.file));
    expect(new Set(files).size).toBe(6);
    for (const [party, ways] of Object.entries(RESULT_FACES))
      for (const [how, art] of Object.entries(ways)) {
        expect(art.file).toBe(`kaos-result-${party.toLowerCase()}-${how.toLowerCase()}.png`);
        expect(['SMILE', 'DOYA']).toContain(art.stand);
      }
    expect(resultFaceFor('TRIO', 'BOSS')).toEqual({ file: 'kaos-result-trio-boss.png', stand: 'DOYA', party: 'TRIO', how: 'BOSS' });
  });

  it('a delivered picture is found by its name; none yet is none', () => {
    expect(resultFaceFile('kaos-result-duo-normal.png', {})).toBeNull();
    expect(resultFaceFile('kaos-result-duo-normal.png', { '/x/result/kaos-result-duo-normal.png': 'url' })).toBe('url');
  });
});
