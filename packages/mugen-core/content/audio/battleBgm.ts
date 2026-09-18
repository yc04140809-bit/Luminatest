// WHICH PIECE A FIGHT IS FOUGHT TO.
//
// One today — 通常戦闘① — and the ① in its own title says what is
// coming. This list is the whole of "add another": put the file in
// assets/audio/bgm, give it an id in the manifest, and add the id
// here. The ♪ control in the fight, the saved choice, the order they
// cycle in and the fallback for a save that names a piece which no
// longer exists all read this and need no other change.

import type { BgmId } from '@mugen/assets';

/**
 * The fighting music, in the order the ♪ button walks through it.
 *
 * A tuple rather than an array so the first entry is a known id at
 * compile time: the default below cannot become `BgmId | undefined`
 * because somebody emptied the list.
 */
export const BATTLE_BGM_IDS = ['NORMAL_BATTLE'] as const satisfies readonly BgmId[];

export type BattleBgmId = (typeof BATTLE_BGM_IDS)[number];

/** What a fight opens with when nobody has chosen otherwise. */
export const DEFAULT_BATTLE_BGM: BattleBgmId = BATTLE_BGM_IDS[0];

/** Whether this is one of them — the guard a stored choice goes through. */
export function isBattleBgm(id: string | null | undefined): id is BattleBgmId {
  return !!id && (BATTLE_BGM_IDS as readonly string[]).includes(id);
}

/**
 * The next one round, wrapping.
 *
 * With one piece registered this returns the same piece, and that is
 * the correct answer rather than a special case: the player presses ♪,
 * nothing changes, and nothing breaks. The day a second piece is added
 * the same press starts doing something, with no code changed here.
 */
export function nextBattleBgm(current: string | null | undefined): BattleBgmId {
  const at = isBattleBgm(current) ? BATTLE_BGM_IDS.indexOf(current) : -1;
  return BATTLE_BGM_IDS[(at + 1) % BATTLE_BGM_IDS.length];
}

/**
 * What the ♪ button says it is on.
 *
 * A number rather than a name: the pieces have titles, the titles are
 * long, and the control is a chip in the corner of a fight. 1 of 1
 * while there is one — which also tells a player pressing it why
 * nothing happened.
 */
export function battleBgmLabel(current: string | null | undefined): string {
  const at = isBattleBgm(current) ? BATTLE_BGM_IDS.indexOf(current) : 0;
  return `${at + 1}/${BATTLE_BGM_IDS.length}`;
}
