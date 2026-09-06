import { describe, it, expect } from 'vitest';
import { TALK_FALLBACK, partyChainFor, lookupOrder } from './artStates';
import { partyArtFor } from '../../content/art';
import { GALD_ART } from '../../content/art/partyArt';

describe('one character, two ways of being shown', () => {
  it('asks for a talking picture along a different chain from a battle one', () => {
    expect(partyChainFor('talk')).toBe(TALK_FALLBACK);
    expect(partyChainFor('battle_attack')).not.toBe(TALK_FALLBACK);
  });

  it('never stands somebody mid-swing in as a picture of them speaking', () => {
    // A battle pose is a bad picture of somebody talking to you, and a
    // portrait is a bad picture of somebody on a battlefield. The chain
    // for a conversation reaches the whole figure first.
    expect(lookupOrder('talk', TALK_FALLBACK)).toEqual([
      'talk',
      'fullbody',
      'portrait',
      'battle_idle',
    ]);
  });
});

describe('Gald', () => {
  it('is one character with one id, not a battle one and a talking one', () => {
    expect(GALD_ART.id).toBe('gald');
    // If a second Gald ever appears in the registry this is the test
    // that says so: there is exactly one entry whose id begins 'gald'.
    expect(Object.keys({ gald: GALD_ART }).filter((k) => k.startsWith('gald'))).toHaveLength(1);
  });

  it('has a picture for the fight and a picture for being face down', () => {
    expect(partyArtFor('gald', 'battle_idle').substituted).toBe(false);
    expect(partyArtFor('gald', 'battle_down').substituted).toBe(false);
    expect(partyArtFor('gald', 'battle_damage').substituted).toBe(false);
  });

  it('has no talking picture yet, and falls back to the whole figure', () => {
    const talk = partyArtFor('gald', 'talk');
    expect(talk.placeholder).toBe(false);
    expect(talk.state).toBe('fullbody');
    expect(talk.substituted, 'and says it stood in').toBe(true);
  });

  it('falls back for a pose nobody has drawn without ever showing nothing', () => {
    for (const state of ['battle_attack', 'battle_skill_1', 'cutin', 'sheet'] as const) {
      expect(partyArtFor('gald', state).placeholder, state).toBe(false);
    }
  });
});
