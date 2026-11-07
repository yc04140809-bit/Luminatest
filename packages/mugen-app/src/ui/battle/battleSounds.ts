import { useEffect, useLayoutEffect, useRef } from 'react';
import { ATTACK_SFX_BY_WEAPON, attackSfxFor, CREATURE_ATTACK_SFX } from '@mugen/content/audio/weaponSfx';
import { battleProfileOf, WEAPON_CANON } from '@mugen/content/characters/battleProfiles';
import type { SfxId } from '@mugen/content/audio/sfx';
import { playSfx } from '../../platform/audio';
import type { Blow } from './blows';
import type { SpellFxView } from './magic/SpellFx';
import type { FieldScene } from './scene/fieldScene';
import { beatLength } from './battleTheatre';

/**
 * THE FIGHT'S NOISES, laid over what the stage already draws.
 *
 * Hung off the things the stage is handed — the theatre's beat, the
 * blows, her spell's drawing, a cut-in, a scene — so the App adds sound
 * without the fight changing in any way: nothing here decides, delays or
 * moves anything. Which file each moment plays, how loud and how long,
 * is content/audio/sfxTuning.ts.
 *
 * THREE LEVELS, and each a different sound, not only a louder one:
 *
 *   ordinary   his swing → the hit; her spell's circle → its burst;
 *              Gald's knives; a creature's heavy blow; a creature
 *              diving into the moss (the rustle, twice in a row)
 *   skill      a heavier swing; a stronger landing
 *   special    a cut-in, the gathering (溜め), the move, and its own
 *              finishing blow — two or three of those, never all at once
 *
 * NOT ON TOP OF EACH OTHER. A spell's own landing replaces the ordinary
 * hit of the same blow rather than joining it, and a burst of spears at
 * ×2 sounds every other one.
 */

/** A spell's landing replaces the ordinary hit of its blow for this long. */
const SPELL_COVERS_HIT_MS = 320;

export interface OpponentSound {
  artId: string;
  person: boolean;
  /** A boss fight (Gald): heavier hits on it, a heavier fall. */
  boss: boolean;
}

/** The second rustle of a dive comes this share of the way into the HIDE beat. */
export const HIDE_SECOND_AT = 0.45;

/** When the two rustles of a dive play, in ms from its start, at this speed. */
export function hideRustles(speed: number): [number, number] {
  return [0, Math.round(beatLength('HIDE', speed > 1 ? 2 : 1) * HIDE_SECOND_AT)];
}

/** Which noise a beat makes, or null for none. Pure, for the tests. */
export function beatSfx(beat: string, opponent: OpponentSound, skill = false): SfxId | null {
  switch (beat) {
    case 'STRIKE':
      // 《瞬断》: its own swing — the slash, lower and heavier (sfxTuning).
      return skill ? 'battle_skill_slash' : attackSfxFor(battleProfileOf('hero'));
    case 'GUARD':
      // Bracing — and see blowSfx: a blow it turns aside entirely clangs too.
      return 'battle_guard';
    case 'ROAR':
      // A boss gathering itself for the next blow: the gathering aura.
      return 'battle_charge_aura';
    case 'TACKLE':
      // A person fought is not in the party's profiles, but their weapon is
      // canon (Gald: two daggers); somebody with none written strikes bare-handed.
      if (!opponent.person) return CREATURE_ATTACK_SFX;
      return WEAPON_CANON[opponent.artId] ? ATTACK_SFX_BY_WEAPON[WEAPON_CANON[opponent.artId]] : 'battle_attack_strike';
    default:
      return null;
  }
}

/**
 * The noise of a blow landing. On the party: being hit. On the opponent:
 * by how much it cost — a light one, an ordinary one, a heavy one — and
 * a boss's own, heavier, whatever the amount.
 */
export function blowSfx(blow: Blow, opponent: OpponentSound, opponentMaxHp: number): SfxId | null {
  // A blow on the party that cost nothing was guarded away, or parried: the clang.
  if (blow.on === 'hero') return blow.amount > 0 ? 'battle_damage' : 'battle_guard';
  if (blow.amount <= 0) return null;
  if (opponent.boss) return 'battle_boss_hit';
  const share = opponentMaxHp > 0 ? blow.amount / opponentMaxHp : 0;
  if (share >= 0.15) return 'battle_hit_heavy';
  if (share <= 0.04) return 'battle_hit_light';
  return 'battle_hit';
}

/** Her spell, as it gathers (the circle) and as it lands. */
export function spellSfx(spell: Pick<SpellFxView, 'kind' | 'phase'> | null): SfxId | null {
  if (!spell) return null;
  if (spell.phase === 'channel') return spell.kind === 'COMET' ? 'battle_charge_aura' : 'magic_cast';
  switch (spell.kind) {
    case 'BOLT':
      return 'battle_magic_hit';
    case 'COMET':
      return 'battle_finisher_hit';
    case 'MEND':
      return 'battle_heal';
    case 'WARD':
      return 'battle_buff';
    case 'HAZE':
      return 'battle_debuff';
    default:
      return null;
  }
}

