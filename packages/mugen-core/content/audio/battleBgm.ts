// WHICH PIECE A FIGHT IS FOUGHT TO.
//
// Two now: 通常戦闘① for a fight that happens, and ボス戦 for a fight
// that is ABOUT something. Adding a third is still the same three
// steps — file in assets/audio/bgm, id in the manifest, id here — and
// the ♪ control, the saved choice, the cycle order and the fallback
// for a save naming a piece that no longer exists all read this list.
//
// WHAT IS NEW IS THAT NOT EVERY PIECE IS YOURS YET.
//
// A piece is UNLOCKED by winning a fight to it. Until then it cannot
// be chosen — you meet it where the story puts you, you hear it out,
// and it becomes yours when you come through. So the first time the
// boss music plays it cannot be switched away from, which is the
// whole point of it: the fight that matters is not one you decorate.
//
// TWO DIFFERENT FACTS, KEPT APART:
//
//   what is UNLOCKED   what happened in this world. Belongs in the
//                      save, travels with it, and is passed in here.
//   what is CHOSEN     how somebody likes to play. A preference, kept
//                      wherever preferences are kept, never here.
//
// This file knows neither. It is given the unlocked set and answers
// questions about it, which is what lets the rule be argued about in
// a test rather than in a playthrough.

import type { BgmId } from '@mugen/assets';

/**
 * The fighting music, in the order the ♪ button walks through it.
 *
 * A tuple rather than an array so the first entry is a known id at
 * compile time: the default below cannot become `BgmId | undefined`
 * because somebody emptied the list.
 */
export const BATTLE_BGM_IDS = ['NORMAL_BATTLE', 'BOSS_BATTLE'] as const satisfies readonly BgmId[];

export type BattleBgmId = (typeof BATTLE_BGM_IDS)[number];

/** What a fight opens with when nobody has chosen otherwise. */
export const DEFAULT_BATTLE_BGM: BattleBgmId = BATTLE_BGM_IDS[0];

/**
 * What every world starts with, before winning anything.
 *
 * The ordinary piece, because a player who has never fought has still
 * got to hear something, and because a fight you are hearing for the
 * first time is not a fight you chose the music for.
 */
export const INITIAL_UNLOCKED_BATTLE_BGM: readonly BattleBgmId[] = [DEFAULT_BATTLE_BGM];

/**
 * FIGHTS THAT BRING THEIR OWN MUSIC, and will not be talked out of it.
 *
 * Keyed by the enemy spec's name, which is what a battle actually
 * carries. A fight listed here ignores the player's choice entirely —
 * not because the choice is unlocked or not, but because the scene has
 * a sound and that is not a preference.
 */
export const FORCED_BATTLE_BGM: Record<string, BattleBgmId> = {
  GALD: 'BOSS_BATTLE',
};

/** Whether this is one of them — the guard a stored choice goes through. */
export function isBattleBgm(id: string | null | undefined): id is BattleBgmId {
  return !!id && (BATTLE_BGM_IDS as readonly string[]).includes(id);
}

/** Only the ones this world has actually won a fight to, in list order. */
export function unlockedBattleBgm(unlocked: readonly string[] | undefined): BattleBgmId[] {
  const held = new Set(unlocked ?? INITIAL_UNLOCKED_BATTLE_BGM);
  const out = BATTLE_BGM_IDS.filter((id) => held.has(id));
  // The default is always available: a world that somehow unlocked
  // nothing must still be able to play a fight.
  return out.length > 0 ? out : [DEFAULT_BATTLE_BGM];
}

/**
 * The next one round, wrapping, WITHIN WHAT IS UNLOCKED.
 *
 * With one piece unlocked this returns the same piece, and that is the
 * correct answer rather than a special case: the player presses ♪,
 * nothing changes, and nothing breaks.
 *
 * `unlocked` DEFAULTS TO THE STARTING SET on purpose. A caller that
 * has not been taught about unlocking — anything written before this
 * existed — keeps cycling within the ordinary piece rather than being
 * handed the boss music for free.
 */
export function nextBattleBgm(
  current: string | null | undefined,
  unlocked?: readonly string[],
): BattleBgmId {
  const ring = unlockedBattleBgm(unlocked);
  const at = isBattleBgm(current) ? ring.indexOf(current) : -1;
  return ring[(at + 1) % ring.length];
}

/**
 * What the ♪ button says it is on.
 *
 * A number rather than a name: the pieces have titles, the titles are
 * long, and the control is a chip in the corner of a fight. 1/1 while
 * only one is unlocked — which also tells a player pressing it why
 * nothing happened.
 */
export function battleBgmLabel(
  current: string | null | undefined,
  unlocked?: readonly string[],
): string {
  const ring = unlockedBattleBgm(unlocked);
  const at = Math.max(0, isBattleBgm(current) ? ring.indexOf(current) : 0);
  return `${at + 1}/${ring.length}`;
}

/** Whether the control is worth showing at all. */
export function moreThanOneBattleBgm(unlocked?: readonly string[]): boolean {
  return unlockedBattleBgm(unlocked).length > 1;
}

/**
 * The piece a fight actually opens with.
 *
 * The scene first, then the player's choice, then the default — and a
 * choice that is not unlocked is not honoured, because a save carried
 * from a build where it was, or edited by hand, must not hand somebody
 * music they have not earned.
 */
export function battleBgmFor(
  enemyKey: string | null | undefined,
  chosen: string | null | undefined,
  unlocked?: readonly string[],
): BattleBgmId {
  const forced = enemyKey ? FORCED_BATTLE_BGM[enemyKey] : undefined;
  if (forced) return forced;
  const ring = unlockedBattleBgm(unlocked);
  return isBattleBgm(chosen) && ring.includes(chosen) ? chosen : ring[0];
}

/**
 * Whether the ♪ control may be used at all in this fight.
 *
 * FALSE WHERE THE SCENE BROUGHT ITS OWN MUSIC. Hearing the boss piece
 * for the first time is not an occasion for choosing, and the control
 * is hidden rather than disabled — a button that refuses is worse than
 * no button.
 */
export function canChooseBattleBgm(
  enemyKey: string | null | undefined,
  unlocked?: readonly string[],
): boolean {
  if (enemyKey && FORCED_BATTLE_BGM[enemyKey]) return false;
  return moreThanOneBattleBgm(unlocked);
}
