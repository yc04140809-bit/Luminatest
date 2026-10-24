import { describe, expect, it } from 'vitest';
import { HERO_STARTING_SKILLS, HIGANBANA, SHUNDAN, skillPowerText, skillReuseText, skillsOf } from './heroSkills';
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

  it('the numbers themselves are unchanged (×2.0, cooldown 3) — in the party fight shown as two cuts, still one strike', () => {
    expect(SHUNDAN).toEqual({ id: 'shundan', name: '瞬断', power: 2.0, cooldown: 3, hits: 2 });
  });

  it('《彼岸花》 (作者 2026-10-24): three cuts of their own adding up to 2.4 × a swing, every fourth turn, slowing — a finisher; not his from the start', () => {
    // 2.4 × a swing in all: 0.72, 0.72 and the heaviest, the finishing third, 0.96 (作者 第一案).
    expect(HIGANBANA).toMatchObject({ id: 'higanbana', name: '彼岸花', power: 2.4, cooldown: 4, cuts: [0.72, 0.72, 0.96], cutBreakPower: 1, slows: true, finisher: true });
    expect(HIGANBANA.cuts!.reduce((a, b) => a + b, 0)).toBeCloseTo(HIGANBANA.power, 6);
    expect(HIGANBANA.cuts![2]).toBeGreaterThan(HIGANBANA.cuts![0]);
    expect(HERO_STARTING_SKILLS).not.toContain(HIGANBANA);
    expect(skillPowerText(HIGANBANA)).toBe('通常攻撃の2.4倍');
    expect(skillReuseText(HIGANBANA)).toBe('4ターンに1回');
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