/** The opponent going down. */
export function downSfx(opponent: OpponentSound): SfxId {
  return opponent.boss ? 'battle_boss_defeat' : 'battle_enemy_defeat';
}

/**
 * A SCENE'S NOISES, by who is on and which step it is at — the special
 * moves (today only the DEBUG preview plays them). Two or three a move:
 *
 *   レヴィ  her stance (the dark gathering) → each spear going in →
 *           her drive → the finish
 *   アリア  the arrow loosed → the rose opening over the field → its
 *           light reaching the party
 *   主人公  his sword gathering → the dash through → the cut landing
 */
export function sceneStepSfx(name: string, step: string): SfxId | null {
  const table: Record<string, Record<string, SfxId>> = {
    levi: { stance: 'battle_debuff', rush: 'battle_attack_heavy_weapon', impact: 'battle_finisher_hit' },
    aria: { shot: 'battle_attack_bow', bloom: 'battle_buff', bless: 'battle_heal' },
    zero: { charge: 'battle_charge_aura', dash: 'battle_skill_slash', break: 'battle_finisher_hit' },
  };
  return table[name]?.[step] ?? null;
}

/** Whether the nth spear going in is heard (1 is the first): all at ×1, every other at ×2. */
export function spearHeard(n: number, speed: number): boolean {
  return speed > 1 ? n % 2 === 1 : true;
}

export function useBattleSounds({
  beat,
  blows,
  opponent,
  opponentMaxHp,
  won,
  cutIn,
  spell,
  downed = false,
  scene = null,
  speed = 1,
  skillSwing = false,
  frost = false,
}: {
  beat: string;
  blows: readonly Blow[];
  opponent: OpponentSound;
  opponentMaxHp: number;
  won: boolean;
  /** A cut-in is on screen now. */
  cutIn: boolean;
  /** Her spell's drawing, while one shows. */
  spell?: SpellFxView | null;
  /** The opponent has fallen and lies on the ground. */
  downed?: boolean;
  /** A scene (a special move) playing on the field. */
  scene?: FieldScene | null;
  speed?: number;
  /** His swing is one of his skills. */
  skillSwing?: boolean;
  /** A boss's great move is landing: its ice. */
  frost?: boolean;
}) {
  const play = (id: SfxId | null) => {
    if (id) playSfx(id, { speed });
  };

  // A cut-in starting.
  useLayoutEffect(() => {
    if (cutIn) play('battle_cutin');
  }, [cutIn]);

  // Before paint, so the noise leaves with the picture.
  useLayoutEffect(() => {
    play(beatSfx(beat, opponent, skillSwing));
    if (beat !== 'HIDE') return;
    // Diving into the moss: the rustle twice, the second inside the beat.
    play('battle_hide');
    const timer = window.setTimeout(() => play('battle_hide'), hideRustles(speed)[1]);
    return () => window.clearTimeout(timer);
  }, [beat]);

  // Her spell: the circle as it gathers, and its burst as it lands —
  // which stands in for the ordinary hit of that same blow.
  const spellLandedAt = useRef(-Infinity);
  useLayoutEffect(() => {
    const sfx = spellSfx(spell ?? null);
    if (!sfx) return;
    if (spell?.phase === 'impact') spellLandedAt.current = performance.now();
    play(sfx);
  }, [spell?.id, spell?.phase]);

  // One noise per blow, never the same blow twice.
  const sounded = useRef(0);
  useLayoutEffect(() => {
    for (const blow of blows) {
      if (blow.id <= sounded.current) continue;
      sounded.current = blow.id;
      if (blow.on === 'enemy' && performance.now() - spellLandedAt.current < SPELL_COVERS_HIT_MS) continue;
      play(blowSfx(blow, opponent, opponentMaxHp));
    }
  }, [blows]);

  // A boss's great move landing: the ice, once.
  useLayoutEffect(() => {
    if (frost) play('battle_magic_ice');
  }, [frost]);

  // Down.
  useLayoutEffect(() => {
    if (downed) play(downSfx(opponent));
  }, [downed]);

  // A special move's steps, and Levi's spears one by one.
  useLayoutEffect(() => {
    if (scene) play(sceneStepSfx(scene.name, scene.step));
  }, [scene?.id, scene?.step]);
  const spears = useRef(0);
  useLayoutEffect(() => {
    if (!scene || scene.name !== 'levi') {
      spears.current = 0;
      return;
    }
    if (!scene.enemy?.startsWith('pierced')) return;
    spears.current += 1;
    if (spearHeard(spears.current, speed)) play('battle_attack_thrust');
  }, [scene?.id, scene?.enemy]);

  useEffect(() => {
    play('battle_start');
  }, []);
  useEffect(() => {
    if (won) play('battle_win');
  }, [won]);
}
