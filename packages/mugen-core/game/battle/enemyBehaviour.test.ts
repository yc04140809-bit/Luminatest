import { describe, it, expect } from 'vitest';
import {
  hitPoise,
  phaseAt,
  phaseChanged,
  recoverPoise,
  type EnemyPhase,
  type EnemyPoiseSpec,
} from './enemyBehaviour';

const POISE: EnemyPoiseSpec = {
  max: 6,
  perHit: 1,
  perGuardedHit: 2,
  staggerTurns: 2,
  staggerDamageTaken: 1.4,
  breakLine: 'よろけた！',
  recoverLine: '構えなおした。',
};

const PHASES: EnemyPhase[] = [
  { id: 'WARY', atOrBelow: 0.55, line: '耳を伏せた。', skillChance: 0.6 },
  { id: 'DESPERATE', atOrBelow: 0.25, line: '飛びかかってきた！', attack: 1.4 },
];

describe('footing', () => {
  it('is taken a blow at a time', () => {
    expect(hitPoise(POISE, 6, 0, false).poise).toBe(5);
  });

  it('is taken faster by a blow that lands on a guard', () => {
    // Hitting something that is bracing is how you break the brace, not
    // a turn thrown away waiting for it to drop.
    expect(hitPoise(POISE, 6, 0, true).poise).toBe(4);
  });

  it('runs out, and that is the moment', () => {
    const broken = hitPoise(POISE, 1, 0, false);
    expect(broken.poise).toBe(0);
    expect(broken.broke).toBe(true);
    expect(broken.staggerTurns).toBe(2);
  });

  it('cannot be taken twice: something already down does not fall further', () => {
    const again = hitPoise(POISE, 0, 2, false);
    expect(again.broke).toBe(false);
    expect(again.staggerTurns).toBe(2);
  });

  it('comes back in full, after the turns it costs', () => {
    let poise = 0;
    let stagger = 2;
    let r = recoverPoise(POISE, poise, stagger);
    expect(r.recovered).toBe(false);
    expect(r.staggerTurns).toBe(1);
    r = recoverPoise(POISE, r.poise, r.staggerTurns);
    expect(r.recovered).toBe(true);
    expect(r.poise).toBe(POISE.max);
    expect(r.staggerTurns).toBe(0);
  });

  it('is not a thing at all for a creature that has none', () => {
    expect(hitPoise(null, 0, 0, true)).toEqual({ poise: 0, staggerTurns: 0, broke: false });
    expect(recoverPoise(null, 0, 0).recovered).toBe(false);
  });
});

describe('phases', () => {
  it('leaves a creature alone while it is unhurt', () => {
    expect(phaseAt(PHASES, 100, 100)).toBeNull();
    expect(phaseAt(PHASES, 60, 100)).toBeNull();
  });

  it('enters the one that fits as it is hurt', () => {
    expect(phaseAt(PHASES, 55, 100)?.id).toBe('WARY');
    expect(phaseAt(PHASES, 30, 100)?.id).toBe('WARY');
  });

  it('takes the worst-hurt one that fits, not the first', () => {
    expect(phaseAt(PHASES, 20, 100)?.id).toBe('DESPERATE');
    expect(phaseAt(PHASES, 1, 100)?.id).toBe('DESPERATE');
  });

  it('says its line once per crossing, and not again', () => {
    expect(phaseChanged(null, PHASES[0])).toBe(true);
    expect(phaseChanged(PHASES[0], PHASES[0])).toBe(false);
    expect(phaseChanged(PHASES[0], PHASES[1])).toBe(true);
  });

  it('is nothing at all for a creature with none', () => {
    expect(phaseAt(null, 1, 100)).toBeNull();
    expect(phaseAt([], 1, 100)).toBeNull();
  });

  it('does not divide by a health of zero', () => {
    expect(phaseAt(PHASES, 0, 0)).toBeNull();
  });
});
