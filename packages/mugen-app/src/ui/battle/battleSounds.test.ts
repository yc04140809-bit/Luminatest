import { describe, expect, it } from 'vitest';
import { beatSfx, blowSfx, spellLandSfx } from './battleSounds';

describe('the App fight’s noises', () => {
  it('his swing is the long sword’s; Gald’s attack is the knife; a creature’s is the heavy blow', () => {
    expect(beatSfx('STRIKE', 'moss_rabbit', false)).toBe('battle_attack_slash');
    expect(beatSfx('TACKLE', 'gald', true)).toBe('battle_attack_dagger');
    expect(beatSfx('TACKLE', 'moss_rabbit', false)).toBe('battle_attack_heavy_strike');
    // A person with no weapon written strikes bare-handed.
    expect(beatSfx('TACKLE', 'somebody', true)).toBe('battle_attack_strike');
  });

  it('bracing and casting have their own; the quiet beats have none', () => {
    expect(beatSfx('GUARD', 'gald', true)).toBe('battle_guard');
    expect(beatSfx('MAGIC', 'gald', true)).toBe('magic_cast');
    for (const b of ['NONE', 'HIDE', 'HURT']) expect(beatSfx(b, 'gald', true)).toBeNull();
  });

  it('a blow that lands is heard by whose side it lands on; one that cost nothing is not a landing', () => {
    expect(blowSfx({ id: 1, on: 'enemy', amount: 9 })).toBe('battle_hit');
    expect(blowSfx({ id: 2, on: 'hero', amount: 4 })).toBe('battle_damage');
    expect(blowSfx({ id: 3, on: 'enemy', amount: 0 })).toBeNull();
  });

  it('her healing light is heard as it reaches the party, her finisher as it lands; the others have no landing sound yet', () => {
    expect(spellLandSfx({ kind: 'MEND', phase: 'impact' })).toBe('battle_heal');
    expect(spellLandSfx({ kind: 'MEND', phase: 'channel' })).toBeNull();
    expect(spellLandSfx({ kind: 'COMET', phase: 'impact' })).toBe('battle_finisher_hit');
    for (const kind of ['BOLT', 'WARD', 'HAZE'] as const) expect(spellLandSfx({ kind, phase: 'impact' })).toBeNull();
    expect(spellLandSfx(null)).toBeNull();
  });
});
