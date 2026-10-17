// HIS SWORD'S MOVES — the hero's skills. Content: names and numbers only.
//
// 《瞬断》 is his from the start: the one thing besides 攻撃 a long sword
// gives him in the first hours, so a fight is not only pressing 攻撃. Twice
// a swing, no MP, usable every third turn (cooldown 3) — worth using every
// time it comes round, never the only right answer between times.
//
// THE NAME IS PROVISIONAL (the author's 仮名称). Replacing it is this line.

import type { HeroSkillSpec } from '../../game/battle/battleLogic';

export const SHUNDAN: HeroSkillSpec = {
  id: 'shundan',
  name: '瞬断',
  power: 2.0,
  cooldown: 3,
};

/** What he knows from the first fight on. */
export const HERO_STARTING_SKILLS: readonly HeroSkillSpec[] = [SHUNDAN];

/**
 * Who knows which skills. Only he has any so far (from the first fight);
 * anybody else knows none — the status screen says 未習得.
 */
export function skillsOf(characterId: string): readonly HeroSkillSpec[] {
  return characterId === 'hero' ? HERO_STARTING_SKILLS : [];
}

/** 「通常攻撃の2倍」 — worked out from the skill's own power, never written twice. */
export function skillPowerText(skill: HeroSkillSpec): string {
  return `通常攻撃の${Number(skill.power.toFixed(2))}倍`;
}

/**
 * 「3ターンに1回」 — from its cooldown, which counts the turn it is used on
 * (skillReadyIn): used on turn 1, ready again on turn 4.
 */
export function skillReuseText(skill: HeroSkillSpec): string {
  return skill.cooldown <= 1 ? '毎ターン' : `${skill.cooldown}ターンに1回`;
}
