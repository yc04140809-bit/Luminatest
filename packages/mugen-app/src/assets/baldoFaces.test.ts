import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { baldoFaceDrawn } from './baldoFaces';
import { dailyFaceFor } from './dailyFaces';

describe('バルドの表情 (2026-10-16)', () => {
  it('four delivered, imported by name; any other face shows NORMAL', () => {
    const source = readFileSync(new URL('./baldoFaces.ts', import.meta.url), 'utf8');
    for (const n of ['normal', 'irritated', 'smile', 'grin']) expect(source).toContain(`baldo-face-${n}.png`);
    for (const f of ['NORMAL', 'ANGRY', 'SMILE_EYES_CLOSED', 'HAPPY'] as const) expect(baldoFaceDrawn(f)).toBe(f);
    expect(baldoFaceDrawn('JITO')).toBe('NORMAL');
  });

  it('his village scene shows his face (the line’s, or NORMAL); unnamed, none', () => {
    expect(dailyFaceFor({ speaker: 'バルド' })?.key).toBe('baldo:NORMAL');
    expect(dailyFaceFor({ speaker: 'バルド', face: 'ANGRY' })?.key).toBe('baldo:ANGRY');
    expect(dailyFaceFor({ speaker: '？？？' })).toBeNull();
  });
});
