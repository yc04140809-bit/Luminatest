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
  /**
   * Its layer (作者 2026-10-24 仕上げ §4–5): 'back' small, faint, slow, many — far behind; 'rise' a few off
   * the lilies first, floating up; 'front' big, clear, fast, turning hard — across the screen near the camera;
   * 'drift' (作者 2026-10-25 ブラッシュアップ §2: 舞って終わる余韻) a few last ones, falling slowly and swaying
   * after the rest are gone; 'mid' (2026-10-26 最終 §9: 奥・中・手前) the middle depth — the size a petal is,
   * across the field at an easy pace, between the far small ones and the big ones near the camera.
   */
  layer: 'back' | 'mid' | 'rise' | 'front' | 'drift';
  /** Which of the author's sixteen petals (作者 2026-10-25 — hero-higanbana-petals.webp, 4×4, row by row). */
  variant: number;
  /** Where it starts (% of the screen). */
  x: number;
  y: number;
  /** How far it flies (% of the screen's width / height), and its turn as it starts and as it ends (deg). */
  dx: number;
  dy: number;
  rot0: number;
  rot: number;
  /** How big (px, the picture's longer side). */
  size: number;
  /** How clear at its clearest (0–1). */
  alpha: number;
  /** When it lets go, and how long it flies — shares of the dark. */
  delay: number;
  dur: number;
}
export interface Bloom {
  /** Each crack as a path in a 0–100 box over the screen (stretched to it). */
  cracks: string[];
  lilies: Lily[];
  petals: Petal[];
}

/** How many petals of each layer (one picture each — 58 in all, a light load on a phone). */
export const PETALS = { back: 30, mid: 8, rise: 6, front: 8, drift: 6 } as const;
export const PETAL_COUNT = PETALS.back + PETALS.mid + PETALS.rise + PETALS.front + PETALS.drift;
/** The author's petals, one picture of sixteen (4×4). */
export const PETAL_VARIANTS = 16;
/** Lilies under each creature: one creature, more of them; several, fewer each. */
export const LILIES_ALONE = 5;
export const LILIES_EACH = 3;

/**
 * When the bloom is taken away, from its dark's start (ms): once SPEED DOWN has been said (at 55% of the
 * dark, for 1450ms) and the last petal is down — the slow last few (余韻) included.
 */
