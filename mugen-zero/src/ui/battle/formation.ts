// WHERE THE PARTY STANDS.
//
// One table, read by the party layer and by nothing else. A slot is a
// place on the field, not a character: who occupies it comes from the
// roster, and the roster's length is what picks the row below.
//
// This is the whole of "a third member does not need new code". Adding
// somebody is adding them to the party; where they stand is already
// written down here.

/** One standing place, said in shares of the field rather than pixels. */
export interface SlotPlacement {
  /**
   * How far in from the party's own edge of the field, as a share of
   * its width. Zero is hard against the edge.
   */
  inset: number;
  /** How far off the ground line, as a share of the field's height. */
  bottom: number;
  /** Drawing order. Higher is nearer the viewer. */
  depth: number;
}

/** As many as a fight is drawn for. */
export const MAX_PARTY = 4;

/**
 * The formations, one row per party size.
 *
 * TWO IS THE MEASURED ONE. Its numbers are the ones the landscape pass
 * settled on — 25% in and on the ground for the front rank, hard
 * against the edge and a step up the path for the back — and they are
 * fixed by a test so this table can grow without moving anybody who is
 * already standing correctly.
 *
 * One, three and four are PROVISIONAL: the shape is right (a front rank
 * nearest the enemy, the rest stepped back and up the path) but the
 * exact numbers are for whoever draws the fight that first needs them.
 * They are here so that day is a change to this table and to nothing
 * else.
 */
export const PARTY_FORMATIONS: Readonly<Record<number, readonly SlotPlacement[]>> = {
  1: [{ inset: 0.16, bottom: 0.03, depth: 1 }],
  2: [
    { inset: 0.25, bottom: 0.03, depth: 2 },
    { inset: 0.0, bottom: 0.13, depth: 1 },
  ],
  3: [
    { inset: 0.3, bottom: 0.02, depth: 3 },
    { inset: 0.09, bottom: 0.11, depth: 2 },
    { inset: 0.0, bottom: 0.2, depth: 1 },
  ],
  4: [
    { inset: 0.34, bottom: 0.02, depth: 4 },
    { inset: 0.15, bottom: 0.09, depth: 3 },
    { inset: 0.06, bottom: 0.17, depth: 2 },
    { inset: 0.0, bottom: 0.25, depth: 1 },
  ],
};

/**
 * The places for a party of this size.
 *
 * A count outside the table is not a crash: one is the smallest fight
 * that can be drawn and four is the largest that has places, so a
 * roster longer than that stands in the four places and the layer draws
 * the ones it has room for.
 */
export function partyFormation(count: number): readonly SlotPlacement[] {
  const n = Math.min(MAX_PARTY, Math.max(1, Math.floor(count)));
  return PARTY_FORMATIONS[n];
}
