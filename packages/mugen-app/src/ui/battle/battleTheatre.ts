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
import { camera as cameraMove, moveMs, type CameraStrength } from '../fx/camera';

/** Where he and the creature stand across the stage (0 left – 1 right), for the camera's TRACK. */
const HERO_AT = 0.72;
const ENEMY_AT = 0.3;
import { spellCutIn } from './magic/spellCutIn';
import { SPELL_CONTACT_AT, spellDamage, spellShowOf, spellStepMs } from './magic/spellShow';
import type { SpellFxView } from './magic/SpellFx';
import { specialFxOf, type SpecialEffectType } from '../fx/special/specialFx';
import type { SlashView } from './slash/SwordSlash';
import type { CutInSpec } from './cutin/CutIn';
import { REACH_CONTACT_AT, reachMs, slashMs } from './slash/slashTiming';
import { multiHitGap, multiHitOf, splitDamage, type CutBlow } from './multiHit';

/** Where he is in the walk-and-swing of an enhanced 攻撃 (slash/reach.css). */
export interface ReachView {
  /** New for every swing, so each measures its own distance. */
  id: number;
  phase: 'approach' | 'windup' | 'strike' | 'recover' | 'return';
  /** This step's length — the CSS reads it. */
  ms: number;
}

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
/** ケイオス's wings, before the spell goes on (作者: カットイン後 0.15〜0.25秒の溜め). */
export const WINGS_BREATH_MS = 200;

/**
 * THE APP'S OWN BEATS, held as long as one of the Artifact's (whose table
 * above stays exactly the Artifact's): a boss's roar is held as long as a
 * creature diving into the moss — a moment with no blow in it.
 */
const HELD_AS: Record<string, string> = { ROAR: 'HIDE' };

/** A beat's length on screen at this speed — the timer AND the drawing. */
export function beatLength(step: string, speed: BattleSpeed): number {
  const as = HELD_AS[step] ?? step;
  return visualMs(BEAT_MS[as] ?? 300, speed, BEAT_MIN_MS[as] ?? 140);
}

/** How long a camera move takes to be seen. */
export function cameraGlideMs(speed: BattleSpeed): number {
  return visualMs(CAMERA_GLIDE_MS, speed, CAMERA_GLIDE_MS);
}

/** What a turn was, for the choice of beats. */
export type TurnKind = 'ATTACK' | 'SKILL' | 'DEFEND' | 'MAGIC' | 'ITEM';

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

/**
 * The creature's answer, in beats — the Artifact's `answerOf`, and one
 * more of the App's: a boss gathering itself (its roar) is ROAR, not the
 * moss rabbit's dive.
 */
export function answerOf(next: BattleState): string[] {
  if (!answered(next)) return [];
  if (next.lastEnemyMove === 'CHARGE') return ['ROAR'];
  return next.lastEnemyAction === 'SKILL'
    ? ['HIDE']
    : next.lastEnemyAction === 'ATTACK'
      ? ['TACKLE', 'HURT']
      : [];
}

/** The player's own beat for a kind of turn. */
export function openingBeat(kind: TurnKind): string {
  return kind === 'ATTACK' || kind === 'SKILL' ? 'STRIKE' : kind === 'MAGIC' ? 'MAGIC' : 'GUARD';
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
  playTurn: (before: BattleState, next: BattleState, kind: TurnKind, extra?: TurnExtras) => void;
  /**
   * Show one of her spells: cut-in, aura, landing, then the creature's
   * answer. `onLanded` is called the moment it lands — the time to say
   * what it did.
   */
  playSpell: (before: BattleState, next: BattleState, spell: MagicDef, onLanded?: () => void) => void;
  /** Her aura or the spell's landing, while one is showing. */
  spell: SpellFxView | null;
  /** ケイオス's wings behind her, for a spell flagged for them (ui/fx/special), from her cut-in's end. */
  wings: { id: number; type: SpecialEffectType } | null;
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
  /** His walk to the creature and back, while an enhanced swing shows. */
  reach: ReachView | null;
  /** The swing being shown is one of his skills (its own trail and sound). */
  skillSwing: boolean;
  /** The creature's great move is landing (its ice over the field), while it shows. */
  frost: number | null;
}

