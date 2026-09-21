// WHAT SOMEBODY FIGHTS WITH, AND HOW.
//
// CONTENT, NEVER SAVE DATA. A profile is a fact about a character the
// way their name is: it is authored, it ships with the build, and no
// world stores a copy of it. That is what keeps this round out of the
// SAVE schema entirely — nothing here is written, so nothing here can
// be out of date in an old save.
//
// TWO SEPARATE FACTS, deliberately kept apart:
//
//   weaponType   what is in their hands. A long sword is a long sword
//                whoever is holding it, and two characters holding one
//                share a swing and its noise.
//   battleStyle  how they fight. Swordsmanship is a way of using a
//                weapon; magic is a way of not needing one.
//
// They are not the same question and collapsing them would answer the
// wrong one. Kaos fights by casting — that is settled — and what she
// might hold while doing it is NOT settled: a staff or a grimoire is
// canon nobody has written, so her weaponType is null and stays null
// until somebody decides. Null here means "not decided", never "none"
// and never "unarmed".

import { CHARACTER_APPEARANCES, statusPortraitKeyOf } from './characterAppearance';

export type WeaponType = 'LONG_SWORD' | 'DUAL_DAGGER' | 'SPEAR' | 'BOW';

export type BattleStyle = 'SWORDSMANSHIP' | 'MAGIC';

export interface BattleProfile {
  /** The same id the party roster and the art registry use. One id. */
  characterId: string;
  /**
   * What they carry, or null where it has not been decided.
   *
   * Null is a STATEMENT and not a gap to fill in: it means the author
   * has deliberately not said, and everything reading it must cope
   * rather than guess — the same rule `CharacterState.age` already
   * follows, and for the same reason.
   */
  weaponType: WeaponType | null;
  battleStyle: BattleStyle;
  /**
   * APPEARANCE, AND NO LONGER OWNED HERE.
   *
   * How somebody LOOKS now lives in `characterAppearance.ts`, because
   * a screen redesign must not force an art change and an art change
   * must not force a screen redesign. These two fields are filled from
   * that registry so the Artifact — which reads `portraitKey` and
   * which this round is not allowed to touch — keeps working unchanged.
   *
   * New code reads `statusPortraitKeyOf` / `skinOf` directly. These go
   * the next time the Artifact's own status screen is opened up.
   */
  portraitKey: string;
  skinId: string;
}

/**
 * WHAT EACH NAMED CHARACTER CARRIES. Canon, and only canon.
 *
 * Separate from the profiles below because it answers a smaller
 * question and can therefore answer it about MORE PEOPLE. Levi, Aria
 * and Gald have a weapon in canon and nothing else decided — no
 * levels, no picture, no place in the party — so a full profile for
 * them would be four invented fields around one real one. This is the
 * one real one, written down, waiting.
 *
 * KAOS IS DELIBERATELY ABSENT. 魔法 is how she fights, not a thing in
 * her hands, and what she might hold is undecided. The status line
 * still reads 魔法 for her, from her style — see `weaponLabelOf`.
 *
 * GALD IS AN ENEMY and being in this map does not change that. It
 * records what he fights with, nothing more: no route through the four
 * answers puts him in the party, and nothing here should ever be read
 * as doing so.
 */
export const WEAPON_CANON: Record<string, WeaponType> = {
  hero: 'LONG_SWORD',
  levi: 'SPEAR',
  aria: 'BOW',
  gald: 'DUAL_DAGGER',
};

/**
 * The full profiles: everybody the game can currently DRAW and show.
 *
 * Two entries, because two people fight. A third is a line here and
 * nothing else — that is the whole point of the shape — and the day
 * Levi joins, her weapon is already above and this is where the rest
 * of her arrives.
 */
export const BATTLE_PROFILES: Record<string, BattleProfile> = {
  hero: {
    characterId: 'hero',
    weaponType: WEAPON_CANON.hero,
    battleStyle: 'SWORDSMANSHIP',
    portraitKey: statusPortraitKeyOf('hero') ?? 'hero',
    skinId: CHARACTER_APPEARANCES.hero.defaultSkinId,
  },
  kaos: {
    characterId: 'kaos',
    // NOT DECIDED, and not to be decided by whoever needs a value here.
    weaponType: null,
    battleStyle: 'MAGIC',
    portraitKey: statusPortraitKeyOf('kaos') ?? 'kaos',
    skinId: CHARACTER_APPEARANCES.kaos.defaultSkinId,
  },
};

export function battleProfileOf(characterId: string): BattleProfile | null {
  return BATTLE_PROFILES[characterId] ?? null;
}

/** Japanese, for the one screen that shows these to a player. */
export const WEAPON_LABELS: Record<WeaponType, string> = {
  LONG_SWORD: '長剣',
  DUAL_DAGGER: '二刀短剣',
  SPEAR: '槍',
  BOW: '弓',
};

export const BATTLE_STYLE_LABELS: Record<BattleStyle, string> = {
  SWORDSMANSHIP: '剣術',
  MAGIC: '魔法特化',
};

/**
 * WHAT TO PUT ON THE 武器種 LINE.
 *
 * A weapon where there is one. Where there is not — Kaos — the line
 * still has to say something true, and the true thing is how she
 * fights: 魔法. What it must NOT do is print 「なし」, which would read
 * as "unarmed" and is a claim nobody has made.
 */
export const MAGIC_WEAPON_LABEL = '魔法';

export function weaponLabelOf(profile: BattleProfile): string {
  return profile.weaponType ? WEAPON_LABELS[profile.weaponType] : MAGIC_WEAPON_LABEL;
}

export function battleStyleLabelOf(profile: BattleProfile): string {
  return BATTLE_STYLE_LABELS[profile.battleStyle];
}
