import { describe, it, expect } from 'vitest';
import { CHAPTER_ONE_PEOPLE, chapterSummaryRows, metMark, personBySpeaker, SUMMARY_ANSWER } from './chapterSummary';
import { LIFE_CHOICE_OPTIONS } from '../dialogue/galdEncounter';
import { isMarkId } from '../../core/world/readMarks';
import { FINALE_SCENES } from './chapter1Finale';

describe('あなたの第1章', () => {
  it('seven rows, in order, each said plainly', () => {
    const rows = chapterSummaryRows({ days: 12, gald: 'SPARE', fuumimi: null, met: 6, rumors: 4, records: 2, unknown: 9 });
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ['過ごした日数', '12日'],
      ['ガルドへの答え', '見逃した'],
      ['フウミミへの答え', 'まだ出会っていない'],
      ['出会った人', '6人'],
      ['聞いた噂話', '4件'],
      ['人生の記録', '2件'],
      ['まだ知らない出来事', '9件'],
    ]);
  });

  it('the answers in the four answers’ own words, past tense', () => {
    for (const o of LIFE_CHOICE_OPTIONS) expect(SUMMARY_ANSWER[o.id].slice(0, 2)).toBe(o.label.slice(0, 2));
  });

  it('who counts as met: the named, by the names they speak under — never Kaos, the hero or the nameless', () => {
    expect(personBySpeaker('盗賊')).toBe('gald');
    expect(personBySpeaker('盗賊 ガルド')).toBe('gald');
    expect(personBySpeaker('マスター')).toBe('grave');
    for (const s of ['ケイオス', '{HERO}', '村人', '衛兵', '男', '旅人', '猟師', '子ども', null, undefined]) expect(personBySpeaker(s)).toBeNull();
    for (const p of CHAPTER_ONE_PEOPLE) expect(isMarkId(metMark(p.id))).toBe(true);
    const all = CHAPTER_ONE_PEOPLE.flatMap((p) => p.speakers);
    expect(new Set(all).size).toBe(all.length);
  });

  it('C2: at the departure, the memo once more — just before they walk off', () => {
    const lines = FINALE_SCENES.DEPARTURE.lines;
    const at = lines.findIndex((l) => l.text.includes('「エルナへ」'));
    expect(at).toBe(lines.length - 2);
    expect(lines[at].speaker).toBeNull();
    expect(lines[at].text).toContain('{HERO}');
  });
});
