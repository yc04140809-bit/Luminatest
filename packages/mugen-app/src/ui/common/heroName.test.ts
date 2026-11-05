import { describe, expect, it } from 'vitest';
import { HERO_IN_TEXT, withHeroName } from './heroName';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { MEDICINE_DISCOVERY_LINES, choiceResultLinesAfterDiscovery } from '@mugen/content/dialogue/galdEncounter';
import { FINALE_SCENES } from '@mugen/content/story/chapter1Finale';

describe('his name in the narration (作者 2026-11-05)', () => {
  it('written as the speaker is written; shown as the player named him, every time it is said', () => {
    expect(HERO_IN_TEXT).toBe(HERO_SPEAKER);
    expect(withHeroName('{HERO}は、包みを拾い上げた。', 'レン')).toBe('レンは、包みを拾い上げた。');
    expect(withHeroName('{HERO}と{HERO}', 'レン')).toBe('レンとレン');
    expect(withHeroName('男は森の奥へと消えていった。', 'レン')).toBe('男は森の奥へと消えていった。');
  });

  it('no narration names him 「主人公」 outright: the medicine, the answer kept, the finale', () => {
    const narration = [
      ...MEDICINE_DISCOVERY_LINES,
      ...(['SPARE', 'KILL', 'HELP', 'CAPTURE'] as const).flatMap((c) => choiceResultLinesAfterDiscovery(c)),
    ].filter((l) => l.speaker === null);
    for (const l of narration) expect(l.text).not.toContain('主人公');
    expect(narration.map((l) => l.text)).toContain('{HERO}は、包みを拾い上げた。');
    expect(narration.map((l) => l.text)).toContain('包みとメモは、まだ{HERO}の手の中にある。');
    expect(JSON.stringify(FINALE_SCENES)).not.toMatch(/text":"[^"]*主人公/);
  });
});
