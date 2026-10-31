import { describe, expect, it } from 'vitest';
import { ARIA_FACES, LEVI_FACES, ariaFaceOf, leviFaceOf } from './companionFaces';

describe('アリア・レヴィの表情 (2026-10-12)', () => {
  it('three each, NORMAL first', () => {
    expect(ARIA_FACES).toEqual(['NORMAL', 'SMILE', 'TROUBLED']);
    expect(LEVI_FACES).toEqual(['NORMAL', 'ANGRY', 'SURPRISED']);
  });

  it('a line names her face, else NORMAL; nobody else’s line gets one', () => {
    expect(ariaFaceOf({ speaker: 'アリア', ariaFace: 'SMILE' })).toBe('SMILE');
    expect(ariaFaceOf({ speaker: 'アリア' })).toBe('NORMAL');
    expect(ariaFaceOf({ speaker: 'レヴィ', ariaFace: 'SMILE' })).toBeNull();
    expect(leviFaceOf({ speaker: 'レヴィ', leviFace: 'ANGRY' })).toBe('ANGRY');
    expect(leviFaceOf({ speaker: 'レヴィ' })).toBe('NORMAL');
    expect(leviFaceOf({ speaker: null })).toBeNull();
  });
});
