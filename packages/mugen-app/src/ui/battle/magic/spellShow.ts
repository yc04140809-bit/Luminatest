// HOW EACH OF KAOS'S SPELLS IS SHOWN — read off the game's own spell data.
//
// ONE PIPELINE FOR ALL OF THEM (battleTheatre.playSpell): her cut-in with
// the spell's name, her aura while she channels, what the spell does
// where it lands, and then the creature's answer. What differs between
// spells is only the shape of the landing, and that is decided here from
// the fields the spell already has — `effect`, and for the two that hurt,
// `animation` — never from its id or its name, so a spell renamed or a
// sixth one added is shown correctly without touching this file.
//
// NOTHING HERE DECIDES A NUMBER. The one number a spell puts on screen is
// the damage of the two that hurt, and that is the creature's health
// before the turn less its health after (`spellDamage`), exactly as a
// sword's is. Mending, the shield and the haze show what they did and
// leave the words to the battle's own log line, which the screen already
// shows for an item; no number is made up for them.

import type { MagicDef } from '@mugen/core/magic/magic';
import type { BattleState } from '@mugen/game/battle/battleLogic';
import { visualMs, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import type { CutInTier } from '../cutin/cutInTiming';

/** The shape of a spell's landing. */
export type SpellKind = 'BOLT' | 'COMET' | 'MEND' | 'WARD' | 'HAZE';

export interface SpellShow {
  kind: SpellKind;
  /** How long her cut-in holds (cutInTiming.ts). */
  tier: CutInTier;
  /** Where it lands: on the creature, or on the party. */
  lands: 'enemy' | 'party';
  /** Whether it takes health off — the only kind that shows a number. */
  hurts: boolean;
}

export function spellShowOf(def: MagicDef): SpellShow {
  switch (def.effect) {
    case 'DAMAGE':
      // The comet is her big one (magicDefs: "The big one"), and held as
      // one; every other spell is an ordinary skill's length.
      return def.animation === 'STAR_COMET'
        ? { kind: 'COMET', tier: 'FINISHER', lands: 'enemy', hurts: true }
        : { kind: 'BOLT', tier: 'SKILL', lands: 'enemy', hurts: true };
    case 'MEND':
      return { kind: 'MEND', tier: 'SKILL', lands: 'party', hurts: false };
    case 'WARD':
    case 'BUFF':
      return { kind: 'WARD', tier: 'SKILL', lands: 'party', hurts: false };
    case 'DEBUFF':
      return { kind: 'HAZE', tier: 'SKILL', lands: 'enemy', hurts: false };
  }
}

/**
 * The damage a spell did — the creature's health before, less after.
 * Nought for a spell that does not hurt, which then shows no number.
 */
export function spellDamage(before: BattleState, next: BattleState, show: SpellShow): number {
  return show.hurts ? Math.max(0, before.enemyHp - next.enemyHp) : 0;
}

/**
 * THE STEPS AFTER THE CUT-IN, at ×1, and the least each may become.
 *
 * Shorter than v18's 双極崩界 (1150ms of channel, 1500ms of blast), which
 * was one showpiece played on its own: these are played every time she
 * casts, so they keep v18's order and look at a length a fight can carry.
 * The floors keep the aura and the landing seen at ×2, as v18 kept its
 * blast legible (`Math.max(900, …)`).
 */
export const SPELL_MS = { CHANNEL: 820, IMPACT: 760 } as const;
export const SPELL_FLOOR_MS = { CHANNEL: 480, IMPACT: 480 } as const;
/** Where in the landing the spell arrives — the number, the flinch. */
export const SPELL_CONTACT_AT = 0.24;

export function spellStepMs(step: keyof typeof SPELL_MS, speed: BattleSpeed): number {
  return visualMs(SPELL_MS[step], speed, SPELL_FLOOR_MS[step]);
}
