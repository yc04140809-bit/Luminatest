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

export type WeaponType = 'LONG_SWORD' | 'DUAL_DAGGERS' | 'SPEAR' | 'BOW';

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
  /** Which standing figure to draw. A key, never a path. */
  portraitKey: string;
  /**
   * FOR THE DAY THERE ARE CLOTHES TO CHANGE.
   *
   * 'default' for everybody, and the field exists so that adding a
   * second outfit is a value here rather than a new column through
   * every screen that draws a person. Nothing reads it yet, which is
   * the correct amount of skin system to have built today.
   */
  skinId: string;
}

/**
 * The roster, by id.
 *
 * Two entries, because two people fight. A third is a line here and
 * nothing else — that is the whole point of the shape.
 */
export const BATTLE_PROFILES: Record<string, BattleProfile> = {
  hero: {
    characterId: 'hero',
    weaponType: 'LONG_SWORD',
    battleStyle: 'SWORDSMANSHIP',
    portraitKey: 'hero',
    skinId: 'default',
  },
  kaos: {
    characterId: 'kaos',
    // NOT DECIDED, and not to be decided by whoever needs a value here.
    weaponType: null,
    battleStyle: 'MAGIC',
    portraitKey: 'kaos',
    skinId: 'default',
  },
};

export function battleProfileOf(characterId: string): BattleProfile | null {
  return BATTLE_PROFILES[characterId] ?? null;
}

/** Japanese, for the one screen that shows these to a player. */
export const WEAPON_LABELS: Record<WeaponType, string> = {
  LONG_SWORD: '長剣',
  DUAL_DAGGERS: '二刀短剣',
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
