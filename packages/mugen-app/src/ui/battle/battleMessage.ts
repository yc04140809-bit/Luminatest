// WHAT THE FIGHT SAYS, IN AS FEW WORDS AS IT CAN SAY IT.
//
// The battle log is written by battleLogic in whole Japanese sentences
// — 「攻撃！ モスラビットに12のダメージ。」 — and that is right for a
// log: it is a record, and a record should read. It is wrong for a
// plate over a battlefield, where a sentence is something the player
// must stop and READ while the thing the sentence is about is happening
// in front of them.
//
// So this is the READING of a log line, not a replacement for it. The
// log keeps its own words; nothing in battleLogic changes, and the
// same sentence still goes to anything that wants the record. What the
// plate gets is the two things an eye can take without stopping:
//
//   a LEAD   — a few characters saying what happened
//   a FIGURE — the number, if there is one
//
// Both are optional and neither is ever a sentence. A line with nothing
// in it worth extracting comes back as its own first clause, clipped —
// which is still shorter than the sentence, and never wrong.

import { displayName } from './battleHud';

/** How many characters of a lead the plate will hold before clipping. */
export const LEAD_LIMIT = 10;

export interface BattleSay {
  /** A few characters saying what happened. */
  lead: string;
  /** The number, in the one form an eye can catch. */
  figure?: string;
}

/** 「……に12のダメージ。」「防御して6のダメージ。」 */
const DAMAGE = /(\d+)のダメージ/;
/** 「HPが20回復した。」 */
const HEAL = /HPが(\d+)回復/;
/** 「モスラビットが現れた！」「ガルドが立ちはだかった。」 */
const ARRIVES = /^(.+?)が(?:現れた|飛び出してきた|立ちはだかった|立ちふさがった)/;
/** 「モスラビットは膝をついた……。」 */
const FALLS = /^(.+?)は膝をついた/;
/** A name in its own brackets, which is always the subject of its line. */
const NAMED = /《([^》]+)》/;

function tooLong(text: string): boolean {
  return [...text].length > LEAD_LIMIT;
}

/** The first clause, without the punctuation that ended it. */
function firstClause(line: string): string {
  const end = line.search(/[！。、!]/);
  return (end === -1 ? line : line.slice(0, end)).trim();
}

/**
 * One log line, read as a plate.
 *
 * Nothing here knows about the fight — it is given a string and gives
 * back at most two short ones, which is why it can be tested against
 * every sentence the game writes without a battle existing.
 */
export function sayOf(line: string | undefined | null): BattleSay | null {
  if (!line) return null;
  const said = line.trim();
  if (said === '') return null;

  const damage = DAMAGE.exec(said);
  const heal = HEAL.exec(said);
  const figure = damage
    ? `${damage[1]} DAMAGE`
    : heal
      ? `${heal[1]} HEAL`
      : undefined;

  // WHO, when the line is about somebody arriving or going down. Their
  // name alone is the whole of it: 「モスラビットが現れた！」 tells the
  // player nothing 「モスラビット」 does not, and one of them can be
  // read without stopping.
  const arrives = ARRIVES.exec(said);
  if (arrives) return { lead: displayName(arrives[1], LEAD_LIMIT) };
  const falls = FALLS.exec(said);
  if (falls) return { lead: displayName(falls[1], LEAD_LIMIT), figure: 'DOWN' };

  // Otherwise the first clause, which is the part that says what was
  // done: 「攻撃」 out of 「攻撃！ モスラビットに12のダメージ。」.
  let lead = firstClause(said);

  // Too long to take at a glance, and there are two better answers
  // before clipping it in the middle of a word.
  if (tooLong(lead)) {
    // A line with a 《》 in it is a line about that thing.
    const named = NAMED.exec(said);
    if (named) lead = `《${named[1]}》`;
  }
  if (tooLong(lead)) {
    // 「モスラビットのリーフタックル」 -> 「リーフタックル」. WHOSE move
    // it is, is not news: there are two of them on the field and one of
    // them is mid-swing. What it was, is.
    const owned = lead.indexOf('の');
    if (owned > 0 && owned < lead.length - 1) lead = lead.slice(owned + 1);
  }

  return { lead: displayName(lead, LEAD_LIMIT), figure };
}
