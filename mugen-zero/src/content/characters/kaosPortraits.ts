// WHICH PICTURE OF KAOS, AND WHEN — the whole table, in one place.
//
// She has six standing pictures and every one of them has a job. The
// jobs are the names below, and they are the names to use from now on:
// a screen asks for a ROLE and never for a file, a state or an
// expression. That is the point of the file. Re-drawing her, adding a
// seventh picture, or deciding that a particular scene wants the tense
// one instead of the calm one are all changes HERE, and the screens do
// not move.
//
//   ① MENU            a status screen, a profile, a character sheet.
//                     Still and lit, looking at you rather than doing
//                     anything. Never a conversation, never a fight.
//   ② TALK_DEFAULT    the ordinary way she talks to you. Daily scenes,
//                     quiet moments, AND THE OPENING. When in doubt
//                     about a conversation, this one.
//   ③ TALK_RINSEN     臨戦 — the air gone tight. Anger, guard, a
//                     serious line, the beat before a fight. The upper
//                     差分 of ②, not a different character.
//   ④ BATTLE_DEFAULT  on the field, between actions. What a fight
//                     mostly looks like.
//   ⑤ CAST            a spell, an arcana, a skill. A moment, not a
//                     state: the field swaps to it for the length of
//                     the effect and back out afterwards.
//   ⑥ AWAKEN          the star dress and the staff. A higher form, a
//                     decisive fight, a story state. NEVER ordinary.
//
// THE SIXTH ONE IS WHY THIS FILE EXISTS. Until these arrived she had
// exactly one battle drawing and it was ⑥, so every moss rabbit in
// Greenwood was fought by her awakened form. One picture with no role
// attached gets used for everything; six pictures with roles cannot.

import type { PartyArtState } from '../../core/art/artStates';

/** The six roles, and the names to refer to them by. */
export type KaosPortraitMode =
  | 'menu'
  | 'talk_default'
  | 'talk_rinsen'
  | 'battle_default'
  | 'cast'
  | 'awaken';

/**
 * Role -> the art state that holds that picture.
 *
 * TWO NAMES FOR ONE THING, and deliberately. The art layer's states are
 * general — every character has a `battle_idle`, and `talk_serious` is
 * a thing anybody could be drawn as — while a ROLE is about MUGEN
 * ZERO's own vocabulary: 臨戦 is a word this project uses, and `cast`
 * covers a spell, an arcana and a skill because the game treats those
 * as one kind of moment. This map is the join, and it is the only
 * place either vocabulary has to know about the other.
 */
export const KAOS_PORTRAIT_STATES: Record<KaosPortraitMode, PartyArtState> = {
  menu: 'menu',
  talk_default: 'talk',
  talk_rinsen: 'talk_serious',
  battle_default: 'battle_idle',
  cast: 'battle_cast',
  awaken: 'awakened',
};

/**
 * `ARCANA_CAST` is `CAST`.
 *
 * The brief names both, and they are the same picture on purpose: a
 * spell, an arcana and a skill are one kind of moment to look at, and
 * splitting them would be two names for one drawing that could drift
 * apart. Kept as an alias so a caller may say whichever it means.
 */
export const KAOS_ARCANA_CAST: KaosPortraitMode = 'cast';

/** The art state this role is drawn from. */
export function kaosPortraitState(mode: KaosPortraitMode): PartyArtState {
  return KAOS_PORTRAIT_STATES[mode];
}

/**
 * Which role a conversation should use.
 *
 * ONE RULE, SAID ONCE: tense scenes get ③ and everything else gets ②.
 * A scene declares whether it is tense; it does not name a picture. So
 * the day 臨戦 wants a different drawing, or a third level of tension
 * exists, the scenes do not change.
 *
 * The opening is not tense, so it gets ② — which is the brief's one
 * explicit instruction about a particular scene, and it falls out of
 * the rule rather than being special-cased.
 */
export function kaosTalkMode(tense = false): KaosPortraitMode {
  return tense ? 'talk_rinsen' : 'talk_default';
}

/**
 * Which role a fight should use, from what is happening in it.
 *
 * The order is the rule: AWAKENING WINS. A higher form does not stop
 * being a higher form because she is mid-spell, so a fight she has
 * awakened in stays ⑥ throughout — the brief's 「覚醒フラグが立った状態
 * では awaken を優先」, said as code.
 *
 * Otherwise a cast is a moment and the field goes back to ④ when it is
 * over. Nothing here remembers anything: it is asked afresh every
 * render with what is true now, so "back out of it afterwards" needs no
 * timer and no cleanup.
 */
export function kaosBattleMode({
  awakened = false,
  casting = false,
}: {
  awakened?: boolean;
  casting?: boolean;
} = {}): KaosPortraitMode {
  if (awakened) return 'awaken';
  if (casting) return 'cast';
  return 'battle_default';
}
