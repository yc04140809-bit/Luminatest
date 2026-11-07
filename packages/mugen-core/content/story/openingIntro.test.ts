import { describe, expect, it } from 'vitest';
import {
  INTRO_ARRIVAL,
  INTRO_HERO,
  INTRO_NOTE_URL,
  INTRO_SKIP_NOTE,
  INTRO_SKIP_QUESTION,
  OPENING_INTRO,
  OPENING_INTRO_MARK,
} from './openingIntro';
import { isMarkId } from '../../core/world/readMarks';

/** 第0話 — the way into Alden (2026-10-08): what it says, and what it does not. */

const said = OPENING_INTRO.map((b) => b.text);
const at = (text: string) => OPENING_INTRO.findIndex((b) => b.text === text);

describe('the way into Alden', () => {
  it('is the author’s exchange, short: about a minute, never three', () => {
    for (const line of [
      '……この先が、アルデン村か。',
      'うん。もうすぐだよ♪',
      '…………誰？',
      '右が天使の翼で、左が悪魔の翼？',
      'なんで一緒に行く前提なんだ？',
      '同じ方向だから？',
      '理由が軽いな！？',
      '……あれがアルデン村。',
      'ケイオス。',
      `よろしくね、${INTRO_HERO}♪`,
      'なんで俺の名前知ってる？',
      '勘。',
      'そんなピンポイントな勘ある！？',
      'あるある♪',
      '絶対ない。',
    ]) {
      expect(said, line).toContain(line);
    }
    expect(OPENING_INTRO.length).toBeLessThanOrEqual(40);
  });

  it('they have never met: a voice first, a stranger until she says her own name', () => {
    expect(OPENING_INTRO.slice(0, at('…………誰？') + 1).every((b) => b.kaos === 'away')).toBe(true);
    const name = at('ケイオス。');
    expect(OPENING_INTRO.slice(0, name).some((b) => b.speaker === 'ケイオス')).toBe(false);
    expect(OPENING_INTRO[name].speaker).toBe('ケイオス');
    expect(OPENING_INTRO.filter((b) => b.speaker === '？？？').length).toBeGreaterThan(0);
  });

  it('his wondering is in his head; the road, then the village', () => {
    expect(OPENING_INTRO.filter((b) => b.thought).every((b) => b.speaker === INTRO_HERO)).toBe(true);
    const village = OPENING_INTRO.findIndex((b) => b.place === 'VILLAGE');
    expect(OPENING_INTRO.slice(village).every((b) => b.place === 'VILLAGE')).toBe(true);
    expect(OPENING_INTRO[village - 1].text).toBe('理由が軽いな！？');
  });

  it('one moment she is not smiling, held, after 「絶対ない。」 — and then she is', () => {
    const still = OPENING_INTRO.findIndex((b) => b.kaos === 'still');
    expect(OPENING_INTRO.filter((b) => b.kaos === 'still')).toHaveLength(1);
    expect(OPENING_INTRO[still - 1].text).toBe('絶対ない。');
    expect(OPENING_INTRO[still].holdMs).toBeGreaterThan(0);
    expect(OPENING_INTRO[still + 1]).toMatchObject({ speaker: 'ケイオス', kaos: 'talk' });
  });

  it('explains nothing: not who she is, not the world before', () => {
    expect(said.join('')).not.toMatch(/ルシファー|AI|戦争|女神|正体|昔|前世|記憶/);
  });

  it('arrives under MUGEN ZERO / ALDEN VILLAGE; skipping asks, with the note line and no address yet', () => {
    expect(INTRO_ARRIVAL).toEqual({ title: 'MUGEN ZERO', place: 'ALDEN VILLAGE' });
    expect(INTRO_SKIP_QUESTION).toBe('導入ストーリーをスキップしますか？');
    expect(INTRO_SKIP_NOTE).toBe('この物語はnote版『MUGEN ZERO』でも読むことができます。');
    expect(INTRO_NOTE_URL).toBeNull();
    expect(isMarkId(OPENING_INTRO_MARK)).toBe(true);
  });
});
