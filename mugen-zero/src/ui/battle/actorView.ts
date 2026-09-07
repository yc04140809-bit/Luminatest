// ONE CHARACTER, AS THE FIELD NEEDS THEM.
//
// Not a character: a view of one, for one frame. It carries the picture
// the art layer already chose rather than the name of a state, which is
// what keeps this type — and the component that draws it — free of any
// knowledge of whether the character is in the party or fighting it.
// The party layer builds these from the party registry; an enemy group
// would build them from the enemy registry, and neither has to teach
// the other anything.

import type { ResolvedArt } from '../../core/art/artStates';

export interface ActorView<S extends string = string> {
  /** Who this is. The art id and the spriteFrames id are the same one. */
  id: string;
  /** Their name, for the placeholder when a picture is missing. */
  label: string;
  /** What the art layer answered. Never a filename, never a state name. */
  art: ResolvedArt<S>;
  /** Which way they look on this screen. */
  face: 'left' | 'right';
  testId: string;
  /**
   * The brief thing happening to them right now, as a class name —
   * 'strike' while a blow of theirs lands, and nothing the rest of the
   * time. One name rather than a machine: the fight has one beat at a
   * time and always has.
   */
  beat?: string | null;
  /** Out of the fight. No drawing for it yet; the flag is the hook. */
  downed?: boolean;
  /** Being pointed at by a command. Likewise. */
  targeted?: boolean;
}
