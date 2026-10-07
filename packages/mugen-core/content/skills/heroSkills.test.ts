import { describe, expect, it } from 'vitest';
import { HERO_STARTING_SKILLS, SHUNDAN, skillPowerText, skillReuseText, skillsOf } from './heroSkills';
import { createBattle, playerAttack, playerSkill, skillReadyIn } from '../../game/battle/battleLogic';

/**
 * What the status screen says of a skill is what the battle does with it
 * (2026-10-07): the words come from the same numbers.
 */
describe('his skills, as the status screen tells them', () => {
  it('《瞬断》: 威力：通常攻撃の2倍 / 再使用：3ターンに1回', () => {
    expect(SHUNDAN.name).toBe('瞬断');
    expect(skillPowerText(SHUNDAN)).toBe('通常攻撃の2倍');
    expect(skillReuseText(SHUNDAN)).toBe('3ターンに1回');
  });

  it('the numbers themselves are unchanged (×2.0, cooldown 3)', () => {
    expect(SHUNDAN).toEqual({ id: 'shundan', name: '瞬断', power: 2.0, cooldown: 3 });
  });

  it('「3ターンに1回」 is what the battle does: used on turn 1, ready again on turn 4', () => {
    const dummy = { name: 'かかし', hp: 999, attackMin: 1, attackMax: 1 };
    let s = playerSkill(createBattle(dummy), SHUNDAN, () => 0.5);
    const readyAt: number[] = [];
    for (let turn = 2; turn <= 7; turn++) {
      if (skillReadyIn(s, SHUNDAN) === 0) {
        readyAt.push(turn);
        s = playerSkill(s, SHUNDAN, () => 0.5);
      } else s = playerAttack(s, () => 0.5);
    }
    expect(readyAt).toEqual([4, 7]);
  });

  it('he knows 《瞬断》 from the start; anybody else knows none (未習得)', () => {
    expect(skillsOf('hero')).toEqual(HERO_STARTING_SKILLS);
    expect(skillsOf('hero').map((k) => k.id)).toContain('shundan');
    expect(skillsOf('kaos')).toEqual([]);
    expect(skillsOf('nobody')).toEqual([]);
  });

  it('other numbers read the same way', () => {
    expect(skillPowerText({ ...SHUNDAN, power: 1.5 })).toBe('通常攻撃の1.5倍');
    expect(skillReuseText({ ...SHUNDAN, cooldown: 1 })).toBe('毎ターン');
  });
});
