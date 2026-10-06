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
}: {
  left: number;
  top: number;
  /** near: in sight · here: standing beside it · looked: already read */
  state: 'near' | 'here' | 'looked';
  testId: string;
}) {
  return (
    <span
      className={`walk-marker is-${state}`}
      data-testid={testId}
      data-state={state}
      style={{ left, top }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 40" width="100%" height="100%">
        <rect className="walk-marker-bar" x="7.5" y="2.5" width="9" height="24" rx="4.5" />
        <circle className="walk-marker-dot" cx="12" cy="34" r="4.6" />
      </svg>
    </span>
  );
}
