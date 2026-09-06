// GALD, WITH KAOS IN THE FIGHT — measured, four ways.
//
// The question this answers is the one the design round asked: does
// adding a second person to the player's one action make the fight
// shorter? It must not. A fight that used to take twenty-three
// exchanges and now takes twelve has not gained a character, it has
// gained a better button.
//
// Four strategies, three hundred fights each, one deterministic stream
// of draws so the numbers are the same tomorrow.

import { describe, it, expect } from 'vitest';
import {
  castMagic,
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
} from './battleLogic';
import { GALD_BATTLE } from '../../content/enemies/galdBattle';
import { STARLIGHT_BOLT } from '../../content/magic/magicDefs';

/** About how long one exchange takes on screen. See battleTempo.test.ts. */
const SECONDS_PER_TURN = 4;
const RUNS = 300;

type Strategy = 'ATTACK_ONLY' | 'MIXED' | 'MAGIC_FIRST' | 'ATTACK_MAGIC_GUARD';

interface Result {
  winRate: number;
  turns: number;
  hpLeft: number;
  mpLeft: number;
  seconds: number;
  /** How often a run saw each of his two phases and his stagger. */
  phasesSeen: number;
  staggersSeen: number;
  castsUsed: number;
}

function draws(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** What the player does on this turn, given what they can see. */
function decide(state: BattleState, strategy: Strategy, turn: number): 'ATTACK' | 'MAGIC' | 'GUARD' {
  const canCast = state.magicUnlocked && state.playerMp >= STARLIGHT_BOLT.mpCost;
  switch (strategy) {
    case 'ATTACK_ONLY':
      return 'ATTACK';
    case 'MIXED':
      // What a player who has understood it would do: shoot past a
      // raised guard, swing the rest of the time.
      return canCast && state.enemyGuardTurns > 0 ? 'MAGIC' : 'ATTACK';
    case 'MAGIC_FIRST':
      return canCast ? 'MAGIC' : 'ATTACK';
    case 'ATTACK_MAGIC_GUARD':
      // Braces on a rhythm rather than in a panic. "Guard whenever hurt"
      // is not a strategy, it is a death spiral: with nothing that
      // heals, a player who stops hurting the enemy below a quarter
      // health simply loses slowly, and measuring that tells us about
      // the strategy rather than about the fight.
      if (turn % 5 === 4) return 'GUARD';
      if (canCast && state.enemyGuardTurns > 0) return 'MAGIC';
      return 'ATTACK';
  }
}

function simulate(strategy: Strategy, runs = RUNS): Result {
  const rng = draws(20260906);
  let wins = 0;
  let turns = 0;
  let hpLeft = 0;
  let mpLeft = 0;
  let phasesSeen = 0;
  let staggersSeen = 0;
  let castsUsed = 0;

  for (let r = 0; r < runs; r++) {
    let state = createBattle(GALD_BATTLE);
    let t = 0;
    const phases = new Set<string>();
    let staggers = 0;
    let casts = 0;
    while (state.outcome === 'ONGOING' && t < 300) {
      const choice = decide(state, strategy, t);
      const before = state.enemyStaggerTurns;
      state =
        choice === 'MAGIC'
          ? castMagic(state, STARLIGHT_BOLT, rng)
          : choice === 'GUARD'
            ? playerDefend(state, rng)
            : playerAttack(state, rng);
      if (choice === 'MAGIC') casts += 1;
      if (before === 0 && state.enemyStaggerTurns > 0) staggers += 1;
      if (state.enemyPhaseId) phases.add(state.enemyPhaseId);
      t += 1;
    }
    turns += t;
    castsUsed += casts;
    staggersSeen += staggers;
    phasesSeen += phases.size;
    if (state.outcome === 'VICTORY') {
      wins += 1;
      hpLeft += state.playerHp;
      mpLeft += state.playerMp;
    }
  }
  const won = Math.max(1, wins);
  return {
    winRate: wins / runs,
    turns: turns / runs,
    hpLeft: hpLeft / won,
    mpLeft: mpLeft / won,
    seconds: (turns / runs) * SECONDS_PER_TURN,
    phasesSeen: phasesSeen / runs,
    staggersSeen: staggersSeen / runs,
    castsUsed: castsUsed / runs,
  };
}

const results: Record<Strategy, Result> = {
  ATTACK_ONLY: simulate('ATTACK_ONLY'),
  MIXED: simulate('MIXED'),
  MAGIC_FIRST: simulate('MAGIC_FIRST'),
  ATTACK_MAGIC_GUARD: simulate('ATTACK_MAGIC_GUARD'),
};

describe('the star earns its place on something a sword is wrong for', () => {
  /**
   * Not a creature anybody has written — a spec made here, to prove the
   * mechanism the design round asked for actually bites. Adding a real
   * armoured enemy is content, and this round was told not to add any.
   */
  const ARMOURED = {
    name: 'テスト・重装',
    hp: 120,
    attackMin: 4,
    attackMax: 6,
    affinity: { physicalResistance: 0.5, magicWeakness: 0.5 },
  };

  function turnsWith(kind: 'ATTACK' | 'MAGIC') {
    const rng = draws(99);
    let state = createBattle(ARMOURED, undefined, { magicUnlocked: true });
    let t = 0;
    while (state.outcome === 'ONGOING' && t < 300) {
      state =
        kind === 'MAGIC' && state.playerMp >= STARLIGHT_BOLT.mpCost
          ? castMagic(state, STARLIGHT_BOLT, rng)
          : kind === 'MAGIC'
            ? playerDefend(state, rng) // out of power: cover, and gather
            : playerAttack(state, rng);
      t += 1;
    }
    return { turns: t, outcome: state.outcome };
  }

  it('is markedly faster than swinging at it', () => {
    const sword = turnsWith('ATTACK');
    const star = turnsWith('MAGIC');
    expect(star.outcome).toBe('VICTORY');
    expect(star.turns).toBeLessThan(sword.turns * 0.8);
  });
});

describe('Gald, with Kaos in the fight', () => {
  it('is still winnable however the player plays it', () => {
    for (const [name, r] of Object.entries(results)) {
      expect(r.winRate, `${name} win rate`).toBeGreaterThanOrEqual(0.95);
    }
  });

  it('is not made shorter by her being there', () => {
    // The thing the design round was worried about. A second character
    // inside the SAME one action cannot speed a fight up, and this is
    // the assertion that keeps it that way when the numbers move.
    const base = results.ATTACK_ONLY.turns;
    for (const [name, r] of Object.entries(results)) {
      expect(r.turns, `${name} must not be a shortcut`).toBeGreaterThan(base * 0.9);
    }
  });

  it('stays inside the elite band, every way of playing it', () => {
    for (const [name, r] of Object.entries(results)) {
      expect(r.seconds, `${name} seconds`).toBeGreaterThanOrEqual(90);
      expect(r.seconds, `${name} seconds`).toBeLessThanOrEqual(150);
    }
  });

  it('is not a better button than the sword', () => {
    // The rule the design round set: her first spell must not be a
    // strict upgrade. Against a man with no opinion about magic, a
    // player who casts at everything finishes no faster than one who
    // never casts at all.
    expect(results.MAGIC_FIRST.turns).toBeGreaterThanOrEqual(results.ATTACK_ONLY.turns);
    expect(results.MAGIC_FIRST.hpLeft).toBeLessThanOrEqual(results.ATTACK_ONLY.hpLeft);
  });

  it('costs the player something to be careless with, and that is the point', () => {
    // Casting through his raised guard trades health for tempo: it does
    // twice what a blocked sword does, but a sword into a guard BREAKS
    // it, and a broken guard is two turns he does not swing. Neither is
    // free and neither is always right — which is the sentence this
    // whole feature exists to make true.
    expect(results.MIXED.turns).toBeLessThanOrEqual(results.ATTACK_ONLY.turns);
    expect(results.MIXED.hpLeft).toBeLessThan(results.ATTACK_ONLY.hpLeft);
  });

  it('bracing is worth a turn now, instead of being a trap with a button', () => {
    // It was not. Guarding every fifth turn used to win this fight one
    // time in seven, because halving one blow never paid for a turn not
    // spent hurting him. It is what refills her, so the price of a
    // spell is a turn of his — which is the two of them being two
    // people rather than one person with a second button.
    expect(results.ATTACK_MAGIC_GUARD.winRate).toBeGreaterThanOrEqual(0.95);
    expect(results.ATTACK_MAGIC_GUARD.mpLeft).toBeGreaterThan(results.MAGIC_FIRST.mpLeft);
  });

  it('does not run her dry before the tutorial is over', () => {
    // She has to have enough for a player to work out what it is FOR.
    expect(results.MIXED.castsUsed).toBeGreaterThanOrEqual(3);
    expect(results.MAGIC_FIRST.castsUsed).toBeGreaterThanOrEqual(6);
  });

  it('still shows him being a person on the way down', () => {
    for (const [name, r] of Object.entries(results)) {
      expect(r.phasesSeen, `${name} phases`).toBeGreaterThanOrEqual(1.9);
      expect(r.staggersSeen, `${name} staggers`).toBeGreaterThanOrEqual(1);
    }
  });

  it('reports its numbers, because they are the point', () => {
    for (const [name, r] of Object.entries(results)) {
      // eslint-disable-next-line no-console
      console.log(
        `${name.padEnd(19)} win ${(r.winRate * 100).toFixed(1)}%  turns ${r.turns.toFixed(1)}` +
          `  ~${r.seconds.toFixed(0)}s  hp ${r.hpLeft.toFixed(0)}  mp ${r.mpLeft.toFixed(0)}` +
          `  casts ${r.castsUsed.toFixed(1)}  phases ${r.phasesSeen.toFixed(2)}` +
          `  staggers ${r.staggersSeen.toFixed(2)}`,
      );
    }
    expect(Object.keys(results)).toHaveLength(4);
  });
});
