import { describe, it, expect } from 'vitest';
import {
  ENEMY_FALLBACK,
  PARTY_FALLBACK,
  lookupOrder,
  resolveArt,
  statesMissing,
  statesPresent,
  type ArtSet,
  type EnemyArtState,
  type PartyArtState,
} from './artStates';
import { enemyArt, partyArt } from './artRegistry';

const ALL_ENEMY: EnemyArtState[] = [
  'front', 'side', 'back', 'idle', 'attack', 'run', 'damage', 'down', 'portrait', 'sheet',
];

function enemySet(states: Partial<Record<EnemyArtState, string>>): ArtSet<EnemyArtState> {
  return {
    id: 'test_creature',
    label: 'テスト生物',
    states: Object.fromEntries(
      Object.entries(states).map(([k, src]) => [k, { src: src as string }]),
    ) as ArtSet<EnemyArtState>['states'],
  };
}

describe('lookupOrder', () => {
  it('tries the state asked for first', () => {
    expect(lookupOrder('attack', ENEMY_FALLBACK)[0]).toBe('attack');
  });

  it('never tries the same state twice', () => {
    const order = lookupOrder('idle', ENEMY_FALLBACK);
    expect(order).toEqual([...new Set(order)]);
    expect(order).toEqual(['idle', 'side', 'front', 'sheet']);
  });

  it('follows the enemy chain in the order it is written', () => {
    expect(lookupOrder('attack', ENEMY_FALLBACK)).toEqual([
      'attack', 'idle', 'side', 'front', 'sheet',
    ]);
  });

  it('follows the party chain in the order it is written', () => {
    expect(lookupOrder('battle_skill_1', PARTY_FALLBACK)).toEqual([
      'battle_skill_1', 'battle_idle', 'fullbody', 'portrait',
    ]);
  });
});

describe('resolveArt', () => {
  it('returns the exact state when it exists, and says it did not substitute', () => {
    const got = resolveArt(enemySet({ attack: 'a.png', idle: 'i.png' }), 'attack', ENEMY_FALLBACK);
    expect(got.asset?.src).toBe('a.png');
    expect(got.state).toBe('attack');
    expect(got.substituted).toBe(false);
    expect(got.placeholder).toBe(false);
  });

  it('falls back down the chain, and says which state it actually found', () => {
    // Only a standing picture exists; asking for the attack pose must
    // give the standing one, and must say so.
    const got = resolveArt(enemySet({ front: 'f.png' }), 'attack', ENEMY_FALLBACK);
    expect(got.asset?.src).toBe('f.png');
    expect(got.state).toBe('front');
    expect(got.substituted).toBe(true);
    expect(got.placeholder).toBe(false);
  });

  it('prefers idle over side, and side over front', () => {
    const all = enemySet({ idle: 'i.png', side: 's.png', front: 'f.png', sheet: 'sh.png' });
    expect(resolveArt(all, 'damage', ENEMY_FALLBACK).state).toBe('idle');
    const noIdle = enemySet({ side: 's.png', front: 'f.png' });
    expect(resolveArt(noIdle, 'damage', ENEMY_FALLBACK).state).toBe('side');
    const onlyFront = enemySet({ front: 'f.png', sheet: 'sh.png' });
    expect(resolveArt(onlyFront, 'damage', ENEMY_FALLBACK).state).toBe('front');
  });

  it('reaches the sheet only when nothing else is drawn', () => {
    expect(resolveArt(enemySet({ sheet: 'sh.png' }), 'run', ENEMY_FALLBACK).state).toBe('sheet');
  });

  it('asks for a placeholder rather than inventing something', () => {
    const got = resolveArt(enemySet({}), 'idle', ENEMY_FALLBACK);
    expect(got.asset).toBeNull();
    expect(got.state).toBeNull();
    expect(got.placeholder).toBe(true);
  });

  it('does the same for a character nobody has registered at all', () => {
    expect(resolveArt(undefined, 'idle', ENEMY_FALLBACK).placeholder).toBe(true);
  });

  it('never falls back to a state outside the chain', () => {
    // 'portrait' is not in the battlefield chain: a book illustration is
    // not a thing to stand on a battlefield, however much better than
    // nothing it looks.
    const got = resolveArt(enemySet({ portrait: 'p.png' }), 'idle', ENEMY_FALLBACK);
    expect(got.placeholder).toBe(true);
  });
});

describe('the registry front door', () => {
  const registry = { test_creature: enemySet({ front: 'f.png' }) };

  it('resolves a known creature', () => {
    expect(enemyArt(registry, 'test_creature', 'idle').asset?.src).toBe('f.png');
  });

  it('gives an unknown creature a placeholder instead of throwing', () => {
    expect(enemyArt(registry, 'nobody', 'idle').placeholder).toBe(true);
  });

  it('gives an unknown party member a placeholder too', () => {
    expect(partyArt({}, 'nobody', 'battle_idle').placeholder).toBe(true);
  });
});

describe('what is drawn and what is not', () => {
  const set = enemySet({ front: 'f.png', down: 'd.png' });

  it('lists the states that exist', () => {
    expect(statesPresent(set, ALL_ENEMY)).toEqual(['front', 'down']);
  });

  it('lists the states that do not, so a report can name them', () => {
    expect(statesMissing(set, ALL_ENEMY)).toEqual([
      'side', 'back', 'idle', 'attack', 'run', 'damage', 'portrait', 'sheet',
    ]);
  });
});
