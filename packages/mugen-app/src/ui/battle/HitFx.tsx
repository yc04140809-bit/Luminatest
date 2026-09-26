// WHAT A BLOW LOOKS LIKE.
//
// The fight used to report damage and show almost none of it: the hero
// leaned thirty pixels left, the creature jolted nine, and the number
// appeared as a sentence in a box at the bottom of the screen. A player
// watching the FIELD — which is the whole of this screen — saw two
// drawings twitch and had to read to find out that one of them had been
// hit.
//
// So the moment of contact is drawn. Five things, one after another
// inside about a third of a second:
//
//   a SLASH across the point of contact,
//   a FLASH that whitens the thing that was hit,
//   an IMPACT ring thrown outwards from it,
//   the NUMBER, rising off the wound,
//   and the field itself kicked, briefly and slightly.
//
// None of it is a state machine. It is one element with a key: a new
// blow is a new key, React replaces the element, and every animation
// inside it starts from nought. That is why a second swing landing
// before the first has finished cannot leave half an effect on screen.

/** Where a blow landed, in shares of the field. */
export interface HitAt {
  /** Across, from the left. */
  x: number;
  /** Up, from the bottom. */
  y: number;
}

export interface HitFxProps {
  /** A new value is a new blow. Nothing replays without one. */
  fxKey: number;
  at: HitAt;
  /** What the fight says it cost. Nought draws no number. */
  amount: number;
  /** How long the whole thing lasts, already scaled for ×2. */
  ms: number;
  /**
   * Which way the blow travelled, so the slash leans with it.
   * The party swings LEFT at the enemy; the enemy swings right.
   */
  facing: 'left' | 'right';
}

/**
 * One blow, drawn.
 *
 * Absolutely placed inside the field and never in anybody's way:
 * `pointer-events: none` on every part of it, and it is gone on its own
 * timer — there is nothing here a thumb can land on and nothing that
 * outlives the beat it belongs to.
 */
export function HitFx({ fxKey, at, amount, ms, facing }: HitFxProps) {
  return (
    <div
      key={fxKey}
      className="bp-hit"
      data-testid="bp-hit-fx"
      aria-hidden="true"
      style={{
        left: `${at.x * 100}%`,
        bottom: `${at.y * 100}%`,
        ['--hit-ms' as string]: `${ms}ms`,
        ['--hit-lean' as string]: facing === 'left' ? '-24deg' : '24deg',
      }}
    >
      <span className="bp-hit-slash" />
      <span className="bp-hit-ring" />
      <span className="bp-hit-spark" />
      {amount > 0 && (
        <b className="bp-hit-damage" data-testid="bp-hit-damage">
          {amount}
        </b>
      )}
    </div>
  );
}
