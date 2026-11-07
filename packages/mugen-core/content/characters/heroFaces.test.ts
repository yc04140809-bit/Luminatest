import { describe, expect, it } from 'vitest';
import { HERO_FACES, heroFaceChain, heroFaceOf } from './heroFaces';
import { HERO_SPEAKER } from '../story/sekiryugaArc';

describe('the hero’s faces (2026-10-11)', () => {
  it('every face falls back, in the end, to NORMAL', () => {
    for (const face of HERO_FACES) {
      expect(heroFaceChain(face)[0]).toBe(face);
      expect(heroFaceChain(face).at(-1)).toBe('NORMAL');
    }
  });

  it('his face on a line: the one named, else NORMAL; none when he is not speaking', () => {
    expect(HERO_SPEAKER).toBe('{HERO}');
    expect(heroFaceOf({ speaker: HERO_SPEAKER, heroFace: 'SMILE' })).toBe('SMILE');
    expect(heroFaceOf({ speaker: HERO_SPEAKER })).toBe('NORMAL');
    expect(heroFaceOf({ speaker: 'ケイオス', heroFace: 'SMILE' })).toBeNull();
  });
});
