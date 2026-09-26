// A SCENE PLAYED ON THE FIELD — the joint a skill's showing is drawn
// through (BattleStage `scene`), for a showing that needs more than the
// spell layer: somebody stepping in beside him, things arriving at the
// creature from every side.
//
// THE STAGE ONLY LENDS ITS PLACES. It measures where the creature and he
// stand when a scene starts, draws what the scene draws there, and marks
// the people with the words the scene gives it (for the scene's own
// stylesheet to act on). It decides nothing: a scene has no numbers, and
// the fight under it is not touched.
//
// Today only the debug preview plays them (src/dev/levi — STEP 5,
// src/dev/aria — STEP 7, src/dev/hero — STEP 9); the game's own fights
// pass none.

import type { ReactNode } from 'react';

/** A box on the field, as fractions of it (0 = left/top, 1 = right/bottom). */
export interface FieldBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where things stand when the scene starts. */
export interface FieldMarks {
  /** The field's size in pixels — for things that must not leave it. */
  stage: { width: number; height: number };
  /** The creature's drawing. */
  enemy: FieldBox;
  /** His drawing. */
  hero: FieldBox;
  /** Hers, when she is on the field. */
  kaos: FieldBox | null;
}

export interface FieldScene {
  /** Changes with every playing, so the places are measured again. */
  id: number;
  /** Put on the field as `data-scene`, for the scene's stylesheet. */
  name: string;
  /** Which step it is at — `data-scene-step` on the field and the layer over it. */
  step: string;
  /** He steps out of the way while it plays (v18 `is-suppressed`). */
  heroAside: boolean;
  /** What the creature is going through — `data-scene-enemy` on it. */
  enemy?: string;
  /** What he is going through, once back — `data-scene-hero` on him. */
  hero?: string;
  /**
   * Measures the scene's stylesheet needs (a distance, a point), set as
   * CSS variables on the field and on the layer over it — so it can move
   * the people themselves (`data-scene-hero` / `data-scene-enemy`)
   * without the stage knowing how.
   */
  vars?: (marks: FieldMarks) => Record<string, string>;
  /** Drawn on the field, among the people (under the HUD). */
  field?: (marks: FieldMarks) => ReactNode;
  /** Drawn over the field and the HUD, in the effects layer. */
  over?: (marks: FieldMarks) => ReactNode;
}
