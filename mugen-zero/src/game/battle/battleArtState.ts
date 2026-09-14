// Which pose belongs to this moment of the fight.
//
// The battle already has a beat — a short-lived name for what is
// happening on screen right now — and the art layer already knows which
// pictures exist. This is the one line between them, and it is a pure
// function so the mapping can be argued about in a test rather than in
// a screenshot.
//
// It answers with the pose the moment DESERVES, not with a pose that is
// known to exist: when the drawing has not been made, the art layer
// falls back and says it did. Keeping the two separate is what makes
// "add an attack pose" a one-line content change later.

import type { EnemyArtState, PartyArtState } from '../../core/art/artStates';
import { kaosBattleMode, kaosPortraitState } from '../../content/characters/kaosPortraits';

/** What is happening on screen. 'NONE' is the fight sitting still. */
export type BattleBeat = 'NONE' | 'STRIKE' | 'TACKLE' | 'HIDE' | 'HURT';

export interface BeatView {
  beat: string;
  /** The creature has been beaten and is lying down. Outranks the beat. */
  downed: boolean;
  /**
   * Kaos is mid-spell, mid-arcana or mid-skill.
   *
   * A MOMENT, not a state: it is true for the length of the effect and
   * false again afterwards, so nothing has to remember to put her back.
   */
  casting?: boolean;
  /**
   * Kaos is in her higher form for this fight.
   *
   * Nothing in the game sets this yet — the awakening round is its
   * caller. It is here and defaulted false so that her ⑥ drawing has
   * exactly one way in, and so it cannot arrive by accident: see the
   * `awakened` state's note in core/art/artStates about being in no
   * fallback chain.
   */
  awakened?: boolean;
}

/**
 * The creature's pose.
 *
 * Lying down wins over everything: once it is beaten it stays beaten,
 * whatever the last thing that happened was.
 */
export function enemyPose({ beat, downed }: BeatView): EnemyArtState {
  if (downed) return 'down';
  switch (beat) {
    // The player's blow lands on it.
    case 'STRIKE':
      return 'damage';
    // Its own attack.
    case 'TACKLE':
      return 'attack';
    // It hides. There is no state for that in the list, and inventing
    // one for a single creature is how a shared vocabulary stops being
    // shared — it stands still and the effect is drawn over it.
    case 'HIDE':
      return 'idle';
    default:
      return 'idle';
  }
}

/** The player's pose. The same moments, seen from the other side. */
export function heroPose({ beat }: BeatView): PartyArtState {
  switch (beat) {
    case 'STRIKE':
      return 'battle_attack';
    case 'HURT':
      return 'battle_damage';
    default:
      return 'battle_idle';
  }
}

/**
 * Kaos' pose.
 *
 * She is not the one swinging: she flinches when the party is hit, she
 * has a drawing of her own for casting, and otherwise she stands.
 *
 * THE ORDER IS THE RULE. Awakening outranks everything, because a
 * higher form does not stop being one mid-spell; then a cast, which is
 * the moment worth seeing; then being hit; then standing. Her pose goes
 * through the role map rather than naming an art state, so which
 * DRAWING is her casting picture is decided in one place and this only
 * decides WHICH MOMENT this is.
 */
export function kaosPose({ beat, casting = false, awakened = false }: BeatView): PartyArtState {
  if (awakened) return kaosPortraitState(kaosBattleMode({ awakened: true }));
  if (casting) return kaosPortraitState(kaosBattleMode({ casting: true }));
  if (beat === 'HURT') return 'battle_damage';
  return kaosPortraitState(kaosBattleMode());
}
