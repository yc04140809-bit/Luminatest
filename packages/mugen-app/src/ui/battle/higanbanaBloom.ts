/**
 * 《彼岸花》: THE GROUND SPLITS, AND THE LILIES COME UP OUT OF IT (作者 2026-10-24 最終仕様 §7–9). Pure
 * geometry — where the cracks run under each creature struck, where a lily opens on them, where the
 * petals fly — so the same bloom is drawn every time and can be checked without a browser.
 *
 * Under each creature (its feet, `x`/`y` % of the screen; `w` its width, % of the screen's width) a
 * crack runs out both ways along the ground — jagged, a fixed jitter, the same each time — with a
 * short branch off each side. Grave's ground crack (specialFx.css gj-crack) drawn the same way, in red.
 * The lilies stand ON the crack: one at the middle (the biggest), then at the ends of its arms and
 * branches — the cracks are where they come up from. With several creatures, fewer each (the whole
 * screen is not a garden). The petals start at the lilies and fly out over the whole screen, a few
 * near the camera (big) — covering it for a moment, then thinning at once.
 *
 * Coordinates are percents of the screen (x of its width, y of its height).
 */

/** The phone held sideways: about this much wider than tall (a crack's rise reads the same either way). */
const ASPECT = 2.16;

export interface BloomSpot {
  x: number;
  y: number;
  w: number;
}
export interface Lily {
  x: number;
  y: number;
  /** Its size, a share of the main one's. */
  size: number;
  /** When it opens, a share of the dark. */
  delay: number;
  /** Its lean (deg). */
  turn: number;
}
export interface Petal {
  /** Where it starts (% of the screen). */
  x: number;
  y: number;
  /** How far it flies (% of the screen's width / height) and turns (deg). */
  dx: number;
  dy: number;
  rot: number;
  /** How big (1: a petal; 3 and more: near the camera). */
  scale: number;
  /** When it lets go, a share of the dark. */
  delay: number;
}
export interface Bloom {
  /** Each crack as a path in a 0–100 box over the screen (stretched to it). */
  cracks: string[];
  lilies: Lily[];
  petals: Petal[];
}

/** How many petals in all, and how many of them near the camera. */
export const PETAL_COUNT = 44;
export const NEAR_PETALS = 8;
/** Lilies under each creature: one creature, more of them; several, fewer each. */
export const LILIES_ALONE = 5;
export const LILIES_EACH = 3;

function jitter(a: number, b: number, salt: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The bloom under these creatures (the one aimed at first). */
export function higanbanaBloom(spots: readonly BloomSpot[]): Bloom {
  const cracks: string[] = [];
  const lilies: Lily[] = [];
  const each = spots.length > 1 ? LILIES_EACH : LILIES_ALONE;
  spots.forEach((spot, k) => {
    const reach = Math.max(6, spot.w * 0.55);
    // Each arm: out from the middle in five jagged steps, a little up or down the ground each step.
    const arm = (way: -1 | 1) => {
      const pts: [number, number][] = [[spot.x, spot.y]];
      for (let i = 1; i <= 5; i++) {
        const along = (reach * i) / 5;
        const rise = (reach * 0.06 * jitter(k, i * way, 1) + reach * 0.015 * i * jitter(k, way, 2)) * ASPECT;
        pts.push([r2(spot.x + way * along), r2(spot.y + rise)]);
      }
      return pts;
    };
    const left = arm(-1);
    const right = arm(1);
    // A branch off each arm, at its third step: short, down the slope (toward the viewer) or up it.
    const branch = (from: [number, number], way: -1 | 1, salt: number): [number, number] => [
      r2(from[0] + way * reach * 0.18),
      r2(from[1] + reach * 0.12 * (jitter(k, salt, 3) > 0 ? 1 : -1) * ASPECT),
    ];
    const bl = branch(left[3], -1, 4);
    const br = branch(right[3], 1, 5);
    const line = (pts: [number, number][]) => `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')}`;
    cracks.push(`${line([...left].reverse())} L${line(right.slice(1)).slice(1)} M${left[3][0]} ${left[3][1]} L${bl[0]} ${bl[1]} M${right[3][0]} ${right[3][1]} L${br[0]} ${br[1]}`);
    // Where the lilies stand: the middle, then the arms' ends, then the branches' ends.
    const at: [number, number, number][] = [
      [spot.x, spot.y, 1],
      [left[5][0], left[5][1], 0.62],
      [right[5][0], right[5][1], 0.62],
      [bl[0], bl[1], 0.5],
      [br[0], br[1], 0.5],
    ];
    // As big as the creature allows: a giant's the full size, an ordinary one's about half (they never bury it).
    const scale = Math.max(0.45, Math.min(1, spot.w / 34));
    at.slice(0, each).forEach(([x, y, size], i) =>
      lilies.push({ x, y, size: r2(size * scale * (k === 0 ? 1 : 0.85)), delay: r2(0.04 + i * 0.07 + k * 0.05), turn: Math.round(14 * jitter(k, i, 6)) }),
    );
  });
  // The petals: from the lilies, out over the whole screen — away from where they start, rising first.
  const petals: Petal[] = [];
  for (let i = 0; i < PETAL_COUNT; i++) {
    const from = lilies[i % lilies.length];
    const near = i < NEAR_PETALS;
    const angle = (i / PETAL_COUNT) * Math.PI * 2 + 0.4 * jitter(i, 0, 7);
    const far = near ? 40 + 20 * Math.abs(jitter(i, 1, 8)) : 30 + 45 * Math.abs(jitter(i, 2, 9));
    petals.push({
      x: from ? from.x : 30,
      y: from ? from.y - 6 : 45,
      dx: r2(Math.cos(angle) * far),
      dy: r2(Math.sin(angle) * far * 0.8 - 8),
      rot: Math.round(360 * jitter(i, 3, 10)),
      scale: near ? r2(3.5 + 2 * Math.abs(jitter(i, 4, 11))) : r2(1 + 1.2 * Math.abs(jitter(i, 5, 12))),
      delay: r2(0.3 + 0.2 * Math.abs(jitter(i, 6, 13))),
    });
  }
  return { cracks, lilies, petals };
}
