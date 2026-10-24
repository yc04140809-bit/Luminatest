// WORLD NEWS — what the village is talking about today.
//
// FOUR FIFTHS OF IT IS NOTHING, and that is the design rather than a
// budget problem. A world where every overheard line turns out to
// matter is not a living world, it is a puzzle box: the player learns
// within an hour to treat every sentence as a clue, and the moment they
// do, the village stops being a place and becomes a list of things to
// check. 「村長のニワトリがまた逃げた」 has to be allowed to be a chicken.
//
// SO NOISE CANNOT BE PROMOTED. Not "we promise not to", not "we would
// have to remember not to" — it cannot, because a NOISE item has
// nowhere to put a consequence. The two kinds of news below are a
// discriminated union, and only one of them has the fields that tie a
// line to the world. Retro-fitting a chicken into foreshadowing would
// mean changing this file, which is exactly the amount of friction that
// decision deserves.
//
// AND THE PLAYER IS TOLD NOTHING ABOUT WHICH IS WHICH. No icon, no
// colour, no ordering, no 「！」. What reaches a screen is a sentence.
// Everything else here is for the author.

/**
 * How much a line is worth, INTERNALLY.
 *
 * Never rendered, never returned to a screen, never used to sort what
 * the player sees. It exists so that an author can ask "is the world
 * saying anything at the moment" without playing for an hour.
 */
export type NewsImportance = 'NOISE' | 'MURMUR' | 'TALK';

/**
 * SOMETHING THAT IS JUST TRUE OF A TUESDAY.
 *
 * Note what this type does not have: no seed, no vine, no actor id, no
 * propagation, no importance beyond the constant below. There is no
 * field on it that anything downstream could read, which is the whole
 * guarantee — a chicken cannot acquire a meaning it was not written
 * with, because there is nowhere to write one.
 */
export interface NoiseNews {
  kind: 'NOISE';
  id: string;
  /** What somebody says. The entire content of the item. */
  text: string;
}

/** What everything in `NoiseNews` is worth, and it is the only value it can be. */
export const NOISE_IMPORTANCE: NewsImportance = 'NOISE';

/**
 * SOMETHING THE WORLD IS ACTUALLY DOING, said the way a village says it.
 *
 * Always a rumour and never a report. 「アルデン村の少女が夜に魔法の練習を
 * しているらしい」 is what a neighbour noticed; the seed, its strength
 * and whose it is stay on this side of the screen. A line that named a
 * mechanism would be the engine talking to the player, and the engine
 * does not talk to the player.
 */
export interface SignalNews {
  kind: 'SIGNAL';
  id: string;
  text: string;
  /** Internal. Never rendered and never used to order what is shown. */
  importance: NewsImportance;
  /** Which seed being alive is why this is being said. Internal. */
  seedEffect?: { npcId: string; type: string };
  /** Which line between two people it came out of. Internal. */
  vineEffect?: { source: string; target: string };
  /**
   * How likely this is to be the thing that travels, 0..1. Internal.
   *
   * CURRENTLY UNUSED BY ANY LOGIC — deliberately, and it is not dead
   * code to be tidied away. Nothing reads this value except GOD VIEW,
   * which prints it; no rumour reaches another town yet.
   *
   * It is written now because it can only be written well now. The
   * question "would this story travel" is answered by whoever writes
   * the line — a man drinking with the guard who used to hunt him
   * travels, a girl doing something odd at night does not — and coming
   * back to a hundred finished lines later to guess at it in bulk is
   * how a world ends up with a hundred identical numbers.
   *
   * DO NOT DELETE as unused. The day rumours propagate between regions,
   * this is the field that decides which ones.
   */
  propagationPotential?: number;
}

export type NewsItem = NoiseNews | SignalNews;

/**
 * ONE LINE, AS THE PLAYER RECEIVES IT.
 *
 * The whole of the public shape, and deliberately not `NewsItem`: a
 * screen cannot accidentally render an importance it was never given,
 * and a test can assert that nothing internal crossed the line by
 * checking the keys rather than by reading the rendering.
 */
export interface PlayerNews {
  id: string;
  text: string;
}

/** What a screen is allowed to know. Strips everything else. */
export function forPlayer(item: NewsItem): PlayerNews {
  return { id: item.id, text: item.text };
}
