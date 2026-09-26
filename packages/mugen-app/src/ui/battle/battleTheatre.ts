// HOW A TURN IS SHOWN — the Artifact's timings, and the App's own hook.
//
// A turn is decided in one call to the shared battle logic and then
// SHOWN over about a second: the swing, the blow landing, the number,
// the creature's answer. This file is only the showing. It never calls
// the battle logic and never decides a number: it is handed the state
// before and the state after a turn, and everything it draws — the
// damage above a head, who flinches — is read off the difference.
//
// THE NUMBERS ARE THE ARTIFACT'S. The Artifact's battle screen keeps
// them as private constants; they are restated here and
// `battleTheatre.test.ts` reads the Artifact's source to hold every one
// of them equal, so the two screens keep the same tempo.
//
// NOTHING OUTLIVES THE SCREEN. Every timer this starts is kept, and the
// component that uses the hook clearing it on unmount clears them all,
// so leaving a fight mid-swing leaves nothing running behind it.

import { useEffect, useRef, useState } from 'react';
import type { BattleState } from '@mugen/game/battle/battleLogic';
import { beatMs, visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { CAMERA_GLIDE_MS, swingCues, type CameraPhase } from './battleCamera';
import { endBlow, landBlow, type Blow } from './blows';

/** How long each beat is held at ×1 — the Artifact's BEAT_MS. */
export const BEAT_MS: Record<string, number> = {
  STRIKE: 320,
  TACKLE: 460,
  HIDE: 560,
  HURT: 300,
  MAGIC: 520,
};
/** The shortest each may become at speed — the Artifact's BEAT_MIN_MS. */
export const BEAT_MIN_MS: Record<string, number> = {
  STRIKE: 110,
  TACKLE: 140,
  HIDE: 140,
  HURT: 140,
  MAGIC: 140,
};
/** How long it takes to go down. */
export const KNOCKDOWN_MS = 340;
/** How long a lost fight sits before the screen moves on. */
export const DEFEAT_WAIT_MS = 1200;
/** And a won one, once the creature is down. */
export const VICTORY_WAIT_MS = 1900;
/** How long a blow's light and number are on screen, and its floor. */
export const HIT_FX_MS = 520;
export const HIT_FX_FLOOR_MS = 380;
/** Where in the swing the blade arrives. */
export const CONTACT_AT = 0.4;
/** The breath between the light and the body — not scaled by speed. */
export const REACTION_LAG_MS = 45;
/** How long a said line holds before getting out of the way. */
export const SAY_HOLD_MS = 2000;

/** A beat's length on screen at this speed — the timer AND the drawing. */
export function beatLength(step: string, speed: BattleSpeed): number {
  return visualMs(BEAT_MS[step] ?? 300, speed, BEAT_MIN_MS[step] ?? 140);
}

/** How long a camera move takes to be seen. */
export function cameraGlideMs(speed: BattleSpeed): number {
  return visualMs(CAMERA_GLIDE_MS, speed, CAMERA_GLIDE_MS);
}

/** What a turn was, for the choice of beats. */
export type TurnKind = 'ATTACK' | 'DEFEND' | 'MAGIC' | 'ITEM';

/**
 * WHETHER THE CREATURE ANSWERED THIS TURN AT ALL.
 *
 * Not simply `lastEnemyAction`: when a blow finishes it, the core returns
 * before its turn and carries the PREVIOUS turn's action and damage
 * forward unchanged — so reading that field alone replays last turn's
 * counter-attack, number and all, on the killing blow. (The Artifact's
 * screen reads it alone and shows exactly that.) A creature that has
 * been beaten did not answer.
 */
export function answered(next: BattleState): boolean {
  return next.outcome !== 'VICTORY' && next.lastEnemyAction !== 'NONE';
}

/** The creature's answer, in beats — the Artifact's `answerOf`. */
export function answerOf(next: BattleState): string[] {
  if (!answered(next)) return [];
  return next.lastEnemyAction === 'SKILL'
    ? ['HIDE']
    : next.lastEnemyAction === 'ATTACK'
      ? ['TACKLE', 'HURT']
      : [];
}

/** The player's own beat for a kind of turn. */
export function openingBeat(kind: TurnKind): string {
  return kind === 'ATTACK' ? 'STRIKE' : kind === 'MAGIC' ? 'MAGIC' : 'GUARD';
}

/** CSS custom properties the stylesheet reads its durations from. */
export function theatreVars(speed: BattleSpeed): Record<string, string> {
  return {
    '--fx': String(1 / speed),
    '--bp-cam': `${cameraGlideMs(speed)}ms`,
    '--bp-strike': `${beatLength('STRIKE', speed)}ms`,
    '--bp-tackle': `${beatLength('TACKLE', speed)}ms`,
    '--bp-hide': `${beatLength('HIDE', speed)}ms`,
    '--bp-hurt': `${beatLength('HURT', speed)}ms`,
    '--bp-react': `${REACTION_LAG_MS}ms`,
    '--bp-say': `${beatMs(SAY_HOLD_MS, speed)}ms`,
    '--bp-fall': `${beatMs(KNOCKDOWN_MS, speed)}ms`,
  };
}

export interface Theatre {
  beat: string;
  camera: CameraPhase;
  blows: readonly Blow[];
  /** True from the first beat of a turn until its last cue: no command. */
  playing: boolean;
  /** Show a turn: the state before it and the state it produced. */
  playTurn: (before: BattleState, next: BattleState, kind: TurnKind) => void;
}

export function useBattleTheatre(speed: BattleSpeed): Theatre {
  const [beat, setBeat] = useState('NONE');
  const [camera, setCamera] = useState<CameraPhase>('IDLE');
  const [blows, setBlows] = useState<Blow[]>([]);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const blowId = useRef(0);

  // Leaving the screen stops everything it started.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** A blow landing, `after` ms from now, at the moment of contact. */
  const strike = (on: 'enemy' | 'hero', amount: number, after = 0) => {
    const contact = after + Math.round(beatLength(on === 'enemy' ? 'STRIKE' : 'TACKLE', speed) * CONTACT_AT);
    later(() => {
      blowId.current += 1;
      const mine = blowId.current;
      setBlows((live) => landBlow(live, { id: mine, on, amount }));
      later(() => setBlows((live) => endBlow(live, mine)), beatLength('HURT', speed) + 260);
    }, contact);
  };

  const playTurn = (before: BattleState, next: BattleState, kind: TurnKind) => {
    // One turn at a time: whatever was still showing is over.
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBlows([]);

    const first = openingBeat(kind);
    const sequence = [first, ...answerOf(next)];
    let at = 0;
    for (const step of sequence) {
      const delay = at;
      later(() => setBeat(step), delay);
      at += beatLength(step, speed);
    }
    later(() => setBeat('NONE'), at);
    let end = at;

    // The camera follows a swing, and only a swing — as in the Artifact.
    if (kind === 'ATTACK') {
      for (const cue of swingCues(beatLength(first, speed), at, cameraGlideMs(speed))) {
        later(() => setCamera(cue.phase), cue.at);
        end = Math.max(end, cue.at);
      }
      // THE NUMBER IS THE CORE'S: what the enemy had, less what it has.
      strike('enemy', Math.max(0, before.enemyHp - next.enemyHp));
    } else {
      setCamera('IDLE');
    }
    // Its answer lands on him, with the core's own figure for it.
    if (answered(next) && next.lastEnemyAction === 'ATTACK') {
      strike('hero', next.lastEnemyDamage, beatLength(first, speed));
    }

    setPlaying(true);
    later(() => setPlaying(false), end);
  };

  return { beat, camera, blows, playing, playTurn };
}
