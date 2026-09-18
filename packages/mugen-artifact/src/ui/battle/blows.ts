// EVERY BLOW OWNS ITS OWN DRAWING.
//
// A turn is not one blow. It is at least two today — the player's swing
// and the creature's answer — and it is meant to be more: a two-handed
// attack, a three-part combo, a spell that lands in stages, a boss that
// hits four times before it is anybody's turn again.
//
// It used to be ONE slot. The second blow of a turn overwrote the
// first's drawing, and worse, the FIRST one's clear timer went off in
// the middle of the second and took it off the screen: measured at ×1,
// the creature's damage number was drawn for 184ms of the 520 it is
// meant to have. Nothing was wrong with either blow. They were sharing
// one piece of paper.
//
// So a blow is a thing with a name — HIT_001, HIT_002 — and every blow
// on the field is in this list until it takes ITSELF off. A timer that
// belongs to HIT_001 cannot end HIT_002, because it does not know how
// to say anything except "HIT_001 is over". That is the whole idea, and
// it is the reason this is a list of records rather than a slot with a
// guard on it: a guard answers "is this still mine?", which is a
// question you have to remember to ask.
//
// Pure on purpose. No React, no timers, no DOM — the rule that broke is
// a rule about a list, and a rule about a list can be tested against
// one, two, three and thirty blows without opening a browser.

export type BlowSide = 'enemy' | 'hero';

export interface Blow {
  /** HIT_001, HIT_002 … never reused for the life of a fight. */
  id: number;
  /** Whose side of the field it landed on. */
  on: BlowSide;
  /** What it cost. Nought draws no number, and is still a blow. */
  amount: number;
}

/**
 * How many can be drawn at once before the oldest is dropped.
 *
 * Not a design limit — six blows on screen at once is already more than
 * anything planned — but a guarantee that a bug in a caller cannot grow
 * this list without end. The OLDEST goes, because the newest is the one
 * the player is looking at.
 */
export const MOST_BLOWS_AT_ONCE = 6;

/** One more blow on the field. */
export function landBlow(live: readonly Blow[], blow: Blow): Blow[] {
  const next = [...live.filter((b) => b.id !== blow.id), blow];
  return next.length > MOST_BLOWS_AT_ONCE ? next.slice(next.length - MOST_BLOWS_AT_ONCE) : next;
}

/**
 * That one is over.
 *
 * Named, and only that one. An id that is not on the field — because it
 * was already dropped, or because its fight ended around it — is not an
 * error and is not a reason to touch anybody else.
 */
export function endBlow(live: readonly Blow[], id: number): Blow[] {
  return live.some((b) => b.id === id) ? live.filter((b) => b.id !== id) : (live as Blow[]);
}

/** The most recent one on this side, which is the one being felt. */
export function latestOn(live: readonly Blow[], side: BlowSide): Blow | null {
  for (let i = live.length - 1; i >= 0; i--) if (live[i].on === side) return live[i];
  return null;
}

/**
 * Which of two identical motions this blow should use.
 *
 * A CSS animation does not begin again because the same class is put on
 * an element that already has it — so a second blow landing on somebody
 * who is still flinching from the first draws no flinch at all, which
 * is the "reaction was skipped" of a combo. Alternating between two
 * spellings of the same motion makes every blow a change, and a change
 * is what restarts it.
 */
export function motionSlot(blow: Blow | null): 'a' | 'b' | undefined {
  if (!blow) return undefined;
  return blow.id % 2 === 0 ? 'a' : 'b';
}
