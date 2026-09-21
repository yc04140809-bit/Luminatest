import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_SLOTS,
  INITIAL_EQUIPMENT,
  OPERABLE_SLOTS,
  WEAPON_DEFS,
  hasNoCorrection,
  weaponDefOf,
} from './equipment';
import { attackKindOf, canEquip, equippableWeapons, weaponTypeOf } from './equipResolve';
import { BATTLE_PROFILES, WEAPON_CANON } from '../characters/battleProfiles';
import { equippedAttackSfxFor } from '../audio/weaponSfx';

describe('what somebody is carrying', () => {
  it('registers the two weapons the author gave, as given', () => {
    expect(WEAPON_DEFS['weapon/worn_long_sword']).toMatchObject({
      name: '使い込まれた長剣',
      attackKind: 'PHYSICAL',
      weaponType: 'LONG_SWORD',
    });
    expect(WEAPON_DEFS['weapon/old_grimoire']).toMatchObject({
      name: '古い魔導書',
      attackKind: 'MAGIC',
    });
    expect(INITIAL_EQUIPMENT.hero.WEAPON).toBe('weapon/worn_long_sword');
    expect(INITIAL_EQUIPMENT.kaos.WEAPON).toBe('weapon/old_grimoire');
  });

  /**
   * THE CANON CONFLICT, HELD IN PLACE BY A TEST. The brief calls
   * Kaos's weapon type 「MAGIC」, but MAGIC is a BattleStyle and never
   * a WeaponType. The grimoire therefore carries NO weapon type, and
   * `WEAPON_CANON` still has no entry for her — she was left out on
   * purpose and equipping a focus does not put her in.
   */
  it('gives the grimoire no weapon type, and does not invent one for her', () => {
    const grimoire = WEAPON_DEFS['weapon/old_grimoire'];
    expect('weaponType' in grimoire).toBe(false);
    expect('kaos' in WEAPON_CANON).toBe(false);
    expect(weaponTypeOf('kaos', 'weapon/old_grimoire')).toBeNull();
  });

  /** And it does not change how she fights, as the brief requires. */
  it('leaves her battle style alone', () => {
    expect(BATTLE_PROFILES.kaos.battleStyle).toBe('MAGIC');
    expect(attackKindOf('kaos', 'weapon/old_grimoire')).toEqual({ kind: 'MAGIC' });
  });

  describe('deciding what somebody attacks as', () => {
    it('prefers what is held over what is canon', () => {
      expect(weaponTypeOf('hero', 'weapon/worn_long_sword')).toBe('LONG_SWORD');
      expect(attackKindOf('hero', 'weapon/worn_long_sword')).toEqual({
        kind: 'PHYSICAL',
        weaponType: 'LONG_SWORD',
      });
    });

    it('falls back to canon with an empty hand', () => {
      expect(weaponTypeOf('hero', null)).toBe('LONG_SWORD');
      expect(weaponTypeOf('levi', null)).toBe('SPEAR');
    });

    /**
     * 「装備がない」 and 「武器種が未設定」 are different facts, and the
     * brief says so in as many words. Both are null here only because
     * the QUESTION is the same one; `attackKindOf` tells them apart.
     */
    it('does not confuse an empty hand with an undecided weapon type', () => {
      expect(weaponTypeOf('kaos', null)).toBeNull();
      expect(attackKindOf('kaos', null)).toEqual({ kind: 'MAGIC' });
      expect(weaponTypeOf('hero', null)).toBe('LONG_SWORD');
    });
  });

  describe('who may hold what', () => {
    it('lets each of them hold their own and nobody else’s', () => {
      expect(canEquip('hero', WEAPON_DEFS['weapon/worn_long_sword'])).toBe(true);
      expect(canEquip('hero', WEAPON_DEFS['weapon/old_grimoire'])).toBe(false);
      expect(canEquip('kaos', WEAPON_DEFS['weapon/old_grimoire'])).toBe(true);
      expect(canEquip('kaos', WEAPON_DEFS['weapon/worn_long_sword'])).toBe(false);
    });

    it('offers each of them only what they could hold', () => {
      expect(equippableWeapons('hero').map((w) => w.equipmentId)).toEqual([
        'weapon/worn_long_sword',
      ]);
      expect(equippableWeapons('kaos').map((w) => w.equipmentId)).toEqual([
        'weapon/old_grimoire',
      ]);
    });

    /** Somebody with no decided weapon type is handed nothing. */
    it('offers a spear to nobody who has not been given one', () => {
      expect(canEquip('aria', WEAPON_DEFS['weapon/worn_long_sword'])).toBe(false);
    });
  });

  /**
   * THE CORRECTION IS ZERO AND MUST STAY ZERO until the battle reads
   * it. A number on the screen that the fight ignores is the screen
   * lying, so this is enforced rather than remembered.
   */
  it('carries no correction at all yet', () => {
    for (const def of Object.values(WEAPON_DEFS)) {
      expect(hasNoCorrection(def), def.equipmentId).toBe(true);
      expect(def.effect).toEqual({ attack: 0, magic: 0 });
    }
  });

  it('can be operated only where there is something to operate', () => {
    expect(OPERABLE_SLOTS).toEqual(['WEAPON']);
    expect(EQUIPMENT_SLOTS).toEqual(['WEAPON', 'OUTFIT', 'ACCESSORY_1', 'ACCESSORY_2']);
    // Every other slot has no definitions at all, which is what makes
    // a screen able to show the frame without offering the door.
    for (const def of Object.values(WEAPON_DEFS)) expect(def.slot).toBe('WEAPON');
  });

  it('knows nothing about an id it has never heard of', () => {
    expect(weaponDefOf('weapon/nonexistent')).toBeNull();
  });

  /** Equipment reaches the ear: change sword, change the noise. */
  it('picks the attack sound from what is held', () => {
    expect(equippedAttackSfxFor('hero', 'weapon/worn_long_sword')).toBe('battle_attack_slash');
    expect(equippedAttackSfxFor('kaos', 'weapon/old_grimoire')).toBe('magic_cast');
    expect(equippedAttackSfxFor('kaos', null)).toBe('magic_cast');
    // A skill still wins over the weapon, as it always did.
    expect(equippedAttackSfxFor('hero', 'weapon/worn_long_sword', 'battle_guard')).toBe(
      'battle_guard',
    );
  });
});
