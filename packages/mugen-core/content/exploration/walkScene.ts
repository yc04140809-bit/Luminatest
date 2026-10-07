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
   * WHERE ITS 「！」 STANDS — on the thing itself, in the painting's own
   * coordinates: the bottom tip of the mark. The banner's is under the
   * banner, the steps' on the steps, not down on the floor where `at`
   * puts the walk. Absent means just above `at`.
   */
  marker?: { x: number; y: number };
  /**
   * WHERE THE PARTY STANDS TO LOOK AT IT, on a place walked in two
   * dimensions (`roam`): a spot on the floor a little to the thing's
   * right, so the one looking never stands in front of its 「！」.
   * Absent means `at`, brought onto the floor.
   */
  stand?: { x: number; y: number };
  /**
   * What looking at it says. The first line whose condition holds wins,
   * so put the most particular first and an unconditional one last.
   */
  lines: readonly WalkLine[];
  /**
   * Whether the thing is there at all. Absent means always: a trace that
   * belongs to one moment of the world — fresh footprints, say — is
   * only on the ground while that moment lasts.
   */
  when?: WalkCondition;
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
  /**
   * WHICH PART OF THE PAINTING THE SCREEN SHOWS, top to bottom: 0 keeps
   * its top edge, 1 (the default) its bottom edge. A landscape screen
   * always crops a little of the painting's height, and a painting with
   * its ground in the middle (the forest) wants the bottom kept, while
   * one whose arches and banners stand in the upper half wants to look
   * higher. Presentation only.
   */
  framing?: number;
  /** Walked about in two dimensions, with small finds turning up (see `WalkRoam`). */
  roam?: WalkRoam;
}

/** A point in a painting, as fractions of its width and height. */
export interface PaintingPoint {
  x: number;
  y: number;
}

/**
 * A SMALL FIND — something noticed on the ground while walking about: a
 * flower in a crack, a feather, a worn carving. Not one of the place's
 * own things (`points`), only a little of the world being there. It
 * gives nothing, records nothing and decides nothing.
 */
export interface WalkDiscovery {
  id: string;
  /** What it is called on the 「調べる」 control. */
  label: string;
  text: string;
  /**
   * FOR LATER, UNUSED TODAY: a real thing to hand over (a material, a
   * collectible, something to sell). Nothing reads it yet — a find
   * gives nothing until the bag is ready to take it.
   */
  reward?: DiscoveryReward;
  /**
   * FOR LATER, UNUSED TODAY: the WORLD MEMORY event a find would write,
   * for the day a find belongs to somebody's life rather than only to
   * the player. Nothing reads it yet and nothing is written.
   */
  remember?: MemoryEventType;
}

/**
 * HOW RARE A FIND IS.
 *
 *   NORMAL   the small finds: a flower, a feather, a puddle.
 *   RARE     golden: an old coin, a fragment of ore — less often.
 *   RAINBOW  once in a world per place: a real thing, kept in the save.
 *   SPECIAL  for later — a travelling merchant, a hidden somebody, old
 *            letters, a strange sky. Named so the shape has room; there
 *            are none.
 */
export type DiscoveryGrade = 'NORMAL' | 'RARE' | 'RAINBOW' | 'SPECIAL';

/** What a find might one day hand over. Shape only: nothing gives one yet. */
export interface DiscoveryReward {
  kind: 'MATERIAL' | 'COLLECTIBLE' | 'VALUABLE';
  itemId: string;
  quantity?: number;
}

/**
 * A PLACE'S ONCE-IN-A-WORLD FIND: a piece of equipment, taken once and
 * kept in the save (`explorationRareFinds`), never there again after.
 */
export interface WalkRainbowFind {
  id: string;
  /** What it is called on the 「調べる」 control before it is known. */
  label: string;
  /** The equipment it is (content/equipment/equipment.ts). */
  equipmentId: string;
}

