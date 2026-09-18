import { describe, it, expect } from 'vitest';
import {
  NORMAL_ENEMY_STORY_TRIGGER_CONFIG,
  mintIndividualId,
  rollIndividualStory,
  storyTriggerChance,
} from './enemyEncounters';

describe('storyTriggerChance', () => {
  it('starts low and climbs the longer nobody has turned up', () => {
    const chances = [1, 2, 3, 4, 5].map((n) => storyTriggerChance(n));
    expect(chances).toEqual([0.1, 0.15, 0.25, 0.4, 0.6]);
    for (let i = 1; i < chances.length; i++) {
      expect(chances[i]).toBeGreaterThan(chances[i - 1]);
    }
  });

  it('is certain once the run has gone on too long', () => {
    expect(storyTriggerChance(8)).toBe(1);
    expect(storyTriggerChance(20)).toBe(1);
  });

  it('is nothing before the first victory', () => {
    expect(storyTriggerChance(0)).toBe(0);
  });
});

describe('rollIndividualStory', () => {
  it('can be settled without the dice, for testing each route', () => {
    expect(rollIndividualStory({ victoriesSinceStory: 1, forced: true, rng: () => 0.99 })).toBe(true);
    expect(rollIndividualStory({ victoriesSinceStory: 20, forced: false, rng: () => 0 })).toBe(false);
  });

  it('follows the rate for the run so far', () => {
    // First victory: 10%.
    expect(rollIndividualStory({ victoriesSinceStory: 1, rng: () => 0.09 })).toBe(true);
    expect(rollIndividualStory({ victoriesSinceStory: 1, rng: () => 0.11 })).toBe(false);
    // Fourth: 40%.
    expect(rollIndividualStory({ victoriesSinceStory: 4, rng: () => 0.39 })).toBe(true);
    expect(rollIndividualStory({ victoriesSinceStory: 4, rng: () => 0.41 })).toBe(false);
  });

  it('never lets a player fight for ever and meet nobody', () => {
    // The worst dice imaginable, every single time.
    const rng = () => 0.999999;
    let run = 0;
    let met = 0;
    for (let fight = 0; fight < 40; fight++) {
      run += 1;
      if (rollIndividualStory({ victoriesSinceStory: run, rng })) {
        met += 1;
        run = 0;
      }
    }
    expect(met).toBeGreaterThan(0);
    // And the wait is never longer than the mercy rule allows.
    expect(run).toBeLessThan(NORMAL_ENEMY_STORY_TRIGGER_CONFIG.guaranteedAt);
  });

  it('is rare at first with ordinary dice, not a coin flip', () => {
    let met = 0;
    let run = 0;
    let i = 0;
    // A fixed, unremarkable sequence of rolls.
    const rng = () => ((i = (i * 9301 + 49297) % 233280), i / 233280);
    for (let fight = 0; fight < 300; fight++) {
      run += 1;
      if (rollIndividualStory({ victoriesSinceStory: run, rng })) {
        met += 1;
        run = 0;
      }
    }
    // Roughly one in three or four fights, not most of them.
    expect(met).toBeLessThan(150);
    expect(met).toBeGreaterThan(30);
  });
});

describe('mintIndividualId', () => {
  it('names them in order, species first', () => {
    expect(mintIndividualId('moss_rabbit', 0)).toBe('moss_rabbit_001');
    expect(mintIndividualId('moss_rabbit', 1)).toBe('moss_rabbit_002');
    expect(mintIndividualId('moss_rabbit', 41)).toBe('moss_rabbit_042');
  });
});
