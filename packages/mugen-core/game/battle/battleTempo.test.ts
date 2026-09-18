// HOW LONG A FIGHT IS, measured rather than guessed.
//
// The target from the design round: a normal fight 45–90 seconds, a
// fight that carries the story 2–4 minutes. Seconds are not something a
// unit test can see, so what is pinned here is the thing seconds are
// made of — how many turns the player takes — together with the number
// used to convert. If a fight is retuned and this fails, the fix is the
// numbers in content, not the band here.

import { describe, it, expect } from 'vitest';
import { createBattle, playerAttack, type BattleState } from './battleLogic';
import { specOf } from './enemySpec';
import { MOSS_RABBIT } from '../../content/enemies/species';
import { GALD_BATTLE } from '../../content/enemies/galdBattle';

/**
 * About how long one exchange takes on screen.
 *
 * A tap, the blow, the creature's answer, and long enough to read the
 * line. Measured off the prototype's own beat timings (320–560ms of
 * animation) plus the reading time a player actually takes.
 */
const SECONDS_PER_TURN = 4;

/** A die that always rolls the middle: an average fight, not a lucky one. */
const evenRng = () => 0.5;

function fightLength(spec: Parameters<typeof createBattle>[0], rng = evenRng): number {
  let state: BattleState = createBattle(spec);
  let turns = 0;
  while (state.outcome === 'ONGOING' && turns < 200) {
    state = playerAttack(state, rng);
    turns += 1;
  }
  return turns;
}

describe('a fight with a moss rabbit', () => {
  const turns = fightLength(specOf(MOSS_RABBIT));

  it('is not over before the music has started', () => {
    // The whole point of the retune. At 22 health this was 2–3 taps.
    expect(turns).toBeGreaterThanOrEqual(11);
  });

  it('does not outstay itself either', () => {
    expect(turns).toBeLessThanOrEqual(18);
  });

  it('lands inside the 45–90 second band it was aimed at', () => {
    const seconds = turns * SECONDS_PER_TURN;
    expect(seconds).toBeGreaterThanOrEqual(45);
    expect(seconds).toBeLessThanOrEqual(90);
  });

  it('is winnable on a bad run and on a good one, and never free', () => {
    // A die that rolls high hurts the player more AND kills the creature
    // faster; a die that rolls low does the opposite. Neither may turn a
    // first ordinary animal into something that beats you.
    for (const rng of [() => 0.01, () => 0.99]) {
      let state = createBattle(specOf(MOSS_RABBIT));
      while (state.outcome === 'ONGOING') state = playerAttack(state, rng);
      expect(state.outcome).toBe('VICTORY');
      expect(state.playerHp).toBeLessThan(state.playerMaxHp);
    }
  });

  it('is still winnable: the player is not the one who runs out', () => {
    let state = createBattle(specOf(MOSS_RABBIT));
    while (state.outcome === 'ONGOING') state = playerAttack(state, evenRng);
    expect(state.outcome).toBe('VICTORY');
    // And it costs something. A fight nobody can lose is not a fight.
    expect(state.playerHp).toBeLessThan(state.playerMaxHp);
  });
});

describe('a fight with Gald', () => {
  const turns = fightLength(GALD_BATTLE);

  it('is the long one: the story turns on it', () => {
    expect(turns).toBeGreaterThanOrEqual(19);
  });

  it('sits in the 90–150 second band, not the ordinary one', () => {
    // The design round's "強敵 / エリート" band rather than its boss
    // band. Two to four minutes of a man swinging a knife at a player
    // with a hundred health is not a longer fight, it is a fight the
    // player loses — so this is aimed at the top of elite and the
    // report says so rather than claiming the boss number.
    const seconds = turns * SECONDS_PER_TURN;
    expect(seconds).toBeGreaterThanOrEqual(90);
    expect(seconds).toBeLessThanOrEqual(150);
  });

  it('is longer than a fight with an animal in the same forest', () => {
    expect(turns).toBeGreaterThan(fightLength(specOf(MOSS_RABBIT)));
  });
});

describe('the shape of a fight, not just its length', () => {
  it('knocks the creature off its footing at least once on the way', () => {
    let state = createBattle(specOf(MOSS_RABBIT));
    let staggered = false;
    while (state.outcome === 'ONGOING') {
      state = playerAttack(state, evenRng);
      if (state.enemyStaggerTurns > 0) staggered = true;
    }
    expect(staggered, 'poise must actually break during a normal fight').toBe(true);
  });

  it('takes the creature through both of its phases, and says so once each', () => {
    let state = createBattle(specOf(MOSS_RABBIT));
    while (state.outcome === 'ONGOING') state = playerAttack(state, evenRng);
    const said = (line: string) => state.log.filter((l) => l === line).length;
    for (const phase of MOSS_RABBIT.phases ?? []) {
      expect(said(phase.line), `${phase.id} is entered and announced exactly once`).toBe(1);
    }
  });

  it('gives an enemy with no footing and no phases the fight it always had', () => {
    // Nothing here is retrospective: a plain spec still behaves plainly.
    const plain = { name: 'かかし', hp: 30, attackMin: 3, attackMax: 6 };
    let state = createBattle(plain);
    while (state.outcome === 'ONGOING') state = playerAttack(state, evenRng);
    expect(state.enemyStaggerTurns).toBe(0);
    expect(state.enemyPhaseId).toBeNull();
  });
});


/**
 * A fight the story has to come out of cannot be a coin flip.
 *
 * This is here because it was not, and nothing said so: at 4-8 damage
 * Gald beat an attack-only player one time in eighteen, and the only
 * symptom was a handful of end-to-end tests failing differently every
 * run. A rate like that is invisible in one playthrough and fatal in a
 * test suite — and worse for a player, who does not get a re-run.
 */
describe('a fight can be won by somebody who only attacks', () => {
  /** Deterministic, but a different draw every turn — not a fixed die. */
  function draws(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
  }

  function winRate(spec: Parameters<typeof createBattle>[0], runs = 300) {
    const rng = draws(20260906);
    let wins = 0;
    for (let r = 0; r < runs; r++) {
      let state = createBattle(spec);
      let turns = 0;
      while (state.outcome === 'ONGOING' && turns < 300) {
        state = playerAttack(state, rng);
        turns += 1;
      }
      if (state.outcome === 'VICTORY') wins += 1;
    }
    return wins / runs;
  }

  it('holds for the first animal anybody meets', () => {
    expect(winRate(specOf(MOSS_RABBIT))).toBe(1);
  });

  it('holds for the fight the four answers are on the other side of', () => {
    expect(winRate(GALD_BATTLE)).toBeGreaterThanOrEqual(0.99);
  });

  it('still costs the player most of what they had', () => {
    // Winnable is not the same as safe. If this ever passes with the
    // player near full health, the fight has stopped being one.
    const rng = draws(7);
    let state = createBattle(GALD_BATTLE);
    while (state.outcome === 'ONGOING') state = playerAttack(state, rng);
    expect(state.playerHp).toBeLessThan(state.playerMaxHp * 0.7);
  });
});
