import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GRAVE_FACES } from '@mugen/content/characters/graveFaces';
import { graveFaceDrawn } from './graveFaces';

describe('グレイヴの表情、絵として (2026-10-12)', () => {
  it('the seven delivered answer for themselves; TROUBLED (not drawn yet) borrows SERIOUS; none is ever missing', () => {
    for (const face of ['NORMAL', 'LAUGH', 'GRIN', 'SERIOUS', 'ANGRY', 'SAD', 'SURPRISED'] as const) expect(graveFaceDrawn(face)).toBe(face);
    expect(graveFaceDrawn('TROUBLED')).toBe('SERIOUS');
    for (const face of GRAVE_FACES) expect(graveFaceDrawn(face)).not.toBeNull();
  });

  it('the files are imported as delivered, by name', () => {
    const source = readFileSync(new URL('./graveFaces.ts', import.meta.url), 'utf8');
    for (const n of ['normal', 'laugh', 'grin', 'serious', 'angry', 'sad', 'surprised']) expect(source).toContain(`grave-face-${n}.png`);
  });
});
