// THEIR SKILLS' CUT-INS (作者 実機 2026-10-23: 通常のスキルにもカットインを — 素材は転用して、
// グレイヴも顔と技名を入れ替えれば使える; then the ordinary fights before ヴァルシール get one too,
// and not only 攻撃's チュンッ).
//
// THE TABLE IS THE WHOLE OF IT, as her spells' (magic/spellCutIn.ts): a skill listed here by its id
// in the game's data plays this cut-in before its blow; one not listed goes straight on. Nothing is
// drawn new — each figure is the one the fight already draws for them (battleArt), and the colours
// are a cut-in look that already exists:
//
//   主人公   《瞬断》      his battle drawing, his own look (red and black, ZERO)
//   グレイヴ 重撃・豪断   his battle drawing, the blue-and-old-gold look (v18's Levi colours —
//                          the nearest to his own blue and gold; there is no third look to make)
//   主人公   《彼岸花》    his battle drawing, his own look — a finisher's long cut-in
//
// The name is the game's own (heroSkills / partyMembers), never a provisional one.

import heroBattle from '@mugen/assets/files/characters/hero/hero-battle-v2.png';
import graveBattle from '@mugen/assets/files/characters/grave/grave-battle-v2.png';
import type { CutInSpec, CutInTheme } from './CutIn';
import type { CutInTier } from './cutInTiming';

interface SkillCutInArt {
  /** Whose picture, by file — shown in the table so nobody has to guess. */
  art: string;
  theme: CutInTheme;
  /** The large faint word behind. */
  word: string;
  /** The small line over the name. */
  kicker: string;
  /** A finisher (必殺技): the long cut-in (cutInTiming FINISHER). Absent: an ordinary skill's. */
  tier?: CutInTier;
}

const HERO: SkillCutInArt = { art: heroBattle, theme: 'hero', word: 'ZERO', kicker: 'ZERO BLADE ARTS' };
const GRAVE: SkillCutInArt = { art: graveBattle, theme: 'levi', word: 'GRAVE', kicker: 'GREATSWORD ARTS' };
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
    art: look.art,
    word: look.word,
    kicker: look.kicker,
    name: skill.name,
  };
}
