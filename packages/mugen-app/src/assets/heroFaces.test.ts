import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { HERO_FACES } from '@mugen/content/characters/heroFaces';
import { heroFaceDrawn } from './heroFaces';

describe('the hero’s faces as pictures (2026-10-11)', () => {
  it('the seven delivered answer for themselves; SAD (not yet drawn) borrows TROUBLED; none is ever missing', () => {
    for (const face of ['NORMAL', 'SMILE', 'SURPRISED', 'TROUBLED', 'POUT', 'ANGRY', 'SERIOUS'] as const) expect(heroFaceDrawn(face)).toBe(face);
    expect(heroFaceDrawn('SAD')).toBe('TROUBLED');
    for (const face of HERO_FACES) expect(heroFaceDrawn(face)).not.toBeNull();
  });

  it('the files are imported as delivered, by name', () => {
    const source = readFileSync(new URL('./heroFaces.ts', import.meta.url), 'utf8');
    for (const n of ['normal', 'smile', 'surprised', 'troubled', 'pout', 'angry', 'serious']) expect(source).toContain(`hero-face-${n}.png`);
  });
});
