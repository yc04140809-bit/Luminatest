import { describe, expect, it } from 'vitest';
import { ATTACK_SFX_BY_STYLE, ATTACK_SFX_BY_WEAPON, attackSfxFor } from './weaponSfx';
import { SFX_IDS } from './sfx';
import {
  BATTLE_PROFILES,
  battleProfileOf,
  weaponLabelOf,
  type BattleProfile,
} from '../characters/battleProfiles';

describe('which noise a swing makes', () => {
  it('answers with a sound the game actually has a name for', () => {
    for (const id of [
      ...Object.values(ATTACK_SFX_BY_WEAPON),
      ...Object.values(ATTACK_SFX_BY_STYLE),
    ]) {
      expect(SFX_IDS, `${id} is a real sound`).toContain(id);
    }
  });

  /**
   * THE WHOLE REASON THIS IS A TABLE. Two characters holding the same
   * weapon share its noise without anybody writing them down together.
   */
  it('gives two people with the same weapon the same swing', () => {
    const one: BattleProfile = {
      characterId: 'one',
      weaponType: 'LONG_SWORD',
      battleStyle: 'SWORDSMANSHIP',
      portraitKey: 'one',
      skinId: 'default',
    };
    const other: BattleProfile = { ...one, characterId: 'other', portraitKey: 'other' };
    expect(attackSfxFor(one)).toBe(attackSfxFor(other));
  });

  it('gives each weapon its own', () => {
    const sounds = Object.values(ATTACK_SFX_BY_WEAPON);
    expect(new Set(sounds).size, 'no two weapons sound alike').toBe(sounds.length);
  });

  /** A skill that brought its own sound is not made to sound like a sword. */
  it('lets a skill overrule the weapon', () => {
    const hero = battleProfileOf('hero')!;
    expect(attackSfxFor(hero)).toBe('battle_attack_slash');
    expect(attackSfxFor(hero, 'battle_critical')).toBe('battle_critical');
  });

  /** Kaos: no weapon decided, so how she fights answers instead. */
  it('falls back to how somebody fights when what they hold is undecided', () => {
    const kaos = battleProfileOf('kaos')!;
    expect(kaos.weaponType, 'her weapon is deliberately not decided').toBeNull();
    expect(attackSfxFor(kaos)).toBe('magic_cast');
  });

  it('still makes a noise for an attacker nobody has written down', () => {
    expect(attackSfxFor(null)).toBe('battle_attack_slash');
  });
});

describe('what somebody fights with', () => {
  it('uses the same ids the party roster does', () => {
    for (const [key, profile] of Object.entries(BATTLE_PROFILES)) {
      expect(profile.characterId, 'the key and the id agree').toBe(key);
    }
  });

  /**
   * 「なし」 would read as unarmed, which is a claim nobody has made.
   * An undecided weapon still shows how she fights.
   */
  it('never prints an empty weapon line', () => {
    for (const profile of Object.values(BATTLE_PROFILES)) {
      expect(weaponLabelOf(profile).length).toBeGreaterThan(0);
    }
    expect(weaponLabelOf(battleProfileOf('kaos')!)).toBe('魔法');
    expect(weaponLabelOf(battleProfileOf('hero')!)).toBe('長剣');
  });

  it('is content, so no world has to store it', () => {
    expect(battleProfileOf('nobody')).toBeNull();
  });
});
