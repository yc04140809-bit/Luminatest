import { describe, expect, it } from 'vitest';
import { createBattle } from '@mugen/game/battle/battleLogic';
import { specOf } from '@mugen/game/battle/enemySpec';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { SHUNDAN } from '@mugen/content/skills/heroSkills';
import { ENEMY_SPECIES, MOSS_RABBIT } from '@mugen/content/enemies/species';
import { skillBeatsSpell } from './autoSkill';

/** AUTO (2026-10-11): 《瞬断》, come round, before a damage spell that would hurt no more. */
const spell = (id: string) => MAGIC_DEFS.find((m) => m.id === id)!;
const fight = (species = MOSS_RABBIT) => createBattle(specOf(species), undefined, { stats: statsForLevels(3, 3), magicUnlocked: true });

describe('his skill or her spell, under AUTO', () => {
  it('《瞬断》 (twice a swing, ~20) is taken before her bolt, even on the rabbit the star hurts more (13.5)', () => {
    expect(skillBeatsSpell(fight(), spell('starlight_bolt'), SHUNDAN)).toBe(true);
  });

  it('and still on one a sword glances off (フウミミ: physical −50%) against the bolt', () => {
    expect(skillBeatsSpell(fight(ENEMY_SPECIES.fuumimi), spell('starlight_bolt'), SHUNDAN)).toBe(true);
  });

  it('never swaps a spell that is not damage — mending, shielding, lifting', () => {
    for (const id of ['mending_light', 'star_shield', 'star_haze']) expect(skillBeatsSpell(fight(), spell(id), SHUNDAN), id).toBe(false);
  });

  it('a spell that would hit harder than the skill is left as it is (her comet on the rabbit, ~30)', () => {
    expect(skillBeatsSpell(fight(), spell('comet_strike'), SHUNDAN)).toBe(false);
  });
});
