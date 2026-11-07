// WHAT THE PLAYER CALLS THEMSELVES.
//
// A NAME IS NOT A CHARACTER ID. `hero` is the id: the art registry, the
// battle, the party roster, WORLD MEMORY and every event in the game
// key off it, and it never changes. This file is only ever about the
// word shown to a player, so renaming can never reach anything that
// decides what happens.
//
// NO SAVE SCHEMA CHANGE. The save is a set of rows in `world_state`,
// and `saveSchema.ts` states the rule plainly: "A missing field is not
// a migration… a save from before a feature existed needs no step at
// all." An older save simply has no name row, and that reads as the
// default — which is exactly what an older save should show. So
// SAVE_VERSION stays where it is and no migration step was added.

/** What they are called before they say otherwise. */
export const DEFAULT_HERO_NAME = '主人公';

/**
 * Provisional, and chosen to be checked on a handset rather than here.
 *
 * Counted in CODE POINTS, not in UTF-16 units: a character that needs
 * a surrogate pair is one character to the person typing it, and a
 * limit that disagrees would cut a name in half.
 */
export const HERO_NAME_MAX_LENGTH = 10;

/** How long a name is, as a person would count it. */
export function heroNameLength(input: string): number {
  return Array.from(input).length;
}

/**
 * What a typed name becomes, or null if it is not a name.
 *
 * Trimmed at both ends, because a trailing space is invisible and
 * would make two names look identical while comparing unequal. Nothing
 * but whitespace is rejected rather than trimmed to an empty string:
 * a nameless character is not something the rest of the game can draw.
 * Inner spaces are kept — 「山田 太郎」 is a name somebody may want.
 */
export function normaliseHeroName(input: string): string | null {
  // \s covers the ideographic space U+3000 as well as ASCII, so a name
  // typed entirely in full-width spaces is rejected like any other.
  const trimmed = input.replace(/^\s+|\s+$/gu, '');
  if (trimmed === '') return null;
  if (heroNameLength(trimmed) > HERO_NAME_MAX_LENGTH) return null;
  return trimmed;
}

/** True when a typed name could be confirmed as it stands. */
export function isUsableHeroName(input: string): boolean {
  return normaliseHeroName(input) !== null;
}

/**
 * The name out of a save, repaired.
 *
 * NEVER FAILS. Anything a save cannot honestly be read as becomes the
 * default, because a player who cannot be named is a player who cannot
 * be shown — and losing a screen is worse than losing a nickname. An
 * over-long name from a build with a higher limit is CUT rather than
 * discarded: what they chose is still mostly what they see.
 */
export function readHeroName(raw: unknown): { value: string; health: 'ok' | 'repaired' } {
  if (typeof raw !== 'string') {
    return { value: DEFAULT_HERO_NAME, health: raw === undefined ? 'ok' : 'repaired' };
  }
  const trimmed = raw.replace(/^\s+|\s+$/gu, '');
  if (trimmed === '') return { value: DEFAULT_HERO_NAME, health: 'repaired' };
  if (heroNameLength(trimmed) > HERO_NAME_MAX_LENGTH) {
    return { value: Array.from(trimmed).slice(0, HERO_NAME_MAX_LENGTH).join(''), health: 'repaired' };
  }
  return { value: trimmed, health: trimmed === raw ? 'ok' : 'repaired' };
}
