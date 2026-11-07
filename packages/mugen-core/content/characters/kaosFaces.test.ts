import { describe, expect, it } from 'vitest';
import { KAOS_FACES, KAOS_FACE_FALLBACK, KAOS_FIRST_FACES, kaosFaceChain, kaosFaceOf } from './kaosFaces';

describe('Kaos’s faces (表情差分, 2026-10-11)', () => {
  it('ten, and ANGRY (added with the first pictures), the first six the author named first', () => {
    expect(KAOS_FACES).toHaveLength(11);
    expect(KAOS_FACES).toContain('ANGRY');
    expect(KAOS_FIRST_FACES).toEqual(['NORMAL', 'SMILE', 'PUKU', 'SURPRISED', 'TROUBLED', 'SERIOUS']);
  });

  it('every face falls back, in the end, to NORMAL — and the later four only through the first six', () => {
    for (const face of KAOS_FACES) {
      const chain = kaosFaceChain(face);
      expect(chain[0]).toBe(face);
      expect(chain.at(-1)).toBe('NORMAL');
      for (const f of KAOS_FACE_FALLBACK[face]) expect(KAOS_FIRST_FACES).toContain(f);
    }
  });

  it('a line’s face: the one named, else SERIOUS when tense, else NORMAL; none when she is not speaking', () => {
    expect(kaosFaceOf({ speaker: 'ケイオス', text: '', kaosFace: 'PUKU' } as never)).toBe('PUKU');
    expect(kaosFaceOf({ speaker: 'ケイオス', tense: true })).toBe('SERIOUS');
    expect(kaosFaceOf({ speaker: 'ケイオス' })).toBe('NORMAL');
    expect(kaosFaceOf({ speaker: '{HERO}', kaosFace: 'SMILE' })).toBeNull();
    expect(kaosFaceOf({ speaker: null })).toBeNull();
  });
});
