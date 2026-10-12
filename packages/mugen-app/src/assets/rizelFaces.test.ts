import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { rizelFaceDrawn } from './rizelFaces';
import { dailyFaceFor } from './dailyFaces';

describe('リゼルの表情 (2026-10-12)', () => {
  it('four delivered, imported by name; any other face shows NORMAL', () => {
    const source = readFileSync(new URL('./rizelFaces.ts', import.meta.url), 'utf8');
    for (const n of ['normal', 'smile', 'surprised', 'troubled']) expect(source).toContain(`rizel-face-${n}.png`);
    for (const f of ['NORMAL', 'HAPPY', 'AMAZED', 'SAD'] as const) expect(rizelFaceDrawn(f)).toBe(f);
    expect(rizelFaceDrawn('JITO')).toBe('NORMAL');
  });

  it('her village scenes show her face (the line’s, or NORMAL); others with no picture show none', () => {
    expect(dailyFaceFor({ speaker: 'リゼル' })?.key).toBe('rizel:NORMAL');
    expect(dailyFaceFor({ speaker: 'リゼル', face: 'AMAZED' })?.key).toBe('rizel:AMAZED');
    expect(dailyFaceFor({ speaker: '村人' })).toBeNull();
    expect(dailyFaceFor({ speaker: null })).toBeNull();
  });
});
