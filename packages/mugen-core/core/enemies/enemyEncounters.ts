// SPECIES AND INDIVIDUALS — when an ordinary enemy turns out to be
// somebody.
//
// A moss rabbit is a kind of animal, not a character. Beating one, or
// killing one, changes nothing about whether there are moss rabbits in
// Greenwood — so an ordinary encounter leaves no trace in WORLD MEMORY
// and no name behind.
//
// Now and then one of them is different: this one has a story, and the
// player is given the four answers. That moment is what this module
// decides. Deliberately NOT a gacha: the player is never shown a rate,
// there is no currency and nothing is bought. It is a chance of meeting
// somebody, rising the longer it has not happened, with a ceiling so a
// long run of ordinary fights cannot go on for ever.
//
// Pure. No world, no storage, no React.

export type Rng = () => number;

export interface StoryTriggerConfig {
  /**
   * The chance on the 1st, 2nd, 3rd… ordinary victory since the last
   * time somebody turned up. Hypotheses for a playtest, not a design:
   * change them here and nothing else moves.
   */
  rates: readonly number[];
  /** The chance once past the end of the table. */
  beyond: number;
  /**
   * The mercy rule. At this many ordinary victories in a row it happens
   * whatever the dice say, so twenty fights can never pass with nothing.
   */
  guaranteedAt: number;
}

export const NORMAL_ENEMY_STORY_TRIGGER_CONFIG: StoryTriggerConfig = {
  rates: [0.1, 0.15, 0.25, 0.4],
  beyond: 0.6,
  guaranteedAt: 8,
};

/**
 * The chance that THIS victory is the one, given how many ordinary ones
 * came before it without a story.
 *
 * `victoriesSinceStory` counts this victory too: the first ever fight
 * passes 1.
 */
export function storyTriggerChance(
  victoriesSinceStory: number,
  config: StoryTriggerConfig = NORMAL_ENEMY_STORY_TRIGGER_CONFIG,
): number {
  if (victoriesSinceStory <= 0) return 0;
  if (victoriesSinceStory >= config.guaranteedAt) return 1;
  return config.rates[victoriesSinceStory - 1] ?? config.beyond;
}

export interface StoryRollOptions {
  victoriesSinceStory: number;
  rng?: Rng;
  config?: StoryTriggerConfig;
  /** Development only: settle it without the dice. */
  forced?: boolean | null;
}

/** Whether this victory turns an animal into somebody. */
export function rollIndividualStory(options: StoryRollOptions): boolean {
  if (options.forced === true) return true;
  if (options.forced === false) return false;
  const chance = storyTriggerChance(options.victoriesSinceStory, options.config);
  if (chance >= 1) return true;
  if (chance <= 0) return false;
  return (options.rng ?? Math.random)() < chance;
}

/**
 * The name this one will be known by.
 *
 * `moss_rabbit_001`: the species is in the id on purpose, so that a
 * fact in WORLD MEMORY stays readable years later without a lookup
 * table having to have survived beside it.
 */
export function mintIndividualId(speciesId: string, alreadyNamed: number): string {
  return `${speciesId}_${String(alreadyNamed + 1).padStart(3, '0')}`;
}
