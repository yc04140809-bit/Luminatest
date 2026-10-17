import { describe, expect, it } from 'vitest';
import { GOUDAN, GRAVE_GUEST, MOON_GUARD_TECH, STAR_FEATHER } from '@mugen/content/characters/partyMembers';
import { SHUNDAN } from '@mugen/content/skills/heroSkills';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { MOMENT_SPECIAL_FX, SKILL_SPECIAL_FX, SPECIAL_FX, specialFxLength, specialFxOf, type SpecialEffectType, type SpecialFxOwner } from './specialFx';
import { SPECIAL_FX_ART } from './specialFxArt';

// Each character's own effects (作者 2026-10-17): whose is whose, and never mixed.

/** Whose each flagged skill is, from the game's own data — never from this table. */
const HOLDER: Record<string, SpecialFxOwner> = {
  [GOUDAN.id]: 'grave',
  [MOON_GUARD_TECH.id]: 'hero',
  [SHUNDAN.id]: 'hero',
  ...Object.fromEntries(MAGIC_DEFS.map((m) => [m.id, 'kaos' as const])),
};

describe('the flag (SKILL_SPECIAL_FX)', () => {
  it('names only skills that exist, and each plays only its own character\'s effects', () => {
    for (const [id, types] of Object.entries(SKILL_SPECIAL_FX)) {
      expect(HOLDER[id], id).toBeDefined();
      for (const t of types) expect(SPECIAL_FX[t].owner, `${id} → ${t}`).toBe(HOLDER[id]);
    }
  });

  it('重撃・豪断 is グレイヴ\'s — his technique, his effects: the downward 重撃 first, then the 豪断', () => {
    expect(GRAVE_GUEST.techniques).toContain(GOUDAN);
    expect(GOUDAN.name).toBe('重撃・豪断');
    const chain = specialFxOf('goudan');
    expect(chain).toEqual(['grave_juugeki', 'grave_goudan_charge', 'grave_goudan']);
    expect(chain.every((t) => SPECIAL_FX[t].owner === 'grave')).toBe(true);
  });

  it('no effect of グレイヴ\'s is the hero\'s, nor any of the hero\'s red moon グレイヴ\'s', () => {
    const heroSkills = Object.entries(SKILL_SPECIAL_FX).filter(([id]) => HOLDER[id] === 'hero');
    for (const [, types] of heroSkills) expect(types.some((t) => t.startsWith('grave_'))).toBe(false);
    expect(specialFxOf('goudan').some((t) => t.startsWith('protagonist_'))).toBe(false);
    for (const t of Object.keys(SPECIAL_FX) as SpecialEffectType[]) {
      const prefix = { grave: 'grave_', hero: 'protagonist_', kaos: 'kaos_' }[SPECIAL_FX[t].owner];
      expect(t.startsWith(prefix), t).toBe(true);
    }
  });

  it('月影の構え, its dodge and its counter are the hero\'s; ケイオス\'s wings are hers; 星癒の羽 plays nothing of anyone else\'s', () => {
    expect(specialFxOf('moon_guard')).toEqual(['protagonist_counter_moon']);
    for (const t of [...MOMENT_SPECIAL_FX.counter, ...MOMENT_SPECIAL_FX.evade, ...MOMENT_SPECIAL_FX.zeroTenshou]) expect(SPECIAL_FX[t].owner).toBe('hero');
    expect(specialFxOf('comet_strike')).toEqual(['kaos_twin_wings']);
    expect(specialFxOf(STAR_FEATHER.id)).toEqual([]);
    expect(specialFxOf(undefined)).toEqual([]);
  });
});

describe('each effect', () => {
  it('uses only pictures that exist, lands within itself, and is short (under 1.2s)', () => {
    for (const [t, spec] of Object.entries(SPECIAL_FX) as [SpecialEffectType, (typeof SPECIAL_FX)[SpecialEffectType]][]) {
      for (const l of spec.layers) if (l.art) expect(SPECIAL_FX_ART[l.art], `${t} ${l.part}`).toBeTruthy();
      expect(spec.impact).toBeLessThanOrEqual(specialFxLength(t));
      expect(specialFxLength(t), t).toBeLessThanOrEqual(1200);
    }
  });

  it('ケイオス\'s wings: in, a little bigger, back, and gone within 0.55s (作者の指定)', () => {
    expect(specialFxLength('kaos_twin_wings')).toBeLessThanOrEqual(620);
    const wings = SPECIAL_FX.kaos_twin_wings.layers.find((l) => l.art === 'kaosWings')!;
    expect(wings.ms).toBeGreaterThanOrEqual(350);
    expect(wings.ms).toBeLessThanOrEqual(600);
  });

  it('零閃・天衝: still and dark first, then the arc, the crescent, and the cut up through it', () => {
    const at = (part: string) => SPECIAL_FX.protagonist_zero_tenshou.layers.find((l) => l.part === part)!.at;
    expect(at('zt-dim')).toBe(0);
    expect(at('zt-line')).toBeLessThan(at('zt-crescent'));
    expect(at('zt-crescent')).toBeLessThan(at('zt-rise'));
    expect(SPECIAL_FX.protagonist_zero_tenshou.impact).toBe(at('zt-rise'));
    // A short hold before the cut (作者: 0.08〜0.15秒).
    expect(at('zt-line')).toBeGreaterThanOrEqual(80);
    expect(at('zt-line')).toBeLessThanOrEqual(150);
  });
});
