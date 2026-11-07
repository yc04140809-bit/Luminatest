import { describe, it, expect } from 'vitest';
import { noteSpeaker, onPersonMet } from './peopleMet';

describe('whom they have met (「あなたの第1章」)', () => {
  it('a named person heard is passed on; Kaos, the hero and the nameless are not', () => {
    const met: string[] = [];
    const off = onPersonMet((p) => met.push(p));
    for (const s of ['ケイオス', '{HERO}', '村人', null, 'グレイヴ', '盗賊', 'リナ', 'マスター']) noteSpeaker(s);
    expect(met).toEqual(['grave', 'gald', 'lina', 'grave']);
    off();
    noteSpeaker('ミレイ');
    expect(met).toHaveLength(4);
  });
});
