// UNKNOWN — a page for something the player has seen and cannot name.
//
// This is not an ARCANA that is 0% built. It is a different kind of
// row entirely, and keeping the two apart is the whole point of this
// file existing separately from arcanaDefs.ts:
//
//   an ARCANA     is something the player is coming to know, and can
//                 finish. It has conditions, a percentage and a book
//                 entry that grows.
//   an UNKNOWN    is something the player observed for one second. It
//                 has no percentage, nothing to do, and no way to
//                 finish it. Seeing it is not obtaining it.
//
// One day the world will actually contain whatever this was, and the
// player will meet it properly. At that point this row becomes an
// ARCANA — see `identifiesAs`, which is the only thing here that
// points forward and the only place that change will have to touch.
// Nothing today reads it.

import type { ArcanaVisual } from '../../core/arcana/arcana';

export interface UnknownArcanaDef {
  arcanaId: string;
  /** What the book calls it, which is not a name. */
  label: string;
  /** The one line the book says about it. */
  note: string;
  /**
   * Its picture, when one exists.
   *
   * Null, today, and null on purpose: there is no drawing of this
   * thing, and the rule of this project is that art is delivered, not
   * improvised. A shape drawn in CSS, an emoji, a recoloured moss
   * rabbit or a letter standing in for a creature would all be a lie
   * about what the player saw — and the one thing this feature is
   * testing is whether what they saw was worth wondering about.
   *
   * So the frame is built and the slot is empty. When the drawing
   * arrives this becomes a visual and nothing else changes.
   */
  visual: ArcanaVisual | null;
  /**
   * The ARCANA this becomes when the world finally contains it.
   *
   * Recorded, unread, unimplemented. The change it describes —
   * UNKNOWN → IDENTIFIED — is a later phase, and this field is here so
   * that phase knows where to start rather than having to guess what
   * an old save meant.
   */
  identifiesAs: string | null;
}

export const UNKNOWN_001: UnknownArcanaDef = {
  arcanaId: 'unknown_001',
  label: '？？？？？？？',
  note: '知らない記憶が、一瞬だけ混ざった。',
  visual: null,
  identifiesAs: null,
};

export const UNKNOWN_ARCANA_DEFS: readonly UnknownArcanaDef[] = [UNKNOWN_001];

export function unknownArcanaDef(arcanaId: string): UnknownArcanaDef | null {
  return UNKNOWN_ARCANA_DEFS.find((def) => def.arcanaId === arcanaId) ?? null;
}