/**
 * A PLACE WALKED ABOUT IN, NOT ALONG — in two dimensions: anywhere on
 * its floor, back into the picture and forward out of it. Without this
 * a place is walked right to left as before.
 */
export interface WalkRoam {
  /**
   * The floor, as an outline in painting fractions (points in order).
   * Walls, cliffs, pillars and sky are outside it; a touch there walks
   * to the nearest floor instead.
   */
  floor: readonly PaintingPoint[];
  /**
   * The painting heights of the farthest and the nearest floor: a
   * walker is drawn smaller the farther back they stand (0.8 at `far`,
   * 1 at `near`), which is all the depth there is — the painting is not
   * cut up.
   */
  far: number;
  near: number;
  /** Where the party stops after walking in from the right. */
  start: PaintingPoint;
  /** Spots on the floor where a small find may turn up, one at a time. */
  spots: readonly PaintingPoint[];
  /** What may be found there — picked so the same one does not come round again soon. */
  discoveries: readonly WalkDiscovery[];
  /** The golden finds — the same kind of line, less often. */
  rareDiscoveries?: readonly WalkDiscovery[];
  /** The place's once-in-a-world find. */
  rainbow?: WalkRainbowFind;
  /**
   * THINGS TO PICK UP (2026-10-07): a few fixed places on the floor with
   * something in them — a herb in the grass, a coin in a broken pot. Each
   * is taken once in a world (`explorationPickups`) and never comes back.
   */
  pickups?: readonly WalkPickup[];
}

/**
 * ONE PLACE TO PICK SOMETHING UP. Its id is for ever (it is what the save
 * remembers); what is in it is rolled once, when it is taken.
 *
 * Room left for later, not built: something that grows back after some
 * days, or that somebody else gathers first, is a field here plus a
 * reader of the taken list — the list itself stays as it is.
 */
export interface WalkPickup {
  /** For ever: `forest_pickup_001`, `ruins_pickup_001`… */
  id: string;
  /** What it is called on the 「調べる」 control: 草むら, 壊れた壺… */
  label: string;
  /** Where it is, on the floor, in painting fractions. */
  at: PaintingPoint;
  /** What looking into it says, before what was got. */
  line: string;
  /** What may be in it — one row is a fixed find; more are weighed. */
  items: readonly PickupRoll[];
}

/** One thing a pickup may hold, and how likely, against its other rows. */
export interface PickupRoll {
  itemId: string;
  quantity: number;
  /** Relative weight. Absent is 1. */
  weight?: number;
}

/** What a pickup holds this time: one of its rows, by weight. */
export function rollPickup(pickup: WalkPickup, rng: () => number = Math.random): PickupRoll {
  const rows = pickup.items;
  const total = rows.reduce((sum, r) => sum + Math.max(0, r.weight ?? 1), 0);
  let left = Math.min(0.999999, Math.max(0, rng())) * total;
  for (const row of rows) {
    left -= Math.max(0, row.weight ?? 1);
    if (left < 0) return row;
  }
  return rows[rows.length - 1];
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

/** The things along the way that are there in this world. */
export function pointsFor(scene: WalkSceneDef, view: WalkWorldView): WalkPoint[] {
  return scene.points.filter((p) => walkConditionHolds(p.when, view));
}

/** The ambient lines that apply in this world, in their written order. */
export function ambientLinesFor(scene: WalkSceneDef, view: WalkWorldView): string[] {
  return scene.ambientLines.filter((l) => walkConditionHolds(l.when, view)).map((l) => l.text);
}

/** The distant figures present in this world. */
export function figuresFor(scene: WalkSceneDef, view: WalkWorldView): WalkFigure[] {
  return (scene.figures ?? []).filter((f) => walkConditionHolds(f.when, view));
}

/** Where a thing's 「！」 stands: its own `marker`, or just above where it is. */
export function markerAt(point: WalkPoint): { x: number; y: number } {
  return point.marker ?? { x: point.at.x, y: point.at.y - 0.03 };
}
