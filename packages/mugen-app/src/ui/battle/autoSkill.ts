import type { BattleState, HeroSkillSpec } from '@mugen/game/battle/battleLogic';
import type { MagicDef } from '@mugen/core/magic/magic';
import { weighMagic } from '@mugen/game/battle/magicChoice';

/**
 * AUTO: HIS SKILL BEFORE HER SPELL, WHEN IT HITS AS HARD (2026-10-11).
 *
 * The core's AUTO brain (`decideTurn`, shared with the Artifact) weighs a
 * spell against a PLAIN swing, and knows nothing of 《瞬断》 — so with power
 * to spare she cast and cast while his skill, ready and free, went unused
 * (seen on a phone). Here, on the App's side only: when the turn's plan is a
 * spell that hurts the creature and a skill of his has come round that would
 * do at least as much (a swing's worth × the skill's power, through the same
 * guard and resistance the spell is weighed through), he takes the turn.
 * Mending, shielding and lifting spells are never swapped — those are not
 * damage.
 */
export function skillBeatsSpell(state: BattleState, spell: MagicDef, skill: HeroSkillSpec): boolean {
  const weigh = weighMagic(state, spell);
  if (weigh.magicDamage <= 0) return false;
  return weigh.swingDamage * skill.power >= weigh.magicDamage;
}
