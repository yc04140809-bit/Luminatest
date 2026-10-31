// WHAT A LEVEL IS ACTUALLY WORTH, IN A FIGHT.
//
// Levels existed for a round without touching anything: EXP went in, a
// number went up, and the next fight was exactly as hard. That is a
// counter, not growth. This is the one step that makes it growth, and
// it is deliberately ONE step.
//
// THE RULE THIS FILE LIVES BY: at level one it must produce, to the
// number, what the battle used to hard-code. 100 health, 48 magic,
// eight to twelve on a swing. Every fight that has ever been tuned —
// the moss rabbit's 124 health, its poise, its two phases, the bandit's
// guard — was tuned against those four numbers, and a growth curve
// whose first step quietly moves them has not added growth, it has
// retuned the whole game and called it a feature.
//
// WHOSE LEVEL DOES WHAT. The party is two people sharing one health
// bar and one pool of magic, which is a simplification the battle has
// made since it was written. So the sword's numbers follow HIS level
// and the magic follows HERS: he is the one swinging, she is the one
// casting, and both earn the same experience from the same fight so
// neither falls behind the other by accident.
//
// WHAT IS NOT HERE, ON PURPOSE: defence. Incoming damage is the
// creature's design space — a moss rabbit hits for two to five because
// that is what a frightened animal does, and the fight's shape comes
// from how long it can keep doing it. Quietly subtracting a number from
// every blow in the game would change the feel of every encounter
// already built, including the ones the poise and phase systems were
// balanced around. It is a real design decision and it deserves its own
// round rather than a line in this one.

/** What the party brings to a fight, once their levels are counted. */
export interface PartyStats {
  maxHp: number;
  maxMp: number;
  attackMin: number;
  attackMax: number;
}

/**
 * Level one, which is what the battle hard-coded before levels meant
 * anything. These four numbers are load-bearing: see the note above.
 */
export const BASE_STATS: PartyStats = {
  maxHp: 100,
  maxMp: 48,
  attackMin: 8,
  attackMax: 12,
};

/**
 * What one level adds.
 *
 * Small on purpose. A moss rabbit has 124 health and a swing is eight
 * to twelve, so a fight is eleven or twelve swings; one level makes it
 * ten or eleven. That is a difference a player can feel across a
 * couple of levels without any single level making the fight before it
 * look like a mistake.
 *
 * The swing's band stays five wide — both ends move together — so a
 * level never makes damage swingier, only better. A widening band
 * would mean high levels feel more random, which is the opposite of
 * what getting stronger should feel like.
 */
export const PER_LEVEL = {
  maxHp: 8,
  maxMp: 2,
  attack: 1,
} as const;

const levelsAbove = (level: number): number => {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.floor(level) - 1);
};

/**
 * The party's numbers for this fight.
 *
 * Pure, and derived every time rather than stored: a stat block in the
 * save would be a second copy of the truth that the level already
 * holds, and the two would disagree the first time this curve is
 * retuned. The save keeps experience; everything else is worked out
 * from it.
 */
export function statsForLevels(heroLevel: number, kaosLevel: number): PartyStats {
  const his = levelsAbove(heroLevel);
  const hers = levelsAbove(kaosLevel);
  return {
    maxHp: BASE_STATS.maxHp + PER_LEVEL.maxHp * his,
    maxMp: BASE_STATS.maxMp + PER_LEVEL.maxMp * hers,
    attackMin: BASE_STATS.attackMin + PER_LEVEL.attack * his,
    attackMax: BASE_STATS.attackMax + PER_LEVEL.attack * his,
  };
}

/** Repairs a stat block that came from somewhere untrusted. */
export function readStats(raw: unknown): PartyStats {
  if (!raw || typeof raw !== 'object') return BASE_STATS;
  const held = raw as Partial<PartyStats>;
  const at = (value: unknown, floor: number): number => {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= floor ? n : floor;
  };
  const attackMin = at(held.attackMin, BASE_STATS.attackMin);
  return {
    maxHp: at(held.maxHp, BASE_STATS.maxHp),
    maxMp: at(held.maxMp, BASE_STATS.maxMp),
    attackMin,
    attackMax: Math.max(attackMin, at(held.attackMax, BASE_STATS.attackMax)),
  };
}