/** 《瞬断》's second and third cuts in the ordinary fight: backhanded, then down across. */
const SHUNDAN_SLASH_TURNS: readonly { turn: number; flip?: boolean }[] = [
  { turn: 22, flip: true },
  { turn: -38 },
];

/** What a turn carries beyond its kind. */
export interface TurnExtras {
  /** His swing is a skill's (《瞬断》): its own trail and sound. */
  skill?: boolean;
  /**
   * A BOSS'S GREAT MOVE: its cut-in, played after his turn and before its
   * answer — then the answer, with its ice over the field. Only for a turn
   * the creature answered.
   */
  answerCutIn?: CutInSpec;
  /**
   * HIS SKILL'S CUT-IN (《瞬断》 — cutin/skillCutIn.ts): played first, then his swing and the rest
   * of the turn as it would have been. Stopped by a newer turn, nothing after it happens.
   */
  skillCutIn?: CutInSpec;
  /** It played a cut-in: the camera follows the swing (TRACK) — set by playTurn, not by callers. */
  follow?: boolean;
}

export interface TheatreOptions {
  /**
   * THE ENHANCED 攻撃 (v18 `playAttack`): he walks to the creature, winds
   * up, swings — with the sword's trail and bite (slash/SwordSlash) —
   * and walks back before it answers. A swing only: never a spell, an
   * item, a guard, or the creature's own blow. Off: the Artifact's swing.
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
  /** ケイオス's wings behind her, while they show (ui/fx/special — the spells flagged for them). */
  const [wings, setWings] = useState<{ id: number; type: SpecialEffectType } | null>(null);
  const [holding, setHolding] = useState<BattleState | null>(null);
  const [slash, setSlash] = useState<SlashView | null>(null);
  const [reach, setReach] = useState<ReachView | null>(null);
  const [skillSwing, setSkillSwing] = useState(false);
  const [frost, setFrost] = useState<number | null>(null);
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
  /**
   * THE CAMERA'S 「クイッ」 at a blow landing (作者 実機 2026-10-23: the fights before ヴァルシール had
   * none; the reference video jolts the whole picture as a blow lands — ui/fx/camera KICK): toward
   * the side struck — left onto the creature, right onto him. Off where motion is (camera.ts).
   */
  const kick = (on: 'enemy' | 'hero', strength: CameraStrength) => {
    // A TRACK under way has its own jolt at the blow; a KICK now would cut it short.
    if (performance.now() < trackUntil.current) return;
    void cameraMove({ kind: 'KICK', dir: on === 'enemy' ? 'left' : 'right', strength }, document, 1 / speed);
  };
  /**
   * A MOVE WITH A CUT-IN, FOLLOWED (作者 2026-10-23 — FF Resonance's way; ui/fx/camera TRACK): a lean in
   * on him, a swing at the creature, held, the jolt at the blow (`impact` ms from now), back.
   */
  const trackUntil = useRef(0);
  const track = (impact: number, blows?: readonly number[]) => {
    const move = { kind: 'TRACK' as const, from: HERO_AT, to: ENEMY_AT, impact, blows, strength: 'medium' as const };
    trackUntil.current = performance.now() + moveMs(move);
    void cameraMove(move, document);
  };

