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
   * NO 肩書き HAS BEEN GIVEN, so the field is absent rather than
   * filled. A screen must draw nothing there — an invented title is
   * the story being written by whoever needed a value.
   */
  it('leaves the epithet absent rather than inventing one', () => {
    for (const p of Object.values(CHARACTER_PRESENTATIONS)) {
      expect(p.epithet).toBeUndefined();
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
