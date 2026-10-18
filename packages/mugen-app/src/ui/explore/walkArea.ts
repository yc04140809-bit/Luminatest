// WHERE A PLACE CAN BE WALKED — told apart (作者「探索画面仕様 更新指示」2026-10-17).
//
// A place walked about in (`WalkRoam`) has always had one floor outline,
// walked across in a straight line. A place may now say more — its
// painting read as a walking surface, as the author's grid images draw it:
//
//   MAIN     緑  the way on: walked freely, the road to the next place
//   SIDE     黄  off the way: a gap in the rubble, a side path, a ruined
//            room — walked into, where finds and traces may lie
//   blocked  赤  everything else (cliffs, big rubble, walls, the distance);
//            and any `blocked` outline cut out of MAIN or SIDE
//   (青 — a thing to look at — is not an area: it is the place's `points`,
//   its pickups and finds, as ever, stood beside on the floor.)
//
// The two kinds join, and they need not be straight: a walk from the road
// up the side steps goes AROUND what is in the way, never through it — so
// the walk is found on a fine grid laid over the painting (`path`), and
// straightened where nothing is in the way.
//
// A place without areas is walked exactly as before: its one floor, in a
// straight line (`groundOf` hands back the old behaviour unchanged).
//
// Everything is in the painting's own fractions, as roam.ts is.

import type { PaintingPoint, WalkAreas } from '@mugen/content/exploration/walkScene';
import { dist, onFloor, toFloor } from './roam';

export type AreaKind = 'MAIN' | 'SIDE';

/** How fine the grid a walk is found on is (cells across × down the painting). */
export const NAV_COLS = 120;
export const NAV_ROWS = 68;

/** The ground of a place: what is floor, where a touch walks to, and the way there. */
export interface Ground {
  /** Whether a point can be stood on. */
  on(p: PaintingPoint): boolean;
  /** Which kind of ground a point is (null: not ground). Without areas, all floor is MAIN. */
  kind(p: PaintingPoint): AreaKind | null;
  /** Where a touch walks to: the point itself on ground, else the nearest ground to it. */
  to(p: PaintingPoint): PaintingPoint;
  /** The way from one point of ground to another: the turning points after `from`, ending at `to`. */
  path(from: PaintingPoint, to: PaintingPoint): PaintingPoint[];
}

/** The one-outline ground every place had before areas: straight walks, as ever. */
function floorGround(floor: readonly PaintingPoint[]): Ground {
  return {
    on: (p) => onFloor(p, floor),
    kind: (p) => (onFloor(p, floor) ? 'MAIN' : null),
    to: (p) => toFloor(p, floor),
    path: (_from, to) => [to],
  };
}

/** Which kind of ground a point is, by the areas (blocked cut-outs first). */
export function areaKind(p: PaintingPoint, areas: WalkAreas): AreaKind | null {
  if ((areas.blocked ?? []).some((b) => onFloor(p, b))) return null;
  if (areas.main.some((m) => onFloor(p, m))) return 'MAIN';
  if ((areas.side ?? []).some((s) => onFloor(p, s.outline))) return 'SIDE';
  return null;
}

/** The grid a walk is found on: a cell is ground when its middle is. */
export function navGrid(areas: WalkAreas, cols = NAV_COLS, rows = NAV_ROWS): Uint8Array {
  const g = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) g[r * cols + c] = areaKind({ x: (c + 0.5) / cols, y: (r + 0.5) / rows }, areas) ? 1 : 0;
  return g;
}

const cellOf = (p: PaintingPoint, cols: number, rows: number) => ({
  c: Math.max(0, Math.min(cols - 1, Math.floor(p.x * cols))),
  r: Math.max(0, Math.min(rows - 1, Math.floor(p.y * rows))),
});
const centre = (c: number, r: number, cols: number, rows: number): PaintingPoint => ({ x: (c + 0.5) / cols, y: (r + 0.5) / rows });

/** Whether the straight line between two points stays on ground (checked finely, as the eye measures). */
export function clearLine(a: PaintingPoint, b: PaintingPoint, isGround: (p: PaintingPoint) => boolean): boolean {
  const steps = Math.max(2, Math.ceil(dist(a, b) / 0.004));
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    if (!isGround({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k })) return false;
  }
  return true;
}

