// PHYSICAL AND MAGIC — what a blow is made of, and what that means to
// the thing being hit.
//
// Until now every point of damage was the same kind of damage, so the
// only question a player ever had was "which button hits hardest". The
// moment there are two people on the field with two ways of hurting
// something, the interesting question becomes "which of us should do
// this one" — and that question only exists if the creature in front of
// you has an opinion about the answer.
//
// Everything here is pure and optional. An enemy written with no
// affinity at all takes both kinds exactly as it always did.

export type DamageType = 'PHYSICAL' | 'MAGIC';

/**
 * What a magic blow is made of.
 *
 * STAR is hers, and for a long time it was the only one — a table of
 * eight elements nobody had written enemies for would have been eight
 * things to balance and nothing to play with.
 *
 * The three below are the ones the world is going to need, and they are
 * here as NAMES and nothing else. There is no fire spell, no creature
 * that hates ice, and no rule anywhere that treats thunder specially:
 * what adding them buys is that a blow can now SAY what it is made of,
 * which is the one thing a screen and an affinity table both need
 * before either can be written. Everything that reads an element
 * already reads it through `affinityMultiplier` and `ELEMENT_LABEL`, so
 * the day a fire spell exists it is an entry in the spell table and a
 * fraction in one creature's affinity — not a change here.
 */
export type Element = 'STAR' | 'FIRE' | 'ICE' | 'THUNDER';

/** Every one of them, for anything that has to show the whole set. */
export const ELEMENTS: readonly Element[] = ['STAR', 'FIRE', 'ICE', 'THUNDER'];

/** What each is called where a player can read it. */
export const ELEMENT_LABEL: Record<Element, string> = {
  STAR: '星',
  FIRE: '炎',
  ICE: '氷',
  THUNDER: '雷',
};

/**
 * The class a screen hangs on an effect so the four look different.
 *
 * The whole of the visual foundation, deliberately: one class per
 * element, carrying a colour and nothing else. No particle system, no
 * per-element animation, no timeline — those are decisions for the day
 * somebody is looking at a fire spell, and guessing at them now would
 * mean throwing them away then. A blow with no element gets no class
 * and looks exactly as it always did.
 */
export function elementClass(element: Element | null | undefined): string {
  return element ? `el-${element.toLowerCase()}` : '';
}

/**
 * What a creature is tough against and what it is soft against.
 *
 * Written the way a designer talks about it — resistance and weakness,
 * as fractions — rather than as one multiplier, because "40% resistant
 * to physical, weak to star" is the sentence somebody says out loud and
 * a single number is not. They fold into one multiplier below; nothing
 * downstream sees the four fields.
 *
 * Every field is optional. Most creatures should have none.
 */
export interface EnemyAffinity {
  /** 0.4 = takes 40% less from swords. */
  physicalResistance?: number;
  magicResistance?: number;
  /** 0.5 = takes 50% more. */
  physicalWeakness?: number;
  magicWeakness?: number;
  elementResistance?: Partial<Record<Element, number>>;
  elementWeakness?: Partial<Record<Element, number>>;
}

/**
 * How far an affinity is allowed to move a number.
 *
 * The battle owns these, not the content: a creature that takes a
 * twentieth from swords is a creature the player cannot fight with the
 * character they have, and one that takes four times over is a creature
 * the fight is decided against before it starts. Content can say
 * "tough" and "soft"; it cannot say "immune" or "instantly".
 */
export const MIN_TAKEN = 0.25;
export const MAX_TAKEN = 2.5;

function fraction(value: number | undefined): number {
  return Number.isFinite(value) && (value as number) > 0 ? (value as number) : 0;
}

/**
 * What this creature multiplies a blow of this kind by.
 *
 * Resistance takes away and weakness adds, which is what the words
 * mean; a creature written with both simply ends up near 1, and that is
 * a reasonable thing to write about something armoured that hates
 * light. Element is folded on top of the kind, so "weak to magic AND
 * weak to star" stacks — up to the ceiling.
 */
export function affinityMultiplier(
  affinity: EnemyAffinity | null | undefined,
  type: DamageType,
  element: Element | null = null,
): number {
  if (!affinity) return 1;
  const resist = type === 'PHYSICAL' ? affinity.physicalResistance : affinity.magicResistance;
  const weak = type === 'PHYSICAL' ? affinity.physicalWeakness : affinity.magicWeakness;
  let m = (1 - fraction(resist)) * (1 + fraction(weak));
  if (element) {
    m *= 1 - fraction(affinity.elementResistance?.[element]);
    m *= 1 + fraction(affinity.elementWeakness?.[element]);
  }
  return Math.min(MAX_TAKEN, Math.max(MIN_TAKEN, m));
}

/**
 * WHAT A CREATURE THINKS OF HER LIGHT, in the three words a designer
 * uses.
 *
 * The multiplier above can express anything; this is the small vocabulary
 * a creature is actually written in. Three states and no more, because
 * the interesting question is "does the star matter here" and a creature
 * that takes 1.35× is a creature nobody can feel the difference in.
 *
 * Not a new system: it produces the affinity the battle has always
 * read, so nothing downstream — the damage, the log line, AUTO —
 * learns anything. It is a way of SAYING it, kept in one place so that
 * the numbers behind the three words are argued about once.
 */
export type StarAffinity = 'WEAK' | 'NORMAL' | 'RESIST';

/**
 * Half again, and half.
 *
 * Both of these are fractions in the sense the affinity uses: weakness
 * ADDS its fraction and resistance TAKES its fraction away, so a half
 * either way comes out as ×1.5 and ×0.5. Deliberately big — a creature
 * whose whole point is that the sword is the wrong tool has to be
 * obvious in one exchange, not in a spreadsheet.
 */
export const STAR_SHARE = 0.5;

/** The affinity for a creature written in those three words. */
export function starAffinity(kind: StarAffinity): EnemyAffinity {
  if (kind === 'WEAK') return { elementWeakness: { STAR: STAR_SHARE } };
  if (kind === 'RESIST') return { elementResistance: { STAR: STAR_SHARE } };
  // Which is what every creature is until somebody has a reason to
  // write otherwise. An empty opinion, not an absent one.
  return {};
}

/**
 * And back again, for a report that has to say which of the three a
 * creature is.
 *
 * Reads the multiplier rather than the fields, so a creature written
 * the long way round — or one that is soft to magic generally — is
 * still answered honestly.
 */
export function starAffinityOf(affinity: EnemyAffinity | null | undefined): StarAffinity {
  const read = readAffinity(affinityMultiplier(affinity, 'MAGIC', 'STAR'));
  return read === 'WEAK' ? 'WEAK' : read === 'RESISTED' ? 'RESIST' : 'NORMAL';
}

/**
 * Whether the creature in front of you would rather be hit by the other
 * one of you.
 *
 * Not used by the battle itself — it is for the log line that tells the
 * player their choice mattered, and for the AUTO brain that has to make
 * the same choice without being able to see the screen.
 */
export type AffinityRead = 'WEAK' | 'RESISTED' | 'PLAIN';

export function readAffinity(multiplier: number): AffinityRead {
  if (multiplier > 1.05) return 'WEAK';
  if (multiplier < 0.95) return 'RESISTED';
  return 'PLAIN';
}
