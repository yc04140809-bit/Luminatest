// ALDEN'S PEOPLE — what was actually decided, and what was not.
//
// Half of these tests exist to hold a line that is easy to cross by
// accident: a reference sheet arrived with each drawing, and the
// sentences printed on those sheets are the image generator's rather
// than the author's. Lina's said her dream is to bake bread like her
// father. That is not canon, and the day somebody writes 'BAKER' into
// her record her future stops being the engine's to grow.

import { describe, it, expect } from 'vitest';
import { INITIAL_LINA_STATE, LINA, BAKERY_HELPER } from './lina';
import { INITIAL_BAKERY_OWNER_STATE, BAKERY_OWNER } from './bakeryOwner';
import { INITIAL_GALD_STATE } from './gald';
import { partyArtFor } from '../art';
import { ALDEN_FIGURES } from '../../assets/manifest';

describe('LINA', () => {
  it('is fourteen, in Alden, helping at the bakery', () => {
    expect(INITIAL_LINA_STATE.id).toBe('LINA');
    expect(INITIAL_LINA_STATE.name).toBe('リナ');
    expect(INITIAL_LINA_STATE.age).toBe(14);
    expect(INITIAL_LINA_STATE.alive).toBe(true);
    expect(INITIAL_LINA_STATE.location).toBe('ALDEN_VILLAGE');
    expect(INITIAL_LINA_STATE.occupation).toBe(BAKERY_HELPER);
    expect(LINA.id).toBe(INITIAL_LINA_STATE.id);
  });

  it('has a life phase the world already had a word for', () => {
    // Not an invented one. Fourteen is below adulthood and the enum's
    // vocabulary is CHILD / YOUNG_ADULT / ADULT / ELDER.
    expect(['CHILD', 'YOUNG_ADULT', 'ADULT', 'ELDER']).toContain(INITIAL_LINA_STATE.lifePhase);
    expect(INITIAL_LINA_STATE.lifePhase).toBe('CHILD');
  });

  it('IS NOT A BAKER, and is not anything else yet either', () => {
    // 「パン屋の手伝い」 is what she is doing at fourteen. Her trade,
    // her leaving or staying, and whether she ever touches magic are
    // all the WORLD LIFE ENGINE's, and none of them is written here.
    // Stated exactly rather than by substring: 'BAKERY_HELPER' contains
    // 'BAKER', and a test that cannot tell those apart is a test that
    // would have to be weakened the first time it was right.
    expect(INITIAL_LINA_STATE.occupation).toBe('BAKERY_HELPER');
    expect(INITIAL_LINA_STATE.occupation).not.toBe('BAKER');
    expect(INITIAL_LINA_STATE.occupation).not.toBe(
      INITIAL_BAKERY_OWNER_STATE.occupation,
    );
    // And none of the futures the engine is supposed to decide appears
    // anywhere in her record.
    const written = JSON.stringify(INITIAL_LINA_STATE).toUpperCase();
    for (const future of ['MAGE', 'WIZARD', 'MAGIC', 'WANDER', 'HEALER', 'ADVENTURER']) {
      expect(written, future).not.toContain(future);
    }
  });

  it('is nobody’s partner and nobody’s parent', () => {
    expect(INITIAL_LINA_STATE.spouseId).toBeNull();
    expect(INITIAL_LINA_STATE.childrenIds).toEqual([]);
  });
});

describe('BAKERY_OWNER', () => {
  it('runs the bakery in Alden', () => {
    expect(INITIAL_BAKERY_OWNER_STATE.id).toBe('BAKERY_OWNER');
    expect(INITIAL_BAKERY_OWNER_STATE.occupation).toBe('BAKERY_OWNER');
    expect(INITIAL_BAKERY_OWNER_STATE.location).toBe('ALDEN_VILLAGE');
    expect(INITIAL_BAKERY_OWNER_STATE.alive).toBe(true);
    expect(BAKERY_OWNER.id).toBe(INITIAL_BAKERY_OWNER_STATE.id);
  });

  it('HAS NO AGE, because nobody decided one', () => {
    // The test that matters. A number here would be a number read off
    // a drawing, and a month later it would be indistinguishable from
    // one an author chose. Null says "not decided" out loud.
    expect(INITIAL_BAKERY_OWNER_STATE.age).toBeNull();
  });
});

describe('親子関係', () => {
  it('records the father listing his daughter, the one way round', () => {
    expect(INITIAL_BAKERY_OWNER_STATE.childrenIds).toEqual(['LINA']);
  });

  it('stores it once, not twice', () => {
    // `CharacterState` has no parent field and did not grow one. The
    // other direction is a scan, which is what GOD VIEW does — so the
    // two directions cannot drift apart, because there is only one.
    expect(Object.keys(INITIAL_LINA_STATE)).not.toContain('parentId');
    expect(Object.keys(INITIAL_LINA_STATE)).not.toContain('parentIds');
  });

  it('points at a character the world actually has', () => {
    for (const childId of INITIAL_BAKERY_OWNER_STATE.childrenIds) {
      expect(childId).toBe(INITIAL_LINA_STATE.id);
    }
  });
});

describe('正式ビジュアル', () => {
  it('registers one standing figure each, and nothing invented', () => {
    expect(ALDEN_FIGURES.lina).toBeTruthy();
    expect(ALDEN_FIGURES.bakeryOwner).toBeTruthy();
    expect(ALDEN_FIGURES.lina).not.toBe(ALDEN_FIGURES.bakeryOwner);
  });

  it('answers for both of them without a placeholder', () => {
    for (const id of ['LINA', 'BAKERY_OWNER']) {
      const art = partyArtFor(id, 'fullbody');
      expect(art.placeholder, id).toBe(false);
      expect(art.state, id).toBe('fullbody');
      expect(art.substituted, id).toBe(false);
      expect(art.asset?.src, id).toBeTruthy();
    }
  });

  it('falls back rather than showing nothing for a pose nobody drew', () => {
    // One pose was delivered. Everything else goes through the ordinary
    // chain, so the day a talking picture exists it lands in the art
    // file and no screen changes.
    for (const state of ['talk', 'portrait', 'battle_idle'] as const) {
      const art = partyArtFor('LINA', state);
      expect(art.placeholder, state).toBe(false);
      expect(art.state, state).toBe('fullbody');
      expect(art.substituted, state).toBe(true);
    }
  });

  it('does not claim either of them has a battle pose', () => {
    // Neither is in a fight and neither was drawn for one. If a real
    // battle_idle ever appears for them it will be a decision, not a
    // fallback that quietly started looking like one.
    expect(partyArtFor('LINA', 'battle_idle').substituted).toBe(true);
    expect(partyArtFor('BAKERY_OWNER', 'battle_idle').substituted).toBe(true);
  });
});

describe('既存キャラクターは触っていない', () => {
  it('leaves Gald exactly as he was', () => {
    expect(INITIAL_GALD_STATE.age).toBe(27);
    expect(INITIAL_GALD_STATE.occupation).toBe('BANDIT');
    expect(INITIAL_GALD_STATE.location).toBe('GREENWOOD_FOREST');
    expect(INITIAL_GALD_STATE.lifePhase).toBe('YOUNG_ADULT');
  });
});
