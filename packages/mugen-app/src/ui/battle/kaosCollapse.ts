/**
 * ケイオス 《双極臨界 → 界核崩壊》: WHERE IT HAPPENS ON THE SCREEN (作者 2026-10-26 正式実装指示書). Pure
 * geometry — where the two circles stand before they meet, where the light/dark core forms, how the
 * space around it cracks and where the crystal shards fly — so the same collapse is drawn every time and
 * can be checked without a browser.
 *
 * Over the creatures (`x`/`y` % of the screen — the middle of those struck): the gold circle comes in
 * from her side (right), turning clockwise, the purple from beyond them (left), turning the other way;
 * they slide together into one point there, where the core forms. At the fourth blow (界核崩壊) the
 * core bursts: the space around it cracks — jagged lines out from it, a fixed jitter, the same each
 * time, a short branch off some — and crystal shards fly out.
 *
 * Coordinates are percents of the screen (x of its width, y of its height).
 */

/** The phone held sideways: about this much wider than tall (a crack's angle reads the same either way). */
const ASPECT = 2.16;

export interface CollapseSpot {
  x: number;
  y: number;
}
export interface Shard {
  /** Where it flies to, from the core (% of the screen's width / height). */
  dx: number;
  dy: number;
  /** Its turn as it flies (deg), its size (px, longer side), its colour (gold, white or purple). */
  rot: number;
  size: number;
  tone: 'gold' | 'white' | 'violet';
  /** When it lets go (ms after the burst) — a few a moment later than the rest. */
  delay: number;
}
export interface Collapse {
  /** Where the core forms and bursts. */
  x: number;
  y: number;
  /** Each crack in the space around it, as a path in a 0–100 box over the screen (stretched to it). */
  cracks: string[];
  shards: Shard[];
}

/** How many cracks run out from the core, and how many shards fly. */
export const COLLAPSE_CRACKS = 9;
export const COLLAPSE_SHARDS = 18;

