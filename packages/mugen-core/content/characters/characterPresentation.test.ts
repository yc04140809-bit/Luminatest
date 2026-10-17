import { describe, expect, it } from 'vitest';
import { CHARACTER_PRESENTATIONS, presentationOf } from './characterPresentation';
import { BATTLE_PROFILES } from './battleProfiles';

describe('what the status screen says about somebody', () => {
  it('has words for everybody the game can draw', () => {
    for (const id of Object.keys(BATTLE_PROFILES)) {
      expect(presentationOf(id), `${id} has something to say`).toBeTruthy();
    }
  });

  it('says nothing about somebody who has not been written', () => {
    expect(presentationOf('levi')).toBeNull();
    expect(presentationOf('gald')).toBeNull();
  });

  /**
   * The author has now given both. The field STAYS OPTIONAL, because
   * somebody may join before their title is written and the screen
   * must draw nothing rather than invent one — so what is asserted is
   * that a title, where present, is a real line and not a placeholder.
   */
  it('carries the titles the author gave, and no placeholder', () => {
    expect(CHARACTER_PRESENTATIONS.hero.epithet).toBe('記憶を辿る剣の旅人');
    expect(CHARACTER_PRESENTATIONS.kaos.epithet).toBe('記憶を導く双翼の少女');
    for (const p of Object.values(CHARACTER_PRESENTATIONS)) {
      if (p.epithet === undefined) continue;
      expect(p.epithet.trim()).not.toBe('');
      for (const filler of ['未実装', '—', 'TODO', '仮']) {
        expect(p.epithet, `${p.characterId}`).not.toContain(filler);
      }
    }
  });

  it('keeps prose out of the numbers', () => {
    for (const p of Object.values(CHARACTER_PRESENTATIONS)) {
      const text = [p.quote, p.intro, p.styleNote].filter(Boolean).join(' ');
      // No stat name may appear: the screen reads those from the world,
      // and a second copy in prose is a second copy that can be wrong.
      for (const stat of ['HP', 'MP', 'LEVEL', '攻撃力', '防御力', '魔力', '素早さ']) {
        expect(text, `${p.characterId} must not restate ${stat}`).not.toContain(stat);
      }
    }
  });
});
