// THEIR SKILLS' CUT-INS (作者 実機 2026-10-23: 通常のスキルにもカットインを — 素材は転用して、
// グレイヴも顔と技名を入れ替えれば使える; then the ordinary fights before ヴァルシール get one too,
// and not only 攻撃's チュンッ).
//
// THE TABLE IS THE WHOLE OF IT, as her spells' (magic/spellCutIn.ts): a skill listed here by its id
// in the game's data plays this cut-in before its blow; one not listed goes straight on. The figure is
// each one's moving bust (cutInFigures.ts — 作者 2026-10-25, replacing the battle drawings):
//
//   主人公   《瞬断》      his moving bust, his own look (red and black, ZERO)
//   グレイヴ 重撃・豪断   his moving bust, his own look (forge-bronze and steel — it borrowed
//                          v18's Levi colours before), his face in the middle of the screen
//   主人公   《彼岸花》    his moving bust, his own look — a finisher's long cut-in
//
// The name is the game's own (heroSkills / partyMembers), never a provisional one.

import type { CutInSpec, CutInTheme } from './CutIn';
import { GRAVE_FIGURE, HERO_FIGURE, type CutInFigure } from './cutInFigures';
import type { CutInTier } from './cutInTiming';

interface SkillCutInArt {
  /** Whose figure — shown in the table so nobody has to guess. */
  figure: CutInFigure;
  theme: CutInTheme;
  /** The large faint word behind. */
  word: string;
  /** The small line over the name. */
  kicker: string;
  /** A finisher (必殺技): the long cut-in (cutInTiming FINISHER). Absent: an ordinary skill's. */
  tier?: CutInTier;
}

const HERO: SkillCutInArt = { figure: HERO_FIGURE, theme: 'hero', word: 'ZERO', kicker: 'ZERO BLADE ARTS' };
const GRAVE: SkillCutInArt = { figure: GRAVE_FIGURE, theme: 'grave', word: 'GRAVE', kicker: 'GREATSWORD ARTS' };
/** 《彼岸花》, his finisher (作者 2026-10-24): his own look, the long cut-in. */
const HERO_FINISHER: SkillCutInArt = { ...HERO, word: 'HIGANBANA', kicker: 'ZERO BLADE ARTS — FINISHER', tier: 'FINISHER' };

/** Skill id (heroSkills / a party technique) → the cut-in it plays. Absent: none. */
export const SKILL_CUT_INS: Readonly<Record<string, SkillCutInArt>> = {
  shundan: HERO, // 《瞬断》
  goudan: GRAVE, // 重撃・豪断
  higanbana: HERO_FINISHER, // 《彼岸花》
};

/** The cut-in for this skill, by its id and the name the game gives it, or null when it has none. */
export function skillCutIn(skill: { id: string; name: string } | undefined | null): CutInSpec | null {
  const look = skill ? SKILL_CUT_INS[skill.id] : undefined;
  if (!skill || !look) return null;
  return {
    theme: look.theme,
    tier: look.tier ?? 'SKILL',
    art: look.figure.art,
    motion: look.figure.motion,
    word: look.word,
    kicker: look.kicker,
    name: skill.name,
  };
}