/** A fixed jitter, the same each time (no dice: the same collapse every time). */
const jitter = (i: number, k: number) => {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * The middle of the creatures struck, kept clear of the screen's edges and of the HUD along the bottom
 * (a giant's middle is high on it: the core forms before its face, not under the plate).
 */
export function collapseCentre(spots: readonly CollapseSpot[]): CollapseSpot {
  if (spots.length === 0) return { x: 32, y: 44 };
  const x = spots.reduce((n, s) => n + s.x, 0) / spots.length;
  const y = spots.reduce((n, s) => n + s.y, 0) / spots.length;
  return { x: Math.round(Math.max(18, Math.min(60, x))), y: Math.round(Math.max(28, Math.min(58, y))) };
}

export function kaosCollapse(spots: readonly CollapseSpot[]): Collapse {
  const { x, y } = collapseCentre(spots);
  const cracks: string[] = [];
  for (let i = 0; i < COLLAPSE_CRACKS; i++) {
    // Around the whole of it, each a little off its even share; long ones and short ones.
    const a = ((i + jitter(i, 1) * 0.6) / COLLAPSE_CRACKS) * Math.PI * 2;
    const len = 16 + jitter(i, 2) * 22;
    let px = x;
    let py = y;
    let d = `M${r1(px)} ${r1(py)}`;
    const steps = 4;
    for (let k = 1; k <= steps; k++) {
      const bend = (jitter(i, k + 3) - 0.5) * 0.7;
      const step = len / steps;
      px += Math.cos(a + bend) * step;
      py += (Math.sin(a + bend) * step * ASPECT) / 2;
      d += ` L${r1(px)} ${r1(py)}`;
      // A short branch off the second bend of every other crack.
      if (k === 2 && i % 2 === 0) {
        const b = a + (jitter(i, 9) > 0.5 ? 0.7 : -0.7);
        d += ` M${r1(px)} ${r1(py)} L${r1(px + Math.cos(b) * step * 0.8)} ${r1(py + (Math.sin(b) * step * 0.8 * ASPECT) / 2)} M${r1(px)} ${r1(py)}`;
      }
    }
    cracks.push(d);
  }
  const tones: Shard['tone'][] = ['gold', 'white', 'violet'];
  const shards: Shard[] = Array.from({ length: COLLAPSE_SHARDS }, (_, i) => {
    const a = ((i + jitter(i, 11)) / COLLAPSE_SHARDS) * Math.PI * 2;
    const far = 18 + jitter(i, 12) * 26;
    return {
      dx: r1(Math.cos(a) * far),
      dy: r1((Math.sin(a) * far * ASPECT) / 2),
      rot: Math.round((jitter(i, 13) - 0.5) * 540),
      size: Math.round(10 + jitter(i, 14) * 18),
      tone: tones[i % 3],
      delay: i % 4 === 3 ? 60 : 0,
    };
  });
  return { x, y, cracks, shards };
}

/**
 * THE SUCTION (グレードアップ v2 §7–10: 「回っている」ではなく「吸われている」): what lies about the point is drawn into
 * it — the film is not the pull, these are. Motes of white, gold, purple and black-purple and thin light, from far out
 * round it, each a little way round as it goes (a spiral, never straight), slow at first and quickening, gone into
 * the point before the stillness; and crystal shards — black-purple and silver — floating where they are, drifting,
 * then pulled in faster still. Fixed, the same every time.
 */
export interface Mote {
  /** Where it starts: its angle round the point (deg) and how far out (a share of the field's width). */
  a: number;
  far: number;
  /** How far round it goes on its way in (deg — the spiral). */
  turn: number;
  /** When it lets go: a share of the pull (0 at the film, 1 at the point). */
  start: number;
  /** Its size (px) and colour; a streak is a thin line of light along its way. */
  size: number;
  tone: 'white' | 'gold' | 'violet' | 'dark';
  streak: boolean;
}
export interface Crystal {
  a: number;
  far: number;
  turn: number;
  /** Its own turn as it goes (deg), its size (px, longer side), black-purple or silver. */
  spin: number;
  size: number;
  tone: 'violet' | 'silver';
}

export const SUCTION_MOTES = 32;
export const SUCTION_STREAKS = 8;
export const SUCTION_CRYSTALS = 10;

export function collapseSuction(): { motes: Mote[]; crystals: Crystal[] } {
  const tones: Mote['tone'][] = ['white', 'gold', 'violet', 'dark'];
  const motes: Mote[] = Array.from({ length: SUCTION_MOTES + SUCTION_STREAKS }, (_, i) => {
    const streak = i >= SUCTION_MOTES;
    // Round the whole of it (the golden angle: never bunched), far out — some beyond the screen's edge.
    return {
      a: Math.round((i * 137.5 + jitter(i, 21) * 20) % 360),
      far: r1((0.42 + jitter(i, 22) * 0.38) * 100) / 100,
      turn: Math.round(70 + jitter(i, 23) * 80),
      start: Math.round(jitter(i, 24) * 0.5 * 100) / 100,
      size: streak ? Math.round(26 + jitter(i, 25) * 22) : Math.round(4 + jitter(i, 25) * 6),
      tone: streak ? (i % 2 ? 'gold' : 'white') : tones[i % 4],
      streak,
    };
  });
  const crystals: Crystal[] = Array.from({ length: SUCTION_CRYSTALS }, (_, i) => ({
    a: Math.round(((i + jitter(i, 31) * 0.7) / SUCTION_CRYSTALS) * 360),
    far: Math.round((0.26 + jitter(i, 32) * 0.18) * 100) / 100,
    turn: Math.round(40 + jitter(i, 33) * 50),
    spin: Math.round((jitter(i, 34) - 0.5) * 720),
    size: Math.round(12 + jitter(i, 35) * 14),
    tone: i % 3 === 2 ? 'silver' : 'violet',
  }));
  return { motes, crystals };
}
