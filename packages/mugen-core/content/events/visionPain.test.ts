import { describe, expect, it } from 'vitest';
import { VISION_MEDICINE_DELIVERED, VISION_PAIN_LINES } from './visionPain';
import { CHOICE_RESULT_PARCEL_LINES } from '../dialogue/galdEncounter';

describe('痛みの一文 under each picture, and where the medicine went (作者 2026-11-03 / 11-06)', () => {
  it('one line for each of the four pictures, as adopted', () => {
    expect(VISION_PAIN_LINES).toEqual({
      GALD_BAKER: '男は、パン屋で働くようになった。だが、村の誰もが彼を受け入れたわけではない。',
      GALD_HEALER: '男は、街道で人の傷を診るようになった。その後を、知る者はいない。',
      GALD_WORKER: '男は、作業場で働いている。妹と過ごせなかった年月は、戻らない。',
      GALD_GRAVE: '村に、平穏が戻った。薬は少女に届けられた。だが兄だけが、もういない。',
    });
  });

  it('とどめ: the medicine delivered by the letter — the letter and the medicine were both placed before it', () => {
    expect(VISION_MEDICINE_DELIVERED).toEqual({ on: 'GALD_GRAVE', text: '手紙を頼りに、薬が少女のもとへ届けられた' });
    const kill = CHOICE_RESULT_PARCEL_LINES.KILL.map((p) => p.line.text);
    expect(kill.some((t) => t.includes('手紙'))).toBe(true);
    expect(kill.some((t) => t.includes('包み'))).toBe(true);
  });
});
