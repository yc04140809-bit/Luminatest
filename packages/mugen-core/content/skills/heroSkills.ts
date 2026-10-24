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
  // In the party fight: one strike shown as two quick cuts (作者 2026-10-24 — light, tempo; the
  // three cuts, the finish and the slowing are 《彼岸花》's).
  hits: 2,
};

/**
 * 《彼岸花》 — HIS FINISHER (作者 2026-10-24「主人公必殺技『彼岸花』＋BREAK / COMBO戦術拡張」, then 最終仕様): he
 * slides back and is gone, then among them — two quick cuts and a big third, the ground splits, the
 * world goes still, red spider lilies open out of the cracks — and every creature standing is left
 * SLOWED, so the party gets more turns in before they move (in a BREAK, more of them before it stands).
 * At ALL of them: three strikes of their own on each (each COMBO's — three creatures, nine).
 *
 * PROVISIONAL NUMBERS (TIGS 前: no big damage — its worth is the three hits, the slowing and COMBO):
 * 2.4 × a swing in all — 0.72, 0.72 and the heaviest last, 0.96 (作者 第一案) — every fourth turn, each
 * cut wearing footing by 1.
 *
 * Where it is: the party fight, for now — built there, as its turns are (a limit of where it is built,
 * not a rule: joined with the ordinary fight, the same data serves both). Learned in the fight with
 * ヴァルシール's second form (ui/finale — not a save flag: that fight is where he has it, lost and
 * fought again included).
 */
export const HIGANBANA: HeroSkillSpec = {
  id: 'higanbana',
  name: '彼岸花',
  power: 2.4,
  cooldown: 4,
  cuts: [0.72, 0.72, 0.96],
  cutBreakPower: 1,
  slows: true,
  area: 'ALL',
  finisher: true,
};

/**
 * His skills with 《彼岸花》 among them (first). One way in for whatever gives it him — the story
 * (ヴァルシール's second form: ui/finale decides when) or a demo forcing it (the DEV preview's
 * `&higanbana=1`; later a TIGS demo or PV) — so the two stay apart and the move stays the same.
 */
export function withHiganbana(skills: readonly HeroSkillSpec[]): HeroSkillSpec[] {
  return [HIGANBANA, ...skills.filter((k) => k.id !== HIGANBANA.id)];
}

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
