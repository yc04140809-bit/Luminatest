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

/** What is happening on screen. 'NONE' is the fight sitting still. */
export type BattleBeat = 'NONE' | 'STRIKE' | 'TACKLE' | 'HIDE' | 'HURT';

export interface BeatView {
  beat: string;
  /** The creature has been beaten and is lying down. Outranks the beat. */
  downed: boolean;
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
 * She is not the one swinging: she flinches when the party is hit and
 * otherwise stands. Her blessing and her summon are drawn as light
 * around her rather than as a pose, so there is no skill state here
 * until there is a drawing of one.
 */
export function kaosPose({ beat }: BeatView): PartyArtState {
  return beat === 'HURT' ? 'battle_damage' : 'battle_idle';
}
