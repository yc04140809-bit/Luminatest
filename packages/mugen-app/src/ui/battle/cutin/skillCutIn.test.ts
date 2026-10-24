import { describe, expect, it } from 'vitest';
import { SHUNDAN } from '@mugen/content/skills/heroSkills';
import { GOUDAN, MOON_GUARD_TECH } from '@mugen/content/characters/partyMembers';
import { SKILL_CUT_INS, skillCutIn } from './skillCutIn';

// Their skills' cut-ins (作者 実機 2026-10-23): the table is the whole of it, the name the game's own.
describe('skillCutIn', () => {
  it('《瞬断》: his own look, with the skill\'s name from the game\'s data', () => {
    const cut = skillCutIn(SHUNDAN)!;
    expect(cut).toMatchObject({ theme: 'hero', tier: 'SKILL', word: 'ZERO', name: SHUNDAN.name });
    expect(cut.art).toBeTruthy();
  });

  it('重撃・豪断: グレイヴ\'s own drawing and name, in the blue-and-gold look', () => {
    const cut = skillCutIn(GOUDAN)!;
    expect(cut).toMatchObject({ theme: 'levi', tier: 'SKILL', word: 'GRAVE', name: GOUDAN.name });
    expect(cut.art).not.toBe(skillCutIn(SHUNDAN)!.art);
  });

  it('a skill not in the table plays none (月影の構え, anything unknown)', () => {
    expect(skillCutIn(MOON_GUARD_TECH)).toBeNull();
    expect(skillCutIn({ id: 'nothing', name: '？' })).toBeNull();
    expect(skillCutIn(undefined)).toBeNull();
    expect(Object.keys(SKILL_CUT_INS).sort()).toEqual(['goudan', 'higanbana', 'shundan']);
  });

  it('《彼岸花》 (作者 2026-10-24): his drawing, his look — the finisher\'s long cut-in; 《瞬断》 an ordinary skill\'s', () => {
    const cut = skillCutIn({ id: 'higanbana', name: '彼岸花' })!;
    expect(cut).toMatchObject({ theme: 'hero', tier: 'FINISHER', name: '彼岸花', word: 'HIGANBANA' });
    expect(skillCutIn({ id: 'shundan', name: '瞬断' })!.tier).toBe('SKILL');
  });
});
