/**
 * 「！」 — THERE IS SOMETHING HERE TO LOOK AT.
 *
 * The one mark every walked place uses for a thing that can be looked
 * at, so no place has to be checked for whether its painting swallows
 * it. A guide, not a mood: a bold red-orange 「！」 with a white edge and
 * a dark shadow, so it reads on pale stone, dark moss, sand or water
 * alike. It floats on the thing it names, its bottom tip at the given
 * point, and breathes slowly; once looked at it dims rather than going,
 * so where one has already been is still plain.
 *
 * Purely a sign. Touching it is touching the ground there, which walks
 * the party to the thing — it has no input of its own.
 */
export function PointMarker({
  left,
  top,
  state,
  testId,
  variant = 'normal',
}: {
  left: number;
  top: number;
  /** near: in sight · here: standing beside it · looked: already read */
  state: 'near' | 'here' | 'looked';
  testId: string;
  /**
   * normal: the red 「！」 · rare: the same 「！」 in gold · rainbow: not a
   * 「！」 at all but a four-pointed star in shifting colour — a find of
   * another kind, told apart at a glance.
   */
  variant?: 'normal' | 'rare' | 'rainbow';
}) {
  return (
    <span
      className={`walk-marker is-${state} v-${variant}`}
      data-testid={testId}
      data-state={state}
      data-variant={variant}
      style={{ left, top }}
      aria-hidden="true"
    >
      {variant === 'rainbow' ? (
        <svg viewBox="0 0 40 40" width="100%" height="100%">
          <defs>
            <linearGradient id={`rb-${testId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff6b8b" />
              <stop offset="0.25" stopColor="#ffd25e" />
              <stop offset="0.5" stopColor="#7cf0a8" />
              <stop offset="0.75" stopColor="#6fb8ff" />
              <stop offset="1" stopColor="#c58bff" />
            </linearGradient>
          </defs>
          <path className="walk-marker-star" d="M20 1 L25 15 L39 20 L25 25 L20 39 L15 25 L1 20 L15 15 Z" fill={`url(#rb-${testId})`} />
          <circle className="walk-marker-core" cx="20" cy="20" r="3.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 40" width="100%" height="100%">
          <rect className="walk-marker-bar" x="7.5" y="2.5" width="9" height="24" rx="4.5" />
          <circle className="walk-marker-dot" cx="12" cy="34" r="4.6" />
        </svg>
      )}
    </span>
  );
}