/**
 * THE WAY THERE: A* over the grid (eight ways, distances as they look),
 * from the cell under `from` to the cell under `to`; then straightened —
 * each turning point kept only where the straight line past it would
 * leave the ground. Null when there is no way (two pieces not joined).
 */
export function findPath(
  from: PaintingPoint,
  to: PaintingPoint,
  grid: Uint8Array,
  isGround: (p: PaintingPoint) => boolean,
  cols = NAV_COLS,
  rows = NAV_ROWS,
): PaintingPoint[] | null {
  if (clearLine(from, to, isGround)) return [to];
  const s = cellOf(from, cols, rows);
  const t = cellOf(to, cols, rows);
  const idx = (c: number, r: number) => r * cols + c;
  const start = idx(s.c, s.r);
  const goal = idx(t.c, t.r);
  const h = (i: number) => dist(centre(i % cols, Math.floor(i / cols), cols, rows), centre(t.c, t.r, cols, rows));
  const g = new Float64Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  g[start] = 0;
  // A small binary heap of [f, index].
  const heap: [number, number][] = [[h(start), start]];
  const push = (e: [number, number]) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const stepW = 1 / cols;
  while (heap.length > 0) {
    const [, cur] = pop();
    if (closed[cur]) continue;
    if (cur === goal) break;
    closed[cur] = 1;
    const cc = cur % cols;
    const cr = Math.floor(cur / cols);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const n = idx(nc, nr);
        // The cell walked from may be off the grid's ground (a point on the edge); the cells walked into may not.
        if (!grid[n] && n !== goal) continue;
        // No cutting a corner between two cells that are not ground.
        if (dr && dc && (!grid[idx(cc + dc, cr)] || !grid[idx(cc, cr + dr)])) continue;
        const cost = dist(centre(cc, cr, cols, rows), centre(nc, nr, cols, rows)) || stepW;
        if (g[cur] + cost < g[n]) {
          g[n] = g[cur] + cost;
          came[n] = cur;
          push([g[n] + h(n), n]);
        }
      }
  }
  if (start !== goal && came[goal] < 0) return null;
  // The cells walked, start to goal, as points; the real ends at each end.
  const cells: PaintingPoint[] = [];
  for (let i = goal; i !== start && i >= 0; i = came[i]) cells.push(centre(i % cols, Math.floor(i / cols), cols, rows));
  cells.reverse();
  const raw = [from, ...cells.slice(0, -1), to];
  // Straightened: from each kept point, as far ahead as is in plain sight.
  const out: PaintingPoint[] = [];
  let at = 0;
  while (at < raw.length - 1) {
    let next = raw.length - 1;
    while (next > at + 1 && !clearLine(raw[at], raw[next], isGround)) next--;
    out.push(raw[next]);
    at = next;
  }
  return out;
}

/** The nearest ground to a point: the middle of the nearest ground cell, then pulled toward the point while it stays ground. */
function nearestGround(p: PaintingPoint, grid: Uint8Array, isGround: (q: PaintingPoint) => boolean, cols: number, rows: number): PaintingPoint {
  let best: PaintingPoint | null = null;
  let bestD = Infinity;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!grid[r * cols + c]) continue;
      const q = centre(c, r, cols, rows);
      const d = dist(p, q);
      if (d < bestD) {
        bestD = d;
        best = q;
      }
    }
  if (!best) return p;
  // Toward the touch, as far as the ground goes.
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (isGround({ x: best.x + (p.x - best.x) * mid, y: best.y + (p.y - best.y) * mid })) lo = mid;
    else hi = mid;
  }
  const k = Math.max(0, lo - 0.02);
  return { x: best.x + (p.x - best.x) * k, y: best.y + (p.y - best.y) * k };
}

/** A place's ground: its areas when it has them, else its one floor (exactly as before). */
export function groundOf(roam: { floor: readonly PaintingPoint[]; areas?: WalkAreas }): Ground {
  const areas = roam.areas;
  if (!areas) return floorGround(roam.floor);
  const isGround = (p: PaintingPoint) => areaKind(p, areas) !== null;
  const grid = navGrid(areas);
  return {
    on: isGround,
    kind: (p) => areaKind(p, areas),
    to: (p) => (isGround(p) ? p : nearestGround(p, grid, isGround, NAV_COLS, NAV_ROWS)),
    path: (from, to) => findPath(from, to, grid, isGround) ?? [to],
  };
}
