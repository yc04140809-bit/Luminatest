import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { KAOS_FACES } from '@mugen/content/characters/kaosFaces';
import { kaosFaceDrawn } from './kaosFaces';

describe('Kaos’s faces as pictures (2026-10-11)', () => {
  it('the nine delivered answer for themselves', () => {
    for (const face of ['NORMAL', 'SERIOUS', 'TROUBLED', 'SMILE', 'DOYA', 'SURPRISED', 'SAD', 'PUKU', 'ANGRY'] as const)
      expect(kaosFaceDrawn(face)).toBe(face);
  });

  it('the two not drawn yet borrow along their chain; she is never missing from a conversation', () => {
    expect(kaosFaceDrawn('LAUGH')).toBe('SMILE');
    expect(kaosFaceDrawn('BLUSH')).toBe('SMILE');
    for (const face of KAOS_FACES) expect(kaosFaceDrawn(face), face).not.toBeNull();
  });

  it('with only some delivered, the chain still finds the nearest', () => {
    expect(kaosFaceDrawn('SAD', { TROUBLED: 1, NORMAL: 1 })).toBe('TROUBLED');
    expect(kaosFaceDrawn('PUKU', { NORMAL: 1 })).toBe('NORMAL');
  });

  it('the files are imported as delivered, by name — none cut or renamed into a sheet', () => {
    const source = readFileSync(new URL('./kaosFaces.ts', import.meta.url), 'utf8');
    for (const n of ['normal', 'serious', 'troubled', 'smile', 'doya', 'surprised', 'sad', 'puku', 'angry'])
      expect(source).toContain(`kaos-face-${n}.png`);
  });
});
