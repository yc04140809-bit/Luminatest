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
//
// The name is the game's own (heroSkills / partyMembers), never a provisional one.

import heroBattle from '@mugen/assets/files/characters/hero/hero-battle-v2.png';
import graveBattle from '@mugen/assets/files/characters/grave/grave-battle-v2.png';
import type { CutInSpec, CutInTheme } from './CutIn';

interface SkillCutInArt {
  /** Whose picture, by file — shown in the table so nobody has to guess. */
  art: string;
  theme: CutInTheme;
  /** The large faint word behind. */
  word: string;
  /** The small line over the name. */
  kicker: string;
}

const HERO: SkillCutInArt = { art: heroBattle, theme: 'hero', word: 'ZERO', kicker: 'ZERO BLADE ARTS' };
const GRAVE: SkillCutInArt = { art: graveBattle, theme: 'levi', word: 'GRAVE', kicker: 'GREATSWORD ARTS' };

/** Skill id (heroSkills / a party technique) → the cut-in it plays. Absent: none. */
export const SKILL_CUT_INS: Readonly<Record<string, SkillCutInArt>> = {
  shundan: HERO, // 《瞬断》
  goudan: GRAVE, // 重撃・豪断
};

/** The cut-in for this skill, by its id and the name the game gives it, or null when it has none. */
export function skillCutIn(skill: { id: string; name: string } | undefined | null): CutInSpec | null {
  const look = skill ? SKILL_CUT_INS[skill.id] : undefined;
  if (!skill || !look) return null;
  return {
    theme: look.theme,
    tier: 'SKILL',
    art: look.art,
    word: look.word,
    kicker: look.kicker,
    name: skill.name,
  };
}
