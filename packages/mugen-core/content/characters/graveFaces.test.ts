import { describe, expect, it } from 'vitest';
import { GRAVE_FACES, GRAVE_SPEAKER, graveFaceChain, graveFaceOf } from './graveFaces';
import type { DialogueLine } from '../dialogue/prologue';

describe('グレイヴの表情 (2026-10-12)', () => {
  it('the eight faces the author named, one person', () => {
    expect([...GRAVE_FACES].sort()).toEqual(['ANGRY', 'GRIN', 'LAUGH', 'NORMAL', 'SAD', 'SERIOUS', 'SURPRISED', 'TROUBLED']);
  });

  it('on his line: the face it names; none named — NORMAL; not his line — none', () => {
    expect(graveFaceOf({ speaker: GRAVE_SPEAKER, graveFace: 'LAUGH' })).toBe('LAUGH');
    expect(graveFaceOf({ speaker: GRAVE_SPEAKER })).toBe('NORMAL');
    expect(graveFaceOf({ speaker: 'ケイオス', graveFace: 'LAUGH' })).toBeNull();
    expect(graveFaceOf({ speaker: null })).toBeNull();
  });

  it('every face ends at NORMAL', () => {
    for (const face of GRAVE_FACES) expect(graveFaceChain(face).at(-1)).toBe('NORMAL');
    expect(graveFaceChain('TROUBLED')).toEqual(['TROUBLED', 'SERIOUS', 'NORMAL']);
  });

  it('an event line can name his face, as it can Kaos\'s and the hero\'s (the raid to come)', () => {
    const lines: DialogueLine[] = [
      { speaker: GRAVE_SPEAKER, text: '……来やがったか。', graveFace: 'SERIOUS' },
      { speaker: 'ケイオス', text: '……！', kaosFace: 'SURPRISED' },
      { speaker: '{HERO}', text: '行くぞ。', heroFace: 'SERIOUS' },
    ];
    expect(lines.map(graveFaceOf)).toEqual(['SERIOUS', null, null]);
  });
});
