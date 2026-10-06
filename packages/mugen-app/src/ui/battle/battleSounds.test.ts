import { describe, expect, it } from 'vitest';
import { beatSfx, blowSfx, downSfx, hideRustles, sceneStepSfx, spearHeard, spellSfx, type OpponentSound } from './battleSounds';
import { beatLength } from './battleTheatre';

const rabbit: OpponentSound = { artId: 'moss_rabbit', person: false, boss: false };
const gald: OpponentSound = { artId: 'gald', person: true, boss: true };

describe('the App fight’s noises', () => {
  it('his swing is the long sword’s; Gald’s attack is the knife; a creature’s is the heavy blow', () => {
    expect(beatSfx('STRIKE', rabbit)).toBe('battle_attack_slash');
    expect(beatSfx('TACKLE', gald)).toBe('battle_attack_dagger');
    expect(beatSfx('TACKLE', rabbit)).toBe('battle_attack_heavy_strike');
    expect(beatSfx('TACKLE', { artId: 'somebody', person: true, boss: false })).toBe('battle_attack_strike');
    expect(beatSfx('GUARD', gald)).toBe('battle_guard');
    for (const b of ['NONE', 'HIDE', 'HURT', 'MAGIC']) expect(beatSfx(b, gald)).toBeNull();
  });

  it('a blow on a creature is light, ordinary or heavy by what it cost; any blow on a boss is the boss’s', () => {
    expect(blowSfx({ id: 1, on: 'enemy', amount: 4 }, rabbit, 124)).toBe('battle_hit_light');
    expect(blowSfx({ id: 2, on: 'enemy', amount: 10 }, rabbit, 124)).toBe('battle_hit');
    expect(blowSfx({ id: 3, on: 'enemy', amount: 30 }, rabbit, 124)).toBe('battle_hit_heavy');
    expect(blowSfx({ id: 4, on: 'enemy', amount: 10 }, gald, 220)).toBe('battle_boss_hit');
    expect(blowSfx({ id: 5, on: 'hero', amount: 4 }, gald, 220)).toBe('battle_damage');
    expect(blowSfx({ id: 6, on: 'enemy', amount: 0 }, rabbit, 124)).toBeNull();
    // A blow on the party that cost nothing was turned aside: the guard's clang.
    expect(blowSfx({ id: 7, on: 'hero', amount: 0 }, gald, 220)).toBe('battle_guard');
  });

  it('her spells: the circle as they gather (the finisher gathers power instead), and each its own landing', () => {
    expect(spellSfx({ kind: 'BOLT', phase: 'channel' })).toBe('magic_cast');
    expect(spellSfx({ kind: 'COMET', phase: 'channel' })).toBe('battle_charge_aura');
    expect(spellSfx({ kind: 'BOLT', phase: 'impact' })).toBe('battle_magic_hit');
    expect(spellSfx({ kind: 'COMET', phase: 'impact' })).toBe('battle_finisher_hit');
    expect(spellSfx({ kind: 'MEND', phase: 'impact' })).toBe('battle_heal');
    expect(spellSfx({ kind: 'WARD', phase: 'impact' })).toBe('battle_buff');
    expect(spellSfx({ kind: 'HAZE', phase: 'impact' })).toBe('battle_debuff');
    expect(spellSfx(null)).toBeNull();
  });

  it('a creature falls lighter than a boss', () => {
    expect(downSfx(rabbit)).toBe('battle_enemy_defeat');
    expect(downSfx(gald)).toBe('battle_boss_defeat');
  });

  it('the special moves: two or three noises each, the finish its own', () => {
    expect(sceneStepSfx('zero', 'charge')).toBe('battle_charge_aura');
    expect(sceneStepSfx('zero', 'dash')).toBe('battle_skill_slash');
    expect(sceneStepSfx('zero', 'break')).toBe('battle_finisher_hit');
    expect(sceneStepSfx('zero', 'moon')).toBeNull();
    expect(sceneStepSfx('levi', 'stance')).toBe('battle_debuff');
    expect(sceneStepSfx('levi', 'impact')).toBe('battle_finisher_hit');
    expect(sceneStepSfx('aria', 'shot')).toBe('battle_attack_bow');
    expect(sceneStepSfx('aria', 'bloom')).toBe('battle_buff');
    for (const name of ['zero', 'levi', 'aria'])
      expect(['enter', 'charge', 'stance', 'draw', 'dash', 'hitstop', 'moon', 'pause', 'break', 'recover', 'return', 'stab', 'rush', 'impact', 'leave', 'shot', 'bloom', 'bless'].filter((s) => sceneStepSfx(name, s)).length).toBeLessThanOrEqual(3);
  });

  it('six spears at ×1 are six; at ×2 every other one, so they never become a buzz', () => {
    expect([1, 2, 3, 4, 5, 6].filter((n) => spearHeard(n, 1))).toEqual([1, 2, 3, 4, 5, 6]);
    expect([1, 2, 3, 4, 5, 6].filter((n) => spearHeard(n, 2))).toEqual([1, 3, 5]);
  });

  it('a dive into the moss is the rustle twice, both inside the beat — at ×2 as well', () => {
    for (const speed of [1, 2] as const) {
      const [a, b] = hideRustles(speed);
      expect(a).toBe(0);
      expect(b).toBeGreaterThan(60);
      expect(b).toBeLessThan(beatLength('HIDE', speed));
    }
    expect(hideRustles(2)[1]).toBeLessThan(hideRustles(1)[1]);
  });
});
