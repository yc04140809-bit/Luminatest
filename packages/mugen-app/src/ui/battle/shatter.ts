/**
 * BREAK: THE WHOLE SCREEN BREAKS LIKE GLASS (作者 実機 2026-10-24: 「画面全体をガラスを割ったみたいな
 * 表現でもいいかも」). Pure geometry — where the cracks run and the pieces they make — so the same
 * break is drawn every time and can be checked without a browser.
 *
 * From the point struck, `RAYS` cracks run out to past the corners; rings cross them at `RINGS`
 * (a share of the screen's width out from the point). Every crossing is moved a little (a fixed
 * jitter, the same each time) and SHARED by the pieces on either side of it, so the pieces fit
 * with no gap. The innermost pieces are triangles at the point; the rest are four-sided.
 *
 * Coordinates are percents of the screen (x of its width, y of its height); `ASPECT` keeps the
 * rings round on a landscape phone.
 */

/** The phone held sideways: about this much wider than tall. */
export const ASPECT = 2.16;
/** How many cracks run out from the point. */
export const RAYS = 9;
/** Where the rings cross the cracks, out from the point (% of the width); the last is past every corner. */
export const RINGS: readonly number[] = [10, 26, 52, 130];

export interface Shard {
  /** The piece's outline, for `clip-path: polygon(...)`. */
  points: string;
  /** Its middle (%), which it turns about as it flies. */
  cx: number;
  cy: number;
  /** Where it flies (% of the screen) and how far it turns (deg). */
  dx: number;
  dy: number;
  rot: number;
  /** How long after the others it lets go (ms): the pieces nearest the point first. */
  delay: number;
  /** Which ring it is in (0 at the point). */
  ring: number;
  /**
   * The piece drawn at its own size, not the screen's (a whole-screen layer per piece is too much to
   * paint on a phone): its box on the screen (%, kept to the screen — beyond it nothing shows), its
   * outline inside that box, the point it turns about, and where it flies — all % of the box.
   */
  box: { x: number; y: number; w: number; h: number };
  local: string;
  ox: number;
  oy: number;
  tx: number;
  ty: number;
}
export interface Crack {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** A fixed jitter in -1…1 for a crossing — the same for the same numbers. */
function jitter(a: number, b: number, salt: number): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

/** The cracks and pieces of a break at (x, y) (% of the screen). */
export function shatter(x: number, y: number): { cracks: Crack[]; shards: Shard[] } {
  const angle = (i: number) => ((i % RAYS) + 0.35 * jitter(i % RAYS, 0, 1)) * ((2 * Math.PI) / RAYS);
  // The crossing of crack i and ring j (the point itself is ring -1).
  const at = (i: number, j: number): [number, number] => {
    if (j < 0) return [x, y];
    const a = angle(i) + 0.12 * jitter(i % RAYS, j, 2);
    const r = RINGS[j] * (1 + 0.18 * jitter(i % RAYS, j, 3));
    return [r2(x + Math.cos(a) * r), r2(y + Math.sin(a) * r * ASPECT)];
  };
  const cracks: Crack[] = [];
  const shards: Shard[] = [];
  for (let j = 0; j < RINGS.length; j++) {
    for (let i = 0; i < RAYS; i++) {
      // Along the crack, from the ring before to this one; and across, from this crack to the next.
      const [ax, ay] = at(i, j - 1);
      const [bx, by] = at(i, j);
      const [nx, ny] = at(i + 1, j);
      cracks.push({ x1: ax, y1: ay, x2: bx, y2: by });
      cracks.push({ x1: bx, y1: by, x2: nx, y2: ny });
      const corners = j === 0 ? [at(i, -1), at(i, 0), at(i + 1, 0)] : [at(i, j - 1), at(i, j), at(i + 1, j), at(i + 1, j - 1)];
      const cx = corners.reduce((n, c) => n + c[0], 0) / corners.length;
      const cy = corners.reduce((n, c) => n + c[1], 0) / corners.length;
      // Out from the point, further the nearer it was (the blow's force), then falling; a turn either way.
      const away = Math.atan2((cy - y) / ASPECT, cx - x);
      const push = 16 - j * 2 + 4 * jitter(i, j, 4);
      const dx = Math.cos(away) * push;
      const dy = Math.sin(away) * push * ASPECT + 44 + 7 * jitter(i, j, 5);
      const keep = (n: number) => Math.max(-2, Math.min(102, n));
      const x0 = keep(Math.min(...corners.map((c) => c[0])));
      const x1 = keep(Math.max(...corners.map((c) => c[0])));
      const y0 = keep(Math.min(...corners.map((c) => c[1])));
      const y1 = keep(Math.max(...corners.map((c) => c[1])));
      const w = Math.max(0.5, x1 - x0);
      const h = Math.max(0.5, y1 - y0);
      shards.push({
        box: { x: r2(x0), y: r2(y0), w: r2(w), h: r2(h) },
        local: corners.map(([px, py]) => `${r2(((px - x0) / w) * 100)}% ${r2(((py - y0) / h) * 100)}%`).join(', '),
        ox: r2(((cx - x0) / w) * 100),
        oy: r2(((cy - y0) / h) * 100),
        tx: r2((dx / w) * 100),
        ty: r2((dy / h) * 100),
        points: corners.map(([px, py]) => `${px}% ${py}%`).join(', '),
        cx: r2(cx),
        cy: r2(cy),
        dx: r2(dx),
        dy: r2(dy),
        rot: Math.round(25 * jitter(i, j, 6) + (jitter(i, j, 7) > 0 ? 20 : -20)),
        delay: Math.round(j * 35 + 25 * Math.abs(jitter(i, j, 8))),
        ring: j,
      });
    }
  }
  return { cracks, shards };
}
