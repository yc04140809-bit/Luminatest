// WHAT THE BATTLE HUD IS SHOWING.
//
// The arithmetic behind the four panels that sit over the battlefield:
// the turn order along the top left, the party column on the right, and
// the WORLD MEMORY panel in the bottom left corner. None of it touches
// React, so all of it can be read back by a test without a browser.
//
// The rule this file exists to keep is that the HUD says only what the
// fight actually knows. A turn order that lists somebody who does not
// take turns, or a depth meter that is a decorative number, is worse
// than no panel: it teaches the player to stop reading it.

import type { BattleArcana } from './battleArcana';

/** Which half of the field somebody belongs to. */
export type TurnSide = 'ALLY' | 'ENEMY';

/**
 * Somebody who takes turns.
 *
 * NOT everybody on the field. Kaos stands with the party and acts on
 * it — she intervenes, she casts — but she does not hold a place in the
 * order, so she is in the party column and not in this line. The day
 * she takes her own turn she becomes an entry here and nothing else in
 * this file changes.
 */
export interface TurnActor {
  id: string;
  name: string;
  side: TurnSide;
}

/** One face in the strip, and whether it is the one acting. */
export interface TurnSlot {
  actor: TurnActor;
  acting: boolean;
  /** How many full cycles ahead of the current turn this is. */
  round: number;
}

/**
 * The order, read left to right, starting from whoever is acting.
 *
 * The roster cycles: with two in it the strip is you, it, you, it, you,
 * which is exactly what the forest fight does. With four it is four
 * different faces before it comes round again, so a party of three plus
 * a creature needs no code here — only a longer roster.
 *
 * `length` is how many places the strip has room for. A roster longer
 * than that is not truncated in spirit: the strip shows the next
 * `length` turns, whoever they belong to.
 */
export function turnOrderLine(
  roster: readonly TurnActor[],
  actingIndex: number,
  length: number,
): TurnSlot[] {
  if (roster.length === 0 || length <= 0) return [];
  const start = ((Math.floor(actingIndex) % roster.length) + roster.length) % roster.length;
  const out: TurnSlot[] = [];
  for (let i = 0; i < Math.floor(length); i += 1) {
    const at = (start + i) % roster.length;
    out.push({
      actor: roster[at],
      acting: i === 0,
      round: Math.floor((start + i) / roster.length),
    });
  }
  return out;
}

/**
 * Whose turn the screen is currently drawing.
 *
 * A beat is a piece of theatre, and every piece of it belongs to one
 * side: the player's swing and her spell are the party's, and the
 * creature's charge, its hiding and the hero flinching from it are all
 * the creature's — being hit is something that happens DURING somebody
 * else's turn, not a turn of your own.
 *
 * Nothing playing means nothing is happening, and what happens next is
 * the player's move.
 */
const ENEMY_BEATS = new Set(['TACKLE', 'HIDE', 'HURT']);

export function actingSideOf(beat: string | null): TurnSide {
  return beat !== null && ENEMY_BEATS.has(beat) ? 'ENEMY' : 'ALLY';
}

/**
 * How deep this world's memory runs, as a whole percent.
 *
 * The average completion of the pages the player has anything of. It is
 * the book's own number rather than a new one: a page at 40% is 40% of
 * a memory rebuilt, and the depth of the world's memory is how much of
 * it has been put back together. An empty book is zero, which is the
 * honest reading of a player who has not collected anything yet.
 */
export function memoryDepth(arcana: readonly BattleArcana[]): number {
  if (arcana.length === 0) return 0;
  const total = arcana.reduce((sum, entry) => sum + Math.max(0, Math.min(100, entry.progress)), 0);
  return Math.round(total / arcana.length);
}

/**
 * HOW LONG A NAME MAY BE BEFORE IT IS CUT, and cut the same way for
 * everybody.
 *
 * The panels used to let CSS do this, which meant a name was cut at
 * whatever width its own panel happened to be — the creature's at one
 * length, a party member's at another, and both of them mid-character
 * with no mark to say anything was missing. A player reading 「盗賊 ガル」
 * cannot tell whether that is the whole name.
 *
 * So it is a rule instead, in characters, applied to every name on the
 * screen: ten through, and an ellipsis from the eleventh. Counted in
 * CODE POINTS rather than UTF-16 units, so a character outside the
 * basic plane counts as the one character it looks like.
 *
 * The stylesheet still ellipsises as a second net, for a name that is
 * short enough by this rule and still too wide for a narrow phone.
 */
export const NAME_LIMIT = 10;

export function displayName(name: string, limit: number = NAME_LIMIT): string {
  const cap = Math.max(0, Math.floor(limit));
  const glyphs = [...name];
  if (glyphs.length <= cap) return name;
  return `${glyphs.slice(0, cap).join('')}…`;
}

/** How many lines the corner panel has room for. */
export const MEMORY_ROWS = 4;

/**
 * The panel's lines: what is known, then what is not.
 *
 * Padded with 「？？？」 rather than left short, and the padding is the
 * point — an empty row is a row the player can still fill. What it must
 * never do is invent a line: everything above the question marks came
 * from the world, in the world's own words.
 */
export function memoryRows(known: readonly string[], rows: number = MEMORY_ROWS): string[] {
  const room = Math.max(0, Math.floor(rows));
  // Newest first: what just happened is what the player is looking for.
  const said = known.filter((line) => line.trim().length > 0).slice(-room).reverse();
  const out = said.slice(0, room);
  while (out.length < room) out.push('？？？');
  return out;
}
