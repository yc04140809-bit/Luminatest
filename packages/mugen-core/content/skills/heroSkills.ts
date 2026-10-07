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
