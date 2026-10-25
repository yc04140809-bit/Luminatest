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
    // His moving bust (作者 2026-10-25), its first frame as the picture.
    expect(cut.motion?.video).toMatch(/hero-cutin.*\.webm/);
    expect(cut.art).toMatch(/hero-cutin-poster/);
  });

  it('重撃・豪断: グレイヴ\'s own moving bust and name, in his own forge-bronze look', () => {
    const cut = skillCutIn(GOUDAN)!;
    expect(cut).toMatchObject({ theme: 'grave', tier: 'SKILL', word: 'GRAVE', name: GOUDAN.name });
    expect(cut.motion?.video).toMatch(/grave-cutin.*\.webm/);
    expect(cut.art).not.toBe(skillCutIn(SHUNDAN)!.art);
  });

  it('every moving figure says where its face is, inside the frame', () => {
    for (const id of ['shundan', 'goudan', 'higanbana']) {
      const face = skillCutIn({ id, name: id })!.motion!.face;
      for (const v of [face.x, face.y]) {
        expect(v).toBeGreaterThan(0.3);
        expect(v).toBeLessThan(0.7);
      }
    }
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
