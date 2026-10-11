import { describe, expect, it } from 'vitest';
import { CHOICE_RESULT_LINES, GALD_ENCOUNTER_LINES, LIFE_CHOICE_OPTIONS } from './galdEncounter';

/**
 * ガルドが見逃された時の台詞 (作者指示 2026-10-11): he came for their money
 * (「命までは取らねぇ」), so he says he attacked them — never that he tried to
 * kill them. The four answers themselves are unchanged.
 */
describe('Gald, spared', () => {
  it('「……俺は、お前を襲ったんだぞ。」「それでも見逃すのか？」 — and nowhere 「殺そうとした」', () => {
    const spare = CHOICE_RESULT_LINES.SPARE.map((l) => l.text);
    expect(spare.slice(0, 3)).toEqual(['……俺は、お前を襲ったんだぞ。', 'それでも見逃すのか？', '……馬鹿じゃねぇのか。']);
    expect(spare.at(-1)).toBe('男は森の奥へと消えていった。');
    for (const lines of Object.values(CHOICE_RESULT_LINES)) for (const l of lines) expect(l.text).not.toContain('殺そうと');
  });

  it('what he said at the start still stands, and the four answers are as they were', () => {
    expect(GALD_ENCOUNTER_LINES.map((l) => l.text)).toContain('金を置いていけ。命までは取らねぇ。');
    expect(LIFE_CHOICE_OPTIONS.map((o) => o.id)).toEqual(['KILL', 'SPARE', 'HELP', 'CAPTURE']);
  });
});
