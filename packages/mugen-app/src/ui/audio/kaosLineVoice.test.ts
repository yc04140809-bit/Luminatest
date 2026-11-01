import { describe, it, expect, vi, beforeEach } from 'vitest';

const played: unknown[][] = [];
vi.mock('../../platform/audio', () => ({ playVoice: (...a: unknown[]) => played.push(a) }));
vi.mock('../../platform/voice', () => ({
  kaosLineVoice: (text: string) => ({ 'ただいまー。': 'ch1.v_ch1_chaos042', 'うん。': 'ch1.v_ch1_chaos007' })[text] ?? null,
  heroLineVoice: (text: string) => ({ 'どうした？': 'ch1.v_ch1_hero022' })[text] ?? null,
}));
const { sayKaosLine, forgetKaosLine } = await import('./kaosLineVoice');

describe('ケイオス’s line, heard as it comes up (ボイスパック12)', () => {
  beforeEach(() => {
    played.length = 0;
    forgetKaosLine();
  });

  it('hers, with a take: said; someone else’s, or hers with none, not', () => {
    expect(sayKaosLine('a:0', { speaker: 'ケイオス', text: 'ただいまー。' })).toBe(true);
    expect(sayKaosLine('a:1', { speaker: '{HERO}', text: 'ただいまー。' })).toBe(false);
    expect(sayKaosLine('a:2', { speaker: 'ケイオス', text: '……。' })).toBe(false);
    expect(sayKaosLine('a:3', null)).toBe(false);
    expect(played).toEqual([['ch1.v_ch1_chaos042', undefined]]);
  });

  it('主人公’s too (ボイスパック13): his line as written (`{HERO}`), by its text; his name put in, or another’s, not', () => {
    expect(sayKaosLine('h:0', { speaker: '{HERO}', text: 'どうした？' })).toBe(true);
    expect(sayKaosLine('h:1', { speaker: 'ユウ', text: 'どうした？' })).toBe(false);
    expect(sayKaosLine('h:2', { speaker: 'グレイヴ', text: 'どうした？' })).toBe(false);
    expect(sayKaosLine('h:3', { speaker: 'ケイオス', text: 'どうした？' })).toBe(false);
    expect(sayKaosLine('h:4', { speaker: '{HERO}', text: '？' })).toBe(false);
    expect(played).toEqual([['ch1.v_ch1_hero022', undefined]]);
  });

  it('once per screen and line, even drawn twice; several together each once, the rest after the first', () => {
    for (let n = 0; n < 2; n++) {
      sayKaosLine('v:0', { speaker: 'ケイオス', text: 'ただいまー。' });
      sayKaosLine('v:1', { speaker: 'ケイオス', text: 'うん。' }, { wait: true });
    }
    expect(played).toEqual([
      ['ch1.v_ch1_chaos042', undefined],
      ['ch1.v_ch1_chaos007', { wait: true }],
    ]);
  });
});
