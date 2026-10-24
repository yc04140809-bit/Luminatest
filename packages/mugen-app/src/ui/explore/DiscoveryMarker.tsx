import type { Cue } from './RoamScene';

/**
 * A THING NOTICED, TOLD APART BY MORE THAN COLOUR (作者「探索ポイント発見演出強化」2026-10-18).
 *
 * On a place that shows its discoveries, each kind of thing has its own shape, movement and glow —
 * so it reads on bright meadow, dark wood or pale stone, and to an eye that does not tell colours
 * apart:
 *
 *   LOOK     調べ     a small blue lens            — a quiet bob
 *   FIND     a small find  a white spark            — a quiet bob
 *   GATHER   採取     a gold faceted crystal       — swells and shrinks softly
 *   RARE     golden   a gold four-pointed star     — brighter
 *   RAINBOW  once in a world  a star in turning colour — the strongest glow, more sparks
 *   EVENT    イベント  an orange diamond with 「！」  — rocks gently side to side
 *   MEMORY   WORLD MEMORY  a pale violet ring round a star — a slow, deep glow
 *
 * `fresh`: just noticed for the first time — it flashes, sparkles and swells (90% ↔ 110%) a little
 * while, then settles to its quiet movement (作者: 発見後は過剰なアニメーションを続けない).
 * Purely a sign: touching it is touching the ground there.
 */
export function DiscoveryMarker({
  left,
  top,
  state,
  cue,
  fresh,
  testId,
}: {
  left: number;
  top: number;
  state: 'near' | 'here';
  cue: Cue;
  fresh: boolean;
  testId: string;
}) {
  const sparks = cue === 'RAINBOW' ? 10 : cue === 'RARE' || cue === 'MEMORY' ? 8 : 6;
  return (
    <span
      className={`disc-marker cue-${cue.toLowerCase()} is-${state}${fresh ? ' fresh' : ''}`}
      data-testid={testId}
      data-state={state}
      data-cue={cue}
      data-fresh={fresh ? 'yes' : 'no'}
      style={{ left, top }}
      aria-hidden="true"
    >
      <span className="disc-shape">{shapeOf(cue, testId)}</span>
      {fresh && (
        <>
          <i className="disc-burst" />
          <span className="disc-sparks">
            {Array.from({ length: sparks }, (_, i) => (
              <b key={i} style={{ ['--a' as string]: `${(360 / sparks) * i}deg` }} />
            ))}
          </span>
        </>
      )}
    </span>
  );
}

function shapeOf(cue: Cue, id: string) {
  switch (cue) {
    case 'GATHER':
      return (
        <svg viewBox="0 0 32 40" width="100%" height="100%">
          <path d="M16 2 L28 14 L16 38 L4 14 Z" className="disc-fill" />
          <path d="M4 14 L28 14 M16 2 L11 14 L16 38 L21 14 Z" className="disc-facet" />
        </svg>
      );
    case 'RARE':
    case 'RAINBOW':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%">
          {cue === 'RAINBOW' && (
            <defs>
              <linearGradient id={`dg-${id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff6b8b" />
                <stop offset="0.25" stopColor="#ffd25e" />
                <stop offset="0.5" stopColor="#7cf0a8" />
                <stop offset="0.75" stopColor="#6fb8ff" />
                <stop offset="1" stopColor="#c58bff" />
              </linearGradient>
            </defs>
          )}
          <path
            d="M20 1 L25 15 L39 20 L25 25 L20 39 L15 25 L1 20 L15 15 Z"
            className="disc-fill"
            style={cue === 'RAINBOW' ? { fill: `url(#dg-${id})` } : undefined}
          />
          <circle cx="20" cy="20" r="3.4" className="disc-core" />
        </svg>
      );
    case 'EVENT':
      return (
        <svg viewBox="0 0 36 36" width="100%" height="100%">
          <path d="M18 1 L35 18 L18 35 L1 18 Z" className="disc-fill" />
          <rect x="15.6" y="8" width="4.8" height="13" rx="2.4" className="disc-core" />
          <circle cx="18" cy="26.5" r="2.7" className="disc-core" />
        </svg>
      );
    case 'MEMORY':
      return (
        <svg viewBox="0 0 40 40" width="100%" height="100%">
          <circle cx="20" cy="20" r="16" className="disc-ring" />
          <path d="M20 8 L23 17 L32 20 L23 23 L20 32 L17 23 L8 20 L17 17 Z" className="disc-fill" />
        </svg>
      );
    case 'FIND':
      return (
        <svg viewBox="0 0 32 32" width="100%" height="100%">
          <path d="M16 2 L19 13 L30 16 L19 19 L16 30 L13 19 L2 16 L13 13 Z" className="disc-fill" />
        </svg>
      );
    default:
      // LOOK: a small lens.
      return (
        <svg viewBox="0 0 36 36" width="100%" height="100%">
          <circle cx="15" cy="15" r="10" className="disc-fill" />
          <circle cx="15" cy="15" r="5.2" className="disc-core" />
          <path d="M22.5 22.5 L32 32" className="disc-handle" />
        </svg>
      );
  }
}