export function bloomGoneMs(darkMs: number, petals: readonly Petal[]): number {
  const lastPetal = Math.max(0, ...petals.map((p) => p.delay + p.dur));
  return Math.round(Math.max(darkMs * 0.55 + 1450, darkMs * lastPetal + 100));
}

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
  // The petals. A few rise off the lilies first; then many small ones far behind, out from the lilies over
  // the whole screen; and big ones near the camera, across it from one side to the other.
  const petals: Petal[] = [];
  const lily = (i: number) => lilies[i % lilies.length] ?? { x: 30, y: 60 };
  for (let i = 0; i < PETALS.rise; i++) {
    const from = lily(i);
    petals.push({
      layer: 'rise',
      variant: (i * 5 + 1) % PETAL_VARIANTS,
      x: from.x,
      y: r2(from.y - 8),
      dx: r2(5 * jitter(i, 0, 14)),
      dy: r2(-14 - 8 * Math.abs(jitter(i, 1, 15))),
      rot0: Math.round(180 * jitter(i, 2, 16)),
      rot: Math.round(180 * jitter(i, 3, 17)),
      size: Math.round(24 + 8 * Math.abs(jitter(i, 4, 18))),
      alpha: 0.95,
      delay: r2(0.12 + 0.03 * i),
      dur: r2(1.1 + 0.2 * Math.abs(jitter(i, 5, 19))),
    });
  }
  for (let i = 0; i < PETALS.back; i++) {
    const from = lily(i);
    const angle = (i / PETALS.back) * Math.PI * 2 + 0.4 * jitter(i, 0, 7);
    const far = 30 + 45 * Math.abs(jitter(i, 2, 9));
    petals.push({
      layer: 'back',
      variant: (i * 7 + 3) % PETAL_VARIANTS,
      x: from.x,
      y: r2(from.y - 6),
      dx: r2(Math.cos(angle) * far),
      dy: r2(Math.sin(angle) * far * 0.8 - 8),
      rot0: Math.round(180 * jitter(i, 3, 10)),
      rot: Math.round(360 * jitter(i, 4, 11)),
      size: Math.round(20 + 16 * Math.abs(jitter(i, 5, 12))),
      alpha: r2(0.65 + 0.25 * Math.abs(jitter(i, 6, 13))),
      delay: r2(0.3 + 0.25 * Math.abs(jitter(i, 7, 20))),
      dur: r2(1.5 + 0.4 * Math.abs(jitter(i, 8, 21))),
    });
  }
  for (let i = 0; i < PETALS.mid; i++) {
    // Out from the lilies to one side and off it, falling a little — the middle of the depth.
    const from = lily(i + 1);
    const right = i % 2 === 0;
    petals.push({
      layer: 'mid',
      variant: (i * 9 + 4) % PETAL_VARIANTS,
      x: from.x,
      y: r2(from.y - 10 - 14 * Math.abs(jitter(i, 0, 37))),
      dx: r2((right ? 1 : -1) * (55 + 30 * Math.abs(jitter(i, 1, 38)))),
      dy: r2(-6 + 24 * Math.abs(jitter(i, 2, 39))),
      rot0: Math.round(180 * jitter(i, 3, 40)),
      rot: Math.round((right ? 1 : -1) * (160 + 140 * Math.abs(jitter(i, 4, 41)))),
      size: Math.round(60 + 30 * Math.abs(jitter(i, 5, 42))),
      alpha: 0.92,
      delay: r2(0.3 + 0.04 * i),
      dur: r2(1.05 + 0.25 * Math.abs(jitter(i, 6, 43))),
    });
  }
  for (let i = 0; i < PETALS.front; i++) {
    // From off one side to past the other, alternately, falling a little as it goes.
    const fromLeft = i % 2 === 0;
    petals.push({
      layer: 'front',
      variant: (i * 3 + 2) % PETAL_VARIANTS,
      x: fromLeft ? -12 : 112,
      y: r2(12 + 62 * Math.abs(jitter(i, 0, 22))),
      dx: r2((fromLeft ? 1 : -1) * (118 + 22 * Math.abs(jitter(i, 1, 23)))),
      dy: r2(8 + 22 * Math.abs(jitter(i, 2, 24))),
      rot0: Math.round(180 * jitter(i, 3, 25)),
      rot: Math.round((fromLeft ? 1 : -1) * (260 + 240 * Math.abs(jitter(i, 4, 26)))),
      size: Math.round(110 + 60 * Math.abs(jitter(i, 5, 27))),
      alpha: 1,
      delay: r2(0.36 + 0.03 * i),
      dur: r2(0.7 + 0.15 * Math.abs(jitter(i, 6, 28))),
    });
  }
  // The last few (余韻): high over the field, falling slowly and swaying as they go, after the rest — so
  // the move ends on petals drifting down, not on an empty screen.
  for (let i = 0; i < PETALS.drift; i++) {
    petals.push({
      layer: 'drift',
      variant: (i * 11 + 6) % PETAL_VARIANTS,
      x: r2(10 + (80 * (i + 0.5)) / PETALS.drift + 5 * jitter(i, 0, 29)),
      y: r2(4 + 14 * Math.abs(jitter(i, 1, 30))),
      dx: r2(6 * jitter(i, 2, 31)),
      dy: r2(48 + 18 * Math.abs(jitter(i, 3, 32))),
      rot0: Math.round(180 * jitter(i, 4, 33)),
      rot: Math.round(220 * jitter(i, 5, 34)),
      size: Math.round(34 + 18 * Math.abs(jitter(i, 6, 35))),
      alpha: 0.9,
      delay: r2(0.75 + 0.08 * i),
      dur: r2(1.7 + 0.25 * Math.abs(jitter(i, 7, 36))),
    });
  }
  return { cracks, lilies, petals };
}
