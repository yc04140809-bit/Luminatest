import { describe, expect, it } from 'vitest';
import {
  CHOICE_RESULT_LINES,
  LIFE_CHOICE_OPTIONS,
  MEDICINE_DISCOVERY_LINES,
  MEDICINE_MEMO,
  choiceResultLinesAfterDiscovery,
} from './galdEncounter';

/** 発見＋薬 (作者 2026-11-03): between his fall and the four answers, and where the medicine goes after each. */
describe('the medicine, found before the four answers', () => {
  it('what fell, the note (written, not said), the hero picking it up, her word and his — short, in that order', () => {
    expect(MEDICINE_DISCOVERY_LINES.map((l) => l.text)).toEqual([
      '男の荷から、小さな包みがこぼれ落ちた。',
      '薬包に、走り書きのメモが挟まっている。',
      '{HERO}は、包みを拾い上げた。',
      '……薬？',
      '妹だ。病気なんだ',
    ]);
    expect(MEDICINE_DISCOVERY_LINES.map((l) => l.speaker)).toEqual([null, null, null, 'ケイオス', '盗賊']);
    // The note is shown from the line that finds it on.
    expect(MEDICINE_DISCOVERY_LINES.map((l) => !!l.showsMemo)).toEqual([false, true, true, true, true]);
    expect(MEDICINE_MEMO).toBe('エルナへ　あと二日分');
    // The four answers themselves are unchanged.
    expect(LIFE_CHOICE_OPTIONS.map((o) => o.id)).toEqual(['KILL', 'SPARE', 'HELP', 'CAPTURE']);
  });

  it('after each answer: where the medicine went, and his name — learned here and no sooner (A9) — in their places', () => {
    expect(choiceResultLinesAfterDiscovery('SPARE').map((l) => l.text)).toEqual([
      '……俺は、お前を襲ったんだぞ。',
      'それでも見逃すのか？',
      '……馬鹿じゃねぇのか。',
      '包みを差し出すと、男は黙って受け取った。',
      '去り際に、男はガルドと名乗った。',
      '男は森の奥へと消えていった。',
    ]);
    expect(choiceResultLinesAfterDiscovery('KILL').map((l) => l.text)).toEqual([
      '男は動かなくなった。',
      '懐から、古い手紙のようなものが覗いている。',
      '手紙の差出人に、ガルド、とあった。',
      '包みとメモは、まだ{HERO}の手の中にある。',
    ]);
    expect(choiceResultLinesAfterDiscovery('HELP').map((l) => l.text)).toEqual([
      '……なんのつもりだ。',
      '男は傷の手当てを黙って受けた。',
      '手当てを終えると、包みを男の手に戻した。',
      '手当ての途中、男はガルドとだけ名乗った。',
    ]);
    expect(choiceResultLinesAfterDiscovery('CAPTURE').map((l) => l.text)).toEqual([
      '男は縄をかけられ、村の衛兵に引き渡された。',
      '包みのことは、衛兵に伝えて預けた。',
      '衛兵が、男の名を呼んだ。ガルド、と。',
      '最後まで、一言も話さなかった。',
    ]);
    // Narration, no voice; the shared lines (the Artifact's) are untouched.
    for (const id of ['SPARE', 'KILL', 'HELP', 'CAPTURE'] as const) {
      const added = choiceResultLinesAfterDiscovery(id).filter((l) => !CHOICE_RESULT_LINES[id].includes(l));
      expect(added).toHaveLength(2);
      for (const l of added) expect(l.speaker).toBeNull();
      // His name once in each, never before the answer (the discovery says 「盗賊」).
      expect(added.filter((l) => l.text.includes('ガルド'))).toHaveLength(1);
    }
    expect(MEDICINE_DISCOVERY_LINES.some((l) => l.text.includes('ガルド') || l.speaker?.includes('ガルド'))).toBe(false);
    expect(CHOICE_RESULT_LINES.SPARE.map((l) => l.text)).not.toContain('包みを差し出すと、男は黙って受け取った。');
  });
});
