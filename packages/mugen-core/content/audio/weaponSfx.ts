// WHICH NOISE A SWING MAKES, DECIDED BY THE WEAPON.
//
// The point of this file is that it is a TABLE and not a switch inside
// a battle screen. Two characters holding long swords sound the same
// because they are holding the same thing, not because somebody
// remembered to give them the same line — and the day a third joins
// carrying a spear, the spear is already answered here and nothing in
// the fight has to know they arrived.
//
// NO CHARACTER IS NAMED IN THIS FILE, on purpose. A per-character sound
// is exactly the thing that does not scale: it has to be written again
// for every new face, and it is wrong the moment somebody changes
// weapon. What a character HAS is in battleProfiles; what a weapon
// SOUNDS LIKE is here; and the join between them is one function.

import type { BattleProfile, BattleStyle, WeaponType } from '../characters/battleProfiles';
import type { SfxId } from './sfx';

/** What each weapon sounds like when it is swung, thrust or loosed. */
export const ATTACK_SFX_BY_WEAPON: Record<WeaponType, SfxId> = {
  LONG_SWORD: 'battle_attack_slash',
  DUAL_DAGGER: 'battle_attack_dagger',
  SPEAR: 'battle_attack_thrust',
  BOW: 'battle_attack_bow',
};

/**
 * And what a way of fighting sounds like, for somebody with nothing in
 * their hands to make the noise.
 *
 * The fallback, not the first answer: a swordsman with a spear swings
 * the spear. It is only consulted where the weapon is genuinely not
 * decided — which today is Kaos, who fights by casting.
 */
export const ATTACK_SFX_BY_STYLE: Record<BattleStyle, SfxId> = {
  SWORDSMANSHIP: 'battle_attack_slash',
  MAGIC: 'magic_cast',
};

/**
 * THE ONE ANSWER, in the order the answers are allowed to win.
 *
 * 1. A SKILL THAT BROUGHT ITS OWN SOUND. An ancient breath is not a
 *    sword and must never be made to sound like one, so a skill's own
 *    sound beats everything below it. This is the hook the cut-ins,
 *    the arcana summons and the boss skills will arrive through; they
 *    need nothing here changed, only a sound to pass in.
 * 2. WHAT IS IN THEIR HANDS.
 * 3. HOW THEY FIGHT, where 2 has not been decided.
 *
 * `profile` may be null — an attacker nobody has written a profile for
 * — and the honest answer then is the ordinary swing rather than
 * silence, because something did just hit somebody.
 */
export function attackSfxFor(
  profile: BattleProfile | null,
  skillSfx?: SfxId | null,
): SfxId {
  if (skillSfx) return skillSfx;
  if (profile?.weaponType) return ATTACK_SFX_BY_WEAPON[profile.weaponType];
  if (profile) return ATTACK_SFX_BY_STYLE[profile.battleStyle];
  return 'battle_attack_slash';
}
