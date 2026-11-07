import {
  BATTLE_PROFILES,
  WEAPON_CANON,
  battleProfileOf,
  type WeaponType,
} from '../characters/battleProfiles';
import { WEAPON_DEFS, weaponDefOf, type WeaponDefinition } from './equipment';

// WHAT SOMEBODY ATTACKS AS, ONCE THEY ARE HOLDING SOMETHING.
//
// The rule is one line and the rest of this file is why it is safe:
//
//     EQUIPPED WEAPON FIRST, THEN THE CHARACTER'S OWN CANON.
//
// THREE STATES, NEVER TWO. 「何も装備していない」 and 「武器種が未設定」
// are different facts and the brief is explicit that they must not be
// confused:
//
//   equipped        holding something — use what it is
//   unequipped      holding nothing, but canon says what they use
//   undecided       nobody has decided what they use at all
//
// Kaos is the third for a PHYSICAL weapon type and the second for how
// she fights: `WEAPON_CANON` leaves her out on purpose, and her
// profile's `weaponType` is null meaning "not decided", never "none".
// So asking "what is her weapon type" must answer NULL, while asking
// "what does her attack sound like" answers from her style. Those are
// two questions and this file keeps them two.

/** What an attack IS, which is not always a kind of weapon. */
export type AttackKind = { kind: 'PHYSICAL'; weaponType: WeaponType } | { kind: 'MAGIC' };

/**
 * The weapon type in force, or null when nobody has decided one.
 *
 * NULL IS AN ANSWER. A magic focus gives no weapon type and neither
 * does an empty hand belonging to somebody with no canon weapon — and
 * a caller that cannot tell those apart should be asking
 * `attackKindOf` instead.
 */
export function weaponTypeOf(characterId: string, equippedId: string | null): WeaponType | null {
  const held = equippedId ? weaponDefOf(equippedId) : null;
  if (held) return held.attackKind === 'PHYSICAL' ? held.weaponType : null;
  return WEAPON_CANON[characterId] ?? null;
}

/**
 * How they attack, holding this or holding nothing.
 *
 * Falls through to the battle style, which is what makes Kaos answer
 * MAGIC without anybody pretending MAGIC is a weapon type.
 */
export function attackKindOf(characterId: string, equippedId: string | null): AttackKind {
  const held = equippedId ? weaponDefOf(equippedId) : null;
  if (held) {
    return held.attackKind === 'PHYSICAL'
      ? { kind: 'PHYSICAL', weaponType: held.weaponType }
      : { kind: 'MAGIC' };
  }
  const canon = WEAPON_CANON[characterId];
  if (canon) return { kind: 'PHYSICAL', weaponType: canon };
  const profile = battleProfileOf(characterId);
  if (profile?.weaponType) return { kind: 'PHYSICAL', weaponType: profile.weaponType };
  return { kind: 'MAGIC' };
}

/**
 * Whether somebody may hold a given weapon.
 *
 * A PHYSICAL weapon must match the weapon type they are canon for —
 * that is what turns 武器種 from a label into a rule. A MAGIC focus
 * needs the magic to focus, so it asks the battle style.
 *
 * SOMEBODY WITH NEITHER CAN HOLD NOTHING, which is correct: a
 * character whose weapon type is undecided must not be handed a sword
 * by a screen that needed a value.
 */
export function canEquip(characterId: string, weapon: WeaponDefinition): boolean {
  if (weapon.attackKind === 'MAGIC') {
    return battleProfileOf(characterId)?.battleStyle === 'MAGIC';
  }
  return WEAPON_CANON[characterId] === weapon.weaponType;
}

/** Every weapon this character could hold, in a stable order. */
export function equippableWeapons(characterId: string): WeaponDefinition[] {
  return Object.values(WEAPON_DEFS).filter((w) => canEquip(characterId, w));
}

/** Everybody the game can currently draw, for tests and for screens. */
export function equippableCharacterIds(): string[] {
  return Object.keys(BATTLE_PROFILES);
}
