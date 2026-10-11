import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { KAOS_FACES } from '@mugen/content/characters/kaosFaces';
import { kaosFaceDrawn } from './kaosFaces';

describe('Kaos’s faces as pictures (2026-10-11)', () => {
  it('the six delivered answer for themselves', () => {
    for (const face of ['SMILE', 'DOYA', 'SURPRISED', 'SAD', 'PUKU', 'ANGRY'] as const) expect(kaosFaceDrawn(face)).toBe(face);
  });

  it('every face is drawn by something — she is never missing from a conversation', () => {
    for (const face of KAOS_FACES) expect(kaosFaceDrawn(face), face).not.toBeNull();
  });

  it('until their own come: NORMAL stands in as SMILE, SERIOUS as SURPRISED; the others borrow along their chain', () => {
    expect(kaosFaceDrawn('NORMAL')).toBe('SMILE');
    expect(kaosFaceDrawn('SERIOUS')).toBe('SURPRISED');
    expect(kaosFaceDrawn('LAUGH')).toBe('SMILE');
    expect(kaosFaceDrawn('BLUSH')).toBe('SMILE');
    expect(kaosFaceDrawn('TROUBLED')).toBe('SMILE');
  });

  it('a picture of its own wins over a stand-in, the moment it is there', () => {
    const files = { SMILE: 1, NORMAL: 1, SERIOUS: 1, TROUBLED: 1 };
    expect(kaosFaceDrawn('NORMAL', files)).toBe('NORMAL');
    expect(kaosFaceDrawn('SERIOUS', files)).toBe('SERIOUS');
    expect(kaosFaceDrawn('TROUBLED', files)).toBe('TROUBLED');
    expect(kaosFaceDrawn('SAD', files)).toBe('TROUBLED');
  });

  it('the files are imported as delivered, by name — none cut or renamed into a sheet', () => {
    const source = readFileSync(new URL('./kaosFaces.ts', import.meta.url), 'utf8');
    for (const n of ['smile', 'doya', 'surprised', 'sad', 'puku', 'angry']) expect(source).toContain(`kaos-face-${n}.png`);
  });
});
