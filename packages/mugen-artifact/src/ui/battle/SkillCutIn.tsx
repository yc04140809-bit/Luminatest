// THE CUT-IN — a face, a name, and back to the fight.
//
// A QUARTER OF A SECOND TO NOT QUITE HALF, and the brevity is the
// design rather than a limitation of it: a cut-in is punctuation. It
// says "this one is hers" and gets out of the way. Anything longer
// stops being emphasis and starts being a thing the player waits
// through on the twentieth cast, and the only way a fight survives
// that is a skip button, which is an admission that the animation was
// too long.
//
// WHAT IS HERE IS THE FOUNDATION. The art is not: `CUT_IN_PORTRAITS`
// is empty and a character with no portrait gets the band, the name
// and the sweep without a face in it — which is a real cut-in, just a
// plain one. Adding a face is adding a file and a line to that map,
// and nothing about this component, the battle or any test changes.

import type { CSSProperties } from 'react';

/** How long the whole thing is on screen, at normal speed. */
export const CUT_IN_MS = 380;

export interface CutIn {
  /** Who it is. Also the key into the portrait map. */
  actorId: string;
  /** What they are doing, in their own words. */
  skillName: string;
  /** A second line, for what it does. Optional. */
  note?: string;
}

/**
 * A face per character, when there is one.
 *
 * DELIBERATELY EMPTY. Every entry is a real drawing somebody has to
 * make, and an entry pointing at a stand-in would be a promise the
 * screen keeps badly: the band would show a placeholder face to a
 * player who has no way of knowing it is one. No entry shows no face,
 * which is honest and still reads as a cut-in.
 */
export const CUT_IN_PORTRAITS: Readonly<Record<string, string>> = {};

/** Whether a character has a face for this yet. */
export function cutInPortrait(actorId: string): string | null {
  return CUT_IN_PORTRAITS[actorId] ?? null;
}

/**
 * One cut-in, played.
 *
 * Rendered with a key by the caller — a new cut-in is a new element —
 * so nothing here has to reset itself, and a second skill cast before
 * the first has finished replaces it instead of overlapping it.
 *
 * `pointer-events: none` throughout: it is over the commands for a
 * moment and must not eat a tap meant for them. A player who presses
 * 攻撃 during a cut-in has pressed 攻撃.
 */
export function SkillCutIn({ cut, ms = CUT_IN_MS }: { cut: CutIn; ms?: number }) {
  const face = cutInPortrait(cut.actorId);
  return (
    <div
      className="bp-cutin"
      data-testid="bp-cutin"
      data-actor={cut.actorId}
      aria-hidden="true"
      style={{ ['--cutin-ms' as string]: `${ms}ms` } as CSSProperties}
    >
      <span className="bp-cutin-sweep" />
      <span className="bp-cutin-band">
        {face && <img className="bp-cutin-face" src={face} alt="" />}
        <span className="bp-cutin-words">
          <b className="bp-cutin-name" data-testid="bp-cutin-name">
            《{cut.skillName}》
          </b>
          {cut.note && <i className="bp-cutin-note">{cut.note}</i>}
        </span>
      </span>
    </div>
  );
}
