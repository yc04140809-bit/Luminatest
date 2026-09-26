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

import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { BattleState } from '@mugen/game/battle/battleLogic';
import type { MagicDef } from '@mugen/core/magic/magic';
import { beatMs, visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { CAMERA_GLIDE_MS, swingCues, type CameraPhase } from './battleCamera';
import { endBlow, landBlow, type Blow } from './blows';
import { useCutInDirector } from './cutin/CutIn';
import { spellCutIn } from './magic/spellCutIn';
import { SPELL_CONTACT_AT, spellDamage, spellShowOf, spellStepMs } from './magic/spellShow';
import type { SpellFxView } from './magic/SpellFx';
import type { SlashView } from './slash/SwordSlash';
import { slashMs } from './slash/slashTiming';

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
  /**
   * Show one of her spells: cut-in, aura, landing, then the creature's
   * answer. `onLanded` is called the moment it lands — the time to say
   * what it did.
   */
  playSpell: (before: BattleState, next: BattleState, spell: MagicDef, onLanded?: () => void) => void;
  /** Her aura or the spell's landing, while one is showing. */
  spell: SpellFxView | null;
  /**
   * THE STATE TO DRAW UNTIL A SPELL LANDS. A spell is decided at once and
   * shown over seconds; until it lands the health bars, the knock-down
   * and the end of the fight must all still read as before it. Null the
   * rest of the time: draw the battle as it is.
   */
  holding: BattleState | null;
  /** Her cut-in, while one plays (for BattleStage's `cinematic`). */
  cinematic: ReactElement | null;
  /** His sword's trail and bite, while a swing shows (only if asked for). */
  slash: SlashView | null;
}

export interface TheatreOptions {
  /**
   * Draw his sword's trail and bite on a 攻撃 (slash/SwordSlash). A swing
   * only: never a spell, an item, a guard, or the creature's own blow.
   */
  slash?: boolean;
}

export function useBattleTheatre(speed: BattleSpeed, options: TheatreOptions = {}): Theatre {
  const [beat, setBeat] = useState('NONE');
  const [camera, setCamera] = useState<CameraPhase>('IDLE');
  const [blows, setBlows] = useState<Blow[]>([]);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const blowId = useRef(0);
  const [spell, setSpell] = useState<SpellFxView | null>(null);
  const [holding, setHolding] = useState<BattleState | null>(null);
  const [slash, setSlash] = useState<SlashView | null>(null);
  const cutIns = useCutInDirector(speed);
  /** Which turn is being shown; a newer one makes an older one's cues no-ops. */
  const showing = useRef(0);

  // Leaving the screen stops everything it started.
  useEffect(
    () => () => {
      showing.current += 1;
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

  /** One turn at a time: whatever was still showing is over. */
  const clearStage = () => {
    showing.current += 1;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cutIns.stop();
    setBlows([]);
    setSpell(null);
    setHolding(null);
    setSlash(null);
  };

  /** The creature's answer, from `from` ms on; returns when it is over. */
  const playAnswer = (next: BattleState, from: number): number => {
    let at = from;
    for (const step of answerOf(next)) {
      const delay = at;
      later(() => setBeat(step), delay);
      at += beatLength(step, speed);
    }
    if (answered(next) && next.lastEnemyAction === 'ATTACK') {
      strike('hero', next.lastEnemyDamage, from);
    }
    later(() => setBeat('NONE'), at);
    return at;
  };

  const playTurn = (before: BattleState, next: BattleState, kind: TurnKind) => {
    clearStage();

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
      // His sword, seen: the trail through the swing, the bite on contact.
      if (options.slash) {
        const id = showing.current;
        const view: SlashView = {
          id,
          arcMs: slashMs('ARC', speed),
          biteMs: slashMs('BITE', speed),
          biteAt: Math.round(beatLength(first, speed) * CONTACT_AT),
        };
        // With the swing's own first beat, not a frame before it.
        later(() => setSlash(view), 0);
        later(() => setSlash((now) => (now?.id === id ? null : now)), Math.max(view.arcMs, view.biteAt + view.biteMs));
      }
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

  const playSpell = (before: BattleState, next: BattleState, def: MagicDef, onLanded?: () => void) => {
    clearStage();
    const mine = showing.current;
    const show = spellShowOf(def);
    const channel = spellStepMs('CHANNEL', speed);
    const impact = spellStepMs('IMPACT', speed);
    setHolding(before);
    setBeat('NONE');
    setCamera('IDLE');
    setPlaying(true);

    // 2–4, once her cut-in is over (or at once, for a spell that has none).
    const afterCutIn = () => {
      // 2. She channels: her casting pose, and the aura round her.
      setBeat('MAGIC');
      setSpell({ id: mine, kind: show.kind, lands: show.lands, phase: 'channel', ms: channel });

      // 3. It lands. From here the battle is drawn as it now is, and the
      //    number — the two that hurt only — is the core's own.
      later(() => {
        setSpell({ id: mine, kind: show.kind, lands: show.lands, phase: 'impact', ms: impact });
        setBeat('NONE');
        setHolding(null);
        onLanded?.();
        const damage = spellDamage(before, next, show);
        if (show.hurts) {
          later(() => {
            blowId.current += 1;
            const id = blowId.current;
            setBlows((live) => landBlow(live, { id, on: 'enemy', amount: damage }));
            later(() => setBlows((live) => endBlow(live, id)), beatLength('HURT', speed) + 260);
          }, Math.round(impact * SPELL_CONTACT_AT));
        }
      }, channel);

      // 4. The landing clears, and the creature answers as it always does.
      later(() => setSpell(null), channel + impact);
      const over = playAnswer(next, channel + impact);
      later(() => setPlaying(false), over);
    };

    // 1. Her cut-in, with the spell's own name. Stopped — by a newer turn
    //    or by the screen going — and nothing after it happens. A spell
    //    with no cut-in in the table (spellCutIn.ts) goes straight on.
    const cutIn = spellCutIn(def);
    if (!cutIn) {
      afterCutIn();
      return;
    }
    void cutIns.play(cutIn).then((ended) => {
      if (ended !== 'done' || showing.current !== mine) return;
      afterCutIn();
    });
  };

  return {
    beat,
    camera,
    blows,
    playing,
    playTurn,
    playSpell,
    spell,
    holding,
    cinematic: cutIns.element,
    slash,
  };
}
