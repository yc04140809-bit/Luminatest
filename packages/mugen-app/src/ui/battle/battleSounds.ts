import { useEffect, useLayoutEffect, useRef } from 'react';
import { ATTACK_SFX_BY_WEAPON, attackSfxFor, CREATURE_ATTACK_SFX } from '@mugen/content/audio/weaponSfx';
import { battleProfileOf, WEAPON_CANON } from '@mugen/content/characters/battleProfiles';
import type { SfxId } from '@mugen/content/audio/sfx';
import { playSfx } from '../../platform/audio';
import type { Blow } from './blows';
import type { SpellFxView } from './magic/SpellFx';

/** The noise of a spell reaching its mark, by what kind of spell it is. */
export function spellLandSfx(spell: Pick<SpellFxView, 'kind' | 'phase'> | null): SfxId | null {
  if (!spell || spell.phase !== 'impact') return null;
  if (spell.kind === 'MEND') return 'battle_heal';
  if (spell.kind === 'COMET') return 'battle_finisher_hit';
  return null;
}

/**
 * THE FIGHT'S NOISES, laid over what the stage already draws.
 *
 * The same moments the Artifact's battle sounds at (BattleUIPrototype),
 * hung off the same things — the theatre's beat and the blows — so the
 * App adds sound without the fight changing in any way: nothing here
 * decides, delays or moves anything. A sound whose file has not been
 * delivered is silence, as everywhere.
 *
 *   STRIKE   the hero's swing, by what he fights with (a long sword)
 *   TACKLE   the opponent's attack: a person by their weapon (Gald's
 *            knives), a creature by its body (the heavy blow)
 *   GUARD    bracing
 *   a cut-in starting (a skill, a special move)
 *   MAGIC    a spell being cast — the magic circle opening, at her casting
 *            pose (after the cut-in, when there is one)
 *   a heal   landing (her 癒しの光), as it reaches the party
 *   a finisher landing (彗星撃): the special move's own blow
 *   the opponent going down — as it lands on the ground
 *   a blow   landing, once each, only when it cost something
 *   the fight starting, and the fight won
 */

/** Which noise a beat makes, or null for none. Pure, for the tests. */
export function beatSfx(beat: string, opponentArtId: string, opponentIsPerson: boolean): SfxId | null {
  switch (beat) {
    case 'STRIKE':
      return attackSfxFor(battleProfileOf('hero'));
    case 'TACKLE':
      // A person fought is not in the party's profiles, but their weapon is
      // canon (Gald: two daggers); somebody with none written strikes bare-handed.
      if (!opponentIsPerson) return CREATURE_ATTACK_SFX;
      return WEAPON_CANON[opponentArtId] ? ATTACK_SFX_BY_WEAPON[WEAPON_CANON[opponentArtId]] : 'battle_attack_strike';
    case 'GUARD':
      return 'battle_guard';
    case 'MAGIC':
      return 'magic_cast';
    default:
      return null;
  }
}

/** The noise of a blow landing, by whose side it lands on. */
export function blowSfx(blow: Blow): SfxId | null {
  if (blow.amount <= 0) return null;
  return blow.on === 'enemy' ? 'battle_hit' : 'battle_damage';
}

export function useBattleSounds({
  beat,
  blows,
  opponentArtId,
  opponentIsPerson,
  won,
  cutIn,
  spell,
  downed = false,
}: {
  beat: string;
  blows: readonly Blow[];
  opponentArtId: string;
  opponentIsPerson: boolean;
  won: boolean;
  /** A cut-in is on screen now. */
  cutIn: boolean;
  /** Her spell's drawing, while one shows. */
  spell?: SpellFxView | null;
  /** The opponent has fallen and lies on the ground. */
  downed?: boolean;
}) {
  // A spell reaching its mark, once per spell.
  useLayoutEffect(() => {
    const sfx = spellLandSfx(spell ?? null);
    if (sfx) playSfx(sfx);
  }, [spell?.id, spell?.phase]);

  // A cut-in starting.
  useLayoutEffect(() => {
    if (cutIn) playSfx('battle_cutin');
  }, [cutIn]);

  // Before paint, so the noise leaves with the picture (see the Artifact's note).
  useLayoutEffect(() => {
    const sfx = beatSfx(beat, opponentArtId, opponentIsPerson);
    if (sfx) playSfx(sfx);
  }, [beat]);

  // Down.
  useLayoutEffect(() => {
    if (downed) playSfx('battle_down');
  }, [downed]);

  // One noise per blow, never the same blow twice.
  const sounded = useRef(0);
  useLayoutEffect(() => {
    for (const blow of blows) {
      if (blow.id <= sounded.current) continue;
      sounded.current = blow.id;
      const sfx = blowSfx(blow);
      if (sfx) playSfx(sfx);
    }
  }, [blows]);

  useEffect(() => {
    playSfx('battle_start');
  }, []);
  useEffect(() => {
    if (won) playSfx('battle_win');
  }, [won]);
}
