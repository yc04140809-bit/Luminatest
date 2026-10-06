import { useMemo } from 'react';
import type { WalkAmbience } from '@mugen/content/exploration/walkScene';

/**
 * THE SMALL THINGS THE PLACE DOES ON ITS OWN — drawn here, from nothing.
 *
 * No pictures: birds are two strokes, leaves are a shape, motes are
 * points of light. They are deliberately small and slow, so the place
 * feels alive without anything asking to be looked at. Which of them
 * appear is decided once per visit (`pickAmbience`), so the forest is
 * not the same screen twice. All of it stops for a player who has asked
 * for less motion (styles.css).
 */

/** Which touches appear this visit: each with even odds, never none. */
export function pickAmbience(allowed: readonly WalkAmbience[], rnd: () => number = Math.random): WalkAmbience[] {
  if (allowed.length === 0) return [];
  const picked = allowed.filter(() => rnd() < 0.6);
  return picked.length > 0 ? picked : [allowed[Math.floor(rnd() * allowed.length) % allowed.length]];
}

function Birds() {
  // Two or three, at different heights and speeds, crossing the sky.
  const flock = useMemo(
    () =>
      Array.from({ length: 2 + Math.floor(Math.random() * 2) }, (_, i) => ({
        top: 6 + Math.random() * 18,
        delay: i * 0.9 + Math.random() * 1.5,
        duration: 11 + Math.random() * 6,
        size: 6 + Math.random() * 3,
      })),
    [],
  );
  return (
    <div className="amb amb-birds" data-testid="ambient-birds" aria-hidden="true">
      {flock.map((b, i) => (
        <span
          key={i}
          className="amb-bird"
          style={{ top: `${b.top}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }}
        >
          <svg width={b.size * 2} height={b.size} viewBox="0 0 20 10">
            <g className="amb-wing">
              <path d={SMALL_BIRD} />
              <ellipse cx="10" cy="5.6" rx="2.1" ry="1.4" />
            </g>
          </svg>
        </span>
      ))}
    </div>
  );
}

function Leaves() {
  const leaves = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        left: 10 + Math.random() * 85,
        delay: Math.random() * 8,
        duration: 7 + Math.random() * 5,
        drift: -40 - Math.random() * 60,
        hue: Math.random() < 0.5 ? 'amb-leaf-gold' : 'amb-leaf-green',
      })),
    [],
  );
  return (
    <div className="amb amb-leaves" data-testid="ambient-leaves" aria-hidden="true">
      {leaves.map((l, i) => (
        <span
          key={i}
          className={`amb-leaf ${l.hue}`}
          style={
            {
              left: `${l.left}%`,
              animationDelay: `${l.delay}s`,
              animationDuration: `${l.duration}s`,
              '--drift': `${l.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Motes() {
  const motes = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        left: 20 + Math.random() * 70,
        top: 20 + Math.random() * 50,
        delay: Math.random() * 6,
        duration: 5 + Math.random() * 4,
      })),
    [],
  );
  return (
    <div className="amb amb-motes" data-testid="ambient-motes" aria-hidden="true">
      {motes.map((m, i) => (
        <span
          key={i}
          className="amb-mote"
          style={{ left: `${m.left}%`, top: `${m.top}%`, animationDelay: `${m.delay}s`, animationDuration: `${m.duration}s` }}
        />
      ))}
    </div>
  );
}

/**
 * A SMALL LAND BIRD, seen from below — short pointed wings either side of
 * a small body, like a swallow or a finch. Not the long shallow "m" of a
 * gull, which reads as the sea.
 */
const SMALL_BIRD = 'M10 5.4 C8.6 3.6 5.6 1.6 1.4 2.4 C4.4 3.4 6.6 4.6 8.4 6 Z M10 5.4 C11.4 3.6 14.4 1.6 18.6 2.4 C15.6 3.4 13.4 4.6 11.6 6 Z';

/** The quiet moments that happen now and then, one at a time. */
export type MomentKind = 'LEAF_PASS' | 'LIGHT_SHIFT' | 'BIRD_SHADOW';

/** How often each comes up: a passing bird least of all. */
const MOMENT_WEIGHTS: readonly [MomentKind, number][] = [
  ['LEAF_PASS', 0.45],
  ['LIGHT_SHIFT', 0.4],
  ['BIRD_SHADOW', 0.15],
];

export function pickMoment(rnd: () => number = Math.random): MomentKind {
  let r = rnd();
  for (const [kind, weight] of MOMENT_WEIGHTS) {
    if (r < weight) return kind;
    r -= weight;
  }
  return 'LEAF_PASS';
}

/**
 * ONE QUIET MOMENT, played once and gone: a single leaf drifting across,
 * the light through the canopy brightening and settling, or a bird's
 * shadow crossing far off. Pure decoration — nothing to press, nothing
 * that changes anything.
 */
export function Moment({ kind }: { kind: MomentKind }) {
  return (
    <div className={`amb amb-moment amb-moment-${kind}`} data-testid="walk-moment" data-kind={kind} aria-hidden="true">
      {kind === 'LEAF_PASS' && <span className="amb-moment-leaf" />}
      {kind === 'LIGHT_SHIFT' && <span className="amb-moment-light" />}
      {kind === 'BIRD_SHADOW' && (
        <span className="amb-moment-bird">
          <svg width="18" height="9" viewBox="0 0 20 10">
            <path d={SMALL_BIRD} />
            <ellipse cx="10" cy="5.6" rx="2.1" ry="1.4" />
          </svg>
        </span>
      )}
    </div>
  );
}

export function Ambience({ picked }: { picked: readonly WalkAmbience[] }) {
  return (
    <>
      {picked.includes('BIRDS') && <Birds />}
      {picked.includes('LEAVES') && <Leaves />}
      {picked.includes('MOTES') && <Motes />}
    </>
  );
}

/**
 * THE NEAREST LEAVES — a dark, soft edge of foliage in front of everything.
 *
 * Out of focus on purpose, and low on the screen so it never crosses a
 * face. It slides faster than the painting as the party walks, which is
 * most of what makes the forest read as deep rather than flat.
 */
export function NearFoliage() {
  const leaf = (x: number, y: number, r: number, s: number, k: number) => (
    <path
      key={k}
      d="M0 0 C 10 -14, 34 -14, 46 0 C 34 14, 10 14, 0 0 Z"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
    />
  );
  // Three clumps along the bottom of a strip wider than the screen.
  const clumps: [number, number][] = [
    [40, 0],
    [520, 1],
    [980, 2],
  ];
  return (
    <svg className="walk-near-foliage" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
      {clumps.map(([cx, c]) => (
        <g key={c} className="walk-near-clump">
          {[-70, -40, -10, 20, 50, 80, -100, 110].map((r, i) =>
            leaf(cx + i * 22, 150 - (i % 3) * 18, r + c * 7, 1.1 + (i % 2) * 0.5, i),
          )}
        </g>
      ))}
    </svg>
  );
}
