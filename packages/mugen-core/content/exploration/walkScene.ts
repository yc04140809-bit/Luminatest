// A PLACE WALKED THROUGH — the App's exploration template.
//
// Not a map. One screen, walked from right to left, with a handful of
// things along the way worth stopping at. What the place IS lives here
// as data — its painting, where along it the things are, and what is
// said of them — and the App draws any place given in this shape the
// same way. The forest is the first; a road, a ruin or a cave is another
// entry, not another screen.
//
// WHAT THE WORLD HAS COME TO, NOT WHAT THE SCREEN REMEMBERS. Any line
// may carry a condition on what the player knows (`getKnownEvents` — the
// player's own WORLD MEMORY), so the same tree can say one thing before
// the four answers and another after. Conditions only READ: walking,
// looking and stopping write nothing to the world, and nothing here can.

import type { MemoryEventType } from '../../core/memory/types';

/** What must be true of the world for a line to be the one said. */
export type WalkCondition =
  /** The player knows at least one of these happened. */
  | { kind: 'KNOWN'; types: readonly MemoryEventType[] }
  /** The player knows none of these happened. */
  | { kind: 'NOT_KNOWN'; types: readonly MemoryEventType[] }
  /** At least this many days into the world. */
  | { kind: 'DAY_AT_LEAST'; day: number };

/** A line, said only when its condition holds (always, without one). */
export interface WalkLine {
  text: string;
  when?: WalkCondition;
}

/** Something along the way worth stopping at. */
export interface WalkPoint {
  id: string;
  /** What it is called on the 「調べる」 control. */
  label: string;
  /**
   * Where it is in the place's painting, as fractions of its width and
   * height — the painting's own coordinates, so it stays on the thing it
   * names on every screen.
   */
  at: { x: number; y: number };
  /**
   * What looking at it says. The first line whose condition holds wins,
   * so put the most particular first and an unconditional one last.
   */
  lines: readonly WalkLine[];
}

/** The ambient things a place can do, drawn by the App. */
export type WalkAmbience = 'BIRDS' | 'LEAVES' | 'MOTES';

/** A figure seen in the distance, while a condition holds. */
export interface WalkFigure {
  id: string;
  at: { x: number; y: number };
  when?: WalkCondition;
}

export interface WalkSceneDef {
  id: string;
  title: string;
  /** Things along the way, in any order; the App walks them right to left. */
  points: readonly WalkPoint[];
  /**
   * Short lines the place says as the player walks — never explanation,
   * only what can be smelt, heard or noticed. Picked in a fresh order
   * each visit from those whose condition holds.
   */
  ambientLines: readonly WalkLine[];
  /** Which of the App's ambient touches may appear; some are left out at random. */
  ambience: readonly WalkAmbience[];
  /** Figures seen in the distance, while their condition holds. */
  figures?: readonly WalkFigure[];
}

/** What a condition is asked against: what the player knows, and when it is. */
export interface WalkWorldView {
  known: ReadonlySet<string>;
  day: number;
}

export function walkConditionHolds(when: WalkCondition | undefined, view: WalkWorldView): boolean {
  if (!when) return true;
  switch (when.kind) {
    case 'KNOWN':
      return when.types.some((t) => view.known.has(t));
    case 'NOT_KNOWN':
      return !when.types.some((t) => view.known.has(t));
    case 'DAY_AT_LEAST':
      return view.day >= when.day;
  }
}

/** The line a point says in this world, or null if none applies. */
export function pointLine(point: WalkPoint, view: WalkWorldView): string | null {
  return point.lines.find((l) => walkConditionHolds(l.when, view))?.text ?? null;
}

/** The ambient lines that apply in this world, in their written order. */
export function ambientLinesFor(scene: WalkSceneDef, view: WalkWorldView): string[] {
  return scene.ambientLines.filter((l) => walkConditionHolds(l.when, view)).map((l) => l.text);
}

/** The distant figures present in this world. */
export function figuresFor(scene: WalkSceneDef, view: WalkWorldView): WalkFigure[] {
  return (scene.figures ?? []).filter((f) => walkConditionHolds(f.when, view));
}