  const strike = (on: 'enemy' | 'hero', amount: number, after = 0) => {
    const contact = after + Math.round(beatLength(on === 'enemy' ? 'STRIKE' : 'TACKLE', speed) * CONTACT_AT);
    later(() => {
      kick(on, 'small');
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
    setWings(null);
    setHolding(null);
    setSlash(null);
    setReach(null);
    setSkillSwing(false);
    setFrost(null);
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

  /**
   * AN ENHANCED 攻撃, v18's way: to the creature, the swing, and back —
   * and only then its answer. The number is still the core's, landing
   * the moment the blade arrives.
   */
  const playSwing = (before: BattleState, next: BattleState, skill = false, follow = false): number => {
    const id = showing.current;
    setSkillSwing(skill);
    const ms = {
      approach: reachMs('APPROACH', speed),
      windup: reachMs('WINDUP', speed),
      strike: reachMs('STRIKE', speed),
      hold: reachMs('HOLD', speed),
      recover: reachMs('RECOVER', speed),
      back: reachMs('RETURN', speed),
    };
    const windupAt = ms.approach;
    const strikeAt = windupAt + ms.windup;
    const contactAt = strikeAt + Math.round(ms.strike * REACH_CONTACT_AT);
    // 《瞬断》, three cuts (作者 2026-10-24 A — multiHit.ts): the one amount the core decided, shown as
    // three cuts landing a gap apart (never closer than its floor, ×2 too); he holds there for them.
    const shares = skill ? multiHitOf('shundan') : null;
    const amounts = splitDamage(Math.max(0, before.enemyHp - next.enemyHp), shares ?? [1]);
    const gap = multiHitGap(1 / speed);
    const cuts = amounts.map((_, i) => contactAt + i * gap);
    const more = cuts[cuts.length - 1] - contactAt;
    const recoverAt = strikeAt + ms.strike + ms.hold + more;
    const returnAt = recoverAt + ms.recover;
    const homeAt = returnAt + ms.back;
    if (follow) track(contactAt, shares ? cuts : undefined);

    setCamera('IDLE');
    setReach({ id, phase: 'approach', ms: ms.approach });
    later(() => {
      setBeat('STRIKE');
      setReach({ id, phase: 'windup', ms: ms.windup });
    }, windupAt);
    later(() => {
      setReach({ id, phase: 'strike', ms: ms.strike });
      // The trail from the start of the swing, the bite on contact.
      setSlash({
        id,
        arcMs: slashMs('ARC', speed),
        biteMs: slashMs('BITE', speed),
        biteAt: contactAt - strikeAt,
        skill,
      });
    }, strikeAt);
    // THE NUMBER IS THE CORE'S: what the enemy had, less what it has — at each cut, its share.
    cuts.forEach((at, i) => {
      later(() => {
        kick('enemy', skill ? 'medium' : 'small');
        blowId.current += 1;
        const blow = blowId.current;
        const landed: CutBlow = { id: blow, on: 'enemy', amount: amounts[i], cut: shares ? i : undefined };
        setBlows((live) => landBlow(live, landed));
        later(() => setBlows((live) => endBlow(live, blow)), beatLength('HURT', speed) + 260);
      }, at);
    });
    // The second and third cuts: the sword's trail again, its bite at its own cut, tilted its own way.
    const bite = contactAt - strikeAt;
    cuts.slice(1).forEach((at, n) => {
      later(() => {
        setSlash({ id: id + (n + 1) / 10, arcMs: slashMs('ARC', speed), biteMs: slashMs('BITE', speed), biteAt: bite, skill, ...SHUNDAN_SLASH_TURNS[n % SHUNDAN_SLASH_TURNS.length] });
      }, at - bite);
    });
    const lastSlash = id + (cuts.length - 1) / 10;
    later(() => setSlash((now) => (now?.id === lastSlash ? null : now)), cuts[cuts.length - 1] - bite + Math.max(slashMs('ARC', speed), bite + slashMs('BITE', speed)));
    later(() => setReach({ id, phase: 'recover', ms: ms.recover }), recoverAt);
    later(() => {
      setBeat('NONE');
      setReach({ id, phase: 'return', ms: ms.back });
    }, returnAt);
    later(() => setReach((now) => (now?.id === id ? null : now)), homeAt);

    // Home again: the creature answers as it always does.
    const over = playAnswer(next, homeAt);
    later(() => setSkillSwing(false), homeAt);
    setPlaying(true);
    later(() => setPlaying(false), over);
    return over;
  };

  const playTurn = (before: BattleState, next: BattleState, kind: TurnKind, extra: TurnExtras = {}) => {
    clearStage();
    if (extra.skillCutIn) {
      const mine = showing.current;
      const { skillCutIn: cut, ...rest } = extra;
      setPlaying(true);
      void cutIns.play(cut).then((ended) => {
        if (ended !== 'done' || showing.current !== mine) return;
        playTurnNow(before, next, kind, { ...rest, follow: true });
      });
      return;
    }
    playTurnNow(before, next, kind, extra);
  };

  const playTurnNow = (before: BattleState, next: BattleState, kind: TurnKind, extra: TurnExtras) => {
    const swings = (kind === 'ATTACK' || kind === 'SKILL') && options.slash;
    const cutIn = extra.answerCutIn;
    if (cutIn && answered(next)) {
      // HIS TURN FIRST, WITH NO ANSWER IN IT; then its cut-in; then its answer.
      const mine = showing.current;
      const quiet: BattleState = { ...next, lastEnemyAction: 'NONE' };
      const end = swings ? playSwing(before, quiet, extra.skill, extra.follow) : playPlain(before, quiet, kind);
      later(() => {
        setPlaying(true);
        void cutIns.play(cutIn).then((ended) => {
          if (ended !== 'done' || showing.current !== mine) return;
          setFrost(mine);
          const over = playAnswer(next, 0);
          later(() => setFrost((now) => (now === mine ? null : now)), over + 200);
          later(() => setPlaying(false), over);
        });
      }, end);
      return;
    }
    if (swings) {
      playSwing(before, next, extra.skill, extra.follow);
      return;
    }
    playPlain(before, next, kind);
  };

  /** A turn the Artifact's way: its beat, then the creature's answer. Returns when it is over. */
  const playPlain = (before: BattleState, next: BattleState, kind: TurnKind): number => {

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
    if (kind === 'ATTACK' || kind === 'SKILL') {
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
    return end;
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

    // 1½. Her wings (作者 2026-10-17 ケイオス専用演出): for a spell flagged for them, the cut-in over,
    //     the twin wings open behind her — a breath (WINGS_BREATH_MS) — and then the spell.
    const own = specialFxOf(def.id).find((t) => t.startsWith('kaos_'));
    const breath = own ? visualMs(WINGS_BREATH_MS, speed, WINGS_BREATH_MS / 2) : 0;

    // 2–4, once her cut-in is over (or at once, for a spell that has none).
    const afterWings = () => {
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
            kick('enemy', 'small');
            blowId.current += 1;
            const id = blowId.current;
            setBlows((live) => landBlow(live, { id, on: 'enemy', amount: damage }));
            later(() => setBlows((live) => endBlow(live, id)), beatLength('HURT', speed) + 260);
          }, Math.round(impact * SPELL_CONTACT_AT));
        }
      }, channel);

      // 4. The landing clears, and the creature answers as it always does.
      later(() => setSpell(null), channel + impact);
      later(() => setWings(null), channel + impact);
      const over = playAnswer(next, channel + impact);
      later(() => setPlaying(false), over);
    };

    // 1. Her cut-in, with the spell's own name. Stopped — by a newer turn
    //    or by the screen going — and nothing after it happens. A spell
    //    with no cut-in in the table (spellCutIn.ts) goes straight on.
    const afterCutIn = (followed = false) => {
      // Her cut-in played: the camera follows the spell to its landing (TRACK) — one that hurts.
      if (followed && show.hurts) track(breath + channel + Math.round(impact * SPELL_CONTACT_AT));
      if (!own) return afterWings();
      setWings({ id: mine, type: own });
      later(afterWings, breath);
    };
    const cutIn = spellCutIn(def);
    if (!cutIn) {
      afterCutIn();
      return;
    }
    void cutIns.play(cutIn).then((ended) => {
      if (ended !== 'done' || showing.current !== mine) return;
      afterCutIn(true);
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
    wings,
    holding,
    cinematic: cutIns.element,
    slash,
    reach,
    skillSwing,
    frost,
  };
}
